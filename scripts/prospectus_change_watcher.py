#!/usr/bin/env python3
"""scripts/prospectus_change_watcher.py — Polite ETag/Last-Modified Watchdog for Official SA PDFs"""
from __future__ import annotations

import datetime as dt
import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import mz_common

USER_AGENT = "MzansiPathways-ChangeWatcher/93.0 (+https://mzansi-pathways.pages.dev; head-check-only)"
DELAY_SEC = 1.5


def robots_allows(url: str) -> bool:
    p = urlparse(url)
    rp = RobotFileParser()
    robots_url = f"{p.scheme}://{p.netloc}/robots.txt"
    rp.set_url(robots_url)
    try:
        with mz_common.safe_open(robots_url, headers={"User-Agent": USER_AGENT}, timeout=8) as resp:
            rp.parse(resp.read().decode("utf-8", errors="ignore").splitlines())
        return rp.can_fetch(USER_AGENT, url)
    except urllib.error.HTTPError as err:
        return err.code == 404
    except Exception:
        return False


def diff_header_snapshot(entry: dict, previous_state: dict, headers_map: dict) -> dict:
    etag = headers_map.get("ETag")
    last_mod = headers_map.get("Last-Modified")
    length = headers_map.get("Content-Length")
    changed = bool(
        (etag and etag != previous_state.get("etag"))
        or (last_mod and last_mod != previous_state.get("lastModified"))
        or (length and length != previous_state.get("contentLength"))
    )
    return {
        "id": entry["id"],
        "name": entry.get("name", entry["id"]),
        "url": entry["url"],
        "status": "OK",
        "changed": changed,
        "etag": etag,
        "lastModified": last_mod,
        "contentLength": length,
        "checkedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
    }


def probe_source(entry: dict, previous_state: dict) -> dict:
    url = entry["url"]
    if not robots_allows(url):
        return {"id": entry["id"], "status": "SKIPPED_ROBOTS", "changed": False}
    time.sleep(DELAY_SEC)
    req_headers = {"User-Agent": USER_AGENT}
    if previous_state.get("etag"):
        req_headers["If-None-Match"] = previous_state["etag"]
    if previous_state.get("lastModified"):
        req_headers["If-Modified-Since"] = previous_state["lastModified"]
    try:
        with mz_common.safe_open(url, headers=req_headers, method="HEAD", timeout=12) as resp:
            return diff_header_snapshot(entry, previous_state, dict(resp.headers))
    except urllib.error.HTTPError as err:
        if err.code == 304:
            return {**previous_state, "status": "NOT_MODIFIED", "changed": False, "checkedAt": dt.datetime.now(dt.timezone.utc).isoformat()}
        return {"id": entry["id"], "name": entry.get("name", ""), "url": url, "status": f"HTTP_{err.code}", "changed": False}
    except Exception as exc:
        return {"id": entry["id"], "name": entry.get("name", ""), "url": url, "status": f"ERROR_{type(exc).__name__}", "changed": False}
