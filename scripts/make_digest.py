#!/usr/bin/env python3
"""Write reports/attention.md: the short list of things a person needs to look at. Empty of "## " sections = all clear.

    python scripts/make_digest.py           # write reports/attention.md and print it
    python scripts/make_digest.py --check   # exit 1 if something needs attention (no write)

Reads what the other automation already produced (automation_status.json, link_health.json, pipeline_report.md, the programme files).
The workflow .github/workflows/data-digest.yml turns this file into ONE GitHub issue that is updated each week and closed when it is all clear.
It changes no data.
"""
import os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mz_common as C
import roll_year

ISO_DATE = re.compile(r'^\d{4}-\d{2}-\d{2}$')
REPORT = os.path.join(C.ROOT, 'reports', 'pipeline_report.md')
OUT = os.path.join(C.ROOT, 'reports', 'attention.md')


def load_opt(name):
    p = C.path(name)
    return C.load(p) if os.path.exists(p) else {}


def sections(t):
    sec = []
    status = load_opt('automation_status.json')
    prog = status.get('programmes', {})
    idx = load_opt('index.json')
    cur = roll_year.wanted_years(t)[0]

    # 0. the bots themselves: switched off, or silently not running
    if C.paused():
        sec.append(('Automation is PAUSED (data/automation_pause.json)', ['No bot is publishing changes. Set `paused` back to `false` to resume.']))
    audited = status.get('auditedDateSAST')
    if audited and ISO_DATE.match(str(audited)):
        age = (t - C.date.fromisoformat(audited)).days
        if age > 3:
            sec.append(('The nightly data refresh has not published for %d days' % age,
                        ['Last audit: %s. Check Actions > \"Data refresh\" (a red run, a disabled schedule, or GitHub pausing schedules on an inactive repository).' % audited]))

    # 0b. SRI integrity manifest check (v99)
    sri = load_opt('sri_manifest.json')
    if not sri or len(sri.get('assets', {})) < 10:
        sec.append(('Integrity manifest (data/sri_manifest.json) is missing or incomplete',
                    ['Run `python3 scripts/autonomous_ops.py` to regenerate SHA-384 asset hashes.']))

    # 1. programme data coverage for the intake year learners see now
    insts = [i for i in load_opt('institutions.json').get('institutions', []) if i.get('type') in ('University', 'UoT')]
    have = set()
    n_rows = 0
    for f in idx.get('files', []):
        for r in load_opt(f).get('programmes', []):
            if r.get('intakeYear') == cur:
                have.add(r.get('institutionId')); n_rows += 1
    if n_rows == 0:
        sec.append(('Programme data: the prospectus pipeline has not produced any %d rows yet' % cur,
                    ['Open the repository on GitHub, then Actions > "Prospectus pipeline" > Run workflow (type `up` in "only" first, read `reports/pipeline_report.md`).',
                     'Run it again on another day: a row needs two separate runs to become auto-verified.',
                     'Until then the app shows the indicative catalogue and says so.']))
    else:
        missing = [i['id'] for i in insts if i['id'] not in have]
        if missing:
            sec.append(('Programme data: no %d rows yet for %d institution(s)' % (cur, len(missing)),
                        ['`%s`' % ', '.join(missing),
                         'See "Not processed" in `reports/pipeline_report.md`. If the prospectus was not found, paste its direct https link into `data/sources.json` (field `url`). Scanned PDFs cannot be read; use Creator Studio / `inbox/` for those.']))
    if prog.get('olderThan120Days'):
        sec.append(('Programme rows older than 120 days (the app no longer shows them as verified)', ['`%s`' % x for x in prog['olderThan120Days'][:25]]))
    if prog.get('closingDatePassed'):
        sec.append(('Programme rows whose closing date has passed', ['`%s`' % x for x in prog['closingDatePassed'][:25]]))
    if prog.get('unknownInstitution'):
        sec.append(('Programme rows with an unknown institution', ['`%s`' % x for x in prog['unknownInstitution'][:25]]))

    # 2. key dates that have not been re-checked
    if status.get('eventsNeedingRecheck'):
        sec.append(('Key dates not re-checked for over 30 days', ['`%s`: confirm on the official site, then update `checkedAt` (inbox/events_*.csv)' % x for x in status['eventsNeedingRecheck']]))

    # 3. links
    lh = load_opt('link_health.json').get('links', {})
    bad = [(u, v) for u, v in lh.items() if v.get('status') == 'failing']
    moved = [(u, v) for u, v in lh.items() if v.get('status') == 'moved']
    if bad:
        sec.append(('Official links that have failed 2 weeks in a row', ['%s (used by %s)' % (u, ', '.join(v.get('usedBy', []))) for u, v in bad[:30]]))
    if moved:
        sec.append(('Official links that now end on a different website (check for a domain change)', ['%s -> %s (used by %s)' % (u, v.get('finalUrl'), ', '.join(v.get('usedBy', []))) for u, v in moved[:30]]))

    # 4. pipeline problems
    if os.path.exists(REPORT):
        txt = C.read_text(REPORT)
        m = re.search(r'## Not processed\n(.*?)(?:\n## |\Z)', txt, re.S)
        if m:
            lines = [l[2:] for l in m.group(1).strip().split('\n') if l.startswith('- ')]
            if lines:
                sec.append(('Prospectus pipeline: %d document(s) not processed in the last run' % len(lines), lines[:15] + (['... and %d more (see reports/pipeline_report.md)' % (len(lines) - 15)] if len(lines) > 15 else [])))
        m = re.search(r'## Kept previous rows[^\n]*\n(.*?)(?:\n## |\Z)', txt, re.S)
        if m:
            lines = [l[2:] for l in m.group(1).strip().split('\n') if l.startswith('- ')]
            if lines:
                sec.append(('Prospectus pipeline: extraction found far fewer rows than before (old rows kept)', lines[:15]))
    return sec


def render(t, sec):
    out = ['# Mzansi Pathways: data needs attention', '', 'Updated %s (South African date). This issue is rewritten every week and closes itself when everything is clear.' % t.isoformat(), '']
    if not sec:
        out.append('All clear: nothing needs a person right now.')
    for title, lines in sec:
        out += ['## ' + title, ''] + ['- ' + l for l in lines] + ['']
    return '\n'.join(out).rstrip() + '\n'


def main(argv):
    t = C.today()
    sec = sections(t)
    if '--check' in argv:
        return 1 if sec else 0
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    text = render(t, sec)
    C.write_atomic(OUT, text)
    C.log(text)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
