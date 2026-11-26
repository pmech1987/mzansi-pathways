#!/usr/bin/env python3
"""
Mzansi Pathways v16 — Deterministic SA Statement-of-Results & Report Card Parser
--------------------------------------------------------------------------------
Zero-cloud, fail-closed parser for text extracted locally from an NSC Statement of
Results, school report card, or Google Lens / Live Text paste. Recognises South
African subjects, HL/FAL/SAL/LO flags, percentage marks (0-100), and NSC levels
(1-7), while flagging ambiguous or low-confidence rows for mandatory user review.
"""
import re
from typing import Dict, List

SUBJECT_ALIASES = [
    ("English Home Language", ["english home language", "english hl", "eng hl", "eng home"]),
    ("English First Additional Language", ["english first additional", "english fal", "eng fal"]),
    ("isiZulu Home Language", ["isizulu home language", "isizulu hl", "zulu hl"]),
    ("isiZulu First Additional Language", ["isizulu first additional", "isizulu fal", "zulu fal"]),
    ("Afrikaans Home Language", ["afrikaans home language", "afrikaans hl", "afr hl"]),
    ("Afrikaans First Additional Language", ["afrikaans first additional", "afrikaans fal", "afr fal"]),
    ("Sepedi Home Language", ["sepedi home language", "sepedi hl"]),
    ("Sesotho Home Language", ["sesotho home language", "sesotho hl"]),
    ("Setswana Home Language", ["setswana home language", "setswana hl"]),
    ("isiXhosa Home Language", ["isixhosa home language", "isixhosa hl"]),
    ("Mathematical Literacy", ["mathematical literacy", "maths lit", "math lit", "mlit"]),
    ("Mathematics", ["mathematics", "pure maths", "maths"]),
    ("Physical Sciences", ["physical sciences", "physical science", "physics"]),
    ("Life Sciences", ["life sciences", "life science", "biology"]),
    ("Life Orientation", ["life orientation", "life orient", "lo"]),
    ("Accounting", ["accounting", "acc"]),
    ("Business Studies", ["business studies", "business"]),
    ("Economics", ["economics", "econ"]),
    ("Geography", ["geography", "geog"]),
    ("History", ["history", "hist"]),
    ("Computer Applications Technology", ["computer applications technology", "cat"]),
    ("Information Technology", ["information technology", "it"]),
    ("Engineering Graphics and Design", ["engineering graphics and design", "egd"]),
    ("Tourism", ["tourism"]),
    ("Agricultural Sciences", ["agricultural sciences", "agric"]),
    ("Consumer Studies", ["consumer studies"]),
]


def _clamp_mark(val: int) -> int:
    return max(0, min(100, int(val)))


SA_ID_RE = re.compile(r"\b\d{13}\b")


def parse_statement_text(raw_text: str) -> Dict[str, object]:
    if isinstance(raw_text, str):
        raw_text = SA_ID_RE.sub("[redacted-id]", raw_text)
    if not isinstance(raw_text, str) or not raw_text.strip():
        return {"subjects": [], "warnings": ["Empty statement text provided."], "needsConfirmation": True}

    lines = [ln.strip() for ln in raw_text.splitlines() if ln.strip()][:80]
    found: Dict[str, dict] = {}
    warnings: List[str] = []

    for line in lines:
        low = re.sub(r"\s+", " ", line.lower())
        matched_name = None
        for canonical, aliases in SUBJECT_ALIASES:
            for alias in aliases:
                if re.search(r"\b" + re.escape(alias) + r"\b", low):
                    matched_name = canonical
                    break
            if matched_name:
                break
        if not matched_name:
            continue

        pct_matches = re.findall(r"\b(100|[1-9]?\d)\s*%", line)
        num_matches = re.findall(r"\b(100|[1-9]?\d)\b", line)
        ambiguous = False

        if pct_matches:
            mark = _clamp_mark(int(pct_matches[0]))
            if len(pct_matches) > 1:
                ambiguous = True
        else:
            candidates = [int(n) for n in num_matches if 10 <= int(n) <= 100]
            if not candidates:
                sym_map = {"A": 85, "B": 75, "C": 65, "D": 55, "E": 45, "F": 35}
                sym_m = re.search(r"\b([A-F])\b", line)
                lvl_m = re.search(r"\b(?:level|lvl)\s*([1-7])\b", low)
                if lvl_m:
                    lvl_mid = {1: 20, 2: 35, 3: 45, 4: 55, 5: 65, 6: 75, 7: 85}
                    mark = lvl_mid[int(lvl_m.group(1))]
                    ambiguous = True
                elif sym_m:
                    mark = sym_map[sym_m.group(1)]
                    ambiguous = True
                else:
                    warnings.append(f"No valid percentage mark found for {matched_name}; left blank for manual entry.")
                    mark = None
                    ambiguous = True
            else:
                mark = _clamp_mark(candidates[-1])
                if len(candidates) > 1:
                    ambiguous = True

        is_hl = "home language" in matched_name.lower() or bool(re.search(r"\bhl\b", low))
        is_lo = matched_name == "Life Orientation"

        found[matched_name] = {
            "name": matched_name,
            "mark": mark,
            "isHomeLanguage": is_hl,
            "isLifeOrientation": is_lo,
            "confidence": "review" if ambiguous else "high",
            "sourceLine": line[:120],
        }

    if not found:
        warnings.append("No South African NSC/TVET subject names matched. Check spelling or use manual entry.")

    return {
        "subjects": list(found.values()),
        "warnings": warnings,
        "needsConfirmation": True,
    }


if __name__ == "__main__":
    sample = (
        "English Home Language 64% (Level 5)\n"
        "isiZulu First Additional Language 66%\n"
        "Mathematics 58%\n"
        "Physical Sciences 54%\n"
        "Life Sciences 62%\n"
        "Life Orientation 74%\n"
    )
    import json
    print(json.dumps(parse_statement_text(sample), indent=2))
