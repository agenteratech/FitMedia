-- ── Community foundation ─────────────────────────────────────────────────────
-- Public profiles + social feed (posts, likes, comments, saves) + follow graph.
-- Follows the public-denormalized-table pattern used by user_streaks so the
-- private `users` table RLS is never loosened — the feed/leaderboard read author
-- info from `profiles`, which is public-readable but safe (no PII).

-- ── profiles ─────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  user_id         uuid        primary key references public.users(id) on delete cascade,
  username        text        unique,
  display_name    text        not null default 'Athlete',
  avatar_url      text,
  bio             text,
  post_count      int         not null default 0,
  follower_count  int         not null default 0,
  following_count int         not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_public_read" on public.profiles
  for select using (true);
create policy "profiles_own_insert" on public.profiles
  for insert with check (auth.uid() = user_id);
create policy "profiles_own_update" on public.profiles
  for update using (auth.uid() = user_id);

-- Auto-create a profile whenever a users row is created (chains off the existing
-- auth.users -> public.users trigger).
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, coalesce(nullif(new.name, ''), 'Athlete'))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_user_created_profile on public.users;
create trigger on_user_created_profile
  after insert on public.users
  for each row execute function public.handle_new_user_profile();

-- Backfill profiles for existing users.
insert into public.profiles (user_id, display_name)
select id, coalesce(nullif(name, ''), 'Athlete') from public.users
on conflict (user_id) do nothing;

-- ── posts ────────────────────────────────────────────────────────────────────
create table if not exists public.posts (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references public.users(id) on delete cascade,
  type          text        not null default 'text'
                  check (type in ('text', 'workout', 'pr', 'achievement', 'photo')),
  caption       text,
  image_url     text,
  workout_id    uuid        references public.workouts(id) on delete set null,
  meta          jsonb       not null default '{}'::jsonb,
  like_count    int         not null default 0,
  comment_count int         not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists posts_user_id_idx   on public.posts (user_id);

alter table public.posts enable row level security;

create policy "posts_public_read" on public.posts
  for select using (true);
create policy "posts_own_insert" on public.posts
  for insert with check (auth.uid() = user_id);
create policy "posts_own_update" on public.posts
  for update using (auth.uid() = user_id);
create policy "posts_own_delete" on public.posts
  for delete using (auth.uid() = user_id);

-- ── post_likes ───────────────────────────────────────────────────────────────
create table if not exists public.post_likes (
  post_id    uuid        not null references public.posts(id) on delete cascade,
  user_id    uuid        not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.post_likes enable row level security;

create policy "post_likes_public_read" on public.post_likes
  for select using (true);
create policy "post_likes_own_insert" on public.post_likes
  for insert with check (auth.uid() = user_id);
create policy "post_likes_own_delete" on public.post_likes
  for delete using (auth.uid() = user_id);

-- ── post_comments ────────────────────────────────────────────────────────────
create table if not exists public.post_comments (
  id         uuid        primary key default gen_random_uuid(),
  post_id    uuid        not null references public.posts(id) on delete cascade,
  user_id    uuid        not null references public.users(id) on delete cascade,
  body       text        not null,
  created_at timestamptz not null default now()
);

create index if not exists post_comments_post_idx on public.post_comments (post_id, created_at);

alter table public.post_comments enable row level security;

create policy "post_comments_public_read" on public.post_comments
  for select using (true);
create policy "post_comments_own_insert" on public.post_comments
  for insert with check (auth.uid() = user_id);
create policy "post_comments_own_delete" on public.post_comments
  for delete using (auth.uid() = user_id);

-- ── post_saves (private bookmarks) ───────────────────────────────────────────
create table if not exists public.post_saves (
  post_id    uuid        not null references public.posts(id) on delete cascade,
  user_id    uuid        not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.post_saves enable row level security;

create policy "post_saves_own_read" on public.post_saves
  for select using (auth.uid() = user_id);
create policy "post_saves_own_insert" on public.post_saves
  for insert with check (auth.uid() = user_id);
create policy "post_saves_own_delete" on public.post_saves
  for delete using (auth.uid() = user_id);

-- ── follows ──────────────────────────────────────────────────────────────────
create table if not exists public.follows (
  follower_id  uuid        not null references public.users(id) on delete cascade,
  following_id uuid        not null references public.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_no_self check (follower_id <> following_id)
);

create index if not exists follows_following_idx on public.follows (following_id);

alter table public.follows enable row level security;

create policy "follows_public_read" on public.follows
  for select using (true);
create policy "follows_own_insert" on public.follows
  for insert with check (auth.uid() = follower_id);
create policy "follows_own_delete" on public.follows
  for delete using (auth.uid() = follower_id);

-- ── count-maintenance triggers ───────────────────────────────────────────────
-- Likes → posts.like_count
create or replace function public.bump_post_like_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;
drop trigger if exists post_likes_count on public.post_likes;
create trigger post_likes_count
  after insert or delete on public.post_likes
  for each row execute function public.bump_post_like_count();

-- Comments → posts.comment_count
create or replace function public.bump_post_comment_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;
drop trigger if exists post_comments_count on public.post_comments;
create trigger post_comments_count
  after insert or delete on public.post_comments
  for each row execute function public.bump_post_comment_count();

-- Posts → profiles.post_count
create or replace function public.bump_profile_post_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set post_count = post_count + 1 where user_id = new.user_id;
  elsif tg_op = 'DELETE' then
    update public.profiles set post_count = greatest(post_count - 1, 0) where user_id = old.user_id;
  end if;
  return null;
end;
$$;
drop trigger if exists posts_profile_count on public.posts;
create trigger posts_profile_count
  after insert or delete on public.posts
  for each row execute function public.bump_profile_post_count();

-- Follows → profiles.follower_count / following_count
create or replace function public.bump_follow_counts()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set following_count = following_count + 1 where user_id = new.follower_id;
    update public.profiles set follower_count  = follower_count  + 1 where user_id = new.following_id;
  elsif tg_op = 'DELETE' then
    update public.profiles set following_count = greatest(following_count - 1, 0) where user_id = old.follower_id;
    update public.profiles set follower_count  = greatest(follower_count  - 1, 0) where user_id = old.following_id;
  end if;
  return null;
end;
$$;
drop trigger if exists follows_counts on public.follows;
create trigger follows_counts
  after insert or delete on public.follows
  for each row execute function public.bump_follow_counts();
