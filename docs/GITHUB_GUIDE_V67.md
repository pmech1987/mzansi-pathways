# Putting Mzansi Pathways on GitHub: step by step (v67)

Written for Windows and for someone who has never used GitHub. Every step says what you should SEE when it worked. Allow about 40 minutes the first time. After that, publishing is one double-click (`publish.bat`) and backups run by themselves.

## What GitHub gives you, and what to know first
- **A free live website** (GitHub Pages) at `https://YOURNAME.github.io/mzansi-pathways/`.
- **A second home for your work.** If your PC dies, your files are still on GitHub.
- **A full history.** You can see and undo every change.
- **Public or private?** GitHub Pages on a free account only works for a **public** repository. The repository holds no secrets by design (reviewer secrets live only in GitHub Secrets or on your PC), and the app is meant to be public. Never put anything in it you would not put on a notice board.
- GitHub ignores the file `_headers`. That file is for other hosts. On GitHub Pages the security rules in `index.html` do the work.
- You do not need to understand Git. The tool `github_publish.py` does the Git work, checks everything first, and **stops without uploading anything** if something looks wrong.

## Part A: One-time setup

### Step 1. GitHub account with 2-step login
1. Go to https://github.com/signup and make an account. Choose a username you are happy to show in the website address.
2. Turn on two-factor login: GitHub (top right photo) > Settings > Password and authentication > Enable two-factor authentication. Use an authenticator app. **Save the recovery codes on paper**, not in a file on this PC.

You should see: your GitHub home page, and a "2FA enabled" tick.

### Step 2. Install Python and Git
1. **Python:** download Python 3.11 or newer from https://www.python.org/downloads/ and run it. On the FIRST screen **tick "Add python.exe to PATH"**, then Install Now.
2. **Git:** download "Git for Windows" from https://git-scm.com/download/win and run it. Press Next on every screen (the defaults are right).
3. Close any open black command window, then open a new one: press the Windows key, type `cmd`, press Enter.
4. Type `python --version` and press Enter. You should see `Python 3.x`. (If Windows opens the Microsoft Store instead, or says "not found", type `py --version`; if that works, use `py` wherever this guide says `python`. The `.bat` files do this switch for you.)
5. Type `git --version` and press Enter. You should see `git version 2.x`.

### Step 3. Tell Git who you are
In the black window type these two lines, using your own details (press Enter after each):
```
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```
(Use the email on your GitHub account, or the private "noreply" address shown at GitHub > Settings > Emails.)

### Step 4. Put the project in a permanent folder and check it
1. Extract the bundle as described in `START_HERE.md`, so you have `C:\MzansiPathways\mzansi-pathways`.
2. In the black window: `cd C:\MzansiPathways\mzansi-pathways`
3. `python scripts/doctor.py` should end with `0 problem(s)`. Warnings are fine for now.
4. `python scripts/maintain.py --zip` should say `92/92 PASSED` or more. This also makes your first backup.

### Step 5. Create the empty repository on GitHub
1. On GitHub click the **+** (top right) > **New repository**.
2. Name: `mzansi-pathways`. Choose **Public**.
3. **Do NOT tick** "Add a README", "Add .gitignore" or "Choose a license". The repository must start empty. (If you did by mistake: nothing is harmed. Delete the repository under Settings > "Delete this repository" and create it again empty. `--sync` will also tell you this in plain words.)
4. Click **Create repository**. Copy the address shown that looks like `https://github.com/YOURNAME/mzansi-pathways.git`.

### Step 6. Turn on the website setting FIRST
1. On your repository page: **Settings** > **Pages**.
2. Under **Build and deployment** > **Source**, choose **GitHub Actions**.

Doing this before the first upload means the first automatic build works. If GitHub does not let you choose yet on an empty repository, skip this: do it after Step 7 and follow the "first run is red" note there.

### Step 7. Connect your folder and do the first upload
In the black window, still inside the project folder:
```
python scripts/github_publish.py --setup https://github.com/YOURNAME/mzansi-pathways.git
python scripts/github_publish.py --dry-run
python scripts/github_publish.py --message "First upload"
```
- `--setup` connects the folder (it refuses addresses that contain a password or token, turns off Windows line-ending conversion, which would break the checks, and puts YOUR GitHub username into `.github/CODEOWNERS` and `SECURITY.md`, which ship naming a different account).
- `--dry-run` runs every check and changes nothing. You should see `DRY RUN: all checks passed`.
- The third command does the real upload. A browser window or small box will ask you to **sign in to GitHub**: sign in there (this is the safe, normal way; you never type your password into the black window). Git for Windows then remembers you.

You should see: `Pushed to GitHub.`, then `Confirmed: GitHub now holds your latest commit`, and on your repository page, all your files.

If you see `[STOP]` the tool tells you what to fix. **Nothing is uploaded when it stops.**

### Step 8. Watch the website go live
1. Click the repository's **Actions** tab. You should see "Deploy Mzansi Pathways to GitHub Pages" running (yellow circle). It runs every check, publishes, then a second job (`smoke-test`) asks the live website for its key files. After 1 to 3 minutes both are green ticks.
2. Your site is at `https://YOURNAME.github.io/mzansi-pathways/`. Open it on your phone as well.

If the Actions tab asks "I understand my workflows, go ahead and enable them", click it.

**If the very first run is red** at "Setup Pages" with a message like "Get Pages site failed": you did Step 6 after the upload. Do Step 6 now, then Actions > the red run > **Re-run all jobs**. It goes green.

If a later run is red: click it, then the failed step, and read the last lines. The commonest causes are in "If something fails" below.

### Step 9. Make GitHub e-mail you when something breaks
GitHub (top right photo) > Settings > Notifications > **Actions**: choose "Send notifications for failed workflows only" and keep your e-mail ticked. Now a red run, a failed backup test or a broken live site reaches you without you looking.

### Step 10. Add the secrets (only if you use these features)
Repository Settings > Secrets and variables > Actions > **New repository secret**.

| Secret name | What it is | Needed for |
|---|---|---|
| `MZ_REVIEWER_SECRETS` | the reviewers' secrets in the format shown in `docs/PROSPECTUS_VERIFICATION_V21.md` | proving verified programme records on GitHub |
| `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` | free keys from the Adzuna developer site | the extra job feed. The site works without them |

Secrets are write-only: once saved, nobody (not even you) can read them back, so keep the originals in a password manager or on paper.

### Step 11. Stop accidents on the main branch (safe for a solo owner)
Settings > **Rules** > **Rulesets** > **New ruleset** > **New branch ruleset** (or the older Settings > **Branches** > **Add rule**):
- Name it `protect-main`. Enforcement: **Active**. Target: the default branch (`main`).
- Tick **Restrict deletions** and **Block force pushes**. Nothing else.
- **Do NOT tick "Require status checks to pass" and do NOT tick "Require a pull request" while you are the only person working.** With either switched on, GitHub refuses every direct upload from `publish.bat` (the error mentions `GH006`, `GH013` or "Required status check"). The deploy workflow already runs every check on each push, so you lose nothing. Turn pull requests on later, when other people help.

### Step 12. Security switches (2 minutes)
Settings > **Code security**: turn on **Secret scanning** and **Push protection** (free for public repositories), and **Dependabot alerts**. Push protection makes GitHub itself refuse a push that contains a key, a second wall behind the tool's own scan.

### Step 13. Automatic backups that leave this PC (strongly recommended)
1. Plug in a USB drive or choose a synced cloud folder, for example `D:\MzansiBackup`. Then, once, in the black window:
```
setx MZ_OFFSITE_DIR "D:\MzansiBackup"
```
2. Close and reopen the black window. Now `maintain.py` and `github_publish.py` also put a hash-checked copy there every time.
3. Turn on the weekly automatic backup (Windows):
```
python scripts/scheduled_backup.py --install
```
You should see `Scheduled: "MzansiPathways weekly backup" every Sunday at 12:00.` Each run makes a checked project zip, a checked copy of the whole Git history, and copies both to your off-site folder. It never changes your files and never publishes. If the PC was off on Sunday, Task Scheduler runs it the next time you are logged in (open Task Scheduler > the task > Settings > "Run task as soon as possible after a scheduled start is missed" and tick it).
4. `python scripts/doctor.py` now shows `off-site folder set` and `automatic backup ran N day(s) ago`. It warns you if the schedule stops.

## Part B: Every day, publishing a change
1. Make your change (for example new programme rows via `scripts/csv_to_programmes_json.py`).
2. Run `python scripts/maintain.py --zip` (or double-click `maintain.bat`). It repairs line endings, refreshes the seals and runs every gate.
3. Double-click **`publish.bat`**, type one line about what you changed, press Enter. (Or: `python scripts/github_publish.py --message "what you changed"`.)
4. Watch the **Actions** tab. Two green ticks (deploy and smoke-test) mean the live site updated and answers.

What `publish` does for you, in order, and stops at the first problem:
1. checks git, your name, that you are on `main`, that no git operation is half finished, and fixes Windows line endings
2. scans every file about to be uploaded for passwords, keys, tokens, `.env`, `.mzansi` backups and files over 50 MB
3. runs every gate (fail-closed)
4. makes a checksummed project backup AND a verified copy of the whole git history, plus a copy off the PC if `MZ_OFFSITE_DIR` is set
5. commits and adds a safety tag `pre-publish-<date>` (the newest 30 are kept)
6. pushes. **It never force-pushes.** If GitHub has newer work it stops and tells you what to run
7. asks GitHub which commit it now holds and compares it with yours (`Confirmed`), then prints your Actions and website addresses

## Part C: Commands you may need

| You want to | Run |
|---|---|
| See what is changed / not yet on GitHub | `python scripts/github_publish.py --status` |
| Prove GitHub holds your latest work and your local history is not damaged | `python scripts/github_publish.py --verify` |
| Test everything without publishing | `python scripts/github_publish.py --dry-run` |
| Bring in changes made on github.com, safely | `python scripts/github_publish.py --sync` |
| Undo the last published change (adds an "undo" commit, erases nothing) | `python scripts/github_publish.py --rollback` |
| Make a single-file backup of all history now | `python scripts/github_publish.py --bundle --offsite D:\MzansiBackup` |
| One-click backup of everything | double-click `backup_now.bat` |
| Check all your backups are readable | `python scripts/maintain.py --verify-backups` |
| PROVE the newest backups can be restored and still pass every gate | `python scripts/maintain.py --restore-drill` |
| Undo local changes to the data/code | `python scripts/maintain.py --restore` |
| Did the automatic backup run? | `python scripts/scheduled_backup.py --status` |

## Part D: Backups, four layers
1. **On your PC:** `backups/*.zip` (project, checksummed, newest 10) and `backups/git/*.bundle` (whole history, newest 10). Both are made automatically before every maintenance run and every publish, and every Sunday by the scheduled backup.
2. **Off your PC:** the `MZ_OFFSITE_DIR` folder, kept hash-checked (newest 5 bundles and the newest release zips).
3. **On GitHub:** your repository itself, plus the **Weekly repository backup** workflow, which stores a verified bundle for 90 days (Actions > "Weekly repository backup" > the run > Artifacts > `repo-bundle`). That workflow also **restores its own bundle into an empty folder and runs every gate**, so a green tick means the backup really works.
4. **A proof you run yourself:** `python scripts/maintain.py --restore-drill` once a month. A backup you never restored is a hope, not a backup.

Rule of thumb: you should always be able to point to at least two places that are not the same PC.

### Restoring everything on a brand new PC
1. Install Python and Git (Steps 2 and 3).
2. Get the history back, either from GitHub: `git clone https://github.com/YOURNAME/mzansi-pathways.git`, or from a bundle: `git clone D:\MzansiBackup\repo_YYYYMMDD-HHMMSS_xxx.bundle mzansi-pathways`.
3. `cd mzansi-pathways`, then `python scripts/github_publish.py --setup https://github.com/YOURNAME/mzansi-pathways.git` (this turns off Windows line-ending conversion again), then `python scripts/doctor.py`, then `python scripts/maintain.py --zip`.
4. Re-add what is deliberately not in GitHub: reviewer secrets (environment variables `MZ_SECRET_<ID>`, from your password manager), `vendor/tesseract/eng.traineddata.gz` (`scripts/fetch_vendor.sh`), and your `MZ_OFFSITE_DIR` and schedule (Step 13).

### If GitHub itself is gone, or your account is locked
Your files and history are still in `backups/git/*.bundle` and in your off-site folder. Clone the newest bundle (above), create a new repository, `--setup` it, and publish. Nothing depends on GitHub keeping your only copy.

## Part E: Rules that protect you
- **Never** put a password, token, `.env` file or reviewer secret in the folder. The tool refuses to upload them, and `.gitignore` excludes them, but the safest place is somewhere else.
- **Never** use `git push --force`. If git suggests it, stop and use `--sync`.
- **Never** paste a GitHub token into a command or into the repository address. Sign in through the browser box.
- If a secret ever does get uploaded: **change it first** (it is public the moment it is pushed, even if you delete the file), then tell the reviewer or provider. Deleting it from GitHub does not un-leak it.
- Edit through your PC, not on github.com, so your backups and checks always see the change. If you did edit on github.com, run `--sync` first.
- **Keep the site alive:** GitHub pauses scheduled workflows (the daily job-feed refresh and the weekly backup test) in a public repository with no new commits for 60 days. If you get a "scheduled workflows disabled" e-mail, open Actions and click **Enable**, or simply publish any small change.
- Keep reviewer backup codes (`python scripts/doctor.py` warns when a reviewer is running low) and GitHub's recovery codes on paper, in two places.

## If something fails

| You see | Meaning | Do this |
|---|---|---|
| `Python was not found` (from a `.bat`) | Python missing, or installed without "Add to PATH" | Step 2. Re-run the installer, choose Modify, tick the PATH box |
| `Git is not installed` | Git missing or window not reopened | Step 2, then open a NEW black window |
| `Git does not know your name` | Step 3 not done | Run the two `git config` lines |
| `You are on branch 'master', but the website is only built from 'main'` | Wrong branch | `git branch -m master main` (or `git checkout main`), then publish |
| `detached HEAD` | Not on any branch | `git checkout main` |
| `[STOP] ... looks like a GitHub token` (or key) | A secret is in a file | Remove it from that file, change the secret, run again |
| `[STOP] A gate failed` | A real check failed, or seals are old | Run `python scripts/maintain.py --zip`; if it still fails, read the line it names, or `--restore` |
| Every gate says "SHA-256 mismatch / possible tamper" after a clone or sync | Windows line endings (CRLF) | `python scripts/maintain.py --zip` repairs them; `--setup` stops it happening again |
| `GitHub did not accept your login` | Sign-in expired | Run `git credential-manager github login`, sign in, retry |
| `GitHub says that repository does not exist` | Wrong address or wrong GitHub account | `python scripts/github_publish.py --status` shows the address; re-run `--setup` with the right one |
| `GitHub has newer work than this PC` | Changes exist on github.com or another PC | `python scripts/github_publish.py --sync`, then publish again |
| `... history and yours are unrelated` | The repository was created with a README/licence ticked | Step 5, point 3: delete it and create it empty. Nothing on your PC was changed |
| `The same lines were changed in both places` | Real clash; the tool put everything back as it was | Back up the folder, clone a fresh copy (`git clone` the repo to a new folder), copy your changed files into it, then publish |
| `No connection to GitHub` | Offline | Your work is safe and committed. Run the same command when online |
| `GitHub refused: the branch rules ...` / `GH006` / `GH013` / "Required status check" | A branch rule is too strict for direct uploads, or GitHub's secret scan fired | Step 11: switch off "Require status checks" and "Require a pull request". If it is the secret scan, read GitHub's message and change the secret. Do not force |
| `over 100 MB` | A file is too big for GitHub | Remove it or add it to `.gitignore` |
| `WARNING: GitHub reports a different latest commit` | The push did not land as expected | `python scripts/github_publish.py --verify`, then `--sync` |
| Actions red at "Setup Pages" (first run only) | Pages was not switched on before the first upload | Step 6, then Re-run all jobs |
| Actions red at "Pre-deploy fail-closed verification gate" | A gate failed on GitHub | Run `python scripts/maintain.py --zip` locally, publish again |
| Actions red at `smoke-test` | The deploy finished but the live site did not answer correctly | Wait 2 minutes and Re-run jobs. If it persists: `python scripts/github_publish.py --rollback` |
| "Weekly repository backup" red at "Restore drill" | The repository's own backup could not be restored and verified | Open the run and read the failed gate; fix it and publish. Do not rely on that week's bundle |
| Site shows the old version | Cached copy | Reload twice online. The app gets a new cache name on every deploy |
| Site is a 404 | Pages source not set | Step 6: Source must be **GitHub Actions** |
| `A git operation is half finished` | A merge or rebase stopped | `git status` shows which; to cancel: `git merge --abort` or `git rebase --abort`, then retry |
| `doctor.py`: "the last automatic backup had problems" | The weekly backup failed (disk full, off-site drive unplugged) | `python scripts/scheduled_backup.py --status` names the step; plug the drive in or free space, then run `python scripts/scheduled_backup.py` |

If you are ever unsure: stop, run `python scripts/github_publish.py --status`, and send that text to whoever helps you. Nothing in this guide asks you to delete history or force anything.

## What changed in v67 (for the record)
- Fixed: CRLF line endings broke every seal on Windows (new `.gitattributes`, `core.autocrlf=false`, automatic repair).
- Fixed: the old Step 9 (required status checks) made `publish.bat` fail; the old guide never mentioned installing Python or the first-run Pages order.
- Fixed: protected-branch refusals were explained as "newer work"; `--sync` now handles an unrelated/non-empty GitHub repository.
- New: branch guard, GitHub-confirmed push, `--verify`, tag pruning, `scripts/scheduled_backup.py`, `backup_now.bat`, `scripts/restore_drill.py`, `maintain.py --restore-drill`.
- New in CI: deploy-time cache stamp, job-feed validation, post-deploy smoke test, weekly restore drill.
- `--setup` now writes your GitHub username into CODEOWNERS and SECURITY.md.
- Gate 92 and 16 new tests.
