-- PadhAI — JEE Main study tracker (Hindi medium)
-- Only user-owned data lives here. The syllabus (subjects / chapters / topics and the
-- 2021-26 weightage numbers) is static reference data and ships in assets/js/syllabus.js,
-- so chapter_id / topic_id below are plain text keys from that file.
-- All tables are prefixed padhai_ because this Supabase project is shared with other apps.

create table if not exists public.padhai_profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  name           text,
  target_exam    text not null default 'JEE Main 2027',
  exam_date      date not null default '2027-01-24',
  daily_goal_min int  not null default 360,
  created_at     timestamptz not null default now()
);

-- one row per (user, chapter): the five checkpoints that make a chapter "done"
create table if not exists public.padhai_progress (
  user_id        uuid not null references auth.users(id) on delete cascade,
  chapter_id     text not null,
  lecture_done   boolean not null default false,
  dpp_done       boolean not null default false,
  module_done    boolean not null default false,
  pyq_count      int     not null default 0,   -- target lives in syllabus.js (default 100)
  test_score     numeric(5,2),                 -- percent; null = test not attempted
  confidence     int     not null default 0 check (confidence between 0 and 5),
  revision_count int     not null default 0,
  last_studied   date,
  notes          text,
  updated_at     timestamptz not null default now(),
  primary key (user_id, chapter_id)
);

-- every study action, feeds the daily analysis
create table if not exists public.padhai_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  chapter_id text,
  activity   text not null check (activity in ('lecture','dpp','module','pyq','test','revision')),
  qty        int  not null default 1,
  minutes    int  not null default 0,
  score      numeric(5,2),
  log_date   date not null default ((now() at time zone 'Asia/Kolkata')::date),
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists padhai_logs_user_date_idx on public.padhai_logs(user_id, log_date desc);

-- uploaded books / DPPs / modules / BIQs / PYQ papers
create table if not exists public.padhai_resources (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  kind       text not null check (kind in ('book','dpp','module','pyq','biq','notes','other')),
  subject_id text,
  chapter_id text,
  year       int,
  file_path  text,                    -- path inside storage bucket 'padhai-resources'
  file_size  bigint,
  mime_type  text,
  created_at timestamptz not null default now()
);
create index if not exists padhai_resources_user_idx on public.padhai_resources(user_id, created_at desc);

-- question bank: owner_id null = shared bank, otherwise the student's own imports
create table if not exists public.padhai_questions (
  id          uuid primary key default gen_random_uuid(),
  subject_id  text not null,
  chapter_id  text not null,
  topic_id    text,
  year        int,                    -- PYQ year; null = practice question
  exam        text not null default 'JEE Main',
  shift       text,
  q_type      text not null default 'mcq' check (q_type in ('mcq','numeric')),
  question_hi text not null,
  question_en text,
  options     jsonb,                  -- [{"key":"A","hi":"…"}, …]
  answer      text not null,          -- 'A'…'D' for mcq, value as text for numeric
  solution_hi text,
  difficulty  text not null default 'medium' check (difficulty in ('easy','medium','hard')),
  source      text,
  owner_id    uuid references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);
create index if not exists padhai_questions_chapter_idx on public.padhai_questions(chapter_id, difficulty);
create index if not exists padhai_questions_year_idx    on public.padhai_questions(year);
create index if not exists padhai_questions_owner_idx   on public.padhai_questions(owner_id);

create table if not exists public.padhai_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  config      jsonb not null default '{}'::jsonb,
  total       int not null default 0,
  correct     int not null default 0,
  wrong       int not null default 0,
  skipped     int not null default 0,
  seconds     int not null default 0,
  started_at  timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists padhai_sessions_user_idx on public.padhai_sessions(user_id, started_at desc);

create table if not exists public.padhai_attempts (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.padhai_sessions(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.padhai_questions(id) on delete cascade,
  chapter_id  text,
  chosen      text,
  is_correct  boolean not null default false,
  seconds     int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists padhai_attempts_user_idx    on public.padhai_attempts(user_id, created_at desc);
create index if not exists padhai_attempts_chapter_idx on public.padhai_attempts(user_id, chapter_id);

-- auto-provision a profile row when a user signs up
create or replace function public.padhai_handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.padhai_profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists padhai_on_auth_user_created on auth.users;
create trigger padhai_on_auth_user_created
  after insert on auth.users
  for each row execute function public.padhai_handle_new_user();

create or replace function public.padhai_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists padhai_progress_touch on public.padhai_progress;
create trigger padhai_progress_touch
  before update on public.padhai_progress
  for each row execute function public.padhai_touch_updated_at();
