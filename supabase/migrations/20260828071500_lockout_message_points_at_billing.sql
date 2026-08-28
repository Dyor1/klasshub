-- The lockout message told people to "renew from Settings", but billing lives
-- at /dashboard/billing under its own nav item. Sending a locked-out school to
-- the wrong page is a small error with an expensive consequence: the one
-- moment they are most willing to pay is the one moment they cannot find how.
--
-- This wording is user-facing by design. The attendance page surfaces
-- error.message straight to the teacher, so what is written here is what a
-- person reads mid-register. Verified by locking the fixture school and
-- marking a register.
create or replace function private.assert_school_writable()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.school_access(new.school_id) = 'locked' then
    raise exception
      'Your KlassHub subscription has ended. Your records are safe and readable — an administrator can renew from Billing to start recording again.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;
