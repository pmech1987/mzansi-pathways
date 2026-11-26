#!/usr/bin/env python3
"""Gate 93: Behaviour verification for best-six APS sorting, UMP LO/2 APS, zero mark=50 guessing, and audited sample rules."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from match_engine import evaluate_nsc_pass, compute_ump_aps
from statement_parser import parse_statement_text


def main():
    errors = []

    # T1: 7 non-LO subjects with highest mark (90% = L7) entered LAST -> best 6 must include it
    subs_t1 = [
        {"name": "English Home Language", "mark": 50, "isHomeLanguage": True, "isLifeOrientation": False},
        {"name": "isiZulu First Additional Language", "mark": 50, "isHomeLanguage": False, "isLifeOrientation": False},
        {"name": "Mathematics", "mark": 50, "isHomeLanguage": False, "isLifeOrientation": False},
        {"name": "Geography", "mark": 50, "isHomeLanguage": False, "isLifeOrientation": False},
        {"name": "History", "mark": 50, "isHomeLanguage": False, "isLifeOrientation": False},
        {"name": "Business Studies", "mark": 30, "isHomeLanguage": False, "isLifeOrientation": False},
        {"name": "Information Technology", "mark": 90, "isHomeLanguage": False, "isLifeOrientation": False},
        {"name": "Life Orientation", "mark": 80, "isHomeLanguage": False, "isLifeOrientation": True},
    ]
    res_t1 = evaluate_nsc_pass(subs_t1)
    # Best six non-LO: 5 subjects at L4 (20) + IT at L7 (7) = 27 (old buggy code got 5*4 + 2 = 22!)
    if res_t1["apsExclLO"] != 27:
        errors.append(f"Best-six APS bug: expected 27 when 7th non-LO subject is 90%, got {res_t1['apsExclLO']}")

    # T2: UMP APS divides Life Orientation level by 2 (LO 80% = L7 -> 3.5)
    subs_ump = [
        {"name": "English Home Language", "mark": 60, "isHomeLanguage": True, "isLifeOrientation": False},   # L5
        {"name": "isiZulu First Additional Language", "mark": 60, "isHomeLanguage": False, "isLifeOrientation": False},  # L5
        {"name": "Mathematics", "mark": 60, "isHomeLanguage": False, "isLifeOrientation": False},             # L5
        {"name": "Life Orientation", "mark": 80, "isHomeLanguage": False, "isLifeOrientation": True},         # L7/2 = 3.5
        {"name": "Physical Sciences", "mark": 50, "isHomeLanguage": False, "isLifeOrientation": False},       # L4
        {"name": "Information Technology", "mark": 70, "isHomeLanguage": False, "isLifeOrientation": False},  # L6
        {"name": "Geography", "mark": 50, "isHomeLanguage": False, "isLifeOrientation": False},               # L4
    ]
    res_ump = compute_ump_aps(subs_ump)
    if res_ump.get("aps") != 32.5:
        errors.append(f"UMP APS LO/2 calculation wrong: expected 32.5, got {res_ump}")

    # T7: statement_parser.py must NEVER silently guess mark=50 when mark is missing
    parsed = parse_statement_text("Mathematics\nEnglish Home Language 64%")
    maths_row = next((s for s in parsed.get("subjects", []) if s.get("name") == "Mathematics"), None)
    if maths_row and maths_row.get("mark") == 50:
        errors.append("statement_parser.py silently guessed mark=50 for Mathematics with no mark")

    # Verify index.html no longer has let mark = 50; or bogus minMark: 45
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    if "let mark = 50;" in html:
        errors.append("index.html still contains silent 'let mark = 50;' fallback")
    if "minMark: 45" in html:
        errors.append("index.html still contains invalid NSC boundary 'minMark: 45'")

    print(json.dumps({"gate": "93_verify_best_six_no_guess_and_ump_aps", "passed": len(errors) == 0, "errors": errors}))
    sys.exit(0 if not errors else 1)


if __name__ == "__main__":
    main()
