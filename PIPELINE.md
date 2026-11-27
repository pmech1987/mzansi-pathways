# Prospectus pipeline: automatic programme data

No typing per course. The pipeline finds each institution's official prospectus PDF, reads every programme, checks every row many ways, and publishes only what holds up. Creator Studio and `inbox/` still work, but you only need them for exceptions.

## What it does
1. **Finds the PDF** on the institution's own website (`data/sources.json`; leave `url` as `null` and it searches the official site by itself). Anything off the official domain is refused.
2. **Reads it twice** with two independent PDF readers (pdftotext and pypdf). Rows are extracted by rules, and, when you add an AI key (`GEMINI_API_KEY` is free, or `ANTHROPIC_API_KEY`), a second AI reader reads the same pages independently.
3. **Runs 15 checks per row**: every requirement line was understood (an unknown subject can never be silently dropped), official domain, document fingerprint, intake year found in the document, the programme and its numbers are on the cited page in both PDF readers, APS inside a possible scale, marks valid, NQF level fits the qualification, no conflicting values inside the document, two readers agree, change from last year is believable, comparable to the catalogue range, and the same values seen on at least 2 separate runs.
4. **Retries failures** up to 10 rounds with different strategies (different reading window, other PDF reader). It stops early when nothing changes.
5. **Publishes by outcome**:
   - `auto_verified`: all checks passed. The app shows it as verified, with "Auto-checked against the official prospectus, p. N" and the document page link.
   - `pending_review`: passed the safety checks but one check is still open (for example, not yet seen on a second run). The app shows it as not yet verified.
   - rejected: failed a hard check (numbers not in the document, conflicting values, wrong site). Never published.
6. **Stays current**: runs every night (cheap: unchanged pages and PDFs are cached, so a quiet night makes no AI calls). A new prospectus (different file fingerprint) is re-read automatically; a removed programme disappears; a row older than 120 days stops counting as verified until re-checked.

A person's own verified row is never overwritten. Every run writes `reports/pipeline_report.md` listing every row and why anything was not verified.

## Turn it on (one time)
1. Put the project on GitHub (see earlier steps). Settings > Actions > General > Workflow permissions > Read and write.
2. Strongly recommended, one of these (the AI reader is what lets a row reach `auto_verified`):
   - **Free:** a Gemini key from aistudio.google.com (no card). Settings > Secrets and variables > Actions > New secret named `GEMINI_API_KEY`.
   - **Paid:** an `ANTHROPIC_API_KEY` from console.anthropic.com.
   Without either, rows stay `pending_review`, which is safe and still shown in the app as "not yet verified".
3. Actions > Prospectus pipeline > Run workflow. Run it once for one institution first (type `up` in "only") and read `reports/pipeline_report.md`.
4. Run it again on another day (or wait for Sunday). The second run is what lets rows reach `auto_verified`.

## First run: what to expect
Every institution formats its prospectus differently. The first real run will read some institutions well and others poorly. The report lists, per institution, what was found and what was skipped ("no prospectus found", "scanned PDF", etc.). Nothing wrong is published; weak parsing shows up as skipped or rejected rows. If an institution's PDF was not discovered, paste its direct https link into `url` in `data/sources.json`.

## Limits worth knowing
- Scanned (image-only) pages are read by OCR (pdftoppm + tesseract). Rows that came from OCR are capped at `pending_review` because OCR can swap look-alike characters and no second engine can cross-check an image. The report says how many pages were OCR'd. Without the tools installed, scanned documents are skipped and the report says why.
- The checks prove a row matches the document, not that the document is right. Institutions publish corrections; the weekly run picks those up when the PDF changes.
- Selection-based programmes (portfolios, interviews, faculty weighting) are stored with the numbers printed in the prospectus; the app still tells learners that acceptance is subject to selection.

## Running on a free AI tier
Free tiers allow only a few requests per minute and per day, and the numbers change (see your limits in AI Studio). The pipeline is built for that:
- Every AI answer is cached by page text, so an unchanged page is never asked twice.
- Calls are paced (`MZ_LLM_RPM`, default 4 on Gemini) and capped per day (`MZ_LLM_MAX_CALLS`, default 15 on Gemini). Set them to your real limits.
- On a rate-limit or quota error it waits and retries, then stops asking and postpones the rest. The report says "postponed", and the next night continues where it left off.
- `MZ_LLM_MODEL` sets the model. The default is the `gemini-flash-latest` alias; if Google retires or renames it, copy the exact model name from AI Studio.
- `MZ_LLM_PROVIDER=gemini|anthropic` forces one when both keys exist (otherwise Anthropic is used first).
Expect the first full backlog to take several nights. Nothing wrong is published while it catches up.

## Where can a Higher Certificate lead? (evidence ledger)
The pipeline copies short quotes about credits, progression and bridging from each Higher Certificate's text in the prospectus into `data/progression.json` with the page number. It never infers a rule.
- `pending_review`: one source (the pipeline or one community submitter).
- `corroborated`: two different sources quote the same statement. A reason to review it first, not proof, because submitters are anonymous.
- `verified`: two enrolled reviewers (`data/reviewers.json`) confirmed it by hand. Scripts never set this; `validate_data.py` refuses a `verified` entry without two enrolled reviewers.
`python scripts/merge_progression.py` copies the evidence onto the matching Higher Certificate row in `data/catalogue.json` (only when exactly one row matches closely; the rest are listed, never guessed) and the app shows the quote with "Confirmed by reviewers" or "Not yet checked by a person".

## People checking a prospectus themselves
`check_prospectus.html` (linked from "Notes and source" on a course) reads a prospectus on the person's own device. Nothing is uploaded. It makes a small `mz-community-v1` JSON file (rows, quotes, next-step statements, optional "this is wrong" notes) with a random submitter id and the file's SHA-256. The person sends it in and it is committed to `inbox/community/`.
1. `python scripts/community_submissions.py inbox/community/*.json` validates it (size cap, strict schema, no links, emails, phone or ID numbers, the quote must contain the APS it claims) and stages it in `data/community/`. Nothing a stranger sends is published.
2. `python scripts/compare_sources.py` writes `reports/source_comparison.md` and `data/source_agreement.json`: agree, conflict, community_only, pipeline_only, and a review queue for the reviewers. It never changes a status. A person who lists fewer subjects is not a conflict; a different mark is.
3. `python scripts/learn_from_feedback.py` improves the scripts from the results:
   - name aliases, only after 2+ different submitters showed matching numbers under both names
   - per-institution retry-strategy order, from what fixed rows before (`data/extraction_hints.json`)
   - agreement rates by reading method (text vs OCR) and feedback hot spots (`data/extraction_stats.json`)
   - course-name starts the reader misses (`data/missed_headings.json`), as suggestions only: a person decides whether to change the reader.
The workflow in `github_workflows_to_add/community-submissions.yml` runs steps 1 to 3, the merge and the safety check. Copy it to `.github/workflows/`.

## Keeping it current (what expires on purpose)
- Learned name aliases are forgotten after 540 days unless people confirm them again; learned retry orders are ignored after 400 days (prospectus layouts change).
- A person's reading of a different file (for example last year's edition) that disagrees is reported as `conflict_other_document`, not as a conflict, and never enters the review queue as one.
- The subject list lives in `scripts/pipeline_extract.py` (SUBJECTS). `python scripts/build_subjects_js.py` regenerates `js/subjects_data.js` for the browser tool; a test fails if they drift apart. It already includes Tourism, Agricultural Sciences, Consumer Studies, the arts, the technology subjects, several home languages and Afrikaans subject names. Add a subject there when the report shows rows held back for "could not read".
- Extended-curriculum and foundation programmes are treated like Higher Certificates for next-step evidence.
