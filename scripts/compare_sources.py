#!/usr/bin/env python3
"""Compare what the pipeline read from official prospectuses with what people read and sent in (data/community/).

    python scripts/compare_sources.py

Per programme: agree | conflict | community_only | pipeline_only, and which fields differ.
It NEVER changes a verification status. Writes data/source_agreement.json (read by learn_from_feedback.py) and
reports/source_comparison.md, with a review queue so the two human reviewers see the most useful rows first.
A submitter who lists fewer subjects than the pipeline is not a conflict; a different mark for the same subject, or a subject the pipeline lacks, is."""
import difflib, glob, os, re, sys, collections

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mz_common as C

STOP = {'in', 'of', 'and', 'the', 'for', 'with', 'a', 'to'}
EXPAND = [('bachelor of science', 'bsc'), ('bachelor of commerce', 'bcom'), ('bachelor of arts', 'ba'), ('bachelor of education', 'bed'),
          ('bachelor of engineering technology', 'bengtech'), ('bachelor of engineering', 'beng'), ('bachelor of technology', 'btech'),
          ('bachelor of laws', 'llb'), ('national diploma', 'diploma')]
FUZZ = 0.88


def name_key(n):
    s = re.sub(r'\([^)]*\)', ' ', str(n or '').lower())
    for a, b in EXPAND: s = s.replace(a, b)
    s = re.sub(r'[^a-z0-9 ]+', ' ', s)
    return ' '.join(w for w in s.split() if w not in STOP)


def subj_set(lst):
    return {(tuple(sorted(x.get('anyOf', []))), float(x.get('minMark', 0))) for x in (lst or [])}


def subject_diffs(pipe, comm):
    """Conflicts only: same subject with another mark, or a subject the pipeline row does not have. Missing subjects are fine."""
    pmap = {}
    for x in pipe or []:
        for n in x.get('anyOf', []): pmap.setdefault(n, set()).add(float(x.get('minMark', 0)))
    bad = []
    for x in comm or []:
        names = x.get('anyOf', [])
        marks = set().union(*[pmap[n] for n in names if n in pmap]) if any(n in pmap for n in names) else None
        if marks is None or float(x['minMark']) not in marks:
            bad.append(x)
    return bad


def load_aliases():
    fp = C.path('name_aliases.json')
    out = collections.defaultdict(set)
    if os.path.exists(fp):
        for a in C.load(fp).get('aliases', []):
            if a.get('count', 0) >= 2:
                out[a['a']].add(a['b']); out[a['b']].add(a['a'])
    return out


def pipeline_rows():
    rows = []
    for f in C.load(C.path('index.json'))['files']:
        fp = C.path(f)
        if os.path.exists(fp):
            rows += [r for r in C.load(fp).get('programmes', []) if isinstance(r, dict)]
    return rows


def match(key, cands, aliases):
    """cands: {key: row}. Exact, then learned alias, then close spelling."""
    if key in cands: return cands[key], 1.0
    for al in aliases.get(key, ()):
        if al in cands: return cands[al], 0.99
    best, score = None, 0.0
    for k, r in cands.items():
        sc = difflib.SequenceMatcher(None, key, k).ratio()
        if sc > score: best, score = r, sc
    return (best, score) if score >= FUZZ else (None, score)


def compare():
    aliases, prows = load_aliases(), pipeline_rows()
    by_doc = collections.defaultdict(dict)
    for r in prows: by_doc[(r['institutionId'], r['intakeYear'])][name_key(r['name'])] = r
    res = {'generatedAt': C.today().isoformat(), 'rows': [], 'aliasCandidates': {}, 'stats': {}}
    corro, conflict = collections.defaultdict(set), collections.defaultdict(set)
    touched = collections.defaultdict(set)
    stats = collections.defaultdict(collections.Counter)
    for fp in sorted(glob.glob(C.path('community', '*.json'))):
        doc = C.load(fp)
        key = (doc['institutionId'], doc['year']); cands = by_doc.get(key, {})
        for sub in doc.get('submissions', []):
            for r in sub['rows']:
                k = name_key(r['name']); pr, sc = match(k, cands, aliases)
                base = {'institutionId': key[0], 'year': key[1], 'name': r['name'], 'submitter': sub['submitter'][:8], 'docSha256': sub['docSha256'][:12], 'readVia': sub['readVia']}
                if not pr:
                    res['rows'].append(dict(base, outcome='community_only')); stats[key[0]]['community_only'] += 1
                    for k2, c in cands.items():          # same numbers under another name: a possible alias
                        if r['minAps'] is not None and c['minAps'] == r['minAps'] and r['subjects'] and subj_set(c['subjectRequirements']) >= subj_set(r['subjects']):
                            res['aliasCandidates'].setdefault('|'.join(sorted([k, k2])), set()).add(sub['submitter'])
                    continue
                diffs = []
                if r['minAps'] is not None and float(pr['minAps']) != float(r['minAps']): diffs.append({'field': 'minAps', 'pipeline': pr['minAps'], 'community': r['minAps']})
                sd = subject_diffs(pr['subjectRequirements'], r['subjects'])
                if sd: diffs.append({'field': 'subjects', 'pipeline': sorted(map(str, subj_set(pr['subjectRequirements']))), 'community': sorted(map(str, subj_set(sd)))})
                touched[key].add(pr['id'])
                same_doc = not pr.get('docSha256') or pr['docSha256'] == sub['docSha256']
                # A different file (maybe last year's edition) that disagrees is information, not a conflict with the current document.
                out = ('conflict' if same_doc else 'conflict_other_document') if diffs else 'agree'
                if out != 'conflict_other_document': (conflict if diffs else corro)[pr['id']].add(sub['submitter'])
                via = pr.get('readVia', 'text' if 'autoChecks' in pr else 'person')
                res['rows'].append(dict(base, outcome=out, pipelineId=pr['id'], fields=diffs, sameDocument=same_doc, matchScore=round(sc, 2), pipelineStatus=pr.get('verificationStatus'), pipelineReadVia=via))
                stats[key[0]][out] += 1; stats['_via:' + via][out] += 1
    for key, ids in touched.items():
        for k, r in by_doc[key].items():
            if r['id'] not in ids:
                res['rows'].append({'institutionId': key[0], 'year': key[1], 'name': r['name'], 'outcome': 'pipeline_only', 'pipelineId': r['id']})
                stats[key[0]]['pipeline_only'] += 1
    res['aliasCandidates'] = {k: sorted(v) for k, v in res['aliasCandidates'].items()}
    res['stats'] = {k: dict(v) for k, v in stats.items()}
    queue = []
    for r in prows:
        n_ok, n_bad = len(corro[r['id']]), len(conflict[r['id']])
        if n_bad: queue.append({'id': r['id'], 'name': r['name'], 'why': 'needs_human_look', 'agree': n_ok, 'conflict': n_bad})
        elif n_ok >= 2 and r.get('verificationStatus') != 'verified': queue.append({'id': r['id'], 'name': r['name'], 'why': 'ready_for_reviewers', 'agree': n_ok, 'conflict': 0})
    queue.sort(key=lambda q: (q['why'] != 'needs_human_look', -q['agree'], q['id']))
    res['reviewQueue'], res['rows'] = queue[:300], res['rows'][:5000]
    return res


def write(res):
    C.save(C.path('source_agreement.json'), res)
    c = collections.Counter(r['outcome'] for r in res['rows'])
    lines = ['# Source comparison %s\n\nPipeline rows vs rows people sent in. This report never changes a verification status.\n\n' % res['generatedAt'],
             'agree %d | conflict %d | conflict_other_document %d | community_only %d | pipeline_only %d\n\n' % (c['agree'], c['conflict'], c['conflict_other_document'], c['community_only'], c['pipeline_only'])]
    via = {k[5:]: v for k, v in res['stats'].items() if k.startswith('_via:')}
    if via: lines.append('## Agreement by how the pipeline read the page\n' + '\n'.join('- %s: %s' % (k, v) for k, v in sorted(via.items())) + '\n\n')
    if res['reviewQueue']:
        lines.append('## Review queue (look at these first)\n' + '\n'.join('- **%s** %s (%s) agree %d, conflict %d' % (q['why'], q['name'], q['id'], q['agree'], q['conflict']) for q in res['reviewQueue'][:60]) + '\n\n')
    conf = [r for r in res['rows'] if r['outcome'] == 'conflict']
    if conf:
        lines.append('## Conflicts\n' + '\n'.join('- %s %s: %s' % (r['institutionId'], r['name'], '; '.join('%s pipeline=%s community=%s' % (d['field'], d['pipeline'], d['community']) for d in r['fields'])) for r in conf[:80]) + '\n')
    os.makedirs(os.path.join(C.ROOT, 'reports'), exist_ok=True)
    C.write_atomic(os.path.join(C.ROOT, 'reports', 'source_comparison.md'), ''.join(lines))


def main(argv=None):
    res = compare(); write(res)
    c = collections.Counter(r['outcome'] for r in res['rows'])
    C.log('compared: agree %d | conflict %d | community_only %d | pipeline_only %d | review queue %d' % (c['agree'], c['conflict'], c['community_only'], c['pipeline_only'], len(res['reviewQueue'])))
    return 0


if __name__ == '__main__':
    sys.exit(main())
