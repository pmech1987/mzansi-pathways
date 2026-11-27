"""Finds statements about where a Higher Certificate (or other entry-level qualification) can lead, in prospectus text.
It copies short quotes; it never infers a progression rule. A quote is evidence for a person to confirm, not a promise to a learner.
kind: 'credit'   = credits/exemptions towards a diploma/degree
      'access'   = graduates may apply / progress / gain entry to a diploma or degree
      'bridging' = called a bridge/foundation/extended route (no onward target stated)"""
import re

TARGET = r'(?:diploma|degree|bachelor|b\.?\s?sc|b\.?\s?com|b\.?\s?ed|b\.?\s?tech|b\.?\s?eng|advanced\s+diploma|national\s+diploma)'
CREDIT_RE = re.compile(r'\b(?:credits?|exemptions?|recognition\s+of\s+prior)\b', re.I)
ACCESS_RE = re.compile(r'\b(?:progress(?:ion)?|articulat\w*|access\s+to|gain\s+entry|admission\s+to|may\s+apply|can\s+apply|eligible\s+(?:for|to)|leads?\s+(?:on\s+)?to|pathway|route\s+(?:in)?to|move\s+on\s+to)\b', re.I)
BRIDGE_RE = re.compile(r'\b(?:bridg\w+|foundation|extended\s+(?:curriculum|programme))\b', re.I)
TARGET_RE = re.compile(TARGET, re.I)
NAME_RE = re.compile(r'\b((?:Advanced\s+Diploma|National\s+Diploma|Diploma|Bachelor|BSc|BCom|BEd|BTech|BEngTech|BEng)\s+(?:of|in)?\s*[A-Z][A-Za-z&/,\- ]{3,70})')
MAX_QUOTE = 300


def _sentences(lines):
    """Join wrapped lines into sentences; a short line with no end punctuation (a heading or label) is its own unit."""
    units, cur = [], []
    for raw in lines:
        l = re.sub(r'\s+', ' ', raw.replace('\u2022', ' ').replace('\u00b7', ' ')).strip()
        if not l:
            if cur: units.append(' '.join(cur)); cur = []
            continue
        if len(l.split()) <= 6 and not re.search(r'[.;!?:]$', l):
            if cur: units.append(' '.join(cur)); cur = []
            units.append(l); continue
        cur.append(l)
        if re.search(r'[.!?]$', l):
            units.append(' '.join(cur)); cur = []
    if cur: units.append(' '.join(cur))
    out = []
    for u in units:
        out.extend(x.strip() for x in re.split(r'(?<=[.;!?])\s+(?=[A-Z(])', u) if x.strip())
    return out


def _trim_name(n):
    n = re.split(r'\s+(?:and|with|for|to|who|or|where|after|once|on|from|which)\s+', n, maxsplit=1)[0]
    return re.sub(r'\s+', ' ', n).strip(' ,;-')


def extract(block_lines, page=None, max_items=3):
    """block_lines: the lines belonging to one programme heading. Returns up to max_items {kind, text, to, page}."""
    out, seen = [], set()
    for s in _sentences(block_lines):
        if len(s) < 25:
            continue
        kind, has_target = None, bool(TARGET_RE.search(s))
        if CREDIT_RE.search(s) and has_target:
            kind = 'credit'
        elif ACCESS_RE.search(s) and has_target:
            kind = 'access'
        elif BRIDGE_RE.search(s):
            kind = 'bridging'
        if not kind:
            continue
        q = s[:MAX_QUOTE].rstrip()
        key = re.sub(r'[^a-z0-9]+', '', q.lower())
        if key in seen:
            continue
        seen.add(key)
        to = []
        for m in NAME_RE.finditer(s):
            n = _trim_name(m.group(1))
            if n not in to:
                to.append(n[:80])
        out.append({'kind': kind, 'text': q, 'to': to[:3], 'page': page})
        if len(out) >= max_items:
            break
    return out


def is_entry_level(name):
    """Higher Certificates, plus extended-curriculum / foundation programmes, which are also bridges in South African universities."""
    n = str(name or '').strip().lower()
    return n.startswith(('higher certificate', 'certificate')) or bool(re.search(r'extended\s+(?:curriculum|programme|degree)|foundation\s+(?:programme|year)|\becp\b', n))
