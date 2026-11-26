#!/usr/bin/env python3
"""
Mzansi Pathways v42 — Multi-Stage Authenticated Release Verifier
----------------------------------------------------------------
Enforces 3 independent verification stages for EVERY gate before release:
  Stage 1 (Pre-Execution Authentication):
    - Parses each gate with Python AST to confirm valid syntax & non-stub body.
    - Verifies each gate's SHA-256 hash against gate_integrity_manifest.json
      (prevents silent tampering or gate weakening).
  Stage 2 (Triple Output Cross-Verification):
    - Requires subprocess returncode == 0 (with 30s timeout failsafe),
    - Valid JSON output with passed === True (strict bool) & errors === [],
    - Non-empty gate identifier matching the gate number prefix.
  Stage 3 (Cryptographic Release Attestation):
    - Writes release_verification_report.json and release_attestation.json
      binding tracked app files + all authenticated gate hashes with SHA-256.
"""
import ast
import hashlib
import json
import subprocess
import sys
import time
from pathlib import Path


def _sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_gate_manifest(root: Path) -> Path:
    gate_files = sorted((root / "scripts" / "gates").glob("[0-9][0-9]_verify_*.py"))
    hashes = {gf.name: _sha256_file(gf) for gf in gate_files}
    payload = {
        "schemaVersion": 1,
        "gateCount": len(hashes),
        "sha256": hashes,
    }
    out = root / "gate_integrity_manifest.json"
    out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return out


FORBIDDEN_GATE_PATTERNS = ("os._exit(", "eval(", "exec(")


def _authenticate_gate(gf: Path, expected_hashes: dict) -> list:
    errs = []
    try:
        src = gf.read_text(encoding="utf-8")
        tree = ast.parse(src, filename=str(gf))
        if len(tree.body) < 2:
            errs.append("Stage 1 AST check failed: gate script appears stubbed/empty")
        for node in ast.walk(tree):
            if isinstance(node, ast.Call):
                fn = node.func
                fname = fn.id if isinstance(fn, ast.Name) else (f"{fn.value.id}.{fn.attr}" if isinstance(fn, ast.Attribute) and isinstance(fn.value, ast.Name) else "")
                if f"{fname}(" in FORBIDDEN_GATE_PATTERNS:
                    errs.append(f"Stage 1 Anti-Bypass failed: forbidden call {fname}() in {gf.name}")
    except Exception as exc:
        errs.append(f"Stage 1 AST syntax error: {exc}")
        return errs

    actual_hash = _sha256_file(gf)
    exp_hash = expected_hashes.get(gf.name)
    if not exp_hash:
        errs.append(f"Stage 1 Auth failed: {gf.name} missing from gate_integrity_manifest.json")
    elif actual_hash != exp_hash:
        errs.append(f"Stage 1 Auth failed: SHA-256 mismatch for {gf.name} (possible tamper)")
    return errs


def run_release_verification(root: Path, min_gates: int = 68) -> int:
    gate_files = sorted((root / "scripts" / "gates").glob("[0-9][0-9]_verify_*.py"))
    gm_path = root / "gate_integrity_manifest.json"
    expected_hashes = {}
    if gm_path.exists():
        try:
            expected_hashes = (json.loads(gm_path.read_text(encoding="utf-8")).get("sha256") or {})
        except Exception:
            expected_hashes = {}

    results = []
    t_start = time.monotonic()

    for gf in gate_files:
        g0 = time.monotonic()
        auth_errs = _authenticate_gate(gf, expected_hashes)
        if auth_errs:
            res = {"gate": gf.stem, "passed": False, "auth_verified": False, "checks_passed": 0, "errors": auth_errs}
        else:
            try:
                proc = subprocess.run([sys.executable, str(gf)], cwd=root, capture_output=True, text=True, timeout=30)
                parsed = None
                try:
                    parsed = json.loads(proc.stdout.strip().splitlines()[-1])
                except Exception:
                    parsed = None

                cross_errs = []
                if proc.returncode != 0:
                    cross_errs.append(f"Stage 2 exit code non-zero ({proc.returncode})")
                if not isinstance(parsed, dict):
                    cross_errs.append("Stage 2 JSON output missing or invalid")
                    parsed = {"gate": gf.stem, "passed": False, "errors": [proc.stderr.strip()[:300]]}
                else:
                    if parsed.get("passed") is not True:
                        cross_errs.append("Stage 2 JSON 'passed' is not strictly True")
                    if not isinstance(parsed.get("errors"), list) or len(parsed.get("errors")) > 0:
                        cross_errs.extend(parsed.get("errors") or ["Stage 2 non-empty errors field"])
                    if not str(parsed.get("gate") or "").startswith(gf.name[:2]):
                        cross_errs.append(f"Stage 2 gate identity mismatch: {parsed.get('gate')}")

                ok = len(cross_errs) == 0
                res = {
                    "gate": parsed.get("gate") or gf.stem,
                    "passed": ok,
                    "auth_verified": True,
                    "checks_passed": 3 if ok else 0,
                    "errors": cross_errs,
                }
            except subprocess.TimeoutExpired:
                res = {"gate": gf.stem, "passed": False, "auth_verified": True, "checks_passed": 0, "errors": ["Gate timed out after 30s failsafe limit"]}

        res["duration_ms"] = round((time.monotonic() - g0) * 1000, 1)
        results.append(res)
        tag = "PASS" if res.get("passed") else "FAIL"
        print(f"[{tag}] {res.get('gate')} (auth={'OK' if res.get('auth_verified') else 'FAIL'}, {res['duration_ms']}ms, errors={len(res.get('errors') or [])})")
        for e in res.get("errors") or []:
            print(f"   ERROR: {e}")

    passed_n = sum(1 for r in results if r.get("passed"))
    total_n = len(results)
    all_ok = passed_n == total_n and total_n >= min_gates

    report = {
        "total_gates": total_n,
        "passed_gates": passed_n,
        "all_passed": all_ok,
        "verification_stages": 3,
        "total_duration_ms": round((time.monotonic() - t_start) * 1000, 1),
        "gates": results,
    }
    (root / "release_verification_report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    # Stage 3: Write cryptographic release attestation seal
    im_path = root / "integrity_manifest.json"
    im_hash = _sha256_file(im_path) if im_path.exists() else ""
    gm_hash = _sha256_file(gm_path) if gm_path.exists() else ""
    seal_input = f"{total_n}|{passed_n}|{all_ok}|{im_hash}|{gm_hash}".encode("utf-8")
    attestation = {
        "schemaVersion": 1,
        "all_passed": all_ok,
        "gate_count": total_n,
        "verification_stages_per_gate": 3,
        "integrity_manifest_sha256": im_hash,
        "gate_integrity_manifest_sha256": gm_hash,
        "attestation_sha256": hashlib.sha256(seal_input).hexdigest(),
    }
    (root / "release_attestation.json").write_text(json.dumps(attestation, indent=2) + "\n", encoding="utf-8")

    print(f"=== {total_n}-GATE MULTI-CHECK SUITE RESULT: {passed_n}/{total_n} PASSED ({report['total_duration_ms']}ms) | SEAL {attestation['attestation_sha256'][:16]}... ===")
    return 0 if all_ok else 1


if __name__ == "__main__":
    if "--write-gate-hashes" in sys.argv:
        p = write_gate_manifest(Path("."))
        print(f"Wrote {p}")
        raise SystemExit(0)
    raise SystemExit(run_release_verification(Path(".")))
