-- ── muscle_stats ─────────────────────────────────────────────────────────────
-- Persists per-user per-muscle RPG stat values between sessions.
create table if not exists public.muscle_stats (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references public.users(id) on delete cascade,
  muscle_group    text        not null,
  current_stat    numeric     not null default 0,
  all_time_max    numeric     not null default 0,
  last_trained_at timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint muscle_stats_group_check check (
    muscle_group in ('chest', 'back', 'shoulders', 'arms', 'legs', 'core')
  ),
  constraint muscle_stats_user_group_unique unique (user_id, muscle_group)
);

alter table public.muscle_stats enable row level security;

create policy "muscle_stats_select" on public.muscle_stats
  for select using (auth.uid() = user_id);

create policy "muscle_stats_insert" on public.muscle_stats
  for insert with check (auth.uid() = user_id);

create policy "muscle_stats_update" on public.muscle_stats
  for update using (auth.uid() = user_id);

-- ── unique constraint on daily_scores (user_id, date) ────────────────────────
-- Required for upsert onConflict in the calculate-scores Edge Function.
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'daily_scores_user_date_unique'
      and table_name = 'daily_scores'
      and table_schema = 'public'
  ) then
    alter table public.daily_scores
      add constraint daily_scores_user_date_unique unique (user_id, date);
  end if;
end $$;
