-- The write paths whose app-layer action carries no auth check of its own.
--
-- An audit of all 64 server actions found six that mutate without calling
-- requireViewer. None is a hole — RLS guards three of them and the CBT RPCs
-- guard the other three internally — but that is a fact about the database,
-- not about the action, and nothing was stopping a future refactor from
-- loosening the policy underneath and leaving the action wide open.
--
-- Run:  psql "$DATABASE_URL" -f supabase/tests/04_action_guards.sql

begin;

grant usage on schema tests to authenticated, anon;
grant execute on all functions in schema tests to authenticated, anon;

do $$
declare
  t         jsonb := tests.make_tenant('guards');
  school    uuid  := (t->>'school')::uuid;
  cls       uuid  := (t->>'class')::uuid;
  adm       uuid  := (t->>'admin')::uuid;
  stu_uid   uuid  := (t->>'student_user')::uuid;
  other_uid uuid;
  v_inv uuid; v_note uuid; v_exam uuid; v_q uuid; v_session uuid;
begin
  -- ======================================================================
  -- revokeInvitation, markRead and dismiss all take an id from a form and
  -- act on it with no check. RLS is the only thing between a pupil and
  -- someone else's row.
  -- ======================================================================
  insert into public.invitations (school_id, email, role, token_hash, invited_by)
  values (school, 'invitee@test.invalid', 'teacher', '\x00'::bytea, adm)
  returning id into v_inv;

  insert into public.notifications (school_id, recipient_id, kind, title, body)
  values (school, adm, 'general', 'admin private notice', 'body')
  returning id into v_note;

  perform tests.authenticate_as(stu_uid);
  -- These do not raise. RLS matches no rows and reports success, which is why
  -- the assertions below are on state rather than on an exception.
  delete from public.invitations where id = v_inv;
  update public.notifications set read_at = now() where id = v_note;
  delete from public.notifications where id = v_note;
  perform tests.clear_auth();

  perform tests.assert_eq((select count(*) from public.invitations where id = v_inv), 1::bigint,
    'a pupil must not revoke an invitation');
  perform tests.assert_eq((select count(*) from public.notifications where id = v_note), 1::bigint,
    'a pupil must not dismiss another person''s notification');
  perform tests.assert_eq((select read_at from public.notifications where id = v_note), null::timestamptz,
    'a pupil must not mark another person''s notification read');

  -- Positive control: the owner can, so the three refusals mean something.
  perform tests.authenticate_as(adm);
  update public.notifications set read_at = now() where id = v_note;
  perform tests.clear_auth();
  perform tests.assert((select read_at is not null from public.notifications where id = v_note),
    'the owner MUST be able to mark their own notification read');

  -- ======================================================================
  -- startExam, saveAnswer and submitExam call SECURITY DEFINER functions,
  -- which bypass RLS entirely — so their guard has to be internal, and is
  -- worth pinning by its exact message.
  -- ======================================================================
  other_uid := tests.make_user('guards.other@test.invalid', school, 'student', 'Other Pupil');
  insert into public.students (school_id, class_id, profile_id, admission_number, surname, first_name)
  values (school, cls, other_uid, 'GD/002', 'Other', 'Pupil');

  insert into public.cbt_exams (school_id, class_id, title, term, academic_year, status)
  values (school, cls, 'Mock', 'first', '2025/2026', 'published') returning id into v_exam;
  insert into public.cbt_questions
    (school_id, exam_id, question_number, question_text, option_a, option_b, correct_option)
  values (school, v_exam, 1, '2+2?', '3', '4', 'b') returning id into v_q;

  perform tests.authenticate_as(stu_uid);
  v_session := (public.cbt_start(v_exam))::uuid;
  perform tests.clear_auth();
  perform tests.assert(v_session is not null,
    'a pupil in the class MUST be able to start the exam');

  perform tests.authenticate_as(other_uid);
  perform tests.assert_denied(
    format('select public.cbt_answer(%L, %L, ''b'')', v_session, v_q),
    '%not your exam session%', 'a classmate must not answer into another pupil''s session');
  perform tests.assert_denied(
    format('select * from public.cbt_paper(%L)', v_session),
    '%not your exam session%', 'a classmate must not read another pupil''s paper');
  perform tests.assert_denied(
    format('select public.cbt_submit(%L)', v_session),
    '%not your exam session%', 'a classmate must not submit another pupil''s exam');
  perform tests.clear_auth();
end $$;

select 'PASS 04_action_guards' as result;

rollback;
