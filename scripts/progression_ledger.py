"""data/progression.json: the evidence ledger for 'where can this qualification lead?'.
Entries are quotes from prospectus text with their sources. Status is computed, never typed by a script:
  pending_review = one source (the pipeline OR one community submitter)
  corroborated   = two or more different sources quote the same statement (a signal to review first, NOT proof: submitters are anonymous)
  verified       = two enrolled reviewers (data/reviewers.json) confirmed it by hand; scripts never set this
The app only calls something 'confirmed' when it is verified. Everything else is shown as 'not yet checked'."""
import hashlib, os, re

import mz_common as C

def _path():
    return C.path('progression.json')


KINDS = ('credit', 'access', 'bridging')


def _norm(s):
    return re.sub(r'[^a-z0-9 ]+', '', str(s or '').lower()).strip()


def _words(s):
    return {w for w in _norm(s).split() if len(w) > 3}


def same_statement(a, b):
    if a['institutionId'] != b['institutionId'] or a.get('year') != b.get('year') or a['kind'] != b['kind']:
        return False
    if _norm(a['name']) != _norm(b['name']):
        return False
    wa, wb = _words(a['text']), _words(b['text'])
    return bool(wa and wb) and len(wa & wb) / len(wa | wb) >= 0.6


def key_of(e):
    return hashlib.sha256(('|'.join([e['institutionId'], str(e.get('year')), _norm(e['name']), e['kind'], _norm(e['text'])[:80]])).encode()).hexdigest()[:16]


def load():
    if os.path.exists(_path()):
        return C.load(_path())
    return {'schemaVersion': 1, 'note': 'Evidence for where qualifications can lead. Quotes from prospectuses with their sources. Status is computed by scripts/progression_ledger.py; only 2 reviewers can make an entry verified.', 'entries': []}


def status_of(e, reviewers):
    revs = {r for r in e.get('reviewedBy', []) if r in reviewers}
    if len(revs) >= 2:
        return 'verified'
    return 'corroborated' if len({(s['type'], s['ref']) for s in e.get('sources', [])}) >= 2 else 'pending_review'


def clean_entry(e):
    if e.get('kind') not in KINDS:
        raise ValueError('kind must be one of ' + ', '.join(KINDS))
    t = re.sub(r'\s+', ' ', str(e.get('text', ''))).strip()
    if not 20 <= len(t) <= 300:
        raise ValueError('quote must be 20-300 characters')
    if re.search(r'https?://|www\.|@|\b\d{13}\b|\b0\d{9}\b', t):
        raise ValueError('quote contains a link, email, phone or ID number')
    name = re.sub(r'\s+', ' ', str(e.get('name', ''))).strip()[:120]
    if len(name) < 5:
        raise ValueError('qualification name missing')
    return {'institutionId': str(e['institutionId']), 'year': int(e.get('year') or 0), 'name': name, 'kind': e['kind'], 'text': t,
            'to': [str(x)[:80] for x in (e.get('to') or [])][:3], 'page': e.get('page') if isinstance(e.get('page'), int) else None,
            'sourceDoc': str(e.get('sourceDoc', ''))[:120]}


def add(ledger, entry, source):
    """Add one quote with its source; merges when the statement is the same. Returns 'new' | 'corroborated' | 'seen'."""
    e = clean_entry(entry)
    s = {'type': source['type'], 'ref': str(source['ref'])[:40], 'at': source.get('at') or C.today().isoformat(), 'ocr': bool(source.get('ocr'))}
    for old in ledger['entries']:
        if same_statement(old, e):
            if any((x['type'], x['ref']) == (s['type'], s['ref']) for x in old['sources']):
                return 'seen'
            old['sources'].append(s)
            return 'corroborated'
    e['key'] = key_of(e); e['sources'] = [s]; e['reviewedBy'] = []
    ledger['entries'].append(e)
    return 'new'


def drop_pipeline(ledger, institution_id, year):
    """Remove the previous run's pipeline quotes for a document before re-adding (they may be gone from a new prospectus).
    Entries a community source or reviewer also stands behind stay, minus the pipeline source."""
    keep = []
    for e in ledger['entries']:
        if e['institutionId'] == institution_id and e.get('year') == year:
            e['sources'] = [s for s in e['sources'] if s['type'] != 'pipeline']
            if not e['sources'] and not e.get('reviewedBy'):
                continue
        keep.append(e)
    ledger['entries'] = keep


def finalize(ledger):
    rp = C.path('reviewers.json')
    revs = {r['id'] for r in (C.load(rp).get('reviewers', []) if os.path.exists(rp) else []) if isinstance(r, dict) and r.get('id')}
    for e in ledger['entries']:
        e['status'] = status_of(e, revs)
    ledger['entries'].sort(key=lambda e: (e['institutionId'], e.get('year') or 0, _norm(e['name']), e['kind'], e['key']))
    return ledger


def save(ledger):
    C.save(_path(), finalize(ledger))
