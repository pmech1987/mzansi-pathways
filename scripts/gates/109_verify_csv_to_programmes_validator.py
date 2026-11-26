#!/usr/bin/env python3
"""Gate 109: Behavioral verification of scripts/csv_to_programmes_json.py (valid NSC boundaries, HTTPS, ISO dates)."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
import csv_to_programmes_json as c2p


def main():
    errors = []
    csv_sample = (
        "id,institutionId,faculty,department,name,nqf,minAps,minEnglish,minMaths,closes,sourceUrl,checkedAt,verificationStatus\n"
        "up_bsc_cs,up,EBIT,CS,BSc Computer Science,7,30,60,70,2026-06-30,https://www.up.ac.za/,2026-11-26,verified\n"
        "bad_45,ump,FANS,ICT,Bad Boundary,6,24,50,45,2026-11-30,https://www.ump.ac.za/,2026-11-26,pending_review\n"
        "bad_http,tut,ICT,CS,Insecure Link,6,23,50,50,2026-09-30,http://tut.ac.za/,2026-11-26,pending_review\n"
        "bad_date,uj,Science,CS,Non ISO Date,7,30,60,60,30 Sep 2026,https://www.uj.ac.za/,2026-11-26,pending_review\n"
    )
    res = c2p.validate_csv_text_strict(csv_sample)
    if res["count"] != 1 or len(res["rejected"]) != 3:
        errors.append(f"Expected 1 accepted & 3 rejected rows, got accepted={res['count']} rejected={len(res['rejected'])}")

    print(json.dumps({"gate": "109_verify_csv_to_programmes_validator", "passed": len(errors) == 0, "errors": errors}))
    sys.exit(0 if not errors else 1)


if __name__ == "__main__":
    main()
