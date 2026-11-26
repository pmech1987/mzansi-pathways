# Mzansi Pathways — Multi-Stage Gate Authentication & Release Attestation (v20)

## 1. Three Independent Verification Layers Per Gate
Before any release is considered verified or deployed to GitHub Pages, every numbered gate in `scripts/gates/` passes through three separate checks in `scripts/verify_release.py`:
1. **Stage 1 — Pre-Execution Gate Authentication:**
   - Parses each gate script with Python `ast.parse()` to confirm valid syntax and a non-stub body.
   - Verifies each gate script's SHA-256 digest against `gate_integrity_manifest.json` so a tampered, emptied, or weakened gate fails closed before execution.
2. **Stage 2 — Triple Output Cross-Verification:**
   - Enforces a 30-second subprocess timeout guard (`timeout=30`).
   - Requires ALL THREE independent signals to agree: process exit code `0`, strict boolean JSON `"passed": true` with `"errors": []`, and a gate identifier matching the file's numbered prefix.
3. **Stage 3 — Cryptographic Release Attestation Seal:**
   - Generates `release_attestation.json` binding `integrity_manifest.json` (app/data SHA-256 hashes) and `gate_integrity_manifest.json` (all 62 gate SHA-256 hashes) into a single verifiable `attestation_sha256` fingerprint.
