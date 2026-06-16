-- ── initial_strength ─────────────────────────────────────────────────────────
-- Stores the user's baseline strength test results from onboarding (or any
-- later recalibration). One row per user (unique constraint). The
-- calculate-scores edge function reads this on first run to seed muscle_stats.
create table if not exists public.initial_strength (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references public.users(id) on delete cascade,
  push_exercise   text,
  push_weight_kg  numeric,
  push_reps       int,
  pull_exercise   text,
  pull_weight_kg  numeric,
  pull_reps       int,
  legs_exercise   text,
  legs_weight_kg  numeric,
  legs_reps       int,
  recorded_at     timestamptz not null default now(),
  constraint initial_strength_user_unique unique (user_id)
);

alter table public.initial_strength enable row level security;

create policy "initial_strength_select" on public.initial_strength
  for select using (auth.uid() = user_id);
create policy "initial_strength_insert" on public.initial_strength
  for insert with check (auth.uid() = user_id);
create policy "initial_strength_update" on public.initial_strength
  for update using (auth.uid() = user_id);

-- ── muscle_stats: allow users to reset their own stats on recalibration ───────
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'muscle_stats'
      and policyname = 'muscle_stats_delete'
  ) then
    execute $policy$
      create policy "muscle_stats_delete" on public.muscle_stats
        for delete using (auth.uid() = user_id)
    $policy$;
  end if;
end $$;
