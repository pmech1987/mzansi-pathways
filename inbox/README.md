# Programme inbox

Drop a finished sheet here to add or correct programme rows. Do not edit `data/programmes/*.json` by hand.

1. Get the header: `python scripts/csv_to_programmes_json.py --template > inbox/my_sheet.csv`, or export from Creator Studio (the JSON file works as is).
2. Fill one row per programme **from the official prospectus or institution page**. `officialUrl` must be https, `sourceDoc` names the document, `lastVerifiedAt` is the day you checked it.
3. Subjects look like `English>=50; Mathematics>=60; Maths or Maths Lit>=40`.
4. Commit the file. GitHub checks it, adds the good rows, and moves the file to `inbox/done/`. Rows that fail are listed in the run log; fix them and commit again.

Rows come in as `pending_review`. Only a second person confirming them (5 checks + 2 reviewers) can make a row `verified`.
