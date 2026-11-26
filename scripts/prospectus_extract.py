#!/usr/bin/env python3
"""Pull entry requirements out of a university / TVET prospectus into data/prospectus/<institution>.json

  python scripts/prospectus_extract.py --inst up --year 2027 --pdf UP_undergrad_2027.pdf
  python scripts/prospectus_extract.py --inst unisa --year 2027 --text unisa_prospectus.txt
  python scripts/prospectus_extract.py --inst uj --year 2027 --url https://example.ac.za/prospectus.pdf   (needs internet)
  python scripts/prospectus_extract.py --self-test

Then:  python scripts/build_catalogue.py     (the rows replace the indicative ones in the app)

What it reads per programme: name, faculty (from headings), qualification type, minimum APS, subject minimums
(percent or NSC level), pass type, whether selection applies, and what the prospectus says about Life Orientation.

Rules (same spirit as the rest of the app):
  * Facts only (numbers, subject names, page). It never copies descriptive prose.
  * Every row is written as status "pending_review". Nothing is ever marked verified by this script; a person
    must compare it with the official page (see docs/PROSPECTUS_TOOL_V68.md).
  * The source document hash and page are recorded so a reviewer can find each number again.
  * Uncertain readings are listed under "needsAttention" instead of being guessed.
  * Be polite online: only fetch documents the institution publishes for applicants, one at a time.
"""
import argparse, hashlib, json, re, shutil, subprocess, sys, urllib.request
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent

LEVEL_TO_MARK = {7: 80, 6: 70, 5: 60, 4: 50, 3: 40, 2: 30}
SUBJECTS = {
    "Mathematical Literacy": "Mathematical Literacy", "Mathematics": "Mathematics", "Physical Sciences": "Physical Sciences",
    "Physical Science": "Physical Sciences", "Life Sciences": "Life Sciences", "Accounting": "Accounting", "Business Studies": "Business Studies",
    "Economics": "Economics", "Geography": "Geography", "History": "History", "Information Technology": "Information Technology",
    "Computer Applications Technology": "Computer Applications Technology", "Engineering Graphics and Design": "Engineering Graphics and Design",
    "Agricultural Sciences": "Agricultural Sciences", "Tourism": "Tourism", "Consumer Studies": "Consumer Studies",
    "English Home Language": "English Home Language", "English First Additional Language": "English First Additional Language", "English": "English",
}
TITLE = re.compile(r"^\s*((?:B\.?Sc|B\.?Com|B\.?A\b|B\.?Ed|LLB|B\.?Eng|B\.?Tech|BPharm|MBChB|BChD|BSW|B\.?N\b|Bachelor of|Diploma in|National Diploma|Advanced Diploma|Higher Certificate|Certificate in|NC\(V\)|N[4-6]\b)[^\n]{0,110})$", re.I)
FACULTY = re.compile(r"^\s*(?:Faculty of|School of|Department of|College of)\s+([A-Z][^\n]{3,70})$")

def qual_of(name):
    n = name.lower()
    if "higher certificate" in n: return "Higher Certificate", 5, "Higher Certificate Pass"
    if "advanced diploma" in n: return "Advanced Diploma", 7, "Diploma Pass"
    if "diploma" in n or n.startswith("n4") or n.startswith("n5") or n.startswith("n6"): return "Diploma", 6, "Diploma Pass"
    if "nc(v)" in n: return "NC(V)", "2-4", "Higher Certificate Pass"
    return "Bachelor's degree", 7, "Bachelor's Pass"

def field_of(name):
    n = name.lower()
    table = [("teaching", r"\bb\.?ed\b|education|teach|foundation phase|grade r"), ("law", r"llb|\blaw\b|legal"), ("nursing", r"nurs|midwif"),
             ("health", r"medic|mbchb|pharm|physio|dent|therap|dietet|radiograph|health|biokinet"), ("engineering", r"engineer|\bbeng\b"),
             ("built", r"architect|quantity|construction|building"), ("it", r"computer|information tech|\bict\b|software|informatics|information systems"),
             ("accounting", r"accounting|auditing|financial account"), ("commerce", r"b\.?com|commerce|business|management|marketing|human resource|economics|finance|logistics"),
             ("admin", r"public (management|admin)|office|administration"), ("social", r"social work|psycholog|sociolog|politic|humanities|\bb\.?a\b"),
             ("media", r"media|communication|journalism"), ("arts", r"design|fine art|visual|music|drama"),
             ("hospitality", r"hospitality|tourism|hotel|catering"), ("agriculture", r"agricult|farming|animal|crop|forestry"),
             ("safety", r"police|policing|safety|security|criminolog|correctional"), ("science", r"b\.?sc\b|science|mathematic|physics|chemistry|biolog|environment")]
    for f, rx in table:
        if re.search(rx, n): return f
    return "social"

def to_text(args):
    """Return (text_pages, source_label, sha256). Pages are split on form feed so every number can cite a page."""
    if args.text:
        raw = Path(args.text).read_bytes(); return raw.decode("utf-8", "replace").split("\f"), Path(args.text).name, hashlib.sha256(raw).hexdigest()
    path = None
    if args.url:
        if not args.url.lower().startswith("https://"): sys.exit("Only https:// prospectus links are accepted.")
        path = ROOT / "data" / "prospectus" / "_downloads" / (re.sub(r"[^a-z0-9._-]+", "_", args.url.lower().split("/")[-1] or "prospectus.pdf"))
        path.parent.mkdir(parents=True, exist_ok=True)
        req = urllib.request.Request(args.url, headers={"User-Agent": "MzansiPathways-prospectus-reader/1.0 (applicant information)"})
        with urllib.request.urlopen(req, timeout=60) as r: path.write_bytes(r.read())
    if args.pdf: path = Path(args.pdf)
    if not path: sys.exit("Give --pdf, --url or --text")
    raw = path.read_bytes(); sha = hashlib.sha256(raw).hexdigest()
    if shutil.which("pdftotext"):
        out = subprocess.run(["pdftotext", "-layout", str(path), "-"], capture_output=True, text=True, errors="replace")
        return out.stdout.split("\f"), path.name, sha
    try:
        from pypdf import PdfReader
        return [(pg.extract_text() or "") for pg in PdfReader(str(path)).pages], path.name, sha
    except Exception:
        sys.exit("Install poppler (pdftotext) or `pip install pypdf` to read PDFs.")

def parse_block(title, block):
    """Read one programme's block of text. Returns (row, needsAttention list)."""
    attention = []
    flat = re.sub(r"[ \t]+", " ", block)
    # APS: "APS 30", "minimum APS of 28", "30 points", "APS: 24 - 26" (take the lower figure, flag the range)
    aps = 0
    m = re.search(r"\bAPS\b[^0-9\n]{0,25}(\d{2})(?:\s*(?:-|to|–)\s*(\d{2}))?", flat, re.I) or re.search(r"\b(\d{2})\s*(?:APS|admission points)", flat, re.I)
    if m:
        aps = int(m.group(1))
        if len(m.groups()) > 1 and m.group(2): attention.append("APS given as a range; lower figure used")
    subjects, seen = [], set()
    for name in sorted(SUBJECTS, key=len, reverse=True):
        rx = re.compile(r"\b" + re.escape(name) + r"\b[^0-9\n%]{0,22}?(?:level\s*)?(\d{1,3})\s*(%|\b)", re.I)
        for mm in rx.finditer(flat):
            canon = SUBJECTS[name]
            if canon in seen: continue
            val = int(mm.group(1)); unit = mm.group(2)
            if unit == "%" and 30 <= val <= 100: mark = val
            elif 2 <= val <= 7 and ("level" in mm.group(0).lower() or unit != "%"): mark = LEVEL_TO_MARK[val]
            else: continue
            seen.add(canon)
            any_of = ["English Home Language", "English First Additional Language"] if canon == "English" else [canon]
            if canon == "Mathematics" and re.search(r"Mathematical Literacy", flat[max(0, mm.start() - 5):mm.end() + 40], re.I): any_of = ["Mathematics", "Mathematical Literacy"]
            subjects.append({"anyOf": any_of, "minMark": mark})
    # Life Orientation wording
    lo = None
    lm = re.search(r"([^.\n]{0,80}Life Orientation[^.\n]{0,100})", flat, re.I)
    if lm:
        ctx = lm.group(1).lower()
        if re.search(r"exclud|not (be )?(counted|included|calculated)|except|without", ctx): lo = "excluded"
        elif re.search(r"50\s*%|half", ctx): lo = "half"
        elif re.search(r"includ|count|calculat|added", ctx): lo = "included"
        else: attention.append("Life Orientation is mentioned but the rule was unclear")
    label, nqf, minpass = qual_of(title)
    if re.search(r"bachelor'?s? (degree )?(endorsement|pass)", flat, re.I): minpass = "Bachelor's Pass"
    elif re.search(r"diploma (endorsement|pass)", flat, re.I) and minpass == "Bachelor's Pass": attention.append("Pass type mentions diploma pass; check")
    sel = bool(re.search(r"selection|limited (number|places)|competitive|interview|portfolio|NBT|National Benchmark", flat, re.I))
    years = None
    ym = re.search(r"(\d)\s*[- ]?\s*year", flat, re.I)
    if ym: years = int(ym.group(1))
    if not aps and not subjects: attention.append("No APS or subject numbers found in this block")
    row = {"name": re.sub(r"\s+", " ", title).strip(" .-:"), "qualType": label, "nqf": nqf, "years": years, "minPassLevel": minpass, "minAps": aps,
           "subjects": subjects, "requiresSelection": sel, "field": field_of(title), "loRule": lo, "note": "", "status": "pending_review"}
    return row, attention

def extract(pages, source_label, sha):
    rows, attention, faculty = [], [], "General"
    flat = [(i + 1, ln) for i, pg in enumerate(pages) for ln in pg.splitlines()]
    # find title lines
    marks = []
    for idx, (pno, ln) in enumerate(flat):
        fm = FACULTY.match(ln)
        if fm: faculty = fm.group(1).strip()
        if TITLE.match(ln) and len(ln.split()) <= 18:
            marks.append((idx, pno, ln.strip(), faculty))
    for k, (idx, pno, title, fac) in enumerate(marks):
        end = marks[k + 1][0] if k + 1 < len(marks) else min(len(flat), idx + 60)
        end = min(end, idx + 60)
        block = "\n".join(l for _, l in flat[idx + 1:end])
        row, att = parse_block(title, block)
        row.update({"faculty": fac, "sourceDoc": source_label, "sourcePage": "p." + str(pno), "sourceSha256": sha})
        rows.append(row)
        for a in att: attention.append({"programme": row["name"], "page": row["sourcePage"], "issue": a})
    # de-duplicate by name, keep the row with more information
    best = {}
    for r in rows:
        key = r["name"].lower(); score = (r["minAps"] > 0) + len(r["subjects"])
        if key not in best or score > best[key][0]: best[key] = (score, r)
    return [v[1] for v in best.values()], attention

def self_test():
    sample = ("Faculty of Law\nLLB\nAdmission requirements: APS 34. English Home Language level 6. Mathematics 50%. Selection applies. Life Orientation is not counted in the APS.\n"
              "Faculty of Education\nBEd Foundation Phase Teaching\nAPS of 26; English level 5; Mathematical Literacy level 4 or Mathematics level 3. Four years.\n"
              "Higher Certificate in Law\nA Higher Certificate pass is needed. English Home Language 40%. Life Orientation counts at 50%.\n")
    rows, att = extract([sample], "selftest.txt", "0" * 64)
    by = {r["name"]: r for r in rows}
    assert len(rows) == 3, [r["name"] for r in rows]
    assert by["LLB"]["minAps"] == 34 and by["LLB"]["loRule"] == "excluded" and by["LLB"]["requiresSelection"]
    assert any(s["anyOf"][0].startswith("English") and s["minMark"] == 70 for s in by["LLB"]["subjects"])
    assert by["BEd Foundation Phase Teaching"]["minAps"] == 26 and by["BEd Foundation Phase Teaching"]["field"] == "teaching"
    assert by["Higher Certificate in Law"]["minPassLevel"] == "Higher Certificate Pass" and by["Higher Certificate in Law"]["loRule"] == "half"
    assert all(r["status"] == "pending_review" for r in rows)
    print("self-test passed:", len(rows), "rows")

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--inst"); ap.add_argument("--year", type=int); ap.add_argument("--pdf"); ap.add_argument("--text"); ap.add_argument("--url")
    ap.add_argument("--self-test", action="store_true")
    a = ap.parse_args()
    if a.self_test: return self_test()
    if not a.inst or not a.year: ap.error("--inst and --year are required")
    insts = {i["id"] for i in json.load(open(ROOT / "data/institutions.json", encoding="utf-8"))["institutions"]}
    if a.inst not in insts: sys.exit("Unknown institution id. Use an id from data/institutions.json")
    pages, label, sha = to_text(a)
    rows, attention = extract(pages, label, sha)
    los = [r.pop("loRule") for r in rows]; lo = next((x for x in los if x), "check")
    for r in rows: r["intakeYear"] = a.year
    out = ROOT / "data" / "prospectus" / (a.inst + ".json"); out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({"institutionId": a.inst, "intakeYear": a.year, "loPolicy": lo, "sourceDoc": label, "sourceSha256": sha,
                               "note": "Machine-read draft. Every row is pending_review until a person compares it with the official page.",
                               "needsAttention": attention, "programmes": rows}, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"{len(rows)} programmes read, {len(attention)} items need a human look -> {out}")
    print("Next: python scripts/build_catalogue.py")

if __name__ == "__main__":
    main()
