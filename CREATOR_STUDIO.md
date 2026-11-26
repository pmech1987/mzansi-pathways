# How to use Creator Studio

Open `/creator_studio.html` on your site (phone or computer). It is a form that turns what you read in an official prospectus into a checked file. Nothing is sent anywhere: your queue is saved in that browser only, so download your file before clearing browser data.

## Add programmes (tab 1)
1. Pick the institution, intake year and route (University, TVET, etc.).
2. Fill faculty, department, programme name, NQF level, minimum APS **on that institution's own scale** (UCT is out of 600, most are out of 42-60).
3. Choose the English and Maths minimum percentages from the prospectus.
4. Enter the closing date, the **official https link**, and the exact document and page you read it from.
5. Press **Add to Queue**. Wrong or unsafe entries are refused with the reason (social media, short links and job boards are not accepted as sources).
6. To fix an entry press **Edit**, change it, and add it again. The same programme and year replaces the old entry, so you never get duplicates.

Everything arrives as **Pending Review**. A programme only becomes Verified when a second person confirms it against the official source.

## Add jobs (tab 2)
Paste a DPSA post header to auto-fill the title and reference, or fill the form. ID numbers, personal phone numbers and free email addresses are removed automatically. Only official employer or gov.za links are accepted.

## Check & export (tab 3)
1. Anything shown in red must be fixed before the programmes file can be downloaded.
2. Press **Download programmes file** (named `programmes_DATE.json`).
3. On GitHub open the `inbox` folder, choose **Add file > Upload files**, drop the file in and commit.
4. GitHub checks it, adds the good rows to `data/programmes/`, moves the file to `inbox/done/`, and refreshes the site data. To run it straight away: Actions > Data refresh > Run workflow. Rejected rows are listed in that run's log.
5. **Load a saved file** lets you reopen an earlier download to keep editing. **Clear queue** empties the list (do this only after the upload).

Jobs are exported separately as `community_jobs_submissions.json` and go into the `data` folder.
