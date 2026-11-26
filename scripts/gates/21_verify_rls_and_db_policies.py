#!/usr/bin/env python3
"""Gate 21: Verifies every PostgreSQL user table enforces Row-Level Security (auth.uid() = user_id)."""
import json, re
from pathlib import Path

REQUIRED_TABLES = ("user_profiles", "academic_results", "saved_plans", "evidence_vault")

def run(root: Path = Path(".")) -> dict:
    errors = []
    sql_p = root / "scripts" / "supabase_schema_rls.sql"
    if not sql_p.exists():
        return {"gate": "21_rls_and_db_policies", "passed": False, "errors": ["Missing scripts/supabase_schema_rls.sql"]}
    sql = sql_p.read_text(encoding="utf-8")
    for tbl in REQUIRED_TABLES:
        if f"ALTER TABLE {tbl} ENABLE ROW LEVEL SECURITY" not in sql:
            errors.append(f"Table '{tbl}' missing ENABLE ROW LEVEL SECURITY")
        if not re.search(rf"ON\s+{tbl}.*auth\.uid\(\)\s*=\s*user_id", sql, re.S):
            errors.append(f"Table '{tbl}' missing auth.uid() = user_id RLS policy")
    return {"gate": "21_rls_and_db_policies", "passed": not errors, "errors": errors}

if __name__ == "__main__":
    r = run(); print(json.dumps(r)); raise SystemExit(0 if r["passed"] else 1)
