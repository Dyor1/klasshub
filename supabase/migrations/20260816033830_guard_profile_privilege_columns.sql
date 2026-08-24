-- RLS decides which ROWS a user may update, not which COLUMNS. Without this
-- guard, the "update own profile" policy let any user set their own role to
-- 'admin', or move themselves into another school.
--
-- Caught by testing: a seeded teacher successfully self-promoted to admin
-- against the first version of this schema.
create or replace function private.guard_profile_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  -- No JWT (service_role, backend jobs, the signup trigger) bypasses these
  -- checks; such callers are already trusted and bypass RLS anyway.
  if v_uid is null then
    return new;
  end if;

  -- Tenancy is immutable from the client. Moving a profile between schools
  -- is an admin/backoffice operation, never a self-service one.
  if new.school_id is distinct from old.school_id then
    raise exception 'school_id cannot be changed'
      using errcode = '42501';
  end if;

  -- Only an admin may change a role, and RLS has already constrained them to
  -- their own school.
  if new.role is distinct from old.role and not private.is_admin() then
    raise exception 'only an administrator can change a role'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger guard_profile_changes
  before update on public.profiles
  for each row execute function private.guard_profile_changes();
