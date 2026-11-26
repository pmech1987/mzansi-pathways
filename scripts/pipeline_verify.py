"""Independent verification passes. Each returns (ok, detail). A row is only 'auto_verified' when every pass is ok.
HARD passes failing means the row is not published at all; SOFT passes failing keep it as pending_review."""
import difflib, re
import mz_common as C
from pipeline_extract import norm, alnum, NQF_RE, LEVEL_PCT

HARD = {'official_domain', 'evidence_on_page', 'numbers_in_evidence', 'aps_scale', 'no_conflict_in_document', 'schema_valid'}
APS_MAX = {'uct_fps': 600}


def registrable(host):
    p = host.lower().split('.')
    return '.'.join(p[-3:]) if len(p) >= 3 and '.'.join(p[-2:]) in ('ac.za', 'gov.za', 'co.za', 'org.za') else '.'.join(p[-2:])


def same_site(url, official):
    try:
        return registrable(url.split('://')[1].split('/')[0].split(':')[0]) == registrable(official.split('://')[1].split('/')[0].split(':')[0])
    except Exception:
        return False


def expected_nqf(name):
    n = name.lower()
    if n.startswith('higher certificate'): return 5
    if n.startswith('advanced diploma') or n.startswith('postgraduate'): return 7
    if 'diploma' in n.split()[0:2]: return 6
    if re.match(r'(beng\b|llb|mbchb|bds|bvsc|bpharm|barch|bengtech)', n): return 8 if not n.startswith('bengtech') else 7
    return 7


def mark_present(text, m):
    """A mark may be printed as a percentage (60%) or as an NSC level (Level 5 = 60%). Both count."""
    if has_num(text, m):
        return True
    lv = [l for l, p in LEVEL_PCT.items() if p == m]
    return any(re.search(r'(?:level|lvl)\s*%d\b|[:=\-\u2013]\s*%d\b' % (l, l), text, re.I) for l in lv)


def numbers_present(text, c):
    return has_num(text, c['minAps']) and all(mark_present(text, s['minMark']) for s in c['subjects'])


def has_num(text, x):
    s = ('%g' % x)
    return re.search(r'(?<![\d.])%s(?![\d])' % re.escape(s), text) is not None


def run_checks(c, ctx):
    """c: candidate dict. ctx: source/doc/prior info. Returns list of {type, ok, detail}."""
    res = []
    add = lambda t, ok, d='': res.append({'type': t, 'ok': bool(ok), 'detail': str(d)[:140]})
    p1 = ctx['pages1'][c['page'] - 1] if 0 < c['page'] <= len(ctx['pages1']) else ''
    p2 = ctx['pages2'][c['page'] - 1] if ctx.get('pages2') and 0 < c['page'] <= len(ctx['pages2']) else None
    ev = ' '.join(c.get('evidence', []))

    add('official_domain', same_site(ctx['url'], ctx['officialUrl']), ctx['url'])
    add('document_hash_recorded', bool(ctx.get('sha256')), (ctx.get('sha256') or '')[:12])
    add('year_match', str(ctx['year']) in ctx['doc_head'], 'intake year %s %s in the document' % (ctx['year'], 'found' if str(ctx['year']) in ctx['doc_head'] else 'NOT found'))
    ev_ok = norm(c['name']) and alnum(c['name']) in alnum(p1)
    add('evidence_on_page', ev_ok and all(alnum(l) in alnum(p1) for l in c.get('evidence', [])[:6] if l) if c.get('extractor') == 'rules' else ev_ok, 'p.%d' % c['page'])
    add('numbers_in_evidence', numbers_present(p1, c), 'APS %g' % c['minAps'])
    mx = APS_MAX.get(ctx.get('apsMethod'), 600 if ctx.get('apsMethod') else 100)
    add('aps_scale', 10 <= c['minAps'] <= mx, 'APS %g, scale max %d' % (c['minAps'], mx))
    add('mark_range', all(30 <= s['minMark'] <= 100 for s in c['subjects']), '')
    exp = expected_nqf(c['name']); dn = c.get('docNqf')
    add('nqf_consistent', dn is None or abs(dn - exp) <= 1, 'doc %s vs expected %d' % (dn, exp))
    add('no_conflict_in_document', len(c.get('apsAll', [c['minAps']])) == 1 and not c.get('conflict'), 'APS values %s' % c.get('apsAll'))
    if p2 is not None:  # second, independent text engine must show the same name and numbers on the same page
        add('second_engine_agrees', alnum(c['name']) in alnum(p2) and numbers_present(p2, c), 'pypdf vs pdftotext')
    else:
        add('second_engine_agrees', False, 'second PDF engine unavailable')
    m = ctx.get('llm_match')
    if ctx.get('llm_on'):
        add('second_extractor_agrees', bool(m) and m['minAps'] == c['minAps'] and sorted((tuple(s['anyOf']), s['minMark']) for s in m['subjects']) == sorted((tuple(s['anyOf']), s['minMark']) for s in c['subjects']),
            'AI reading ' + ('matches' if m else ('postponed: daily AI limit reached, it will be read on a later run' if any(abs(c['page'] - q) <= 1 for q in ctx.get('llm_postponed', ())) else 'found no matching row')))
    else:
        add('second_extractor_agrees', False, 'AI extractor not configured (set ANTHROPIC_API_KEY or GEMINI_API_KEY)')
    prior = ctx['prior'].get(c['baseKey'])
    add('year_on_year_plausible', prior is None or abs(prior.get('minAps', c['minAps']) - c['minAps']) <= 6, 'previous %s' % (prior or {}).get('minAps'))
    cat = ctx.get('catalogue', [])
    near = difflib.get_close_matches(norm(c['name']), [norm(x['name']) for x in cat], n=1, cutoff=0.86)
    if near:
        ref = next(x for x in cat if norm(x['name']) == near[0])
        add('catalogue_plausible', ref.get('minAps') in (None, 0) or abs(ref['minAps'] - c['minAps']) <= 12 or ctx.get('apsMethod') == 'uct_fps', 'typical range %s' % ref.get('minAps'))
    else:
        add('catalogue_plausible', True, 'no comparable catalogue row')
    add('seen_in_repeat_runs', ctx['seen'].get(c['id'], 1) >= ctx['min_runs'], 'seen %d of %d needed runs' % (ctx['seen'].get(c['id'], 1), ctx['min_runs']))
    return res


def verdict(checks):
    hard_fail = [x['type'] for x in checks if not x['ok'] and x['type'] in HARD]
    soft_fail = [x['type'] for x in checks if not x['ok'] and x['type'] not in HARD]
    return ('rejected' if hard_fail else 'auto_verified' if not soft_fail else 'pending_review'), hard_fail, soft_fail
