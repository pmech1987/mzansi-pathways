#!/usr/bin/env python3
"""Gate 85: every programme marked 'verified' must pass ALL multi-checks (5 checks, 2 independent
authenticator-sealed reviewers, fresh, rules unchanged since sign-off). Set MZ_REQUIRE_SIGS=1 in CI with
MZ_SECRET_<ID> secrets to also verify the cryptographic seals."""
import json, os, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
import mz_verify

def main() -> int:
    errors, n = [], 0
    for f in sorted((ROOT / "data/programmes").glob("*.json")):
        for r in json.loads(f.read_text(encoding="utf-8")).get("programmes", []):
            if r.get("verificationStatus") == "verified":
                n += 1
                ok, bad = mz_verify.evaluate(r, strict_sigs=bool(os.environ.get("MZ_REQUIRE_SIGS")))
                errors += [f"{f.name}:{r['id']}: {b}" for b in bad]
    print(json.dumps({"gate": "85_verify_prospectus_multi_check", "passed": not errors, "verifiedRecords": n, "errors": errors}))
    return 0 if not errors else 1

if __name__ == "__main__":
    raise SystemExit(main())
