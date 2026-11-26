# Mzansi Pathways — Civic Design System & Institutional Trust Standard (v14)

## 1. Authoritative Civic Interface
- **Institutional Notice Bar (`#civic-trust-bar`):** Displays independent-tool attribution, DHET/QCTO/SAQA/NSFAS verification guidance, on-device privacy status, and the official government CAS WhatsApp number (`081 308 4196`) at the top of every view.
- **Uncluttered Navigation & Deep Slate Hierarchy:** Primary navigation tabs (`Results`, `Careers`, `All Routes`, `Plan A/B/C`, `Evidence & CV`, `Work & Scams`) and the Deep Slate hero banner avoid casual emoji clutter and chat-room framing, presenting deterministic NSC/APS assessment and planning tracks (`Standard Intake`, `Bridging & Support Routes`, `Rewrite / Subject Upgrade`).

## 2. First-Class 2-Way Results Entry
- Right at the top of the **Results** panel, learners choose between **Enter Manually** (`#mode-manual-btn`) and **Scan Report Photo** (`#scan-results-btn`), elevating the on-device Image-to-Result Statement Scanner as an equal primary entry method.

## 3. Consolidated Settings & Privacy Controls
- **Settings Modal (`#settings-modal`):** Houses `Home Province`, `Language`, `Parent / Guardian View`, `Easy View`, `Large Text (A+)`, `High Contrast (HC)`, `Dark Mode`, **Import Custom Prospectus Rules (`.json`)** (`#import-rules-file`), and direct shortcuts to **Sync & Backup** and **Replay Tour**.

## 4. Zero-Emoji Institutional Polish & Release Integrity
- Gate 40 (`40_verify_institutional_polish_and_integrity.py`) enforces zero cartoon emojis in `index.html`, frontend `validateStateIntegrity()` deduplication/reference checks, backend `audit_profile_integrity()` in `scripts/match_engine.py`, and timed JSON reporting via `scripts/verify_release.py` (`release_verification_report.json`).
