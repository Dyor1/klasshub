-- Homework: a teacher sets it, students submit, a teacher grades.
--
-- This is the first feature where a student WRITES, so two column-level rules
-- need triggers (RLS constrains rows, not columns):
--   * a student must not set their own score or feedback
--   * a student must not edit a submission after it has been graded

create type public.assignment_status as enum ('draft', 'published', 'closed');

create table public.assignments (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references public.schools (id) on delete cascade,
  class_id      uuid not null,
  subject_id    uuid,
  teacher_id    uuid,
  title         text not null check (length(btrim(title)) between 1 and 160),
  instructions  text,
  due_at        timestamptz,
  max_score     numeric(6,2) not null default 10 check (max_score > 0),
  allow_file    boolean not null default true,
  allow_text    boolean not null default true,
  status        public.assignment_status not null default 'draft',
  term          public.term not null,
  academic_year text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint assignment_needs_a_channel check (allow_file or allow_text),
  foreign key (class_id, school_id)   references public.classes  (id, school_id) on delete cascade,
  foreign key (subject_id, school_id) references public.subjects (id, school_id) on delete set null (subject_id),
  foreign key (teacher_id, school_id) references public.profiles (id, school_id) on delete set null (teacher_id)
);

create index assignments_school_idx  on public.assignments (school_id, created_at desc);
create index assignments_class_idx   on public.assignments (class_id, school_id);
create index assignments_subject_idx on public.assignments (subject_id, school_id);
create index assignments_teacher_idx on public.assignments (teacher_id, school_id);

alter table public.assignments enable row level security;

create policy "read assignments" on public.assignments
  for select to authenticated
  using (
    school_id = (select private.current_school_id())
    and (
      (select private.is_staff())
      or (status <> 'draft' and class_id in (select private.visible_class_ids()))
    )
  );
create policy "staff insert assignments" on public.assignments
  for insert to authenticated
  with check ( school_id = (select private.current_school_id()) and (select private.is_staff()) );
create policy "staff update assignments" on public.assignments
  for update to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_staff()) )
  with check ( school_id = (select private.current_school_id()) );
create policy "staff delete assignments" on public.assignments
  for delete to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_staff()) );

-- ---------------------------------------------------------------------------
-- submissions
-- ---------------------------------------------------------------------------
create table public.assignment_submissions (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references public.schools (id) on delete cascade,
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  student_id    uuid not null,
  body          text,
  file_path     text,
  file_name     text,
  file_size     bigint,
  submitted_at  timestamptz not null default now(),
  is_late       boolean not null default false,
  score         numeric(6,2) check (score is null or score >= 0),
  feedback      text,
  graded_by     uuid,
  graded_at     timestamptz,
  updated_at    timestamptz not null default now(),
  unique (assignment_id, student_id),
  foreign key (student_id, school_id) references public.students (id, school_id) on delete cascade,
  foreign key (graded_by, school_id)  references public.profiles (id, school_id) on delete set null (graded_by)
);

create index submissions_assignment_idx on public.assignment_submissions (assignment_id);
create index submissions_student_idx    on public.assignment_submissions (student_id, school_id);
create index submissions_school_idx     on public.assignment_submissions (school_id);
create index submissions_grader_idx     on public.assignment_submissions (graded_by, school_id);

alter table public.assignment_submissions enable row level security;

-- Staff see every submission; a student sees only their own, and a guardian
-- only their children's. A student can never see a classmate's work.
create policy "read submissions" on public.assignment_submissions
  for select to authenticated
  using (
    school_id = (select private.current_school_id())
    and ( (select private.is_staff()) or student_id in (select private.visible_student_ids()) )
  );

-- A student may submit only for themselves, and only to a published
-- assignment set for their own class.
create policy "student inserts own submission" on public.assignment_submissions
  for insert to authenticated
  with check (
    school_id = (select private.current_school_id())
    and student_id = (select private.my_student_id())
    and exists (
      select 1 from public.assignments a
      join public.students s on s.id = (select private.my_student_id())
      where a.id = assignment_id
        and a.status = 'published'
        and a.class_id = s.class_id
    )
  );
create policy "student updates own submission" on public.assignment_submissions
  for update to authenticated
  using (
    school_id = (select private.current_school_id())
    and student_id = (select private.my_student_id())
  )
  with check (
    school_id = (select private.current_school_id())
    and student_id = (select private.my_student_id())
  );

create policy "staff grade submissions" on public.assignment_submissions
  for update to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_staff()) )
  with check ( school_id = (select private.current_school_id()) );
create policy "staff delete submissions" on public.assignment_submissions
  for delete to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_staff()) );

-- ---------------------------------------------------------------------------
-- Column guards. RLS decides which rows a student may write; these decide
-- which columns.
-- ---------------------------------------------------------------------------
create or replace function private.guard_submission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_due timestamptz;
begin
  -- Lateness is decided by the server against the assignment's own due date,
  -- never by anything the client sends.
  select due_at into v_due from public.assignments where id = new.assignment_id;
  new.is_late := v_due is not null and new.submitted_at > v_due;

  if (select auth.uid()) is null or private.is_staff() then
    return new;
  end if;

  -- From here on the caller is a student editing their own row.
  if tg_op = 'INSERT' then
    if new.score is not null or new.feedback is not null or new.graded_by is not null then
      raise exception 'You cannot grade your own submission.' using errcode = '42501';
    end if;
    return new;
  end if;

  if old.graded_at is not null then
    raise exception 'This submission has already been graded and can no longer be edited.'
      using errcode = '42501';
  end if;
  if new.score is distinct from old.score
     or new.feedback is distinct from old.feedback
     or new.graded_by is distinct from old.graded_by
     or new.graded_at is distinct from old.graded_at then
    raise exception 'You cannot grade your own submission.' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger guard_submission
  before insert or update on public.assignment_submissions
  for each row execute function private.guard_submission();

create trigger touch_assignments before update on public.assignments
  for each row execute function private.touch_updated_at();
create trigger touch_submissions before update on public.assignment_submissions
  for each row execute function private.touch_updated_at();

grant select, insert, update, delete on public.assignments            to authenticated;
grant select, insert, update, delete on public.assignment_submissions to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: students may now upload, but only under their own folder.
-- Path becomes {school_id}/assignments/{auth.uid()}/{file}, so segment 3
-- proves ownership.
-- ---------------------------------------------------------------------------
drop policy "read school files" on storage.objects;
create policy "read school files" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'school-files'
    and (storage.foldername(name))[1] = (select private.current_school_id())::text
    and (
      (storage.foldername(name))[2] = 'class-notes'
      or (select private.is_staff())
      -- a student may read back their own uploaded work
      or (
        (storage.foldername(name))[2] = 'assignments'
        and (storage.foldername(name))[3] = (select auth.uid())::text
      )
    )
  );

drop policy "staff upload school files" on storage.objects;
create policy "upload school files" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'school-files'
    and (storage.foldername(name))[1] = (select private.current_school_id())::text
    and (
      (select private.is_staff())
      or (
        (storage.foldername(name))[2] = 'assignments'
        and (storage.foldername(name))[3] = (select auth.uid())::text
      )
    )
  );

drop policy "staff delete school files" on storage.objects;
create policy "delete school files" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'school-files'
    and (storage.foldername(name))[1] = (select private.current_school_id())::text
    and (
      (select private.is_staff())
      or (
        (storage.foldername(name))[2] = 'assignments'
        and (storage.foldername(name))[3] = (select auth.uid())::text
      )
    )
  );
