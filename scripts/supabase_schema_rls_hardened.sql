-- scripts/supabase_schema_rls_hardened.sql
-- Deploy ONLY if optional 18+ adult client-side-encrypted sync is explicitly enabled
create schema if not exists private;
create table if not exists public.adult_learner_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  is_adult_attested boolean not null check (is_adult_attested = true),
  encrypted_payload text not null check (octet_length(encrypted_payload) <= 262144),
  updated_at timestamptz not null default now()
);
create index if not exists idx_adult_learner_plans_user_id on public.adult_learner_plans (user_id);
alter table public.adult_learner_plans enable row level security;
alter table public.adult_learner_plans force row level security;
revoke all on table public.adult_learner_plans from anon, authenticated, public;
grant select, insert, update, delete on table public.adult_learner_plans to authenticated;
create policy "owner_select_own_plan" on public.adult_learner_plans for select to authenticated using ((select auth.uid()) = user_id);
create policy "owner_insert_own_plan" on public.adult_learner_plans for insert to authenticated with check ((select auth.uid()) = user_id and is_adult_attested = true);
create policy "owner_update_own_plan" on public.adult_learner_plans for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and is_adult_attested = true);
create policy "owner_delete_own_plan" on public.adult_learner_plans for delete to authenticated using ((select auth.uid()) = user_id);
create or replace view public.v_my_plan_summary with (security_invoker = true) as select id, updated_at from public.adult_learner_plans;
revoke all on public.v_my_plan_summary from anon, public;
grant select on public.v_my_plan_summary to authenticated;
