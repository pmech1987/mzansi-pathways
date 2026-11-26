#!/usr/bin/env python3
"""Gate 86: translations stay complete and honest; institution pages exist.
Every language has one string per English key; unreviewed translations keep reviewed:false AND a visible draft note."""
import json, re
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]

def main() -> int:
    errors = []
    js = (ROOT / "js/i18n.js").read_text(encoding="utf-8")
    keys = re.search(r"EN_KEYS = \[(.*?)\];", js, re.S).group(1)
    n = len(re.findall(r"'(?:[^'\\]|\\.)*'", keys))
    for lang in re.finditer(r"(\w\w): \{ name: '(\w+)', reviewed: (true|false), t: \[(.*?)\] \}", js, re.S):
        c = len(re.findall(r"'(?:[^'\\]|\\.)*'", lang.group(4)))
        if c != n: errors.append(f"{lang.group(2)} has {c} strings, English has {n}")
        if lang.group(3) == "true" and not (ROOT / "docs/LANGUAGES_V22.md").read_text(encoding="utf-8").count(lang.group(2) + " reviewed by"):
            errors.append(f"{lang.group(2)} marked reviewed without a named reviewer in docs/LANGUAGES_V22.md")
    if "DRAFT" not in js or "lang-draft-note" not in js: errors.append("draft translation notice missing")
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    for tok in ("renderInstitutions", "data-inst-search", "./js/i18n.js"):
        if tok not in html: errors.append("index.html missing " + tok)
    print(json.dumps({"gate": "86_verify_languages_and_institution_pages", "passed": not errors, "errors": errors}))
    return 0 if not errors else 1

if __name__ == "__main__":
    raise SystemExit(main())
