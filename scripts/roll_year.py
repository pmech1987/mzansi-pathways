#!/usr/bin/env python3
"""Roll the data over to the next intake year by itself, so nobody has to remember to.

    python scripts/roll_year.py            # update
    python scripts/roll_year.py --check    # exit 1 if a rollover is due (no writes)

Same calendar the app uses: from August the app defaults to NEXT year's intake. Prospectuses for the year after that appear around June.
  * "current" intake year  = this year before August, next year from August
  * the year after it is added to data/sources.json from 1 June of the current year (when its prospectuses start to appear)
  * every wanted year gets an empty data/programmes/<year>.json (if missing) and an entry in data/index.json, so the app and offline cache see it
  * a source line for a year that is over (before the current intake year) is marked "active": false, so the weekly run stops spending time on it
It only ever ADDS or deactivates source lines. It never deletes a row, a file, or a source, and never touches programme facts.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mz_common as C


def wanted_years(t):
    cur = t.year + 1 if t.month >= 8 else t.year
    years = [cur]
    if t >= C.date(cur, 6, 1):
        years.append(cur + 1)
    return cur, years


def plan(t):
    cur, years = wanted_years(t)
    src_p = C.path('sources.json')
    src = C.load(src_p)
    rows = src['sources']
    ids = []
    for r in rows:
        if r['institutionId'] not in ids:
            ids.append(r['institutionId'])
    have = {(r['institutionId'], r['intakeYear']) for r in rows}
    add = [{'institutionId': i, 'intakeYear': y, 'url': None} for y in years for i in ids if (i, y) not in have]
    off = [r for r in rows if r['intakeYear'] < cur and r.get('active') is not False]
    on = [r for r in rows if r['intakeYear'] >= cur and r.get('active') is False]
    idx = C.load(C.path('index.json'))
    files = ['programmes/%d.json' % y for y in years]
    new_files = [f for f in files if not os.path.exists(C.path(f))]
    new_index = [f for f in files if f not in idx['files']]
    return {'cur': cur, 'years': years, 'src': src, 'add': add, 'off': off, 'on': on, 'idx': idx, 'new_files': new_files, 'new_index': new_index}


def main(argv):
    t = C.today()
    pl = plan(t)
    due = bool(pl['add'] or pl['off'] or pl['on'] or pl['new_files'] or pl['new_index'])
    C.log('current intake year %d, tracking %s' % (pl['cur'], ', '.join(map(str, pl['years']))))
    if '--check' in argv:
        if due:
            C.log('ROLLOVER DUE: run python scripts/roll_year.py')
        return 1 if due else 0
    if not due:
        C.log('nothing to roll over')
        return 0
    for r in pl['off']:
        r['active'] = False
    for r in pl['on']:
        r.pop('active', None)
    pl['src']['sources'] = pl['src']['sources'] + pl['add']  # existing order kept, so a rollover never reshuffles the file
    C.save(C.path('sources.json'), pl['src'])
    for f in pl['new_files']:
        y = int(os.path.basename(f).split('.')[0])
        C.save(C.path(f), {'schemaVersion': 3, 'intakeYear': y, 'notice': 'Empty on purpose. Rows are added by scripts/run_pipeline.py or scripts/csv_to_programmes_json.py after checking each against the official prospectus.', 'programmes': []})
    if pl['new_index']:
        pl['idx']['files'] = sorted(set(pl['idx']['files']) | set(pl['new_index']))
        C.save(C.path('index.json'), pl['idx'])
    C.log('added %d source line(s), deactivated %d, created %d file(s), indexed %d' % (len(pl['add']), len(pl['off']), len(pl['new_files']), len(pl['new_index'])))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
