const { google } = require('googleapis');
const sheets = google.sheets('v4');

exports.api = async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');

    let segments = getSubSegments(req.path.split('/'));
    let page = 0;
    let per_page = 10;

    switch (req.method) {
        case 'GET':
            return await handleGet(segments, page, per_page, res);
        
        case 'POST':
            return handlePost(segments, page, per_page, res);

        case 'OPTIONS':
            res.set('Access-Control-Allow-Methods', 'GET');
            res.set('Access-Control-Allow-Headers', 'Content-Type');
            res.set('Access-Control-Max-Age', '3600');
            return res.status(204).send('');

        default:
          res.status(405).send({ error: 'That method is not allowed.' });
          break;
      }
}

const listSchema = {
    Projects: { width: 5 },
    Writing: { width: 5 }
}
const singleSchema = {
    Projects: { width: 6 },
    Writing: { width: 6 }
}

async function handleGet(segments, page, per_page, res) {
    let singleSelect = false;
    if (segments.length > 1 && segments[1] !== '') {
        singleSelect = true;
    }

    let spreadsheetId = getSpreadsheetId();
    let jwt = getJwt();

    let sheet = handleSheet(segments);
    let range;

    if (singleSelect) {
        let row =  await lookupRow(spreadsheetId, jwt, sheet, 0, segments[1]);
        if (isNaN(row)) {
            return res.sendStatus(404);
        }
        range = handlePagination(sheet, singleSchema, row, 1);
    }
    else {
        range = handlePagination(sheet, listSchema, page, per_page);
    }

    let result = { rows: [] };
    try {
        result = await retrieveRows(spreadsheetId, jwt, sheet, range);
    }
    catch (e) {
        console.log(e);
        return res.sendStatus(500);
    }

    if (singleSelect) {
        return res.send(result.rows[0]);
    }
    return res.send(result);
}

function handlePost(res) {
    return res.sendStatus(501);
}

function handleSheet(segments) {
    let sheet;
    switch (segments[0]) {
        case 'projects':
            sheet = 'Projects';
            break;

        case 'writing':
            sheet = 'Writing';
            break;
    }
    return sheet;
}

function handlePagination(sheet, schema, page, per_page) {
    return {
        firstRow: page * per_page,
        lastRow: (page + 1) * per_page - 1,
        firstColumn: 0,
        lastColumn: schema[sheet].width - 1
    };
}

async function retrieveRows(spreadsheetId, jwt, sheet, range) {
    let rangeStr = getRange(range);
    range.firstRow = -1;
    range.lastRow = -1;
    let titles = getRange(range);

    const request = {
        spreadsheetId: spreadsheetId,
        ranges: [`${sheet}!${titles}`, `${sheet}!${rangeStr}`, `${sheet}Length`],
        dateTimeRenderOption: 'SERIAL_NUMBER',
        auth: jwt
    };

    let response = {};
    try {
        response = (await sheets.spreadsheets.values.batchGet(request)).data;
    }
    catch (err) {
        console.error(err);
        if (err.code === 403) {
            throw new Error('The request to the Sheets API failed.');
        } 
    }

    let rows = [];
    let keys = response.valueRanges[0].values[0];
    let values = response.valueRanges[1].values;
    for (let row of values) {
        let obj = {};
        for (let i in keys) {
            obj[keys[i]] = row[i];
        }
        rows.push(obj);
    }
    let length = parseInt(response.valueRanges[2].values[0][0]);

    return {
        rows: rows,
        length: length
    };
}

async function lookupRow(spreadsheetId, jwt, sheet, column, needle) {
    column = column < 26 ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[column] : 'Z';

    const request = {
        spreadsheetId: spreadsheetId,
        auth: jwt,
        
        valueInputOption: "USER_ENTERED",
        range: "Lookup!A1",
        includeValuesInResponse: true,
        resource: {
            values: [
                [
                    `=MATCH("${needle}", ${sheet}!${column}2:${column}, 0)`
                ]
            ]
        }
    };

    let response = {};
    try {
        response = (await sheets.spreadsheets.values.update(request)).data;
    }
    catch (err) {
        console.error(err);
        if (err.code === 403) {
            throw new Error('The request to the Sheets API failed.');
        } 
    }

    return parseInt(response.updatedData.values[0][0] - 1);
}

function getSubSegments(segments) {
    segments = segments.slice(1, segments.length);
    if (segments[0] === 'api') {
        return segments.slice(1, segments.length);
    }
    return segments;
}

function getSpreadsheetId() {
    return require('./config.json').spreadsheetId; 
}

function getApiKey() {
    return require('./config.json').keys.incoming; 
}

function getJwt() {
    let credentials = require('./config.json').keys.outgoing;
    return new google.auth.JWT(
        credentials.client_email,
        null,
        credentials.private_key,
        ['https://www.googleapis.com/auth/spreadsheets'],
        null
    );
}

function getRange(range) {
    let firstRow = range.firstRow + 2;
    let lastRow = range.lastRow + 2;
    let firstColumn = range.firstColumn < 26 ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[range.firstColumn] : 'Z';
    let lastColumn = range.lastColumn < 26 ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[range.lastColumn] : 'Z';
    return `${firstColumn}${firstRow}:${lastColumn}${lastRow}`;
}