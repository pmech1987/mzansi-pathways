#!/usr/bin/env python3
"""Gate 102: Behavioral tests for scripts/legal_job_ingestor.py, dpsa_and_dhet_parser.py, and hardened RLS SQL."""
import json
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
import legal_job_ingestor as lji
import dpsa_and_dhet_parser as ddp


def main():
    errors = []
    # 1. Verify PII scrub + scam/shortener rejection
    if "082 555 1234" in lji.scrub_text("Call 082 555 1234 or 0501015800084"):
        errors.append("legal_job_ingestor failed to scrub SA phone/ID")
    if lji.make_record("greenhouse", "Co", "1", "Pay registration fee", "Johannesburg", "https://bit.ly/x", "2026-11-26") is not None:
        errors.append("legal_job_ingestor failed to reject scam/shortener job")
    good = lji.make_record("greenhouse", "Luno", "99", "Junior Engineer", "Cape Town, South Africa", "https://job-boards.greenhouse.io/luno/jobs/99", "2026-11-26")
    if not good or not good.get("metadataOnly"):
        errors.append("legal_job_ingestor rejected valid SA metadata job")

    # 2. Verify circuit breaker trips on sudden >65% drop
    with tempfile.TemporaryDirectory() as tmp:
        fp = Path(tmp) / "jobs.json"
        fp.write_text(json.dumps({"items": [{"id": f"j{i}"} for i in range(20)]}), encoding="utf-8")
        try:
            lji.atomic_write_with_circuit_breaker(fp, [good], [])
            errors.append("Circuit breaker failed to trip on 20 -> 1 drop")
        except RuntimeError:
            pass

    # 3. Verify DPSA & DHET factual parsers
    dpsa = ddp.extract_dpsa_index_from_text("POST 42/10 : ADMIN CLERK\nREF NO : MP/2026/01\nSALARY : R216 417 per annum\nCLOSING DATE : 11 December 2026", "https://www.gov.za/jobs", "Circular 42")
    if dpsa["count"] != 1:
        errors.append(f"Expected 1 DPSA vacancy indexed, got {dpsa['count']}")
    dhet = ddp.extract_dhet_register_from_text(["SECTION A: CANCELLED 2018/FE07/001", "SECTION B: REGISTERED 2023/FE07/003"], "Private Colleges", "2026-11")
    if "2018/FE07/001" not in dhet["cancelledRegistrationNumbers"] or "2023/FE07/003" not in dhet["activeRegistrationNumbers"]:
        errors.append(f"DHET register split failed: {dhet}")

    # 4. Verify hardened RLS SQL
    sql = (ROOT / "scripts" / "supabase_schema_rls_hardened.sql").read_text(encoding="utf-8")
    for tok in ("force row level security", "security_invoker = true", "(select auth.uid())"):
        if tok not in sql.lower():
            errors.append(f"supabase_schema_rls_hardened.sql missing: {tok}")

    print(json.dumps({"gate": "102_verify_legal_multi_ats_and_dpsa_dhet_scripts", "passed": len(errors) == 0, "errors": errors}))
    sys.exit(0 if not errors else 1)


if __name__ == "__main__":
    main()
