-- A school's own logo on its report cards, and an optional passport photo per
-- pupil.
--
-- Both are stored in the existing private bucket rather than a public one.
-- A child's photograph is the most sensitive thing this system holds: a public
-- URL is guessable-forever and survives the pupil leaving the school, so
-- everything here goes through short-lived signed URLs like the rest of the
-- files.

alter table public.schools add column logo_path text;

comment on column public.schools.logo_path is
  'Object path inside the school-files bucket, not a URL. URLs are signed on '
  'read so they expire; storing one would freeze a link that outlives the file.';

comment on column public.students.photo_url is
  'Object path inside the school-files bucket, despite the name. Predates the '
  'upload feature and is kept to avoid renaming a live column.';

-- ---------------------------------------------------------------------------
-- Storage access.
--
-- Two new kinds join class-notes / lesson-notes / assignments:
--
--   branding/       the school logo. Everyone in the school may read it — it
--                   appears on every report card — but only an admin may
--                   change it. A teacher should not be able to restyle the
--                   school's letterhead.
--
--   student-photos/ one folder per pupil, keyed by student id, so the policy
--                   can decide per child rather than per school. Staff see
--                   all; a pupil sees their own; a parent sees the children
--                   linked to them. That is the same rule the rest of the app
--                   applies to a pupil's record, expressed in storage.
-- ---------------------------------------------------------------------------

drop policy if exists "read school files" on storage.objects;

create policy "read school files" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'school-files'
    and (storage.foldername(name))[1] = (select private.current_school_id())::text
    and (
      -- Readable by the whole school.
      (storage.foldername(name))[2] in ('class-notes', 'branding')
      or (select private.is_staff())
      -- A pupil's photo: only that pupil, or a guardian linked to them.
      or (
        (storage.foldername(name))[2] = 'student-photos'
        and exists (
          select 1
          from public.students s
          where s.id::text = (storage.foldername(name))[3]
            and s.school_id = (select private.current_school_id())
            and (
              s.profile_id = (select auth.uid())
              or exists (
                select 1
                from public.student_guardians g
                where g.student_id = s.id
                  and g.profile_id = (select auth.uid())
              )
            )
        )
      )
    )
  );

-- Writes stay staff-only as before, with branding narrowed to admins. Written
-- as a replacement rather than an extra policy because storage policies are
-- permissive: an additional policy would widen access, not narrow it.
drop policy if exists "staff upload school files" on storage.objects;
drop policy if exists "staff update school files" on storage.objects;

create policy "staff upload school files" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'school-files'
    and (storage.foldername(name))[1] = (select private.current_school_id())::text
    and (select private.is_staff())
    and (
      (storage.foldername(name))[2] <> 'branding'
      or (select private.is_admin())
    )
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
    and (select private.is_staff())
    and (
      (storage.foldername(name))[2] <> 'branding'
      or (select private.is_admin())
    )
  );
