# gh-pages-backend

A little backend for my Github Pages site.

Deploy to Google Cloud:

`gcloud functions deploy api --project oscarcs-github-pages --region=us-central1 --runtime=nodejs18 --entry-point=api --trigger-http`

This function requires a `config.json` file set up like this:

```jsonc
{
    "spreadsheetId": "",
    "keys": {
        "outgoing": { 
            // Put your service account key here
            // Google Cloud -> IAM & Admin -> Service Accounts.
            // (also should be in the function already, the source can be viewed)
            // "type": "...",
            // "project_id": "..."
            // etc
        }
    }
}
```
