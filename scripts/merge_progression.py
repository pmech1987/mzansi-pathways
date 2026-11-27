#!/usr/bin/env python3
"""Copy progression evidence from data/progression.json onto the matching Higher Certificate rows in data/catalogue.json,
then rebuild js/catalogue_data.js (python scripts/build_catalogue.py).

    python scripts/merge_progression.py

Matching is by institution plus close qualification name (>= 0.85). A quote that cannot be matched to exactly one catalogue row is left out and
listed, never guessed. Rows that lose their evidence lose the field, so removed statements cannot linger in the app."""
import difflib, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mz_common as C
import compare_sources as CS
import progression_ledger as PL
import progression_extract as PX

MIN_MATCH = 0.85
ORDER = {'verified': 0, 'corroborated': 1, 'pending_review': 2}


def merge():
    cat = C.load(C.path('catalogue.json'))
    led = PL.finalize(PL.load())
    by_inst = {i['id']: i for i in cat['institutions']}
    for i in cat['institutions']:
        for p in i['programmes']: p.pop('progression', None)
    placed, unmatched = 0, []
    for e in led['entries']:
        inst = by_inst.get(e['institutionId'])
        if not inst: unmatched.append((e, 'unknown institution')); continue
        k = CS.name_key(e['name'])
        scored = sorted(((difflib.SequenceMatcher(None, k, CS.name_key(p['name'])).ratio(), p) for p in inst['programmes'] if PX.is_entry_level(p['name'])), key=lambda x: -x[0])
        if not scored or scored[0][0] < MIN_MATCH or (len(scored) > 1 and scored[1][0] >= scored[0][0] - 0.02):
            unmatched.append((e, 'no single close catalogue match')); continue
        scored[0][1].setdefault('progression', []).append({'kind': e['kind'], 'text': e['text'], 'to': e['to'], 'page': e['page'], 'doc': e['sourceDoc'], 'status': e['status'], 'sources': len(e['sources'])})
        placed += 1
    for i in cat['institutions']:
        for p in i['programmes']:
            if p.get('progression'): p['progression'] = sorted(p['progression'], key=lambda x: (ORDER.get(x['status'], 9), x['kind']))[:3]
    return cat, placed, unmatched


def main(argv=None):
    cat, placed, unmatched = merge()
    C.save(C.path('catalogue.json'), cat)
    C.log('progression quotes placed on catalogue rows: %d | not matched: %d' % (placed, len(unmatched)))
    for e, why in unmatched[:20]: C.log('  not matched (%s): %s / %s' % (why, e['institutionId'], e['name']))
    return 0


if __name__ == '__main__':
    sys.exit(main())
