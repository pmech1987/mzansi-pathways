# v93: Evolved South African Pathways, Reverse-APS Solver, BM25 Search & Autonomous Ops

Built directly on top of v92's self-running 14-check prospectus pipeline (`scripts/run_pipeline.py` + `scripts/push_data.sh` + `scripts/backup_data.py`):

## Added
- `js/core/pathways_v2_engines.js`: TVET NC(V) Level 4 statutory university articulation (Gazette 32743), official NBT readiness bands, Funza Lushaka 2027 pre-checker, NSFAS 15/30-day appeal & Propensity Letter navigator, Safari 7-day storage durability guard, and cross-browser Trusted Types policy.
- `js/core/reverse_aps_solver.js`: Exact minimum-percentage-delta Reverse-APS solver flagging <=3% borderline subjects as January DBE remark candidates.
- `js/data/bm25_shard_search.js`: Zero-dependency offline BM25 prefix-matching search engine.
- `js/core/trusted_dom.js`: Baseline 2026 Trusted Types DOM & local script-URL gate.
- `data/sa_extended_pathways.json`: CAS (`081 308 4196`) replacing discontinued CACH, Higher Health (`0800 36 36 36`), zero-rated SAYouth.mobi (`0800 72 72 72`), all 10 Public Nursing Colleges (SANC), 11 Public Colleges of Agriculture, and SAPS BPDLP / hardcopy-only SANDF MSDS.
- `scripts/prospectus_change_watcher.py`: Polite `ETag`/`Last-Modified` HEAD watchdog routed through `mz_common.safe_open` SSRF protection and `robots.txt`.
- `scripts/autonomous_ops.py`: SAST (`Africa/Johannesburg`) expired-record archiver and cryptographic SHA-384 Subresource Integrity manifest (`data/sri_manifest.json`).
- Behavioral test suites `tests/test_v93_evolved.mjs` & `scripts/test_v93_ops.py` wired into `scripts/run_all_checks.py`.
