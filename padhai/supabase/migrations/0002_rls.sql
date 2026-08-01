-- Row Level Security: every row is reachable only by the student who owns it.
-- The shared question bank (owner_id is null) is readable by any signed-in student.

alter table public.padhai_profiles  enable row level security;
alter table public.padhai_progress  enable row level security;
alter table public.padhai_logs      enable row level security;
alter table public.padhai_resources enable row level security;
alter table public.padhai_questions enable row level security;
alter table public.padhai_sessions  enable row level security;
alter table public.padhai_attempts  enable row level security;

drop policy if exists padhai_profiles_sel on public.padhai_profiles;
create policy padhai_profiles_sel on public.padhai_profiles for select to authenticated using (id = (select auth.uid()));
drop policy if exists padhai_profiles_ins on public.padhai_profiles;
create policy padhai_profiles_ins on public.padhai_profiles for insert to authenticated with check (id = (select auth.uid()));
drop policy if exists padhai_profiles_upd on public.padhai_profiles;
create policy padhai_profiles_upd on public.padhai_profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists padhai_progress_sel on public.padhai_progress;
create policy padhai_progress_sel on public.padhai_progress for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists padhai_progress_ins on public.padhai_progress;
create policy padhai_progress_ins on public.padhai_progress for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists padhai_progress_upd on public.padhai_progress;
create policy padhai_progress_upd on public.padhai_progress for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists padhai_progress_del on public.padhai_progress;
create policy padhai_progress_del on public.padhai_progress for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists padhai_logs_sel on public.padhai_logs;
create policy padhai_logs_sel on public.padhai_logs for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists padhai_logs_ins on public.padhai_logs;
create policy padhai_logs_ins on public.padhai_logs for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists padhai_logs_del on public.padhai_logs;
create policy padhai_logs_del on public.padhai_logs for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists padhai_res_sel on public.padhai_resources;
create policy padhai_res_sel on public.padhai_resources for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists padhai_res_ins on public.padhai_resources;
create policy padhai_res_ins on public.padhai_resources for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists padhai_res_upd on public.padhai_resources;
create policy padhai_res_upd on public.padhai_resources for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists padhai_res_del on public.padhai_resources;
create policy padhai_res_del on public.padhai_resources for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists padhai_q_sel on public.padhai_questions;
create policy padhai_q_sel on public.padhai_questions for select to authenticated
  using (owner_id is null or owner_id = (select auth.uid()));
drop policy if exists padhai_q_ins on public.padhai_questions;
create policy padhai_q_ins on public.padhai_questions for insert to authenticated with check (owner_id = (select auth.uid()));
drop policy if exists padhai_q_upd on public.padhai_questions;
create policy padhai_q_upd on public.padhai_questions for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists padhai_q_del on public.padhai_questions;
create policy padhai_q_del on public.padhai_questions for delete to authenticated using (owner_id = (select auth.uid()));

drop policy if exists padhai_ses_sel on public.padhai_sessions;
create policy padhai_ses_sel on public.padhai_sessions for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists padhai_ses_ins on public.padhai_sessions;
create policy padhai_ses_ins on public.padhai_sessions for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists padhai_ses_upd on public.padhai_sessions;
create policy padhai_ses_upd on public.padhai_sessions for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists padhai_att_sel on public.padhai_attempts;
create policy padhai_att_sel on public.padhai_attempts for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists padhai_att_ins on public.padhai_attempts;
create policy padhai_att_ins on public.padhai_attempts for insert to authenticated with check (user_id = (select auth.uid()));

-- private per-student storage bucket for uploaded material (50 MB per file)
insert into storage.buckets (id, name, public, file_size_limit)
values ('padhai-resources', 'padhai-resources', false, 52428800)
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

drop policy if exists padhai_storage_read on storage.objects;
create policy padhai_storage_read on storage.objects for select to authenticated
  using (bucket_id = 'padhai-resources' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists padhai_storage_write on storage.objects;
create policy padhai_storage_write on storage.objects for insert to authenticated
  with check (bucket_id = 'padhai-resources' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists padhai_storage_del on storage.objects;
create policy padhai_storage_del on storage.objects for delete to authenticated
  using (bucket_id = 'padhai-resources' and (storage.foldername(name))[1] = (select auth.uid())::text);
