-- Advisor follow-up on the academic tables.
--
-- 1. `for all` write policies also match SELECT, so every read evaluated both
--    the read policy and the write policy. Split writes into explicit
--    INSERT/UPDATE/DELETE and collapse each table to a single SELECT policy.
-- 2. Composite FKs (col, school_id) need composite covering indexes; the
--    single-column indexes did not cover them.

drop policy "staff write subjects" on public.subjects;
create policy "staff insert subjects" on public.subjects for insert to authenticated
  with check ( school_id = (select private.current_school_id()) and (select private.is_staff()) );
create policy "staff update subjects" on public.subjects for update to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_staff()) )
  with check ( school_id = (select private.current_school_id()) );
create policy "staff delete subjects" on public.subjects for delete to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_staff()) );

drop policy "staff write classes" on public.classes;
create policy "staff insert classes" on public.classes for insert to authenticated
  with check ( school_id = (select private.current_school_id()) and (select private.is_staff()) );
create policy "staff update classes" on public.classes for update to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_staff()) )
  with check ( school_id = (select private.current_school_id()) );
create policy "staff delete classes" on public.classes for delete to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_staff()) );

drop policy "staff write students" on public.students;
drop policy "staff read students" on public.students;
drop policy "student reads own record" on public.students;

create policy "read students in own school" on public.students for select to authenticated
  using (
    school_id = (select private.current_school_id())
    and ( (select private.is_staff()) or profile_id = (select auth.uid()) )
  );
create policy "staff insert students" on public.students for insert to authenticated
  with check ( school_id = (select private.current_school_id()) and (select private.is_staff()) );
create policy "staff update students" on public.students for update to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_staff()) )
  with check ( school_id = (select private.current_school_id()) );
create policy "staff delete students" on public.students for delete to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_staff()) );

drop policy "staff write results" on public.results;
drop policy "staff read results" on public.results;
drop policy "student reads own published results" on public.results;

create policy "read results in own school" on public.results for select to authenticated
  using (
    school_id = (select private.current_school_id())
    and (
      (select private.is_staff())
      or (
        published
        and student_id in (
          select id from public.students where profile_id = (select auth.uid())
        )
      )
    )
  );
create policy "staff insert results" on public.results for insert to authenticated
  with check ( school_id = (select private.current_school_id()) and (select private.is_staff()) );
create policy "staff update results" on public.results for update to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_staff()) )
  with check ( school_id = (select private.current_school_id()) );
create policy "staff delete results" on public.results for delete to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_staff()) );

-- Composite covering indexes. Each replaces a single-column index; the
-- composite is a superset because the leftmost column still serves
-- single-column lookups.
drop index if exists public.classes_teacher_idx;
drop index if exists public.students_class_idx;
drop index if exists public.students_profile_idx;
drop index if exists public.results_student_idx;

create index classes_teacher_school_idx  on public.classes  (class_teacher_id, school_id);
create index students_class_school_idx   on public.students (class_id, school_id);
create index students_profile_school_idx on public.students (profile_id, school_id);
create index results_student_school_idx  on public.results  (student_id, school_id);
create index results_subject_school_idx  on public.results  (subject_id, school_id);
create index results_class_school_idx    on public.results  (class_id, school_id);
create index results_recorded_by_idx     on public.results  (recorded_by, school_id);
