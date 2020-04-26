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

async function handleGet(segments, page, per_page, res) {
    let range;
    let sheet;

    switch (segments[0]) {
        case 'posts':
            range = {
                firstRow: page * per_page,
                lastRow: (page + 1) * per_page - 1,
                firstColumn: 0,
                lastColumn: 4
            };
            sheet = 'Blog';
            break;
        case 'test':
            range = {
                firstRow: page * per_page,
                lastRow: (page + 1) * per_page - 1,
                firstColumn: 0,
                lastColumn: 2
            };
            sheet = 'Test';
            break;

        default:
            return res.send(404);
    }
    let spreadsheetId = getSpreadsheetId();
    let jwt = getJwt();

    let rows = await retrieveRows(spreadsheetId, jwt, range, sheet);

    return res.send(rows);
}

async function retrieveRows(spreadsheetId, jwt, range, sheet) {
    let rangeStr = getRange(range);
    range.firstRow = -1;
    range.lastRow = -1;
    let titles = getRange(range);

    const request = {
        spreadsheetId: spreadsheetId,
        ranges: [`${sheet}!${titles}`, `${sheet}!${rangeStr}`],
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
            return res.status(403).send('The request to the Sheets API failed.');
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
    return rows;
}

function handlePost(res) {
    return res.sendStatus(501);
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