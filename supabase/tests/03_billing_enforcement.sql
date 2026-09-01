-- Trials that end, plans that cap, and a lockout that never holds data hostage.
--
-- Two of these matter commercially and one matters ethically. The ethical one
-- is the last block: a school that stops paying must keep every byte readable
-- and be able to take it away. If that assertion ever fails, the fix is the
-- code, not the test.
--
-- Run:  psql "$DATABASE_URL" -f supabase/tests/03_billing_enforcement.sql

begin;

grant usage on schema tests to authenticated, anon;
grant execute on all functions in schema tests to authenticated, anon;

do $$
declare
  t jsonb := tests.make_tenant('delta');
  school uuid := (t->>'school')::uuid;
  a_class uuid := (t->>'class')::uuid;
  stu     uuid := (t->>'student')::uuid;
  adm     uuid := (t->>'admin')::uuid;
  stu_uid uuid := (t->>'student_user')::uuid;
  v_ref   text;
begin
  -- ======================================================================
  -- The state machine.
  -- ======================================================================
  update public.schools set paid_until = now() + interval '30 days' where id = school;
  perform tests.assert_eq(private.school_access(school)::text, 'active', 'paid ahead is active');

  update public.schools set paid_until = null, trial_ends_at = now() + interval '5 days' where id = school;
  perform tests.assert_eq(private.school_access(school)::text, 'trial', 'trial still running');

  update public.schools set trial_ends_at = now() - interval '3 days' where id = school;
  perform tests.assert_eq(private.school_access(school)::text, 'grace', 'three days past expiry is grace');

  update public.schools set trial_ends_at = now() - interval '30 days' where id = school;
  perform tests.assert_eq(private.school_access(school)::text, 'locked', 'a month past expiry is locked');

  update public.schools set paid_until = now() - interval '2 days' where id = school;
  perform tests.assert_eq(private.school_access(school)::text, 'grace',
    'a lapsed payment also opens a grace window');

  -- ======================================================================
  -- Grace writes; locked does not. The grace case is the control — without it
  -- the lockout assertions would pass just as well if writes were broken
  -- outright.
  -- ======================================================================
  perform tests.assert_allowed(
    format('insert into public.attendance (school_id, student_id, class_id, date, status)
            values (%L, %L, %L, ''2026-02-02'', ''present'')', school, stu, a_class),
    'a school in grace MUST still be able to mark a register');

  update public.schools set paid_until = now() - interval '60 days',
                            trial_ends_at = now() - interval '60 days' where id = school;
  perform tests.assert_eq(private.school_access(school)::text, 'locked', 'now locked');

  perform tests.assert_denied(
    format('insert into public.attendance (school_id, student_id, class_id, date, status)
            values (%L, %L, %L, ''2026-02-03'', ''present'')', school, stu, a_class),
    '%subscription has ended%',
    'a locked school must not mark a new register');
  perform tests.assert_denied(
    format('update public.results set remarks = ''edited'' where school_id = %L', school),
    '%subscription has ended%',
    'a locked school must not edit results');

  -- ======================================================================
  -- Locked is read-only, not hostage-taking. Their records stay legible and
  -- removable. This is a promise to schools, not an implementation detail.
  -- ======================================================================
  perform tests.assert_eq(
    (select count(*) from public.results where school_id = school), 1::bigint,
    'a locked school MUST still be able to read its results');
  perform tests.assert_allowed(
    format('delete from public.attendance where school_id = %L and date = ''2026-02-02''', school),
    'a locked school MUST still be able to delete its own data');

  -- ======================================================================
  -- Plan caps.
  -- ======================================================================
  update public.schools set plan = 'trial', trial_ends_at = now() + interval '10 days',
                            paid_until = null where id = school;
  update public.plan_limits set max_students = 1 where plan = 'trial';

  perform tests.assert_denied(
    format('insert into public.students (school_id, class_id, admission_number, surname, first_name)
            values (%L, %L, ''D/002'', ''Over'', ''Cap'')', school, a_class),
    '%plan covers 1 students%',
    'enrolling past the cap must be refused');

  update public.plan_limits set max_students = 2 where plan = 'trial';
  perform tests.assert_allowed(
    format('insert into public.students (school_id, class_id, admission_number, surname, first_name)
            values (%L, %L, ''D/002'', ''Under'', ''Cap'')', school, a_class),
    'raising the cap by one MUST admit the same pupil');

  -- ======================================================================
  -- Only an admin may change what the school pays.
  -- ======================================================================
  perform tests.authenticate_as(stu_uid);
  perform tests.assert_denied(
    'select public.create_subscription_attempt(''starter'')',
    '%Only administrators%',
    'a pupil must not change the school''s plan');

  perform tests.authenticate_as(adm);
  perform tests.assert_denied(
    'select public.create_subscription_attempt(''group'')',
    '%sales team%',
    'a sales-led plan must not be purchasable online');
  perform tests.assert_allowed(
    'select public.create_subscription_attempt(''starter'')',
    'an admin MUST be able to start a plan payment');

  -- ======================================================================
  -- Paying is idempotent, and a wrong amount buys nothing.
  -- ======================================================================
  perform tests.clear_auth();
  select reference into v_ref from public.subscription_payments where school_id = school limit 1;

  perform tests.assert_eq(
    public.record_subscription_payment(v_ref, 'ps_test', 3500000), 'recorded',
    'first webhook delivery records the payment');
  perform tests.assert_eq(
    public.record_subscription_payment(v_ref, 'ps_test', 3500000), 'already recorded',
    'a retried delivery must not buy a second term');
  perform tests.assert_eq(private.school_access(school)::text, 'active',
    'paying makes the school active');

  insert into public.subscription_payments (school_id, plan, reference, amount)
  values (school, 'standard', 'KHSUB-testwrongamount000000001', 85000);
  perform tests.assert(
    public.record_subscription_payment('KHSUB-testwrongamount000000001', 'ps_bad', 100) like 'amount mismatch%',
    'a wrong amount is refused');
  perform tests.assert_eq(
    (select status::text from public.subscription_payments where reference = 'KHSUB-testwrongamount000000001'),
    'failed',
    'and the failure is recorded durably, not lost to a rollback');
end $$;

select 'PASS 03_billing_enforcement' as result;

rollback;
