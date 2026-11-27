#!/usr/bin/env python3
"""Daily housekeeping for the data files. Safe to run any time; changes nothing unless something really changed.

    python scripts/refresh_data.py            # update
    python scripts/refresh_data.py --check    # exit 1 if a file is stale (no writes)

  1. events.json       -> data/automation_status.json: each event OPEN / CLOSING_SOON (7 days) / CLOSING_TODAY / CLOSED, days left,
                          and any event whose source was last checked more than 30 days ago.
  2. open_jobs_live    -> drops jobs whose closing date has passed, recomputes days remaining and the counts.
  3. programmes/*.json -> report only: totals by verification status, rows older than 120 days (the app already refuses to
                          show them as verified), rows past their closing date, rows with an unknown institution.
It never edits a programme row and never promotes anything to 'verified'. Facts are only ever changed by a person.
"""
import os, re, sys, urllib.parse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mz_common as C

SOON_DAYS, STALE_EVENT_DAYS, STALE_PROGRAMME_DAYS = 7, 30, 120
STALE_KEY = 'olderThan%dDays' % STALE_PROGRAMME_DAYS


def days_between(iso, t):
    return (C.date.fromisoformat(iso) - t).days


def event_status(d):
    return 'CLOSED' if d < 0 else 'CLOSING_TODAY' if d == 0 else 'CLOSING_SOON' if d <= SOON_DAYS else 'OPEN'



SHORTENER_HOSTS = {'bit.ly', 'tinyurl.com', 't.co', 'rb.gy', 'cutt.ly', 'shorturl.at', 'goo.gl', 'ow.ly', 'is.gd', 'wa.me', 'chat.whatsapp.com', 't.me'}
SA_ID_RE = re.compile(r'\b\d{13}\b')
EMAIL_RE = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b')
PHONE_RE = re.compile(r'(?:\+27|0)[6-8]\d[\s-]?\d{3}[\s-]?\d{4}\b')


def sanitize_job_row(j):
    if not isinstance(j, dict):
        return None
    url = str(j.get('officialUrl') or '').strip()
    if url:
        host = (urllib.parse.urlparse(url).hostname or '').lower()
        if host.startswith('www.'):
            host = host[4:]
        if host in SHORTENER_HOSTS:
            return None
    out = dict(j)
    for field in ('title', 'town', 'employer'):
        if isinstance(out.get(field), str):
            s = SA_ID_RE.sub('[redacted-id]', out[field])
            s = EMAIL_RE.sub('[redacted-email]', s)
            s = PHONE_RE.sub('[redacted-phone]', s)
            out[field] = re.sub(r'\s+', ' ', s).strip()
    return out


def refresh_jobs(t):
    doc = C.load(C.path('open_jobs_live.json'))
    jobs, dropped = [], 0
    for raw_j in doc.get('jobs', []):
        j = sanitize_job_row(raw_j)
        if j is None:
            dropped += 1
            continue
        cd = str(j.get('closingDate') or '')
        if C.ISO.match(cd):
            n = days_between(cd, t)
            if n < 0:
                dropped += 1
                continue
            j = dict(j, daysRemaining=n, freshnessStatus='closing_soon' if n <= SOON_DAYS else 'open')
        jobs.append(j)
    by = {}
    for j in jobs:
        by[j.get('sourceType', 'other')] = by.get(j.get('sourceType', 'other'), 0) + 1
    return dict(doc, generatedAt=t.isoformat(), jobs=jobs, openCount=len(jobs), bySourceType=by), dropped


def programme_report(t):
    idx = C.load(C.path('index.json'))
    insts = {i['id'] for i in C.load(C.path('institutions.json'))['institutions']}
    rep = {'total': 0, 'byStatus': {}, 'byYear': {}, STALE_KEY: [], 'closingDatePassed': [], 'unknownInstitution': []}
    for f in idx.get('files', []):
        for p in C.load(C.path(f)).get('programmes', []):
            rep['total'] += 1
            st = p.get('verificationStatus', 'unknown')
            rep['byStatus'][st] = rep['byStatus'].get(st, 0) + 1
            y = str(p.get('intakeYear'))
            rep['byYear'][y] = rep['byYear'].get(y, 0) + 1
            pid = '%s@%s' % (p.get('id'), p.get('intakeYear'))
            try:
                if (t - C.date.fromisoformat(p.get('lastVerifiedAt'))).days > STALE_PROGRAMME_DAYS:
                    rep[STALE_KEY].append(pid)
            except Exception:
                rep[STALE_KEY].append(pid)
            if C.ISO.match(str(p.get('closes') or '')) and days_between(p['closes'], t) < 0:
                rep['closingDatePassed'].append(pid)
            if p.get('institutionId') not in insts:
                rep['unknownInstitution'].append(pid)
    return rep


def main(argv):
    t = C.today()
    rows, stale_ev = [], []
    for e in C.load(C.path('events.json'))['events']:
        d = days_between(e['date'], t)
        rows.append({'id': e['id'], 'date': e['date'], 'status': event_status(d), 'daysLeft': d})
        try:
            if (t - C.date.fromisoformat(e.get('checkedAt'))).days > STALE_EVENT_DAYS:
                stale_ev.append(e['id'])
        except Exception:
            stale_ev.append(e['id'])
    status = {'schemaVersion': 1, 'auditedDateSAST': t.isoformat(), 'eventsChecked': len(rows),
              'openCount': sum(r['status'] != 'CLOSED' for r in rows), 'closedCount': sum(r['status'] == 'CLOSED' for r in rows),
              'events': rows, 'eventsNeedingRecheck': stale_ev, 'programmes': programme_report(t)}
    jobs, dropped = refresh_jobs(t)
    if '--check' in argv:
        bad = [n for n, cur, new in (('automation_status.json', C.load(C.path('automation_status.json')), status),
                                     ('open_jobs_live.json', C.load(C.path('open_jobs_live.json')), jobs)) if cur != new]
        for n in bad:
            C.log('STALE', n, 'is out of date: run python scripts/refresh_data.py')
        return 1 if bad else 0
    ch = [C.write_if_changed(C.path('automation_status.json'), status), C.write_if_changed(C.path('open_jobs_live.json'), jobs)]
    pr = status['programmes']
    C.log('events: %d open, %d closed, %d need a source recheck' % (status['openCount'], status['closedCount'], len(stale_ev)))
    C.log('jobs: %d open, %d expired removed' % (jobs['openCount'], dropped))
    C.log('programmes: %d rows %s, %d older than %d days, %d past closing date' % (pr['total'], pr['byStatus'], len(pr[STALE_KEY]), STALE_PROGRAMME_DAYS, len(pr['closingDatePassed'])))
    if pr['unknownInstitution']:
        C.log('PROBLEM programmes with unknown institution:', pr['unknownInstitution'])
        return 1
    C.log('files changed' if any(ch) else 'nothing to change')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
