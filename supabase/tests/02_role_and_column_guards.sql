-- Rules that RLS alone cannot express, and the roles inside one school.
--
-- Row-level security decides which ROWS you may touch. Several of the rules
-- this system depends on are about COLUMNS — a pupil owns their submission row
-- but must not write the score on it — and those live in triggers and
-- column-level grants instead. Both are easy to lose in a refactor and neither
-- announces itself when it goes.
--
-- Run:  psql "$DATABASE_URL" -f supabase/tests/02_role_and_column_guards.sql

begin;

grant usage on schema tests to authenticated, anon;
grant execute on all functions in schema tests to authenticated, anon;

do $$
declare
  t jsonb := tests.make_tenant('charlie');
  school uuid := (t->>'school')::uuid;
  a_class uuid := (t->>'class')::uuid;
  a_subj  uuid := (t->>'subject')::uuid;
  stu     uuid := (t->>'student')::uuid;
  stu_uid uuid := (t->>'student_user')::uuid;
  adm     uuid := (t->>'admin')::uuid;
  tea     uuid := (t->>'teacher')::uuid;
  v_assignment uuid;
  v_submission uuid;
begin
  -- Homework to submit against.
  insert into public.assignments (school_id, class_id, subject_id, title, term, academic_year, status, max_score)
  values (school, a_class, a_subj, 'Essay', 'first', '2025/2026', 'published', 10)
  returning id into v_assignment;

  -- ======================================================================
  -- A pupil may write their own submission but not their own mark.
  -- ======================================================================
  perform tests.authenticate_as(stu_uid);

  perform tests.assert_denied(
    format('insert into public.assignment_submissions (school_id, assignment_id, student_id, body, score)
            values (%L, %L, %L, ''my work'', 10)', school, v_assignment, stu),
    '%cannot grade your own submission%',
    'pupil must not set a score when submitting');

  perform tests.assert_allowed(
    format('insert into public.assignment_submissions (school_id, assignment_id, student_id, body)
            values (%L, %L, %L, ''my work'')', school, v_assignment, stu),
    'pupil MUST be able to submit work');

  perform tests.clear_auth();
  select id into v_submission from public.assignment_submissions where assignment_id = v_assignment;

  perform tests.authenticate_as(stu_uid);
  perform tests.assert_denied(
    format('update public.assignment_submissions set score = 10 where id = %L', v_submission),
    '%cannot grade your own submission%',
    'pupil must not award themselves a score afterwards');

  -- Staff mark it, and from then the pupil cannot rewrite what was marked.
  perform tests.authenticate_as(tea);
  perform tests.assert_allowed(
    format('update public.assignment_submissions set score = 7, graded_at = now(), graded_by = %L
            where id = %L', tea, v_submission),
    'a teacher MUST be able to mark work');

  perform tests.authenticate_as(stu_uid);
  perform tests.assert_denied(
    format('update public.assignment_submissions set body = ''swapped after marking'' where id = %L', v_submission),
    '%already been graded%',
    'pupil must not edit work after it is marked');

  -- ======================================================================
  -- Nobody promotes themselves.
  -- ======================================================================
  perform tests.authenticate_as(tea);
  perform tests.assert_denied(
    format('update public.profiles set role = ''admin'' where id = %L', tea),
    '%only an administrator can change a role%',
    'a teacher must not make themselves an admin');
  perform tests.assert_denied(
    format('update public.profiles set school_id = gen_random_uuid() where id = %L', tea),
    '%school_id cannot be changed%',
    'nobody may move their own account to another school');

  -- ======================================================================
  -- The outbox holds phone numbers and the text of private notices. An admin
  -- may see whether a message went; never what it said, or where to.
  -- ======================================================================
  perform tests.authenticate_as(adm);
  perform tests.assert_denied(
    'select body from public.message_outbox limit 1',
    '%permission denied%',
    'admin must not read message bodies');
  perform tests.assert_denied(
    'select destination from public.message_outbox limit 1',
    '%permission denied%',
    'admin must not read message destinations');
  perform tests.assert_allowed(
    'select count(*) from public.message_delivery_log',
    'admin MUST be able to see delivery status');

  -- ======================================================================
  -- Functions only the webhook and the worker may call.
  -- ======================================================================
  perform tests.assert_denied(
    'select public.record_paystack_payment(''x'',''y'',1,''card'')',
    '%permission denied for function%',
    'a signed-in user must not be able to record a payment');
  perform tests.assert_denied(
    'select * from public.claim_outbox_batch(1)',
    '%permission denied for function%',
    'a signed-in user must not be able to drain the outbox');
  perform tests.assert_denied(
    'select public.record_subscription_payment(''x'',''y'',1)',
    '%permission denied for function%',
    'a signed-in user must not be able to grant themselves a subscription');

  -- ======================================================================
  -- Notification preferences are personal; routing is the school's.
  -- ======================================================================
  perform tests.authenticate_as(stu_uid);
  perform tests.assert_denied(
    format('insert into public.notification_preferences (profile_id, school_id) values (%L, %L)', adm, school),
    '%row-level security%',
    'a pupil must not set an admin''s notification preferences');
  perform tests.assert_denied(
    format('insert into public.notification_routes (school_id, kind, email, sms) values (%L, ''general'', true, true)', school),
    '%row-level security%',
    'a pupil must not switch the school onto SMS');
  perform tests.assert_allowed(
    format('insert into public.notification_preferences (profile_id, school_id) values (%L, %L)', stu_uid, school),
    'a pupil MUST be able to set their own preferences');

  -- ======================================================================
  -- Paying: a pupil may not open a checkout against work that is not theirs,
  -- nor mark their own attempt as paid.
  -- ======================================================================
  perform tests.authenticate_as(stu_uid);
  perform tests.assert_denied(
    format('select public.create_payment_attempt(%L)', gen_random_uuid()),
    '%could not be found%',
    'a pupil must not open a checkout on an unknown invoice');

  perform tests.clear_auth();
  insert into public.payment_attempts (school_id, invoice_id, student_id, reference, amount)
  values (school, (t->>'invoice')::uuid, stu, 'KH-testguard000000000000000001', 50000);

  perform tests.authenticate_as(stu_uid);
  perform tests.assert_denied(
    'update public.payment_attempts set status = ''success''',
    '%permission denied%',
    'a payer must not mark their own attempt paid');

  perform tests.clear_auth();
end $$;

select 'PASS 02_role_and_column_guards' as result;

rollback;
