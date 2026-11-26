#!/usr/bin/env python3
"""Generates a deterministic, audit-grounded CHANGELOG.md from verified repo state."""
import json
from pathlib import Path


def generate_changelog(root: Path) -> Path:
    gates = sorted((f for f in (root / "scripts" / "gates").glob("*_verify_*.py") if f.name.split("_", 1)[0].isdigit()), key=lambda f: int(f.name.split("_", 1)[0]))
    docs = sorted((root / "docs").glob("*.md"))
    progs = json.loads((root / "data" / "programmes_2027.json").read_text(encoding="utf-8")).get("programmes") or []
    manifest = json.loads((root / "integrity_manifest.json").read_text(encoding="utf-8"))

    lines = [
        "# Mzansi Pathways — Release Changelog",
        "",
        "## v48 (Current Verified Release)",
        f"- **Verification Suite:** {len(gates)} automated security, determinism, accessibility, and governance gates.",
        f"- **Documentation Suite:** {len(docs)} specification and operational guides under `docs/`.",
        f"- **2027 Pathway Fixtures:** {len(progs)} schema-validated South African pathway records in `data/programmes_2027.json`.",
        "- **Frontend Enhancements:** Institutional Deep Slate civic UI (zero cartoon emojis), first-class 2-way Results entry (`Enter Manually | Scan Report Photo`), live scanner APS preview, full subject Undo stack, expandable NSC Level 1–7 APS scale reference, skippable 7-step interactive tutorial with live demos, consolidated Settings modal with 1-tap Reset Preferences, NSFAS/Missing Middle pre-check, and formula-injection-safe CSV export.",
        "- **GitHub & PWA Hardening:** Network-first `sw.js` (`mzansi-pathways-v48`), fail-closed GitHub Pages CI (`deploy-pages.yml`), static link/domain hygiene checker (`scripts/check_links_and_domains.py`), and SHA-256 integrity manifest.",
        "",
        "## Tracked SHA-256 Fingerprints",
    ]
    for fname, digest in sorted((manifest.get("sha256") or {}).items()):
        lines.append(f"- `{fname}`: `{digest[:16]}...`")

    out = root / "CHANGELOG.md"
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return out


if __name__ == "__main__":
    p = generate_changelog(Path("."))
    print(f"Wrote {p}")
