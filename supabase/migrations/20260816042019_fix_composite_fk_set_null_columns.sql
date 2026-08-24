-- Bug found while deleting a test school: on a COMPOSITE foreign key,
-- `on delete set null` nulls EVERY column in the constraint, including
-- school_id, which is NOT NULL. Deleting a teacher, class or staff profile
-- therefore failed with:
--   null value in column "school_id" violates not-null constraint
--
-- Postgres 15+ allows naming the columns to null, so only the referencing
-- column is cleared and the tenant key is preserved.

alter table public.classes
  drop constraint classes_class_teacher_id_school_id_fkey,
  add constraint classes_class_teacher_id_school_id_fkey
    foreign key (class_teacher_id, school_id)
    references public.profiles (id, school_id)
    on delete set null (class_teacher_id);

alter table public.students
  drop constraint students_class_id_school_id_fkey,
  add constraint students_class_id_school_id_fkey
    foreign key (class_id, school_id)
    references public.classes (id, school_id)
    on delete set null (class_id);

alter table public.students
  drop constraint students_profile_id_school_id_fkey,
  add constraint students_profile_id_school_id_fkey
    foreign key (profile_id, school_id)
    references public.profiles (id, school_id)
    on delete set null (profile_id);

alter table public.results
  drop constraint results_recorded_by_school_id_fkey,
  add constraint results_recorded_by_school_id_fkey
    foreign key (recorded_by, school_id)
    references public.profiles (id, school_id)
    on delete set null (recorded_by);
