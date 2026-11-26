"""scripts/legal_job_ingestor.py — Zero-Scraping, Lawful Multi-ATS SA Job Metadata Ingestor"""
from __future__ import annotations

import datetime as dt
import hashlib
import json
import os
import re
import tempfile
import time
import urllib.error
import urllib.request
from functools import lru_cache
from pathlib import Path
from typing import Any
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser

USER_AGENT = "MzansiPathways-OpenCivicBot/73.0 (+https://mzansi-pathways.pages.dev; factual-metadata-only)"
REQUEST_DELAY_SEC = 1.5
TIMEOUT_SEC = 12
MIN_KEEP_RATIO = 0.35

SA_LOCATION_RE = re.compile(
    r"\b(south\s*africa|gauteng|johannesburg|pretoria|tshwane|sandton|midrand|centurion|"
    r"cape\s*town|western\s*cape|stellenbosch|durban|kwazulu|umhlanga|pietermaritzburg|"
    r"mpumalanga|mbombela|nelspruit|emalahleni|witbank|middelburg|polokwane|limpopo|"
    r"gqeberha|port\s*elizabeth|east\s*london|bloemfontein|kimberley|mahikeng|rustenburg|"
    r"remote\s*[-–—]?\s*(za|south\s*africa|emea|africa))\b",
    re.IGNORECASE,
)

SCAM_PATTERNS = [
    re.compile(r"pay\s+(a\s+)?(registration|admin|uniform|application)\s+fee", re.I),
    re.compile(r"send\s+money\s+via\s+(ewallet|mukuru|pep|shoprite|cashsend)", re.I),
    re.compile(r"whatsapp\s+only\s+for\s+application", re.I),
    re.compile(r"\b(bit\.ly|tinyurl\.com|t\.co|rb\.gy|cutt\.ly|shorturl\.at)/", re.I),
]

PII_PATTERNS = [
    (re.compile(r"\b\d{13}\b"), "[ID-REDACTED]"),
    (re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+"), "[EMAIL-REDACTED]"),
    (re.compile(r"(?:\+27|0)[\s-]?\d{2}[\s-]?\d{3}[\s-]?\d{4}"), "[PHONE-REDACTED]"),
]


def scrub_text(value: str) -> str:
    clean = re.sub(r"\s+", " ", str(value or "")).strip()
    for pat, repl in PII_PATTERNS:
        clean = pat.sub(repl, clean)
    return clean[:240]


def is_safe_url(url: str) -> bool:
    parsed = urlparse(str(url or ""))
    if parsed.scheme != "https" or not parsed.netloc:
        return False
    return not any(p.search(url) for p in SCAM_PATTERNS)


def is_scam_flagged(title: str, apply_url: str) -> bool:
    blob = f"{title} {apply_url}"
    return (not is_safe_url(apply_url)) or any(p.search(blob) for p in SCAM_PATTERNS)


@lru_cache(maxsize=128)
def allowed_by_robots(url: str) -> bool:
    parsed = urlparse(url)
    robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
    rp = RobotFileParser()
    rp.set_url(robots_url)
    try:
        req = urllib.request.Request(robots_url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=8) as resp:
            rp.parse(resp.read().decode("utf-8", errors="ignore").splitlines())
        return rp.can_fetch(USER_AGENT, url)
    except urllib.error.HTTPError as err:
        return err.code == 404
    except Exception:
        return False


def http_json(url: str, method: str = "GET", payload: dict | None = None) -> Any:
    if not allowed_by_robots(url):
        raise PermissionError(f"Blocked by robots.txt: {url}")
    time.sleep(REQUEST_DELAY_SEC)
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}
    if data is not None:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=TIMEOUT_SEC) as resp:
        return json.loads(resp.read().decode("utf-8", errors="replace"))


def make_record(ats: str, company: str, ext_id: str, title: str, location: str, apply_url: str, posted_iso: str | None) -> dict | None:
    clean_title = scrub_text(title)
    clean_loc = scrub_text(location)
    if not clean_title or not SA_LOCATION_RE.search(clean_loc):
        return None
    if is_scam_flagged(clean_title, apply_url):
        return None
    uid = hashlib.sha256(f"{ats}:{company}:{ext_id}".encode("utf-8")).hexdigest()[:16]
    return {
        "id": f"{ats}_{uid}",
        "sourceAts": ats,
        "employer": scrub_text(company),
        "title": clean_title,
        "location": clean_loc,
        "applyUrl": apply_url,
        "postedAt": posted_iso,
        "metadataOnly": True,
    }


def fetch_greenhouse(board: dict) -> list[dict]:
    host = board.get("host", "https://boards-api.greenhouse.io")
    url = f"{host}/v1/boards/{board['slug']}/jobs"
    data = http_json(url)
    out = []
    for j in data.get("jobs", []):
        rec = make_record("greenhouse", board["name"], str(j.get("id", "")), j.get("title", ""), (j.get("location") or {}).get("name", ""), j.get("absolute_url", ""), j.get("updated_at"))
        if rec:
            out.append(rec)
    return out


def fetch_lever(board: dict) -> list[dict]:
    host = board.get("host", "https://api.lever.co")
    url = f"{host}/v0/postings/{board['slug']}?mode=json"
    items = http_json(url)
    out = []
    for j in items if isinstance(items, list) else []:
        ms = j.get("createdAt")
        iso = dt.datetime.fromtimestamp(ms / 1000, tz=dt.timezone.utc).date().isoformat() if isinstance(ms, (int, float)) else None
        loc = (j.get("categories") or {}).get("location", "")
        rec = make_record("lever", board["name"], str(j.get("id", "")), j.get("text", ""), loc, j.get("hostedUrl", ""), iso)
        if rec:
            out.append(rec)
    return out


def fetch_smartrecruiters(board: dict) -> list[dict]:
    out, offset, limit = [], 0, 100
    while offset < 2000:
        url = f"https://api.smartrecruiters.com/v1/companies/{board['slug']}/postings?limit={limit}&offset={offset}"
        data = http_json(url)
        rows = data.get("content", [])
        if not rows:
            break
        for j in rows:
            loc = (j.get("location") or {}).get("fullLocation") or (j.get("location") or {}).get("city", "")
            apply_url = f"https://jobs.smartrecruiters.com/{board['slug']}/{j.get('id')}"
            rec = make_record("smartrecruiters", board["name"], str(j.get("id", "")), j.get("name", ""), loc, apply_url, j.get("releasedDate"))
            if rec:
                out.append(rec)
        total = int(data.get("totalFound", 0))
        offset += len(rows)
        if offset >= total or len(rows) < limit:
            break
    return out


def fetch_workday_cxs(board: dict) -> list[dict]:
    """Workday CXS with strict limit=20 and 3-way wrap/duplicate/total=0 pagination defenses."""
    origin = board["origin"].rstrip("/")
    tenant = board["tenant"]
    site = board["site"]
    url = f"{origin}/wday/cxs/{tenant}/{site}/jobs"
    out, seen_paths = [], set()
    offset, page_size, reported_total = 0, 20, None
    while offset < 2000:
        payload = {"appliedFacets": {}, "limit": page_size, "offset": offset, "searchText": board.get("searchText", "South Africa")}
        data = http_json(url, method="POST", payload=payload)
        if reported_total is None:
            reported_total = int(data.get("total") or 0)
        rows = data.get("jobPostings", [])
        if not rows:
            break
        new_on_page = 0
        for j in rows:
            ext_path = j.get("externalPath", "")
            if not ext_path or ext_path in seen_paths:
                continue
            seen_paths.add(ext_path)
            new_on_page += 1
            apply_url = f"{origin}/{site}{ext_path}"
            rec = make_record("workday", board["name"], ext_path, j.get("title", ""), j.get("locationsText", ""), apply_url, j.get("postedOn"))
            if rec:
                out.append(rec)
        if new_on_page == 0 or len(rows) < page_size:
            break
        offset += len(rows)
        if reported_total and offset >= reported_total:
            break
    return out


def atomic_write_with_circuit_breaker(target_path: Path, new_items: list[dict], errors: list[str]) -> bool:
    previous_count = 0
    if target_path.exists():
        try:
            prev = json.loads(target_path.read_text(encoding="utf-8"))
            previous_count = len(prev.get("items", []))
        except Exception:
            previous_count = 0
    if previous_count >= 10 and len(new_items) < int(previous_count * MIN_KEEP_RATIO):
        raise RuntimeError(f"CIRCUIT BREAKER TRIPPED: Refusing to overwrite {previous_count} verified jobs with only {len(new_items)} items.")
    deduped = {item["id"]: item for item in new_items}
    sorted_items = sorted(deduped.values(), key=lambda x: (x.get("postedAt") or "", x["employer"], x["title"]), reverse=True)
    envelope = {
        "schemaVersion": "2.0",
        "generatedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
        "legalBasis": "Factual metadata only from unauthenticated official public ATS JSON APIs; no HTML scraping or PII.",
        "count": len(sorted_items),
        "boardErrors": errors,
        "items": sorted_items,
    }
    target_path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(dir=target_path.parent, suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            json.dump(envelope, fh, indent=2, ensure_ascii=False)
            fh.flush()
            os.fsync(fh.fileno())
        os.replace(tmp_name, target_path)
    finally:
        if os.path.exists(tmp_name):
            os.unlink(tmp_name)
    return True
