#!/usr/bin/env python3
"""Let the scripts improve from what happens: comparison results, people's feedback, and which retry strategy worked.

    python scripts/learn_from_feedback.py

Changes it makes ON ITS OWN (small, reversible):
  data/name_aliases.json      two names count as the same course once 2+ different submitters showed matching numbers under both
  data/extraction_hints.json  per institution, retry strategies are tried in the order that fixed the most rows before
  data/extraction_stats.json  agreement by reading method (text / ocr) and institution; feedback hot spots
Only SUGGESTS (a person must act, so a stranger can never alter the reader):
  data/missed_headings.json   course-name starts the reader's heading rule does not recognise
It never changes a verification status."""
import collections, glob, os, sys
from datetime import timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mz_common as C
import pipeline_extract as X
import run_pipeline as R


ALIAS_MAX_AGE_DAYS = 540


def _load(name, default):
    fp = C.path(name)
    return C.load(fp) if os.path.exists(fp) else default


def learn():
    agree = _load('source_agreement.json', {'rows': [], 'aliasCandidates': {}, 'stats': {}})
    out = {}
    al = _load('name_aliases.json', {'schemaVersion': 1, 'aliases': []})
    have = {(a['a'], a['b']): a for a in al['aliases']}
    for k, subs in agree.get('aliasCandidates', {}).items():
        a, b = k.split('|')
        if len(subs) >= 2: have[(a, b)] = {'a': a, 'b': b, 'count': len(subs), 'lastSeen': C.today().isoformat()}
    cut = (C.today() - timedelta(days=ALIAS_MAX_AGE_DAYS)).isoformat()
    for v in have.values(): v.setdefault('lastSeen', C.today().isoformat())
    al['aliases'] = sorted((v for v in have.values() if v['lastSeen'] >= cut), key=lambda x: (x['a'], x['b']))   # an alias nobody has confirmed lately is forgotten
    C.save(C.path('name_aliases.json'), al); out['aliases'] = len(al['aliases'])

    hints = _load('extraction_hints.json', {'schemaVersion': 1, 'institutions': {}})
    tally = collections.defaultdict(collections.Counter)
    for key, d in _load('pipeline_state.json', {'docs': {}}).get('docs', {}).items():
        for idx, n in (d.get('fixedBy') or {}).items(): tally[key.rsplit('_', 1)[0]][int(idx)] += n
    for iid, c in tally.items():
        if sum(c.values()) >= 3:
            hints['institutions'][iid] = {'strategyOrder': sorted(range(len(R.STRATEGIES)), key=lambda i: (-c[i], i)), 'basedOnFixes': sum(c.values()), 'updatedAt': C.today().isoformat()}
    C.save(C.path('extraction_hints.json'), hints); out['hinted'] = len(hints['institutions'])

    stats = {'generatedAt': C.today().isoformat(), 'byReadMethod': {}, 'byInstitution': {}, 'hotspots': []}
    for k, v in agree.get('stats', {}).items():
        tot = v.get('agree', 0) + v.get('conflict', 0)
        entry = dict(v, agreeRate=round(v.get('agree', 0) / tot, 3) if tot else None)
        (stats['byReadMethod'] if k.startswith('_via:') else stats['byInstitution'])[k[5:] if k.startswith('_via:') else k] = entry
    fb = collections.defaultdict(lambda: collections.defaultdict(set))
    for fp in glob.glob(C.path('community', '*.json')):
        for sub in C.load(fp).get('submissions', []):
            for f in sub.get('feedback', []): fb[f['programmeId']][f['issue']].add(sub['submitter'])
    for pid, issues in fb.items():
        who = set().union(*issues.values())
        if len(who) >= 2: stats['hotspots'].append({'programmeId': pid, 'people': len(who), 'issues': {k: len(v) for k, v in issues.items()}})
    stats['hotspots'].sort(key=lambda h: (-h['people'], h['programmeId']))
    C.save(C.path('extraction_stats.json'), stats); out['hotspots'] = len(stats['hotspots'])

    miss = collections.Counter()
    for r in agree.get('rows', []):
        if r['outcome'] == 'community_only' and not X.HEAD_RE.match(r['name']): miss[' '.join(r['name'].split()[:2])] += 1
    C.save(C.path('missed_headings.json'), {'note': 'Suggestions only. A person decides whether to add a prefix to HEAD_RE in scripts/pipeline_extract.py.', 'candidates': [{'startsWith': k, 'seen': n} for k, n in miss.most_common(40)]})
    out['missedHeadings'] = len(miss)
    return out


def main(argv=None):
    C.log('learned: %(aliases)d alias(es) | %(hinted)d institution(s) with a tuned strategy order | %(hotspots)d feedback hot spot(s) | %(missedHeadings)d heading suggestion(s)' % learn())
    return 0


if __name__ == '__main__':
    sys.exit(main())
