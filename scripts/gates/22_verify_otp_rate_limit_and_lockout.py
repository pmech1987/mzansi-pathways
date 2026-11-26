#!/usr/bin/env python3
"""Gate 22: Verifies OTP expiry <= 10 min, max 5 attempts, rate limiting, and no-ID requirement."""
import json
from pathlib import Path

def run(root: Path = Path(".")) -> dict:
    errors = []
    cfg_p = root / "auth_security_policy.json"
    if not cfg_p.exists():
        return {"gate": "22_otp_rate_limit_and_lockout", "passed": False, "errors": ["Missing auth_security_policy.json"]}
    cfg = json.loads(cfg_p.read_text(encoding="utf-8"))
    otp = cfg.get("otp") or {}
    sess = cfg.get("session") or {}
    if int(otp.get("expirySeconds") or 9999) > 600:
        errors.append("OTP expirySeconds exceeds 600s (10 minutes)")
    if int(otp.get("maxVerifyAttempts") or 99) > 5:
        errors.append("OTP maxVerifyAttempts exceeds 5")
    if int(otp.get("rateLimitPer15Min") or 99) > 5:
        errors.append("OTP rateLimitPer15Min too permissive")
    if not otp.get("neverLogOtp"):
        errors.append("neverLogOtp must be true")
    if sess.get("requireSaIdNumber") is not False:
        errors.append("requireSaIdNumber must be false (POPIA data minimization)")
    return {"gate": "22_otp_rate_limit_and_lockout", "passed": not errors, "errors": errors}

if __name__ == "__main__":
    r = run(); print(json.dumps(r)); raise SystemExit(0 if r["passed"] else 1)
