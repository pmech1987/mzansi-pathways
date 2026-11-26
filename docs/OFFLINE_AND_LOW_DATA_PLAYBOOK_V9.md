# Mzansi Pathways v13 — Offline, Low-Data & CI Timeout Playbook

- **Live Offline Pill (`#net-pill`):** Automatically alerts learners when mobile data drops (`📴 Offline`) while keeping cached Results, Careers, All Routes, and Evidence Vault working.
- **Full Family Dossier Export (`buildFamilyDossier()`):** Downloads a lightweight `.txt` summary (< 3 KB) of NSC/APS, Plan A/B/C, Affordability, and Document Readiness for parents or school counsellors.
- **30s CI Gate Timeout Failsafe (`run_all_20_gates.py`):** Every verification gate runs inside a strict 30-second timeout boundary so hung processes never stall automated checks.
