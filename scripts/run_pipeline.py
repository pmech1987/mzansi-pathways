#!/usr/bin/env python3
"""Prospectus pipeline: find the official prospectus, read it, verify every row many times, publish only what holds up.

    python scripts/run_pipeline.py                      # all sources in data/sources.json
    python scripts/run_pipeline.py --only up --year 2027
    python scripts/run_pipeline.py --pdf up=/path/to/prospectus.pdf --year 2027   # use a local file (no download)
    python scripts/run_pipeline.py --dry-run

Per document: read pages with two PDF engines; extract rows with rules (and with an AI reader when ANTHROPIC_API_KEY is set);
run 14 independent checks; re-extract failing rows with different strategies for up to --max-rounds rounds; then
  auto_verified  = every check passed, including agreement of two readers and the same values seen in repeat runs
  pending_review = passed the hard checks but a soft check is open (it shows as "not yet verified" in the app)
  rejected       = failed a hard check (wrong page, numbers not in the document, conflicting values): never published
Rows a person entered and verified are never overwritten. Everything is written to reports/pipeline_report.md.
"""
import argparse, hashlib, json, os, sys, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mz_common as C
import csv_to_programmes_json as imp
import pipeline_extract as X
import pipeline_verify as V
import pipeline_sources as S
import pipeline_ocr as O
import progression_extract as PX
import progression_ledger as PL

STRATEGIES = [(40, 1), (15, 1), (60, 2), (10, 2), (30, 1), (20, 2), (50, 1), (8, 2), (35, 1), (25, 2)]  # (lines after heading, text engine)
RETRYABLE = {'evidence_on_page', 'numbers_in_evidence', 'no_conflict_in_document', 'second_engine_agrees', 'second_extractor_agrees', 'nqf_consistent', 'aps_scale', 'mark_range'}


def strategies_for(iid):
    """Retry strategies reordered by what worked for this institution before (data/extraction_hints.json, written by learn_from_feedback.py)."""
    try:
        h = C.load(C.path('extraction_hints.json'))['institutions'][iid]; order = h['strategyOrder']
        if (C.today() - C.date.fromisoformat(h['updatedAt'])).days > 400: return STRATEGIES      # layouts change: stale hints are ignored
        if sorted(order) == list(range(len(STRATEGIES))): return [STRATEGIES[i] for i in order]
    except Exception:
        pass
    return STRATEGIES


def heading_block(page_text, name, window=40):
    lines = [l.rstrip() for l in page_text.split('\n')]
    for i, l in enumerate(lines):
        if X.norm(X.clean_name(l)) == X.norm(name):
            end = next((j for j in range(i + 1, min(len(lines), i + 1 + window)) if X.HEAD_RE.match(lines[j].strip()) and not X.APS_RE.search(lines[j])), min(len(lines), i + 1 + window))
            return lines[i + 1:end]
    return []


def slug(s):
    import re
    return re.sub(r'[^a-z0-9]+', '_', s.lower().replace('&', ' and ')).strip('_')[:48]


def sig(c):
    return hashlib.sha256(json.dumps([X.norm(c['name']), c['minAps'], sorted((tuple(s['anyOf']), s['minMark']) for s in c['subjects'])], sort_keys=True).encode()).hexdigest()[:16]


def dedupe(cands):
    groups = collections.OrderedDict()
    for c in cands:
        groups.setdefault(X.norm(c['name']), []).append(c)
    out = []
    for g in groups.values():
        first = g[0]
        first['apsAll'] = sorted({a for c in g for a in c['apsAll']})
        if any(sig(c) != sig(first) for c in g[1:]):
            first['conflict'] = True
        out.append(first)
    return out


def process_document(ctx, pages1, pages2, max_rounds=10, llm_call=None):
    """Core loop. Returns (rows, report) where rows are dicts with status and autoChecks."""
    cands = dedupe(X.rules_extract(pages1, window=25))
    for c in cands:
        c['baseKey'] = slug(ctx['institutionId'] + '_' + c['name']); c['id'] = c['baseKey'] + '_' + str(ctx['year'])
    lc = X.llm_extract(pages1, {c['page'] for c in cands}, call=llm_call)
    ctx['llm_on'] = lc is not None
    ctx['llm_postponed'] = set(X.LAST['postponed']) if lc is not None else set()
    if lc is not None:
        C.log('  AI reader (%s): %d page(s) read, %d from cache, %d postponed to a later run' % (X.LAST['provider'] or 'injected', X.LAST['calls'], X.LAST['cached'], len(X.LAST['postponed'])))
    ctx['pages1'], ctx['pages2'] = pages1, pages2
    ctx['doc_head'] = ' '.join(pages1[:15]) + ' ' + ' '.join(pages1[-3:])

    def evaluate(c):
        ctx['llm_match'] = next((l for l in (lc or []) if X.norm(l['name']) == X.norm(c['name']) and abs(l['page'] - c['page']) <= 1), None)
        c['checks'] = V.run_checks(c, ctx)
        c['verdict'], c['hardFail'], c['softFail'] = V.verdict(c['checks'])
        if c['page'] in ctx.get('ocr_pages', ()) and c['verdict'] == 'auto_verified':   # OCR can swap look-alike characters: never auto-verify from it
            c['verdict'] = 'pending_review'; c['softFail'] = list(c['softFail']) + ['ocr_source']

    for c in cands: evaluate(c)
    rounds_used, strategies, fixed = 1, ctx.get('strategies') or STRATEGIES, {}
    for rnd in range(1, max_rounds + 1):
        todo = [c for c in cands if any(f in RETRYABLE for f in c['hardFail'] + c['softFail']) and c['verdict'] != 'auto_verified']
        if not todo: break
        sidx = (rnd - 1) % len(strategies); window, engine = strategies[sidx]
        src = pages1 if engine == 1 or pages2 is None else pages2
        changed = 0
        for c in todo:
            again = [x for x in X.rules_extract([src[c['page'] - 1]], window=window) if X.norm(x['name']) == X.norm(c['name'])]
            if not again: continue
            n = again[0]; n['page'] = c['page']
            new = {k: n[k] for k in ('minAps', 'apsAll', 'subjects', 'docNqf', 'closes', 'evidence', 'unparsed')}
            if any(c.get(k) != v for k, v in new.items()):
                before = len(c['hardFail']) + len(c['softFail'])
                c.update(new); changed += 1; evaluate(c)
                if len(c['hardFail']) + len(c['softFail']) < before:
                    k = str(STRATEGIES.index(strategies[sidx])); fixed[k] = fixed.get(k, 0) + 1
        rounds_used = rnd + 1
        if not changed: break  # no strategy changed anything: stop, do not loop forever
    for c in cands:
        c['rounds'] = rounds_used
        if PX.is_entry_level(c['name']) and 0 < c['page'] <= len(pages1):
            c['progression'] = PX.extract(heading_block(pages1[c['page'] - 1], c['name']), c['page'])
    return cands, {'candidates': len(cands), 'rounds': rounds_used, 'fixed': fixed}


def build_record(c, ctx, inst):
    route = 'Diploma / UoT (Extended)' if inst.get('type') == 'UoT' and X.norm(c['name']).startswith(('diploma', 'higher certificate', 'advanced diploma')) else 'University'
    raw = {'id': c['id'], 'institutionId': ctx['institutionId'], 'intakeYear': ctx['year'], 'name': c['name'], 'route': route,
           'nqf': str(c.get('docNqf') or V.expected_nqf(c['name'])), 'minAps': c['minAps'], 'requiresSelection': False, 'subjectRequirements': c['subjects'],
           'closes': c.get('closes') or ctx.get('closes') or '', 'funding': [], 'officialUrl': ctx['url'] + '#page=%d' % c['page'],
           'sourceDoc': '%s Prospectus %s' % (inst.get('short') or inst['name'], ctx['year']), 'sourcePage': 'p. %d' % c['page'],
           'lastVerifiedAt': C.today().isoformat(), 'verificationStatus': c['verdict']}
    rec, _ = imp.clean(raw, {inst['id']}, ctx['year'], allow_auto=True, require_closes=False)
    rec['autoChecks'] = c['checks']
    rec['evidenceSha'] = hashlib.sha256(X.alnum(' '.join(c['evidence'])).encode()).hexdigest()[:16]
    rec['docSha256'] = ctx.get('sha256', '')
    rec['readVia'] = 'ocr' if c['page'] in ctx.get('ocr_pages', ()) else 'text'
    return rec


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--only'); ap.add_argument('--year', type=int); ap.add_argument('--max-rounds', type=int, default=int(os.environ.get('MZ_MAX_ROUNDS', 10)))
    ap.add_argument('--pdf', action='append', default=[], help='id=path to use a local PDF instead of downloading')
    ap.add_argument('--no-download', action='store_true'); ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args(argv)
    local = dict(x.split('=', 1) for x in a.pdf)
    min_runs = int(os.environ.get('MZ_MIN_RUNS', 2))
    insts = {i['id']: i for i in C.load(C.path('institutions.json'))['institutions']}
    cat = {i['id']: [p for p in i['programmes']] for i in C.load(C.path('catalogue.json'))['institutions']}
    srcs = C.load(C.path('sources.json'))['sources']
    st_p = C.path('pipeline_state.json')
    state = C.load(st_p) if os.path.exists(st_p) else {'schemaVersion': 1, 'docs': {}, 'rows': {}}
    report, lines, touched = {'documents': 0, 'verified': 0, 'pending': 0, 'rejected': 0, 'skipped': []}, [], {}
    for src in srcs:
        iid, year = src['institutionId'], src['intakeYear']
        if (a.only and a.only != iid) or (a.year and a.year != year): continue
        if src.get('active') is False: continue  # intake year is over (scripts/roll_year.py switched it off)
        inst = insts.get(iid)
        if not inst: report['skipped'].append('%s %s: unknown institution' % (iid, year)); continue
        key = '%s_%s' % (iid, year)
        path, url, sha = local.get(iid), src.get('url'), None
        if path:
            url = url or inst.get('officialUrl', '').rstrip('/') + '/prospectus.pdf'
            sha = S.sha256_file(path)
        elif not a.no_download:
            try:
                if not url:
                    found = S.discover(inst['officialUrl'], year)
                    if not found: report['skipped'].append('%s %s: no prospectus PDF found on %s' % (iid, year, inst['officialUrl'])); continue
                    url = found[0][1]
                if not V.same_site(url, inst['officialUrl']): report['skipped'].append('%s %s: %s is not on the official site' % (iid, year, url)); continue
                path, sha, size = S.download(url, key)
            except Exception as e:
                report['skipped'].append('%s %s: could not fetch (%s)' % (iid, year, e)); continue
        else:
            cached = os.path.join(S.CACHE, key + '.pdf'); path = cached if os.path.exists(cached) else None
            if not path: report['skipped'].append('%s %s: no cached PDF' % (iid, year)); continue
            sha = S.sha256_file(path); url = url or ''
        p1, p2 = X.pages_pdftotext(path), X.pages_pypdf(path)
        if not p1 and p2: p1, p2 = p2, None
        ocr_used = []
        if not p1 or sum(len(x.strip()) for x in p1) < 500:   # scanned: read every page by OCR (rows from it can never be auto_verified)
            p1, ocr_used = O.ocr_all(path); p2 = None
            if not p1 or sum(len(x.strip()) for x in p1) < 500:
                report['skipped'].append('%s %s: no readable text, and OCR %s' % (iid, year, 'found nothing' if O.available() else 'is not installed (apt-get install poppler-utils tesseract-ocr tesseract-ocr-afr)')); continue
        elif len(O.sparse_pages(p1)) > 0.3 * len(p1):          # part scanned: OCR only the image-only pages
            p1, ocr_used = O.fill_sparse(path, p1)
        prior_rows = state['rows']; prior = {}
        for f in C.load(C.path('index.json'))['files']:
            for r in C.load(C.path(f)).get('programmes', []):
                if r.get('institutionId') == iid and r.get('intakeYear') == year - 1: prior[slug(iid + '_' + r['name'])] = r
        ctx = {'institutionId': iid, 'year': year, 'url': url, 'officialUrl': inst['officialUrl'], 'sha256': sha, 'apsMethod': inst.get('apsMethod'),
               'closes': src.get('closes') or X.parse_closing(' '.join(p1[:15])), 'prior': prior, 'catalogue': cat.get(iid, []), 'min_runs': min_runs, 'seen': {}, 'ocr_pages': set(ocr_used), 'strategies': strategies_for(iid)}
        # repeat-run memory: how many separate runs produced these same values
        probe, _ = (lambda c0: (c0, 0))(dedupe(X.rules_extract(p1, 25)))
        for c in probe:
            cid = slug(iid + '_' + c['name']) + '_' + str(year); old = prior_rows.get(cid)
            ctx['seen'][cid] = (old['seen'] + (0 if old.get('lastRun') == C.today().isoformat() else 1)) if old and old.get('sig') == sig(c) else 1
        cands, info = process_document(ctx, p1, p2, a.max_rounds)
        report['documents'] += 1
        rows = []
        for c in cands:
            lines.append('%-13s %-4s %-3s p.%-4s %s  %s' % (c['verdict'], iid, year, c['page'], c['name'][:60], ', '.join(c['hardFail'] + c['softFail'])))
            if c['verdict'] == 'rejected':
                report['rejected'] += 1; continue
            try: rec = build_record(c, ctx, inst)
            except ValueError as e:
                report['rejected'] += 1; lines.append('               schema: %s' % e); continue
            rows.append(rec)
            report['verified' if rec['verificationStatus'] == 'auto_verified' else 'pending'] += 1
            state['rows'][c['id']] = {'sig': sig(c), 'seen': ctx['seen'].get(c['id'], 1), 'lastRun': C.today().isoformat()}
        touched[(iid, year)] = rows
        report.setdefault('docs', []).append('%s %s: %d page(s) read%s; %d next-step statement(s) quoted for Higher Certificates' % (iid, year, len(p1), (', %d of them by OCR' % len(ocr_used)) if ocr_used else '', sum(len(c.get('progression', [])) for c in cands if c['verdict'] != 'rejected')))
        ledger = PL.load(); PL.drop_pipeline(ledger, iid, year)
        for c in cands:
            if c['verdict'] == 'rejected': continue
            for pr in c.get('progression', []):
                PL.add(ledger, dict(pr, institutionId=iid, year=year, name=c['name'], sourceDoc='%s Prospectus %s' % (inst.get('short') or inst['name'], year)),
                       {'type': 'pipeline', 'ref': 'pipeline:' + sha[:12], 'ocr': c['page'] in ctx['ocr_pages']})
        if not a.dry_run: PL.save(ledger)
        state['docs'][key] = {'url': url, 'sha256': sha, 'checkedAt': C.today().isoformat(), 'pages': len(p1), 'rowsFound': len(cands), 'rounds': info['rounds'], 'fixedBy': info.get('fixed', {}), 'ocrPages': len(ocr_used)}
    kept_human, shrink_kept = [], []
    for (iid, year), rows in touched.items():
        fp = C.path('programmes', '%d.json' % year)
        doc = C.load(fp) if os.path.exists(fp) else {'schemaVersion': 3, 'intakeYear': year, 'notice': '', 'programmes': []}
        old_auto = [p for p in doc['programmes'] if p.get('institutionId') == iid and 'autoChecks' in p]
        if len(old_auto) >= int(os.environ.get('MZ_SHRINK_MIN_ROWS', 6)) and len(rows) < 0.5 * len(old_auto):
            # Circuit breaker: the document used to give N rows and now gives under half. That is almost always a changed layout or a bad read,
            # not half the programmes disappearing. Keep what we have and say so; a person decides.
            shrink_kept.append('%s %s: found %d row(s), previously %d. Kept the previous rows (possible layout change in the new document).' % (iid, year, len(rows), len(old_auto)))
            continue
        new_ids = {r['id'] for r in rows}
        keep = []
        for p in doc['programmes']:
            if p.get('institutionId') == iid and 'autoChecks' in p and p['id'] not in new_ids: continue  # no longer in the prospectus
            if p['id'] in new_ids and 'autoChecks' not in p: kept_human.append(p['id']); new_ids.discard(p['id']); keep.append(p); continue  # a person's row wins
            if p['id'] in new_ids: continue
            keep.append(p)
        doc['programmes'] = sorted(keep + [r for r in rows if r['id'] in new_ids], key=lambda p: (p['institutionId'], p['name'], p['id']))
        doc['notice'] = 'Rows with autoChecks were read from the official prospectus by scripts/run_pipeline.py and checked by independent passes. Rows without autoChecks were entered by a person.'
        if not a.dry_run:
            C.save(fp, doc)
            idx = C.load(C.path('index.json')); rel = 'programmes/%d.json' % year
            if rel not in idx['files']: idx['files'].append(rel); idx['files'].sort(); C.save(C.path('index.json'), idx)
    if not a.dry_run:
        C.save(st_p, state)
        os.makedirs(os.path.join(C.ROOT, 'reports'), exist_ok=True)
        _rep = []
        _rep.append('# Prospectus pipeline report %s\n\n%d document(s): %d auto-verified, %d pending review, %d rejected\n\n' % (C.today(), report['documents'], report['verified'], report['pending'], report['rejected']))
        if report['skipped']: _rep.append('## Not processed\n' + '\n'.join('- ' + s for s in report['skipped']) + '\n\n')
        if shrink_kept: _rep.append('## Kept previous rows (extraction found far fewer than before)\n' + '\n'.join('- ' + s for s in shrink_kept) + '\n\n')
        if kept_human: _rep.append('## Kept a person\'s row (pipeline disagreed or matched)\n' + '\n'.join('- ' + s for s in kept_human) + '\n\n')
        if report.get('docs'): _rep.append('## Documents read\n' + '\n'.join('- ' + d for d in report['docs']) + '\n\n')
        _rep.append('## Rows\n```\n' + '\n'.join(lines) + '\n```\n')
        C.write_atomic(os.path.join(C.ROOT, 'reports', 'pipeline_report.md'), ''.join(_rep))
    C.log('documents %d | auto_verified %d | pending_review %d | rejected %d | not processed %d' % (report['documents'], report['verified'], report['pending'], report['rejected'], len(report['skipped'])))
    for s in report['skipped']: C.log('  skipped:', s)
    return 0


if __name__ == '__main__':
    sys.exit(main())
