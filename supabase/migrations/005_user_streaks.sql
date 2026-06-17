-- ── user_streaks ──────────────────────────────────────────────────────────────
-- Public leaderboard table. One row per user, updated client-side after the
-- streak engine runs. Exposes only the display name and streak counts — no
-- sensitive profile data is accessible here.
create table if not exists public.user_streaks (
  user_id         uuid        primary key references public.users(id) on delete cascade,
  display_name    text        not null default 'Anonymous',
  current_streak  int         not null default 0,
  longest_streak  int         not null default 0,
  updated_at      timestamptz not null default now()
);

alter table public.user_streaks enable row level security;

-- Anyone (including authenticated users reading the leaderboard) can see all rows.
create policy "user_streaks_public_read" on public.user_streaks
  for select using (true);

-- Users can only write their own row.
create policy "user_streaks_own_insert" on public.user_streaks
  for insert with check (auth.uid() = user_id);

create policy "user_streaks_own_update" on public.user_streaks
  for update using (auth.uid() = user_id);
