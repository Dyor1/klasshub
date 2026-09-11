-- Platform operators: the people who run KlassHub, as distinct from the people
-- who run a school.
--
-- This is the one place in the system that deliberately reads across tenants,
-- so it is built to be the narrowest possible opening rather than a general
-- key. Three rules shape everything below.
--
-- 1. MEMBERSHIP CANNOT BE GRANTED THROUGH THE APPLICATION.
--    The roster lives in the `private` schema, which is revoked from anon and
--    authenticated, so it is not readable or writable over the API at all.
--    Adding an operator requires a direct SQL connection — which means it
--    requires database credentials, not an account takeover.
--
-- 2. NO POLICY IS WIDENED.
--    The tempting shortcut is `or private.is_platform_admin()` inside every
--    existing RLS policy. That would put a second way into every table in the
--    system and make each policy harder to reason about. Instead the access
--    lives in a small number of SECURITY DEFINER functions, each a deliberate,
--    named window with its own gate.
--
-- 3. OPERATORS DO NOT READ SCHOOL CONTENT.
--    Nothing here returns a pupil's name, marks, attendance, fees or messages.
--    Running the platform needs to know that a school has 340 pupils and is
--    three days from the end of its trial. It does not need to know what
--    Chidi scored in Mathematics. That boundary is the same one that stops a
--    school admin reading a notification body.

create table private.platform_operators (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  note       text,
  added_at   timestamptz not null default now()
);

comment on table private.platform_operators is
  'Who may use the /platform area. Deliberately in the private schema: no API '
  'role can read or write it, so membership is grantable only with direct '
  'database access.';

create or replace function private.is_platform_operator()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from private.platform_operators
    where user_id = (select auth.uid())
  );
$$;

-- ---------------------------------------------------------------------------
-- Audit. Written by the mutating functions below, never by the application, so
-- an operator cannot act without leaving a record.
-- ---------------------------------------------------------------------------
create table private.platform_audit (
  id         bigint generated always as identity primary key,
  actor      uuid not null,
  action     text not null,
  school_id  uuid,
  detail     jsonb,
  at         timestamptz not null default now()
);

create index platform_audit_at_idx on private.platform_audit (at desc);

-- ---------------------------------------------------------------------------
-- Read: one row per school, counts only.
-- ---------------------------------------------------------------------------
create or replace function public.platform_schools()
returns table (
  id            uuid,
  name          text,
  slug          text,
  plan          public.school_plan,
  access        public.school_access_state,
  trial_ends_at timestamptz,
  paid_until    timestamptz,
  created_at    timestamptz,
  students      bigint,
  staff         bigint,
  max_students  int
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_platform_operator() then
    raise exception 'Not a platform operator.' using errcode = '42501';
  end if;

  return query
  select
    s.id, s.name, s.slug, s.plan,
    private.school_access(s.id),
    s.trial_ends_at, s.paid_until, s.created_at,
    (select count(*) from public.students st where st.school_id = s.id),
    (select count(*) from public.profiles p
      where p.school_id = s.id and p.role in ('admin', 'teacher')),
    pl.max_students
  from public.schools s
  left join public.plan_limits pl on pl.plan = s.plan
  order by s.created_at desc;
end;
$$;

-- ---------------------------------------------------------------------------
-- Write: the two things running a platform actually requires.
--
-- Both are deliberately small. There is no "delete a school" here: dropping a
-- tenant's entire record on a support call is not a button, it is a
-- conversation followed by a considered SQL statement.
-- ---------------------------------------------------------------------------
create or replace function public.platform_extend_trial(
  p_school uuid,
  p_days   int
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new timestamptz;
begin
  if not private.is_platform_operator() then
    raise exception 'Not a platform operator.' using errcode = '42501';
  end if;
  if p_days is null or p_days < 1 or p_days > 180 then
    raise exception 'Extend by between 1 and 180 days.' using errcode = '22023';
  end if;

  -- From today when the trial has already lapsed, otherwise from where it
  -- stands: extending an expired trial by 14 days should give 14 days of use,
  -- not 14 days measured from a date in the past.
  update public.schools
  set trial_ends_at = greatest(trial_ends_at, now()) + make_interval(days => p_days)
  where id = p_school
  returning trial_ends_at into v_new;

  if v_new is null then
    raise exception 'No such school.' using errcode = '22023';
  end if;

  insert into private.platform_audit (actor, action, school_id, detail)
  values ((select auth.uid()), 'extend_trial', p_school,
          jsonb_build_object('days', p_days, 'new_trial_ends_at', v_new));

  return v_new;
end;
$$;

create or replace function public.platform_set_plan(
  p_school uuid,
  p_plan   public.school_plan
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before public.school_plan;
  v_count  bigint;
  v_limit  int;
begin
  if not private.is_platform_operator() then
    raise exception 'Not a platform operator.' using errcode = '42501';
  end if;

  select plan into v_before from public.schools where id = p_school;
  if v_before is null then
    raise exception 'No such school.' using errcode = '22023';
  end if;

  -- Moving a school onto a plan smaller than its roll would leave it over the
  -- cap with no way to add a pupil and no explanation. Refuse and say so,
  -- rather than let the enrolment trigger surface it later as a baffling error
  -- on somebody else's screen.
  select count(*) into v_count from public.students where school_id = p_school;
  select max_students into v_limit from public.plan_limits where plan = p_plan;

  if v_limit is not null and v_count > v_limit then
    raise exception
      'That school has % pupils; the % plan allows %.', v_count, p_plan, v_limit
      using errcode = '22023';
  end if;

  update public.schools set plan = p_plan where id = p_school;

  insert into private.platform_audit (actor, action, school_id, detail)
  values ((select auth.uid()), 'set_plan', p_school,
          jsonb_build_object('from', v_before, 'to', p_plan));
end;
$$;

-- ---------------------------------------------------------------------------
-- Recent operator activity, so the audit is visible in the app rather than
-- only to whoever can open a psql session.
-- ---------------------------------------------------------------------------
create or replace function public.platform_recent_actions(p_limit int default 50)
returns table (actor_email text, action text, school_name text, detail jsonb, at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_platform_operator() then
    raise exception 'Not a platform operator.' using errcode = '42501';
  end if;

  return query
  select u.email::text, a.action, s.name, a.detail, a.at
  from private.platform_audit a
  left join auth.users u on u.id = a.actor
  left join public.schools s on s.id = a.school_id
  order by a.at desc
  limit least(coalesce(p_limit, 50), 200);
end;
$$;

-- Granted to authenticated because every one of them gates on
-- is_platform_operator() first; the grant is not the gate.
revoke all on function public.platform_schools() from public, anon;
revoke all on function public.platform_extend_trial(uuid, int) from public, anon;
revoke all on function public.platform_set_plan(uuid, public.school_plan) from public, anon;
revoke all on function public.platform_recent_actions(int) from public, anon;

grant execute on function public.platform_schools() to authenticated;
grant execute on function public.platform_extend_trial(uuid, int) to authenticated;
grant execute on function public.platform_set_plan(uuid, public.school_plan) to authenticated;
grant execute on function public.platform_recent_actions(int) to authenticated;

-- ---------------------------------------------------------------------------
-- Adding the first operator. Deliberately left commented out: it must be run
-- by a human with database credentials, and it should be obvious in the diff
-- if anyone ever tries to slip one in.
--
--   insert into private.platform_operators (user_id, note)
--   select id, 'founder' from auth.users where email = 'you@example.com';
-- ---------------------------------------------------------------------------
