# gh-pages-backend

A little backend for my Github Pages site.

Deploy to GCP like: `gcloud functions deploy api --runtime nodejs10 --trigger-http`

This function requires a `config.json` file set up like this:

```jsonc
{
    "spreadsheetId": "",
    "keys": {
        "outgoing": { 
            // Put your service account key here
            // Google Cloud -> IAM & Admin -> Service Accounts.
            // You can only download it once so be careful!
            // "type": "...",
            // "project_id": "..."
            // etc
        }
    }
}
```
