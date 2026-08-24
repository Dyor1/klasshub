-- Two permissive UPDATE policies on profiles meant both were evaluated on
-- every update (flagged by the performance advisor). Collapse them into one
-- with the same effective rules:
--   * you may edit your own row, or
--   * an admin may edit any row in their school.
-- Column-level protection for role/school_id stays with the guard trigger.
drop policy "update own profile" on public.profiles;
drop policy "admins update profiles in own school" on public.profiles;

create policy "update own profile or admin in same school"
  on public.profiles for update to authenticated
  using (
    id = (select auth.uid())
    or (
      school_id = (select private.current_school_id())
      and (select private.is_admin())
    )
  )
  with check (
    school_id = (select private.current_school_id())
  );
