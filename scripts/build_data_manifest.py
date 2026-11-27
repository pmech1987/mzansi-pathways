#!/usr/bin/env python3
"""Build deterministic data/data_manifest.json from data/institutions.json & data/catalogue.json.

Running twice with unchanged inputs produces byte-identical output (no wall-clock timestamp).
"""
import hashlib
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def build_manifest(root: Path = ROOT) -> dict:
    inst_doc = json.loads((root / "data" / "institutions.json").read_text(encoding="utf-8"))
    cat_doc = json.loads((root / "data" / "catalogue.json").read_text(encoding="utf-8"))
    insts = inst_doc.get("institutions", [])
    cat_insts = cat_doc.get("institutions", [])

    status_counts = Counter()
    per_inst = []
    total_progs = 0
    for ci in sorted(cat_insts, key=lambda x: x.get("id", "")):
        progs = ci.get("programmes", [])
        total_progs += len(progs)
        c = Counter(p.get("status", "indicative") for p in progs)
        for k, v in c.items():
            status_counts[k] += v
        per_inst.append({
            "id": ci.get("id"),
            "name": ci.get("name"),
            "programmeCount": len(progs),
            "verifiedCount": c.get("verified", 0),
            "indicativeCount": c.get("indicative", 0),
            "lastVerifiedAt": ci.get("lastVerifiedAt", ""),
        })

    h = hashlib.sha256()
    h.update((root / "data" / "catalogue.json").read_bytes())
    h.update((root / "data" / "institutions.json").read_bytes())

    manifest = {
        "schemaVersion": 1,
        "contentHash": h.hexdigest()[:16],
        "institutionsTotal": len(insts),
        "institutionsWithProgrammes": sum(1 for x in per_inst if x["programmeCount"] > 0),
        "institutionsWithoutProgrammes": len(insts) - sum(1 for x in per_inst if x["programmeCount"] > 0),
        "programmesTotal": total_progs,
        "programmesByStatus": dict(sorted(status_counts.items())),
        "institutions": per_inst,
    }
    out = root / "data" / "data_manifest.json"
    tmp = out.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    tmp.replace(out)
    return manifest


if __name__ == "__main__":
    m = build_manifest()
    print(f"DATA MANIFEST READY: institutions={m['institutionsTotal']} withProgrammes={m['institutionsWithProgrammes']} programmes={m['programmesTotal']} hash={m['contentHash']}")
