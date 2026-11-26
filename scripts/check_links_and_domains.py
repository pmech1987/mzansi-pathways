#!/usr/bin/env python3
"""
Mzansi Pathways — Static External Link & Domain Safety Checker
--------------------------------------------------------------
Scans index.html, README.md, and data/programmes_2027.json to guarantee zero
insecure http:// links (excluding XML/SVG namespace URIs) and zero URL shorteners.
"""
import json
import re
from pathlib import Path

BLOCKED_DOMAINS = {"bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "rb.gy"}
URL_RE = re.compile(r"https?://[^\s\"'<>`)\]]+", re.IGNORECASE)


def audit_links(root: Path) -> dict:
    errors = []
    scanned = 0
    for rel in ["index.html", "README.md", "data/programmes_2027.json"]:
        fp = root / rel
        if not fp.exists():
            continue
        txt = fp.read_text(encoding="utf-8", errors="replace")
        for url in URL_RE.findall(txt):
            scanned += 1
            low = url.lower()
            if low.startswith("http://") and "w3.org" not in low:
                errors.append(f"{rel}: insecure plain HTTP link found: {url}")
            host = low.split("://", 1)[1].split("/", 1)[0].split(":", 1)[0]
            if host in BLOCKED_DOMAINS:
                errors.append(f"{rel}: blocked URL shortener domain found: {url}")
    return {"passed": len(errors) == 0, "scannedUrls": scanned, "errors": errors}


if __name__ == "__main__":
    print(json.dumps(audit_links(Path(".")), indent=2))
