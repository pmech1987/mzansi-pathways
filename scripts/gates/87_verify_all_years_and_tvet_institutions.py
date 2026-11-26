#!/usr/bin/env python3
"""Gate 87: the app works for any intake year and covers every institution type.
- data/index.json lists real files whose name matches their intakeYear; ids are unique inside a file.
- institutions.json: unique ids, valid provinces, exactly 50 public TVET colleges, no admission rules, no invented links.
- Loader keeps the same programme in different years (id@year), service worker serves data files fresh, new_year.py exists.
- No hardcoded intake year left in the Why-panel checklist."""
import json, re
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
PROV = {"Eastern Cape","Free State","Gauteng","KwaZulu-Natal","Limpopo","Mpumalanga","North West","Northern Cape","Western Cape"}
RULE_FIELDS = {"minAps","minMaths","minPassLevel","subjectRequirements","requiresSelection","closes"}

def main() -> int:
    errors = []
    idx = json.loads((ROOT / "data/index.json").read_text(encoding="utf-8"))
    seen_files = set()
    for rel in idx.get("files", []):
        f = ROOT / "data" / rel
        if rel in seen_files: errors.append("index.json lists " + rel + " twice")
        seen_files.add(rel)
        if not f.exists(): errors.append("index.json lists missing file " + rel); continue
        d = json.loads(f.read_text(encoding="utf-8"))
        m = re.fullmatch(r"programmes/(\d{4})\.json", rel)
        if not m: errors.append("bad data file name " + rel); continue
        if d.get("intakeYear") != int(m.group(1)): errors.append(rel + ": intakeYear does not match the file name")
        ids = [r.get("id") for r in d.get("programmes", [])]
        if len(ids) != len(set(ids)): errors.append(rel + ": duplicate programme ids")
        for r in d.get("programmes", []):
            if r.get("intakeYear") != d.get("intakeYear"): errors.append(f"{rel}:{r.get('id')}: record year differs from file year")
            if r.get("carriedFrom") and r.get("verificationStatus") == "verified": errors.append(f"{rel}:{r.get('id')}: carried-forward record cannot be verified without fresh checks")
    for f in sorted((ROOT / "data/programmes").glob("*.json")):
        if "programmes/" + f.name not in seen_files: errors.append(f.name + " exists but is not listed in data/index.json (the app would never load it)")

    inst = json.loads((ROOT / "data/institutions.json").read_text(encoding="utf-8"))["institutions"]
    ids = [i["id"] for i in inst]
    if len(ids) != len(set(ids)): errors.append("duplicate institution ids")
    tv = [i for i in inst if i["type"] == "TVET"]
    if len(tv) != 50: errors.append(f"expected 50 public TVET colleges, found {len(tv)}")
    if len({i["name"] for i in tv}) != len(tv): errors.append("duplicate TVET names")
    for i in inst:
        if i["province"] not in PROV: errors.append(f"{i['id']}: bad province {i['province']}")
        bad = RULE_FIELDS & set(i)
        if bad: errors.append(f"{i['id']}: admission rule fields do not belong in institutions.json: {sorted(bad)}")
        u = i.get("officialUrl")
        if u is not None and not str(u).startswith("https://"): errors.append(f"{i['id']}: officialUrl must be https or null")
        if i["type"] == "TVET":
            if i.get("apsMethod"): errors.append(f"{i['id']}: TVET colleges have no university APS method")
            if i.get("listStatus") not in ("draft_unchecked", "checked"): errors.append(f"{i['id']}: listStatus must be draft_unchecked or checked")
            if i.get("listStatus") == "checked" and not u: errors.append(f"{i['id']}: marked checked but has no officialUrl")

    dj = (ROOT / "js/data.js").read_text(encoding="utf-8")
    if "'@' + p.intakeYear" not in dj: errors.append("data.js must key records by id@year so other years are not dropped")
    sw = (ROOT / "sw.js").read_text(encoding="utf-8")
    if "/data/" not in sw or "fetch(e.request).then" not in sw: errors.append("sw.js must serve data files network-first")
    if not (ROOT / "scripts/new_year.py").exists(): errors.append("scripts/new_year.py missing")
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    if "Confirm 2027 prospectus" in html: errors.append("hardcoded year in the Why-panel checklist")
    for tok in ("data-year-jump", "inst-search", "inst-prov", "inst-type", "<span>Institutions</span>", "prevYearNote"):
        if tok not in html: errors.append("index.html missing " + tok)
    print(json.dumps({"gate": "87_verify_all_years_and_tvet_institutions", "passed": not errors, "errors": errors}))
    return 0 if not errors else 1

if __name__ == "__main__":
    raise SystemExit(main())
