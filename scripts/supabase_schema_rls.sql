-- Mzansi Pathways v7: Production PostgreSQL + Row-Level Security (RLS) Schema
-- Ensures EVERY learner's marks, Plan A/B/C, applications, and Evidence Vault are
-- strictly isolated to their own authenticated account (auth.uid() = user_id).

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  province TEXT NOT NULL DEFAULT 'Mpumalanga',
  grade_stage TEXT NOT NULL DEFAULT 'Grade 12 / Matric',
  is_under_18 BOOLEAN NOT NULL DEFAULT FALSE,
  guardian_consent_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_profiles_owner_only ON user_profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS academic_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  subjects_json JSONB NOT NULL,
  confirmed_by_user BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE academic_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY academic_results_owner_only ON academic_results
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS saved_plans (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_a TEXT,
  plan_b TEXT,
  plan_c TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE saved_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY saved_plans_owner_only ON saved_plans
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS evidence_vault (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill TEXT NOT NULL,
  tools TEXT NOT NULL,
  story TEXT NOT NULL,
  include_in_cv BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE evidence_vault ENABLE ROW LEVEL SECURITY;
CREATE POLICY evidence_vault_owner_only ON evidence_vault
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
