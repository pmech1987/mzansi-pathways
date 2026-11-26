#!/usr/bin/env python3
"""CSV -> data/programmes/<year>.json with strict validation.
Usage: python scripts/csv_to_programmes_json.py my_rows.csv   (one file may hold many years; rows are MERGED into each year file by id)
A row is REJECTED (nothing written) if it lacks a source, an https official URL, a verify date,
a known institutionId, or has a non-numeric / out-of-range APS. 'verified' also needs sourcePage."""
import csv, json, re, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import safe_io
ROOT = Path(__file__).resolve().parent.parent
INST = {i["id"] for i in safe_io.read_json(ROOT/"data/institutions.json")["institutions"]}
PASS = {"Higher Certificate Pass","Diploma Pass","Bachelor's Pass"}
ROUTES = {"University","Higher Certificate / UoT","Public TVET College","QCTO Occupational","Private College","Apprenticeship"}
STATUS = {"verified","pending_review","conflict","unverified_existence"}
def reqs(s):
    out=[]
    for part in filter(None,(s or "").split("|")):
        names,_,mark=part.rpartition(":")
        if not names or not mark.isdigit() or not 0<=int(mark)<=100: raise ValueError("bad subjectRequirements: "+part)
        out.append({"anyOf":[n.strip() for n in names.split("/")],"minMark":int(mark)})
    return out
def row(r,n):
    e=[]
    for k in ("id","institutionId","name","route","intakeYear","sourceDoc","officialUrl","lastVerifiedAt"):
        if not (r.get(k) or "").strip(): e.append(f"missing {k}")
    if r.get("institutionId") not in INST and r.get("institutionId") and not r["institutionId"].startswith("x_"): e.append("unknown institutionId (add it to data/institutions.json or prefix x_)")
    if r.get("route") and r["route"] not in ROUTES: e.append("route must be one of "+", ".join(sorted(ROUTES)))
    if not re.match(r"^https://",r.get("officialUrl","")): e.append("officialUrl must be https")
    if not re.match(r"^\d{4}$",r.get("intakeYear","")): e.append("intakeYear must be 4 digits")
    if not re.match(r"^\d{4}-\d{2}-\d{2}$",r.get("lastVerifiedAt","")): e.append("lastVerifiedAt must be YYYY-MM-DD")
    if r.get("closes") and not re.match(r"^\d{4}-\d{2}-\d{2}$",r["closes"]): e.append("closes must be YYYY-MM-DD or empty")
    st=r.get("verificationStatus") or "pending_review"
    if st not in STATUS: e.append("bad verificationStatus")
    if st=="verified": e.append("CSV cannot create verified rows. Import as pending_review, then use scripts/mz_verify.py (5 checks + 2 authenticator sign-offs)")
    mp=r.get("minPassLevel") or ""
    if mp and mp not in PASS: e.append("bad minPassLevel")
    aps=r.get("minAps") or "0"
    if not aps.isdigit() or int(aps)>42: e.append("minAps must be 0-42")
    try: sr=reqs(r.get("subjectRequirements"))
    except ValueError as x: sr=[]; e.append(str(x))
    if e: return None,[f"row {n} ({r.get('id','?')}): "+"; ".join(e)]
    f=[x.strip() for x in (r.get("funding") or "").split("/") if x.strip()]
    return {"id":r["id"].strip(),"institutionId":r["institutionId"],"campus":r.get("campus",""),"province":r.get("province",""),
      "route":r["route"],"name":r["name"],"nqf":int(r["nqf"]) if (r.get("nqf") or "").isdigit() else None,"duration":r.get("duration",""),
      "minPassLevel":mp or None,"minAps":int(aps),"subjectRequirements":sr,"requiresSelection":(r.get("requiresSelection","").lower() in ("yes","true","1")),
      "closes":r.get("closes") or None,"feesNote":r.get("feesNote") or "See official fee schedule","funding":f,"careerFamily":r.get("careerFamily") or "other",
      "officialUrl":r["officialUrl"],"sourceDoc":r["sourceDoc"],"sourcePage":r.get("sourcePage",""),"intakeYear":int(r["intakeYear"]),
      "lastVerifiedAt":r["lastVerifiedAt"],"verificationStatus":st,"enteredBy":(r.get("enteredBy") or "").strip() or None,"checks":[],"signoffs":[]},[]
RULE_KEYS = ("minAps", "minPassLevel", "subjectRequirements", "requiresSelection", "name", "institutionId", "route", "intakeYear")
def main(path, allow_unverify=False):
    by,errs,ids={}, [], set()
    if not Path(path).exists(): sys.exit(f"File not found: {path}")
    with open(path,encoding="utf-8-sig",newline="") as fh: rows=list(csv.DictReader(fh))
    if not rows: sys.exit("The CSV has no data rows. Nothing was written.")
    for n,r in enumerate(rows,2):
        r={(k or "").strip():(v or "").strip() if isinstance(v,str) else v for k,v in r.items()}  # tolerate stray spaces from Excel
        if r.get("id","").startswith("example_"): continue
        p,e=row(r,n)
        if p and p["id"] in ids: p,e=None,[f"row {n}: duplicate id {r['id']}"]
        if e: errs+=e; continue
        ids.add(p["id"]); by.setdefault(p["intakeYear"],[]).append(p)
    # Merge with what is already in each year file. A verified record is never silently replaced.
    idx=safe_io.read_json(ROOT/"data/index.json"); (ROOT/"data/programmes").mkdir(exist_ok=True)
    plan={}
    for y,ps in by.items():
        f=ROOT/f"data/programmes/{y}.json"
        old={r["id"]:r for r in safe_io.read_json(f).get("programmes",[])} if f.exists() else {}
        for p in ps:
            o=old.get(p["id"])
            if o and o.get("verificationStatus")=="verified" and any(o.get(k)!=p.get(k) for k in RULE_KEYS) and not allow_unverify:
                errs.append(f"{y}/{p['id']}: record is verified; changing its rules voids the verification. Re-run with --allow-unverify to replace it with a pending_review record.")
            old[p["id"]]=p
        plan[y]=list(old.values())
    if errs: print("\n".join(errs)); sys.exit("Rejected: fix the rows above. Nothing was written.")
    safe_io.snapshot(ROOT, "before-csv-import")
    for y,ps in plan.items():
        safe_io.write_json(ROOT/f"data/programmes/{y}.json", {"schemaVersion":3,"intakeYear":y,"programmes":ps})
        rel=f"programmes/{y}.json"
        if rel not in idx["files"]: idx["files"].append(rel)
        print(f"{y}: {len(by[y])} imported, {len(ps)} programmes in file")
    idx["files"].sort(); safe_io.write_json(ROOT/"data/index.json", idx)
if __name__=="__main__":
    a=[x for x in sys.argv[1:] if not x.startswith("--")]
    main(a[0] if a else sys.exit(__doc__), "--allow-unverify" in sys.argv)
