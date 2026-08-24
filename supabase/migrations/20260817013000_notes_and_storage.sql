-- Class notes (materials shared TO students) and lesson notes (a teacher's
-- plans submitted FOR admin approval). Both carry an uploaded file.
--
-- Files live in one private bucket, keyed by path: {school_id}/{kind}/{file}.
-- Storage RLS reads the school out of the first path segment, so a file can
-- only ever be reached by its own tenant.

create type public.lesson_note_status as enum ('draft', 'submitted', 'approved', 'rejected');

-- ---------------------------------------------------------------------------
-- class_notes — visible to the class they belong to
-- ---------------------------------------------------------------------------
create table public.class_notes (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references public.schools (id) on delete cascade,
  class_id      uuid not null,
  subject_id    uuid,
  title         text not null check (length(btrim(title)) between 1 and 160),
  description   text,
  file_path     text not null,
  file_name     text not null,
  file_size     bigint,
  file_type     text,
  academic_year text not null,
  term          public.term,
  uploaded_by   uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  foreign key (class_id, school_id)    references public.classes  (id, school_id) on delete cascade,
  foreign key (subject_id, school_id)  references public.subjects (id, school_id) on delete set null (subject_id),
  foreign key (uploaded_by, school_id) references public.profiles (id, school_id) on delete set null (uploaded_by)
);

create index class_notes_school_idx   on public.class_notes (school_id, created_at desc);
create index class_notes_class_idx    on public.class_notes (class_id, school_id);
create index class_notes_subject_idx  on public.class_notes (subject_id, school_id);
create index class_notes_uploader_idx on public.class_notes (uploaded_by, school_id);

alter table public.class_notes enable row level security;

create policy "read class notes" on public.class_notes
  for select to authenticated
  using (
    school_id = (select private.current_school_id())
    and (
      (select private.is_staff())
      or class_id in (select private.visible_class_ids())
    )
  );
create policy "staff insert class notes" on public.class_notes
  for insert to authenticated
  with check ( school_id = (select private.current_school_id()) and (select private.is_staff()) );
create policy "staff update class notes" on public.class_notes
  for update to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_staff()) )
  with check ( school_id = (select private.current_school_id()) );
create policy "staff delete class notes" on public.class_notes
  for delete to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_staff()) );

-- ---------------------------------------------------------------------------
-- lesson_notes — a teacher's own plans, reviewed by an admin
-- ---------------------------------------------------------------------------
create table public.lesson_notes (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references public.schools (id) on delete cascade,
  teacher_id    uuid not null,
  class_id      uuid,
  subject_id    uuid,
  week_number   int check (week_number is null or week_number between 1 and 20),
  topic         text not null check (length(btrim(topic)) between 1 and 200),
  description   text,
  term          public.term not null,
  academic_year text not null,
  file_path     text,
  file_name     text,
  file_size     bigint,
  file_type     text,
  status        public.lesson_note_status not null default 'submitted',
  admin_feedback text,
  reviewed_by   uuid,
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  foreign key (teacher_id, school_id)  references public.profiles (id, school_id) on delete cascade,
  foreign key (class_id, school_id)    references public.classes  (id, school_id) on delete set null (class_id),
  foreign key (subject_id, school_id)  references public.subjects (id, school_id) on delete set null (subject_id),
  foreign key (reviewed_by, school_id) references public.profiles (id, school_id) on delete set null (reviewed_by)
);

create index lesson_notes_school_idx   on public.lesson_notes (school_id, created_at desc);
create index lesson_notes_teacher_idx  on public.lesson_notes (teacher_id, school_id);
create index lesson_notes_class_idx    on public.lesson_notes (class_id, school_id);
create index lesson_notes_subject_idx  on public.lesson_notes (subject_id, school_id);
create index lesson_notes_reviewer_idx on public.lesson_notes (reviewed_by, school_id);

alter table public.lesson_notes enable row level security;

-- A teacher sees only their own notes; an admin sees every note in the school.
create policy "read lesson notes" on public.lesson_notes
  for select to authenticated
  using (
    school_id = (select private.current_school_id())
    and ( (select private.is_admin()) or teacher_id = (select auth.uid()) )
  );
create policy "teacher inserts own lesson notes" on public.lesson_notes
  for insert to authenticated
  with check (
    school_id = (select private.current_school_id())
    and (select private.is_staff())
    and ( teacher_id = (select auth.uid()) or (select private.is_admin()) )
  );
create policy "update lesson notes" on public.lesson_notes
  for update to authenticated
  using (
    school_id = (select private.current_school_id())
    and ( (select private.is_admin()) or teacher_id = (select auth.uid()) )
  )
  with check ( school_id = (select private.current_school_id()) );
create policy "delete lesson notes" on public.lesson_notes
  for delete to authenticated
  using (
    school_id = (select private.current_school_id())
    and ( (select private.is_admin()) or teacher_id = (select auth.uid()) )
  );

-- A teacher must not be able to approve their own note. Only the review
-- columns are guarded; everything else stays editable by the owner.
create or replace function private.guard_lesson_note_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    return new;
  end if;

  if (new.status is distinct from old.status
      or new.admin_feedback is distinct from old.admin_feedback
      or new.reviewed_by is distinct from old.reviewed_by)
     and not private.is_admin() then
    raise exception 'Only an administrator can review a lesson note.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger guard_lesson_note_review
  before update on public.lesson_notes
  for each row execute function private.guard_lesson_note_review();

create trigger touch_class_notes before update on public.class_notes
  for each row execute function private.touch_updated_at();
create trigger touch_lesson_notes before update on public.lesson_notes
  for each row execute function private.touch_updated_at();

grant select, insert, update, delete on public.class_notes  to authenticated;
grant select, insert, update, delete on public.lesson_notes to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: one private bucket, partitioned by school in the object path.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('school-files', 'school-files', false, 20971520)
on conflict (id) do nothing;

-- Path shape: {school_id}/{kind}/{filename}
--   [1] = school_id   [2] = 'class-notes' | 'lesson-notes'
--
-- Reads: class notes are readable by anyone in the school (students need to
-- download them); lesson notes are staff-only.
create policy "read school files" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'school-files'
    and (storage.foldername(name))[1] = (select private.current_school_id())::text
    and (
      (storage.foldername(name))[2] = 'class-notes'
      or (select private.is_staff())
    )
  );

-- Writes are staff-only. Upsert needs INSERT + SELECT + UPDATE, so all three
-- exist — granting INSERT alone makes file replacement fail silently.
create policy "staff upload school files" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'school-files'
    and (storage.foldername(name))[1] = (select private.current_school_id())::text
    and (select private.is_staff())
  );
create policy "staff update school files" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'school-files'
    and (storage.foldername(name))[1] = (select private.current_school_id())::text
    and (select private.is_staff())
  )
  with check (
    bucket_id = 'school-files'
    and (storage.foldername(name))[1] = (select private.current_school_id())::text
  );
create policy "staff delete school files" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'school-files'
    and (storage.foldername(name))[1] = (select private.current_school_id())::text
    and (select private.is_staff())
  );
