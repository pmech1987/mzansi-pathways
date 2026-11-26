#!/usr/bin/env python3
"""Start a new intake year: python scripts/new_year.py 2028 [--copy-from 2027] [--root DIR]
Creates data/programmes/<year>.json and lists it in data/index.json (the app and service worker pick it up).
--dry-run shows what would happen. A backup is taken first (backups/).
--copy-from copies the earlier year's records as a STARTING POINT ONLY: every copy becomes pending_review,
loses its checks, sign-offs, seal and verify date, gets the new intakeYear and closes=null, and records carriedFrom.
Copied numbers are last year's rules, not this year's. They can never show as verified until the 5 checks
and 2 sign-offs are done for the new year (python scripts/mz_verify.py)."""
import json, re, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import safe_io

def main(argv):
    args = [a for a in argv if not a.startswith("--")]
    root = Path(__file__).resolve().parent.parent
    if "--root" in argv:
        root = Path(argv[argv.index("--root") + 1]); args = [a for a in args if a != str(root)]
    copy_from = None
    if "--copy-from" in argv:
        copy_from = argv[argv.index("--copy-from") + 1]; args = [a for a in args if a != copy_from]
    if len(args) != 1 or not re.fullmatch(r"20\d\d", args[0]):
        sys.exit(__doc__)
    year = int(args[0])
    prog = root / "data" / "programmes"; prog.mkdir(parents=True, exist_ok=True)
    target = prog / f"{year}.json"
    ip = root / "data" / "index.json"
    if target.exists():
        # Crash recovery: a previous run may have written the year file but not listed it. List it now so the app can see it.
        idx0 = safe_io.read_json(ip); rel0 = f"programmes/{year}.json"
        if rel0 not in idx0["files"] and "--dry-run" not in argv:
            safe_io.read_json(target)  # must parse before we list it
            safe_io.snapshot(root, f"before-heal-{year}")
            idx0["files"].append(rel0); idx0["files"].sort(); safe_io.write_json(ip, idx0)
            sys.exit(f"{target.name} existed but was not listed in data/index.json (an earlier run was interrupted). It is listed now.")
        sys.exit(f"{target.name} already exists. Nothing changed.")
    records = []
    if copy_from:
        src = prog / f"{copy_from}.json"
        if not src.exists(): sys.exit(f"No data for {copy_from}.")
        for r in safe_io.read_json(src).get("programmes", []):
            n = dict(r)
            for k in ("checks", "signoffs", "seal", "lastVerifiedAt", "enteredBy"): n.pop(k, None)
            n.update({"intakeYear": year, "verificationStatus": "pending_review", "closes": None,
                      "carriedFrom": int(copy_from), "checks": [], "signoffs": []})
            n["sourceDoc"] = f"CARRIED FROM {copy_from} - replace with the {year} source"
            n["sourcePage"] = ""
            records.append(n)
    notice = (f"Starting point copied from {copy_from}. These are last year's numbers, pending_review, not {year} rules. Replace each from the {year} prospectus."
              if copy_from else f"Empty on purpose. Add rows via scripts/csv_to_programmes_json.py after checking each against the official {year} prospectus.")
    if "--dry-run" in argv:
        print(f"Would create {target.name} with {len(records)} record(s) and list it in data/index.json."); return
    idx = safe_io.read_json(ip)
    safe_io.snapshot(root, f"before-new-year-{year}")
    safe_io.write_json(target, {"schemaVersion": 3, "intakeYear": year, "notice": notice, "programmes": records})
    rel = f"programmes/{year}.json"
    if rel not in idx["files"]: idx["files"].append(rel)
    idx["files"].sort(); safe_io.write_json(ip, idx)
    print(f"Created {target.name} with {len(records)} record(s). Listed in data/index.json.")
    print("Next: run python scripts/run_all_20_gates.py to refresh the release seal.")

if __name__ == "__main__":
    main(sys.argv[1:])
