# Mzansi Pathways — Frozen Selector & Data Contract (v127)

All UI screens read from these single-source selectors rather than recomputing numbers locally:

- `evaluateNsc(subs)` / `computeApsFor(method, subs)` (`js/engine.js`) -> `{ aps, apsMax, passLevel, complete, loltOk }`
- `MZCAT.query(subs, E, filters)` (`js/catalogue.js`) -> `{ rows: [{ p, inst, ev }], me }` (memoized per marks signature)
- `MZSelectors.getHome(state)` (`js/modules/selectors.js`) -> `{ province, canRelocate }`
- `MZSelectors.computeDistanceLabel(itemProvince, home)` -> `{ sameProvince, label, short }`
- `MZSelectors.getTrust(record)` -> `{ status, label, source, scam }`
- `MZSelectors.isSampleJob(record)` -> `boolean`
- `MZSelectors.getCounts(state)` -> `{ docsReady, docsTotal, planSize, savedJobs }`
- `data/data_manifest.json` (generated deterministically by `scripts/build_data_manifest.py`) -> canonical counts for institutions, programmes, statuses, and intake years.
