# Mzansi Pathways v9 — Hidden Failsafe & Resilience Architecture

## 1. Client-Side Hidden Failsafes (`index.html`)
- **State Schema Auto-Repair (`repairState()`):** Validates every array, plan slot, affordability figure, and subject mark (`0..100`) on startup and after encrypted backup restore so corrupt `localStorage` never crashes the app.
- **Crash-Proof Render Boundary (`safeRender()`):** Wraps UI rendering in `try/catch`; if any unexpected render error occurs, resets only the transient view tab to `results` and shows a non-blocking recovery toast.
- **Global Unhandled Error Shield:** `window.addEventListener('error')` and `unhandledrejection` keep background errors from freezing low-cost Android browsers.
- **Keyboard Focus Visibility (`:focus-visible`):** High-contrast 3px outline on interactive controls for keyboard and switch-access users.

## 2. Backend & Matching Failsafes (`scripts/match_engine.py`)
- **NaN / Infinity / Bounds Clamping (`_safe_mark()`):** Clamps all marks to `0..100`, rejects `NaN`/`Inf`, and safely handles empty subject arrays.
- **Prospectus Sanity Bounds (`extract_prospectus_snippet_facts()`):** Rejects impossible APS (`> 42`) or percentages (`> 100%`) automatically.
- **25-Gate Fail-Closed CI (`scripts/gates/01..25`):** Blocks any release missing RLS policies, OTP limits, security headers, SHA-256 manifests, or crash-recovery guards.
