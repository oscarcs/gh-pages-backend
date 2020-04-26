# gh-pages-backend

A little backend for my Github Pages site.

Deploy to GCP like: `gcloud functions deploy api --runtime nodejs10 --trigger-http`

This function requires a `config.json` file set up like this:

```json
{
    "spreadsheetId": "",
    "keys": {
        "incoming": "", // Put your API key here
        "outgoing": { 
            // Put your service account key here
            // type, project id, private key, etc...
        }
    }
}
```