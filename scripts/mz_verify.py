#!/usr/bin/env python3
"""Multi-check verification for programme records. Nothing becomes 'verified' without ALL of:
  5 independent checks  : official_domain, document_hash, second_source, institution_confirmation, year_match
  2 reviewer sign-offs  : different people, each proven by an authenticator (TOTP) code and an HMAC seal over the record
  freshness             : last verified <= 120 days ago
Commands:
  enroll <id> <name>                         create reviewer + authenticator secret (scan the otpauth URI in your app)
  check <year> <record_id> <type> --by ID --url URL [--file PDF] [--note TXT]
  signoff <year> <record_id> --by ID --code 123456      (secret from env MZ_SECRET_<ID>)
  code <id>                                  print the current 6-digit code from the secret in MZ_SECRET_<ID> (phone lost, secret kept)
  recovery-status <id>                       how many one-time backup codes are left
  recovery-new <id> --code CODE              replace all backup codes (needs a current authenticator code or an unused backup code)
  signoff ... --recovery XXXX-XXXX-XXXX-XXXX  sign with a one-time BACKUP CODE when the authenticator app is unavailable
  status <year> [record_id]                  show what is missing
  queue <year>                               what to verify / re-verify next, most urgent first
  promote <year>                             set verified / downgrade to pending_review from evidence"""
import argparse, base64, hashlib, hmac, json, os, re, secrets, struct, subprocess, sys, time
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.parse import urlparse
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
import safe_io  # atomic, validated writes + a safety copy before each change (a crash can no longer corrupt sign-offs)
REQUIRED = ["official_domain", "document_hash", "second_source", "institution_confirmation", "year_match"]
MIN_REVIEWERS, MAX_AGE_DAYS = 2, 120
RULE_FIELDS = ["institutionId","name","route","nqf","minPassLevel","minAps","subjectRequirements","requiresSelection","closes","intakeYear","officialUrl"]

def totp(secret_b32, t=None, step=30, digits=6):
    key = base64.b32decode(secret_b32.upper() + "=" * (-len(secret_b32) % 8))
    c = struct.pack(">Q", int((t or time.time()) // step)); h = hmac.new(key, c, "sha1").digest()
    o = h[-1] & 15; return str((struct.unpack(">I", h[o:o+4])[0] & 0x7fffffff) % 10**digits).zfill(digits)
def totp_ok(secret, code):  # +-1 step for clock drift
    return any(hmac.compare_digest(totp(secret, time.time() + d * 30), str(code)) for d in (-1, 0, 1))
def record_hash(rec):
    return hashlib.sha256(json.dumps({k: rec.get(k) for k in RULE_FIELDS}, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
def seal(secret, rhash, reviewer, at):
    k = hashlib.sha256(("mz-sign:" + secret).encode()).digest()
    return hmac.new(k, f"{rhash}|{reviewer}|{at}".encode(), "sha256").hexdigest()
def sha256_file(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def host_ok(url, inst_url):
    h = (urlparse(url).hostname or "").lower(); b = (urlparse(inst_url or "").hostname or "").lower().replace("www.", "")
    return urlparse(url).scheme == "https" and bool(h) and ((b and (h == b or h.endswith("." + b))) or h.endswith(".gov.za"))
def doc_text(path):
    p = Path(path)
    if p.suffix.lower() == ".pdf":
        return subprocess.run(["pdftotext", "-layout", str(p), "-"], capture_output=True, text=True).stdout
    return re.sub(r"<[^>]+>", " ", p.read_text(encoding="utf-8", errors="ignore"))
def search_terms(rec, text):
    """Independent searches of the downloaded document for every value we claim. Returns {term: found}."""
    t = re.sub(r"\s+", " ", text).lower(); out = {}
    out["intake year " + str(rec["intakeYear"])] = str(rec["intakeYear"]) in t
    out["programme name"] = all(w in t for w in re.findall(r"[a-z]{3,}", rec["name"].lower()))
    if rec.get("minAps"): out[f"APS {rec['minAps']}"] = re.search(r"\b" + str(rec["minAps"]) + r"\b", t) is not None
    for r in rec.get("subjectRequirements", []):
        out["subject " + "/".join(r["anyOf"]) + f" {r['minMark']}"] = (any(s.lower().split()[0] in t for s in r["anyOf"]) and re.search(r"\b" + str(r["minMark"]) + r"\b", t) is not None)
    return out

def save(path, obj):
    """Back up the file, then write it atomically. Verification evidence is the most valuable data here: never write it in place."""
    safe_io.file_backup(ROOT, path); safe_io.write_json(path, obj)
def load(year):
    if not re.fullmatch(r"20\d\d", str(year)): sys.exit("year must look like 2028")
    p = ROOT / f"data/programmes/{year}.json"
    if not p.exists(): sys.exit(f"No data file for {year}. Create it with: python scripts/new_year.py {year}")
    return p, safe_io.read_json(p)
def find(d, rid):
    for r in d["programmes"]:
        if r["id"] == rid: return r
    sys.exit(f"record {rid} not found")
def reviewers():
    return {r["id"]: r for r in safe_io.read_json(ROOT / "data/reviewers.json")["reviewers"]}
def merged_env(env):
    env = dict(env)
    try: env.update({"MZ_SECRET_" + k.upper(): v for k, v in json.loads(env.get("MZ_REVIEWER_SECRETS", "{}")).items()})
    except ValueError: pass
    return env

# ---- one-time backup (recovery) codes -------------------------------------------------------------------------------------------
# enroll prints 8 codes ONCE. Only salted PBKDF2 hashes go into data/reviewers.json (public file); a used code is recorded and never works
# again. A backup code replaces the 6-digit authenticator code only. The sign-off is still sealed with the reviewer's secret, so a backup
# code alone can never forge a sign-off. Lose BOTH phone and secret and the reviewer must be re-enrolled (old seals then fail loudly).
_ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"   # no 0/O/1/I confusion
RECOVERY_COUNT, RECOVERY_ITER = 8, 200_000
def _norm_code(c): return re.sub(r"[^A-Z0-9]", "", str(c).upper())
def _rhash(code, salt_hex): return hashlib.pbkdf2_hmac("sha256", _norm_code(code).encode(), bytes.fromhex(salt_hex), RECOVERY_ITER).hex()
def new_recovery_codes(n=RECOVERY_COUNT):
    """Returns (codes_to_show_once, public_record). 16 characters from a 32-letter alphabet = 80 bits each."""
    salt = secrets.token_bytes(16).hex(); codes = []
    for _ in range(n):
        raw = "".join(secrets.choice(_ALPHA) for _ in range(16)); codes.append("-".join(raw[i:i + 4] for i in range(0, 16, 4)))
    return codes, {"salt": salt, "iter": RECOVERY_ITER, "hashes": [_rhash(c, salt) for c in codes], "used": []}
def use_recovery_code(rev, code, consume=True):
    """Check a backup code against a reviewer record. On success marks it used IN MEMORY and returns True. Caller must save."""
    rec = rev.get("recovery") or {}
    if not rec.get("hashes") or not _norm_code(code): return False
    h = _rhash(code, rec["salt"])
    for i, known in enumerate(rec["hashes"]):
        if hmac.compare_digest(h, known) and i not in rec.setdefault("used", []):
            if consume: rec["used"].append(i)
            return True
    return False
def recovery_left(rev):
    rec = rev.get("recovery") or {}; return len(rec.get("hashes", [])) - len(rec.get("used", []))
def secret_for(rid):
    env = merged_env(os.environ); return env.get("MZ_SECRET_" + rid.upper())
def queue(year, today=None):
    """Work list: what to (re)verify next, most urgent first."""
    today = today or date.today(); rows = []
    for r in load(year)[1]["programmes"]:
        ok, bad = evaluate(r, today)
        try: left = MAX_AGE_DAYS - (today - date.fromisoformat(r.get("lastVerifiedAt", ""))).days
        except ValueError: left = -999
        done = len({c["type"] for c in r.get("checks", []) if c.get("ok")})
        pri = 0 if (r.get("verificationStatus") == "verified" and left < 0) else 1 if (r.get("verificationStatus") == "verified" and left < 30) else 2 if not ok else 3
        rows.append((pri, left, r["id"], f"{done}/5 checks, {len(r.get('signoffs', []))}/2 sign-offs, {left} days of validity left" if ok or done else f"not started, {left} days"))
    return sorted(rows)
def evaluate(rec, today=None, env=os.environ, strict_sigs=False):
    """Returns (ok, problems). Used by promote, status and the CI gate."""
    today = today or date.today(); bad = []; env = merged_env(env)
    checks = {}
    for c in rec.get("checks", []):
        if c.get("ok") is True: checks.setdefault(c["type"], []).append(c)
    for t in REQUIRED:
        if t not in checks: bad.append("missing check: " + t)
    urls = [c.get("url") for t in ("document_hash", "second_source") for c in checks.get(t, [])]
    if len(set(urls)) < 2: bad.append("document_hash and second_source must use DIFFERENT URLs")
    hs = [c.get("sha256") for t in ("document_hash", "second_source") for c in checks.get(t, []) if c.get("sha256")]
    if len(hs) >= 2 and len(set(hs)) < 2: bad.append("second source is the same file as the first")
    for c in checks.get("official_domain", []):
        if not host_ok(c.get("url", ""), rec.get("officialUrl")): bad.append("official_domain URL does not match the institution domain")
    rh = record_hash(rec); good = set()
    for s in rec.get("signoffs", []):
        if s.get("recordHash") != rh: bad.append(f"signoff by {s.get('reviewer')} is for an OLD version of the rules"); continue
        sec = env.get("MZ_SECRET_" + str(s.get("reviewer")).upper())
        if sec:
            if hmac.compare_digest(seal(sec, rh, s["reviewer"], s["at"]), s.get("sig", "")): good.add(s["reviewer"])
            else: bad.append(f"signature of {s['reviewer']} is invalid")
        elif strict_sigs: bad.append(f"cannot verify signature of {s['reviewer']} (no secret in env)")
        else: good.add(s["reviewer"])
    if rec.get("enteredBy") in good: good.discard(rec["enteredBy"]); bad.append("the person who entered the data cannot also be a verifier")
    if len(good) < MIN_REVIEWERS: bad.append(f"needs {MIN_REVIEWERS} independent reviewer sign-offs (has {len(good)})")
    try:
        age = (today - date.fromisoformat(rec.get("lastVerifiedAt", ""))).days
        if age > MAX_AGE_DAYS: bad.append(f"stale: verified {age} days ago (max {MAX_AGE_DAYS})")
    except ValueError: bad.append("lastVerifiedAt missing")
    return (not bad), bad

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest="cmd", required=True)
    e = sp.add_parser("enroll"); e.add_argument("id"); e.add_argument("name")
    c = sp.add_parser("check"); [c.add_argument(a) for a in ("year", "record_id", "type")]; c.add_argument("--by", required=True); c.add_argument("--url", required=True); c.add_argument("--file"); c.add_argument("--note", default="")
    s = sp.add_parser("signoff"); [s.add_argument(a) for a in ("year", "record_id")]; s.add_argument("--by", required=True); s.add_argument("--code"); s.add_argument("--recovery")
    cd = sp.add_parser("code"); cd.add_argument("id")
    rs = sp.add_parser("recovery-status"); rs.add_argument("id")
    rn = sp.add_parser("recovery-new"); rn.add_argument("id"); rn.add_argument("--code", required=True)
    st = sp.add_parser("status"); st.add_argument("year"); st.add_argument("record_id", nargs="?")
    pr = sp.add_parser("promote"); pr.add_argument("year")
    qu = sp.add_parser("queue"); qu.add_argument("year")
    a = ap.parse_args()
    if a.cmd == "enroll":
        sec = base64.b32encode(secrets.token_bytes(20)).decode().rstrip("=")
        f = ROOT / "data/reviewers.json"; d = safe_io.read_json(f)
        if any(r["id"] == a.id for r in d["reviewers"]): sys.exit("reviewer exists")
        if not re.fullmatch(r"[A-Za-z0-9_]{1,24}", a.id): sys.exit("reviewer id: letters, digits and _ only (max 24)")
        codes, rec_rec = new_recovery_codes()
        d["reviewers"].append({"id": a.id, "name": a.name, "enrolledAt": date.today().isoformat(), "recovery": rec_rec}); save(f, d)
        print("BACKUP CODES (shown ONCE, each works once, only if the authenticator app is unavailable). Write them on paper and keep them in 2 safe places, NOT in this folder:\n  " + "\n  ".join(codes) + "\n")
        print(f"Scan in your authenticator app:\notpauth://totp/MzansiPathways:{a.id}?secret={sec}&issuer=MzansiPathways\n\nSave the secret as env var MZ_SECRET_{a.id.upper()} (and a GitHub Actions secret). NEVER commit it.\nSecret: {sec}"); return
    if a.cmd == "queue":
        for pri, left, rid, msg in queue(a.year): print(["EXPIRED", "EXPIRING", "TO DO", "OK"][pri].ljust(9), rid.ljust(24), msg)
        return
    if a.cmd in ("code", "recovery-status", "recovery-new"):
        f = ROOT / "data/reviewers.json"; d = safe_io.read_json(f); rev = next((r for r in d["reviewers"] if r["id"] == a.id), None)
        if not rev: sys.exit("unknown reviewer")
        if a.cmd == "code":
            sec = secret_for(a.id)
            if not sec: sys.exit(f"MZ_SECRET_{a.id.upper()} is not set. Without the secret (or a re-enrolment) no code can be made.")
            print(totp(sec)); return
        if a.cmd == "recovery-status":
            n = recovery_left(rev); print(f"{a.id}: {n} backup code(s) left" + ("" if n >= 3 else "  <- running low: run recovery-new")); return
        sec = secret_for(a.id)
        if not ((sec and totp_ok(sec, a.code)) or use_recovery_code(rev, a.code)): sys.exit("Code rejected. Nothing changed.")
        codes, rev["recovery"] = new_recovery_codes(); save(f, d)
        print("NEW BACKUP CODES (old ones no longer work). Shown ONCE:\n  " + "\n  ".join(codes)); return
    p, d = load(a.year)
    if a.cmd == "check":
        rec = find(d, a.record_id); ok, det, sha = True, {}, None
        if a.by not in reviewers(): sys.exit("unknown reviewer")
        if a.type not in REQUIRED: sys.exit("type must be one of " + ", ".join(REQUIRED))
        if a.type in ("document_hash", "second_source", "official_domain") and not host_ok(a.url, rec.get("officialUrl")) and a.type != "second_source": ok = False; det["domain"] = "URL is not on the institution's own https domain or .gov.za"
        if a.file:
            sha = sha256_file(a.file); det["searches"] = search_terms(rec, doc_text(a.file))
            if not all(det["searches"].values()): ok = False
        elif a.type in ("document_hash", "second_source"): ok = False; det["file"] = "download the document and pass --file so it can be hashed and searched"
        if a.type == "year_match": ok = ok and bool(a.file) and det.get("searches", {}).get("intake year " + str(rec["intakeYear"]), False)
        rec.setdefault("checks", []).append({"type": a.type, "by": a.by, "at": datetime.now(timezone.utc).isoformat(timespec="seconds"), "url": a.url, "sha256": sha, "ok": ok, "details": det, "note": a.note})
        save(p, d); print(json.dumps({"type": a.type, "ok": ok, "details": det}, indent=1)); return
    if a.cmd == "signoff":
        rec = find(d, a.record_id); sec = os.environ.get("MZ_SECRET_" + a.by.upper())
        if a.by not in reviewers() or not sec: sys.exit("unknown reviewer or MZ_SECRET_<ID> not set")
        used_recovery = False
        if a.recovery:
            rf = ROOT / "data/reviewers.json"; rd = safe_io.read_json(rf); rv = next(r for r in rd["reviewers"] if r["id"] == a.by)
            if not use_recovery_code(rv, a.recovery, consume=False): sys.exit("Backup code rejected or already used. Nothing signed.")
            used_recovery = True  # accepted now, but only BURNED after every other check passes (a refused sign-off must not waste a code)
        elif not a.code or not totp_ok(sec, a.code): sys.exit("Authenticator code rejected (or use --recovery with a backup code). Nothing signed.")
        if rec.get("enteredBy") == a.by: sys.exit("You entered this data; someone else must verify it.")
        ok, bad = evaluate(rec, env={}) ; pre = [b for b in bad if b.startswith("missing check") or "DIFFERENT" in b or "official_domain" in b]
        if pre: sys.exit("Complete the checks first:\n- " + "\n- ".join(pre))
        if used_recovery:
            use_recovery_code(rv, a.recovery); save(rf, rd); print(f"Backup code accepted and burned ({recovery_left(rv)} left).")
        at = datetime.now(timezone.utc).isoformat(timespec="seconds"); rh = record_hash(rec)
        rec["signoffs"] = [x for x in rec.get("signoffs", []) if x["reviewer"] != a.by] + [{"reviewer": a.by, "at": at, "recordHash": rh, "totp": not used_recovery, "recovery": used_recovery, "sig": seal(sec, rh, a.by, at)}]
        rec["lastVerifiedAt"] = date.today().isoformat(); save(p, d); print("Signed."); return
    if a.cmd == "status":
        for r in d["programmes"]:
            if a.record_id and r["id"] != a.record_id: continue
            ok, bad = evaluate(r); print(("PASS " if ok else "OPEN ") + r["id"]); [print("   - " + b) for b in bad]
        return
    if a.cmd == "promote":
        for r in d["programmes"]:
            ok, _ = evaluate(r, strict_sigs=bool(os.environ.get("MZ_REQUIRE_SIGS")))
            r["verificationStatus"] = "verified" if ok else ("pending_review" if r.get("verificationStatus") == "verified" else r.get("verificationStatus", "pending_review"))
            print(r["id"], "->", r["verificationStatus"])
        save(p, d)
if __name__ == "__main__": main()
