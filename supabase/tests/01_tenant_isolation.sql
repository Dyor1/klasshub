-- Can one school see another?
--
-- This is the promise the whole product rests on, and until this file existed
-- it had never been tested. Every isolation check written by hand compared a
-- student against a teacher inside a single school — which proves role rules,
-- and proves nothing at all about tenancy.
--
-- Run:  psql "$DATABASE_URL" -f supabase/tests/01_tenant_isolation.sql
-- The transaction rolls back, so it is safe against a database with real data.

begin;

-- The harness lives in a schema no production role can reach, which is the
-- point of it — but the assertions run while impersonating those roles. Lend
-- access for the life of this transaction; the rollback takes it back, so
-- nothing outside these tests ever sees the tests schema.
grant usage on schema tests to authenticated, anon;
grant execute on all functions in schema tests to authenticated, anon;

do $$
declare
  a jsonb := tests.make_tenant('alpha');
  b jsonb := tests.make_tenant('bravo');
  a_school uuid := (a->>'school')::uuid;
  b_school uuid := (b->>'school')::uuid;
begin
  -- ======================================================================
  -- An admin of Bravo, looking at everything Alpha owns.
  -- Each of these is a silent denial: RLS returns no rows rather than an
  -- error, which is exactly why they must be asserted on counts.
  -- ======================================================================
  perform tests.authenticate_as((b->>'admin')::uuid);

  perform tests.assert_eq(
    (select count(*) from public.schools where id = a_school), 0::bigint,
    'Bravo admin must not see Alpha the school');

  perform tests.assert_eq(
    (select count(*) from public.students where school_id = a_school), 0::bigint,
    'Bravo admin must not see Alpha students');

  perform tests.assert_eq(
    (select count(*) from public.results where school_id = a_school), 0::bigint,
    'Bravo admin must not see Alpha results');

  perform tests.assert_eq(
    (select count(*) from public.attendance where school_id = a_school), 0::bigint,
    'Bravo admin must not see Alpha attendance');

  perform tests.assert_eq(
    (select count(*) from public.invoices where school_id = a_school), 0::bigint,
    'Bravo admin must not see Alpha invoices');

  perform tests.assert_eq(
    (select count(*) from public.profiles where school_id = a_school), 0::bigint,
    'Bravo admin must not see Alpha staff or pupils');

  perform tests.assert_eq(
    (select count(*) from public.classes where school_id = a_school), 0::bigint,
    'Bravo admin must not see Alpha classes');

  -- The analytics views aggregate; a leak here would surface another school's
  -- averages rather than its rows, which is subtler and no less a breach.
  perform tests.assert_eq(
    (select count(*) from public.student_term_summary where school_id = a_school), 0::bigint,
    'Bravo admin must not see Alpha in student_term_summary');
  perform tests.assert_eq(
    (select count(*) from public.class_term_summary where school_id = a_school), 0::bigint,
    'Bravo admin must not see Alpha in class_term_summary');
  perform tests.assert_eq(
    (select count(*) from public.fee_summary where school_id = a_school), 0::bigint,
    'Bravo admin must not see Alpha in fee_summary');
  perform tests.assert_eq(
    (select count(*) from public.attendance_daily where school_id = a_school), 0::bigint,
    'Bravo admin must not see Alpha in attendance_daily');
  perform tests.assert_eq(
    (select count(*) from public.invoice_balances where school_id = a_school), 0::bigint,
    'Bravo admin must not see Alpha in invoice_balances');

  -- Positive control. Without this, every assertion above would also pass if
  -- RLS were simply denying everything to everyone.
  perform tests.assert_eq(
    (select count(*) from public.students where school_id = b_school), 1::bigint,
    'Bravo admin MUST see their own pupil');
  perform tests.assert_eq(
    (select count(*) from public.results where school_id = b_school), 1::bigint,
    'Bravo admin MUST see their own results');

  -- ======================================================================
  -- Writing across the boundary.
  -- ======================================================================
  perform tests.assert_denied(
    format('insert into public.students (school_id, class_id, admission_number, surname, first_name)
            values (%L, %L, ''X/1'', ''Injected'', ''Row'')', a_school, (a->>'class')::uuid),
    '%row-level security%',
    'Bravo admin must not enrol a pupil into Alpha');

  -- An UPDATE across the boundary does not raise: RLS simply matches no rows,
  -- so it reports success having changed nothing. Asserting on the absence of
  -- an error would pass here whether isolation held or not — the only honest
  -- check is that Alpha's row is still what it was.
  execute format('update public.students set surname = ''Tampered'' where school_id = %L', a_school);

  perform tests.clear_auth();
  perform tests.assert_eq(
    (select surname from public.students where school_id = a_school), 'Pupil',
    'Alpha pupil surname must be unchanged after Bravo tried to rewrite it');

  -- ======================================================================
  -- A pupil at Bravo, reaching for Alpha.
  -- ======================================================================
  perform tests.authenticate_as((b->>'student_user')::uuid);
  perform tests.assert_eq(
    (select count(*) from public.results where school_id = a_school), 0::bigint,
    'Bravo pupil must not see Alpha results');
  perform tests.assert_eq(
    (select count(*) from public.students where school_id = a_school), 0::bigint,
    'Bravo pupil must not see Alpha pupils');

  -- ======================================================================
  -- Notifications: scoped tighter than tenancy. Even Alpha's own admin owns
  -- this one, and Bravo's admin is two boundaries away from it.
  -- ======================================================================
  -- Each tenant's admin has exactly one notice of their own. The question is
  -- not how many they can see but WHOSE — a count alone would pass if the
  -- rows had been swapped.
  perform tests.authenticate_as((b->>'admin')::uuid);
  perform tests.assert_eq(
    (select count(*) from public.notifications), 1::bigint,
    'Bravo admin sees exactly one notice');
  perform tests.assert_eq(
    (select title from public.notifications), 'bravo private notice',
    'and it is Bravo''s own, not Alpha''s');

  perform tests.authenticate_as((a->>'admin')::uuid);
  perform tests.assert_eq(
    (select title from public.notifications), 'alpha private notice',
    'Alpha admin sees only their own notice');

  -- ======================================================================
  -- anon: signed out, holding the publishable key anyone can read.
  -- ======================================================================
  perform tests.authenticate_as_anon();
  perform tests.assert_eq((select count(*) from public.students), 0::bigint,
    'anon must see no pupils anywhere');
  perform tests.assert_eq((select count(*) from public.results), 0::bigint,
    'anon must see no results anywhere');
  perform tests.assert_eq((select count(*) from public.profiles), 0::bigint,
    'anon must see no people anywhere');
  perform tests.assert_eq((select count(*) from public.schools), 0::bigint,
    'anon must see no schools anywhere');

  perform tests.clear_auth();
  raise notice 'PASS  01_tenant_isolation';
end $$;

rollback;
