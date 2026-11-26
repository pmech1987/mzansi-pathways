#!/usr/bin/env python3
"""
Mzansi Pathways v39 — Automated Multi-Source Legal Public Job Discovery
-----------------------------------------------------------------------
Runs free on GitHub Actions (daily cron) with ZERO scraping:
1. Reads verified local/community direct-employer submissions (data/community_jobs_submissions.json).
2. Queries public Greenhouse ATS JSON boards listed in data/public_ats_boards.json
   (boards-api.greenhouse.io/v1/boards/<slug>/jobs) filtering for South Africa locations.
3. Queries the free-tier Adzuna South Africa API when ADZUNA_APP_ID & ADZUNA_APP_KEY
   GitHub Secrets are configured (keeps still-open jobs up to 14 days old).
4. Pipes every listing through ingest_free_open_jobs.filter_legal_open_jobs() to
   strip copied advert prose (metadata-only), block scraping-restricted domains,
   reject upfront-fee scams, and drop expired closingDate posts.
5. Writes data/open_jobs_live.json atomically for index.html to load automatically.
"""
import datetime
import json
import os
import urllib.request
from pathlib import Path
from typing import List

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
import safe_io
from ingest_free_open_jobs import filter_legal_open_jobs


def _safe_get_json(url: str, timeout: int = 12):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "MzansiPathways-LegalFeed/1.0"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8", errors="replace"))
    except Exception:
        return None


def fetch_greenhouse_boards(root: Path) -> List[dict]:
    cfg_path = root / "data" / "public_ats_boards.json"
    if not cfg_path.exists():
        return []
    try:
        cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
    except Exception:
        return []
    loc_keys = [k.lower() for k in (cfg.get("saLocationKeywords") or ["south africa"])]
    out: List[dict] = []
    for board in cfg.get("greenhouseBoards") or []:
        slug = str(board.get("slug") or "").strip()
        if not slug:
            continue
        data = _safe_get_json(f"https://boards-api.greenhouse.io/v1/boards/{slug}/jobs")
        for j in (data or {}).get("jobs") or []:
            loc_name = str((j.get("location") or {}).get("name") or "")
            if not any(k in loc_name.lower() for k in loc_keys):
                continue
            out.append({
                "title": j.get("title", ""),
                "employer": board.get("employer") or slug,
                "town": loc_name or "South Africa",
                "province": board.get("defaultProvince") or "South Africa",
                "closingDate": "Open / Rolling",
                "sourceType": "public_ats_api",
                "officialUrl": j.get("absolute_url", ""),
            })
    return out



def fetch_lever_boards(root: Path) -> List[dict]:
    cfg_path = root / "data" / "public_ats_boards.json"
    if not cfg_path.exists():
        return []
    try:
        cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
    except Exception:
        return []
    loc_keys = [k.lower() for k in (cfg.get("saLocationKeywords") or ["south africa"])]
    out: List[dict] = []
    for board in cfg.get("leverBoards") or []:
        slug = str(board.get("slug") or "").strip()
        if not slug:
            continue
        data = _safe_get_json(f"https://api.lever.co/v0/postings/{slug}?mode=json")
        if not isinstance(data, list):
            continue
        for j in data:
            loc_name = str((j.get("categories") or {}).get("location") or "")
            if not any(k in loc_name.lower() for k in loc_keys):
                continue
            out.append({
                "title": j.get("text", ""),
                "employer": board.get("employer") or slug,
                "town": loc_name or "South Africa",
                "province": board.get("defaultProvince") or "South Africa",
                "closingDate": "Open / Rolling",
                "sourceType": "public_ats_api",
                "officialUrl": j.get("hostedUrl", ""),
            })
    return out


def fetch_adzuna_sa_jobs() -> List[dict]:
    app_id = os.environ.get("ADZUNA_APP_ID", "").strip()
    app_key = os.environ.get("ADZUNA_APP_KEY", "").strip()
    if not app_id or not app_key:
        return []
    url = f"https://api.adzuna.com/v1/api/jobs/za/search/1?app_id={app_id}&app_key={app_key}&results_per_page=25&max_days_old=14"
    data = _safe_get_json(url)
    out = []
    for r in (data or {}).get("results") or []:
        out.append({
            "title": r.get("title", ""),
            "employer": (r.get("company") or {}).get("display_name", "South African Employer"),
            "town": (r.get("location") or {}).get("display_name", "South Africa"),
            "province": "South Africa",
            "closingDate": "Open / Rolling",
            "sourceType": "open_api",
            "officialUrl": r.get("redirect_url", ""),
        })
    return out


def refresh_open_jobs(root: Path, offline: bool = False) -> dict:
    raw_jobs: List[dict] = []
    sub_file = root / "data" / "community_jobs_submissions.json"
    if sub_file.exists():
        try:
            raw_jobs.extend(json.loads(sub_file.read_text(encoding="utf-8")).get("jobs") or [])
        except Exception:
            pass

    net_jobs: List[dict] = []
    if not offline:
        for fn in (lambda: fetch_greenhouse_boards(root), lambda: fetch_lever_boards(root), fetch_adzuna_sa_jobs):
            try:
                net_jobs.extend(fn())
            except Exception:  # one broken source must never stop the others or the refresh
                pass
    raw_jobs.extend(net_jobs)

    out_path = root / "data" / "open_jobs_live.json"
    fetch_status = "ok" if (net_jobs or offline) else "network_unavailable"
    # Failsafe: if every live source returned nothing (outage, rate limit, no internet), keep the previous live jobs instead of wiping them.
    # Kept jobs go back through the same legality/expiry filter, so expired ones still drop out.
    if fetch_status == "network_unavailable" and out_path.exists():
        try:
            prev = json.loads(out_path.read_text(encoding="utf-8")).get("jobs") or []
            kept = [j for j in prev if isinstance(j, dict) and j.get("sourceType") in ("public_ats_api", "open_api", "direct_employer")]
            if kept:
                raw_jobs.extend(kept); fetch_status = "network_unavailable_kept_previous"
        except Exception:
            pass

    filtered = filter_legal_open_jobs(raw_jobs)
    payload = {
        "schemaVersion": 1,
        "generatedAt": datetime.date.today().isoformat(),
        "notice": "Copyright-safe factual metadata only (zero scraping). Expired closing dates are automatically removed.",
        "openCount": filtered["openCount"],
        "bySourceType": filtered.get("bySourceType", {}),
        "jobs": filtered["accepted"],
        "fetchStatus": fetch_status,
    }
    safe_io.file_backup(root, out_path, keep=7)       # yesterday's feed is kept in backups/files/
    safe_io.write_json(out_path, payload, indent=2)   # atomic and validated: a crash can never leave a half-written feed
    return payload


if __name__ == "__main__":
    root = Path(__file__).resolve().parent.parent
    offline = os.environ.get("MZANSI_OFFLINE", "0") == "1"
    res = refresh_open_jobs(root, offline=offline)
    print(f"Refreshed data/open_jobs_live.json (openCount={res['openCount']})")
