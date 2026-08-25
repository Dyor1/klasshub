-- The candidate-facing surface. Every one of these derives the student from
-- auth.uid() rather than accepting a student_id, so a candidate cannot sit an
-- exam as someone else.

create or replace function private.my_student_id()
returns uuid
language sql
security definer
stable
set search_path = ''
as $$
  select id from public.students where profile_id = (select auth.uid()) limit 1;
$$;

-- Start (or resume) an attempt.
create or replace function public.cbt_start(p_exam_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_school  uuid := private.current_school_id();
  v_student uuid := private.my_student_id();
  v_exam    public.cbt_exams%rowtype;
  v_session public.cbt_sessions%rowtype;
begin
  if v_student is null then
    raise exception 'Only a student can sit an exam.' using errcode = '42501';
  end if;

  select * into v_exam from public.cbt_exams
  where id = p_exam_id and school_id = v_school;

  if not found then
    raise exception 'Exam not found.' using errcode = '42501';
  end if;
  if v_exam.status <> 'published' then
    raise exception 'This exam is not open.' using errcode = '22023';
  end if;
  if v_exam.opens_at is not null and now() < v_exam.opens_at then
    raise exception 'This exam has not opened yet.' using errcode = '22023';
  end if;
  if v_exam.closes_at is not null and now() > v_exam.closes_at then
    raise exception 'This exam has closed.' using errcode = '22023';
  end if;

  -- The candidate must be in the class the exam was set for.
  if not exists (
    select 1 from public.students
    where id = v_student and class_id = v_exam.class_id
  ) then
    raise exception 'This exam was not set for your class.' using errcode = '42501';
  end if;

  select * into v_session from public.cbt_sessions
  where exam_id = p_exam_id and student_id = v_student;

  if found then
    if v_session.status <> 'in_progress' then
      raise exception 'You have already submitted this exam.' using errcode = '22023';
    end if;
    return v_session.id;   -- resume
  end if;

  insert into public.cbt_sessions (school_id, exam_id, student_id, expires_at)
  values (
    v_school, p_exam_id, v_student,
    least(
      now() + make_interval(mins => v_exam.duration_minutes),
      coalesce(v_exam.closes_at, now() + make_interval(mins => v_exam.duration_minutes))
    )
  )
  returning * into v_session;

  return v_session.id;
end;
$$;

-- Fetch the paper. correct_option is never selected.
create or replace function public.cbt_paper(p_session_id uuid)
returns table (
  question_id     uuid,
  question_number int,
  question_text   text,
  option_a        text,
  option_b        text,
  option_c        text,
  option_d        text,
  marks           numeric,
  selected        public.cbt_option
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.cbt_sessions%rowtype;
  v_exam    public.cbt_exams%rowtype;
begin
  select * into v_session from public.cbt_sessions where id = p_session_id;
  if not found then
    raise exception 'Session not found.' using errcode = '42501';
  end if;

  -- Staff may review any paper; a candidate only their own.
  if not private.is_staff() and v_session.student_id is distinct from private.my_student_id() then
    raise exception 'That is not your exam session.' using errcode = '42501';
  end if;

  select * into v_exam from public.cbt_exams where id = v_session.exam_id;

  return query
  select
    q.id, q.question_number, q.question_text,
    q.option_a, q.option_b, q.option_c, q.option_d, q.marks,
    a.selected
  from public.cbt_questions q
  left join public.cbt_answers a
    on a.question_id = q.id and a.session_id = p_session_id
  where q.exam_id = v_session.exam_id
  order by
    -- Shuffled per session, so the order is stable on refresh but differs
    -- between candidates.
    case when v_exam.shuffle_questions
         then md5(p_session_id::text || q.id::text) end,
    q.question_number;
end;
$$;

-- Record an answer. No correctness is returned, and none is stored yet.
create or replace function public.cbt_answer(
  p_session_id uuid,
  p_question_id uuid,
  p_selected public.cbt_option
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.cbt_sessions%rowtype;
begin
  select * into v_session from public.cbt_sessions where id = p_session_id;
  if not found then
    raise exception 'Session not found.' using errcode = '42501';
  end if;
  if v_session.student_id is distinct from private.my_student_id() then
    raise exception 'That is not your exam session.' using errcode = '42501';
  end if;
  if v_session.status <> 'in_progress' then
    raise exception 'This attempt has already been submitted.' using errcode = '22023';
  end if;
  if now() > v_session.expires_at then
    raise exception 'Your time is up.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.cbt_questions
    where id = p_question_id and exam_id = v_session.exam_id
  ) then
    raise exception 'That question is not on this paper.' using errcode = '22023';
  end if;

  insert into public.cbt_answers (school_id, session_id, question_id, selected)
  values (v_session.school_id, p_session_id, p_question_id, p_selected)
  on conflict (session_id, question_id)
  do update set selected = excluded.selected, answered_at = now();
end;
$$;

-- Submit and grade. Scoring happens here and nowhere else — the client never
-- supplies a score. A CASE yields text, so the status is cast explicitly.
create or replace function public.cbt_submit(p_session_id uuid)
returns table (score numeric, total_marks numeric, percentage numeric, revealed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.cbt_sessions%rowtype;
  v_exam    public.cbt_exams%rowtype;
  v_score   numeric(8,2);
  v_total   numeric(8,2);
  v_pct     numeric(5,2);
  v_expired boolean;
begin
  select * into v_session from public.cbt_sessions where id = p_session_id;
  if not found then
    raise exception 'Session not found.' using errcode = '42501';
  end if;
  if v_session.student_id is distinct from private.my_student_id() then
    raise exception 'That is not your exam session.' using errcode = '42501';
  end if;
  if v_session.status <> 'in_progress' then
    raise exception 'This attempt has already been submitted.' using errcode = '22023';
  end if;

  select * into v_exam from public.cbt_exams where id = v_session.exam_id;
  v_expired := now() > v_session.expires_at;

  update public.cbt_answers a
  set is_correct = (a.selected = q.correct_option)
  from public.cbt_questions q
  where a.question_id = q.id and a.session_id = p_session_id;

  select coalesce(sum(q.marks) filter (where a.is_correct), 0)
  into v_score
  from public.cbt_answers a
  join public.cbt_questions q on q.id = a.question_id
  where a.session_id = p_session_id;

  select coalesce(sum(marks), 0) into v_total
  from public.cbt_questions where exam_id = v_session.exam_id;

  v_pct := case when v_total > 0 then round((v_score / v_total) * 100, 2) else 0 end;

  update public.cbt_sessions
  set status = (case when v_expired then 'expired' else 'submitted' end)::public.cbt_session_status,
      submitted_at = now(),
      score = v_score,
      total_marks = v_total,
      percentage = v_pct
  where id = p_session_id;

  return query
  select v_score, v_total, v_pct, v_exam.reveal_score;
end;
$$;

revoke all on function public.cbt_start(uuid) from public, anon;
revoke all on function public.cbt_paper(uuid) from public, anon;
revoke all on function public.cbt_answer(uuid, uuid, public.cbt_option) from public, anon;
revoke all on function public.cbt_submit(uuid) from public, anon;

grant execute on function public.cbt_start(uuid) to authenticated;
grant execute on function public.cbt_paper(uuid) to authenticated;
grant execute on function public.cbt_answer(uuid, uuid, public.cbt_option) to authenticated;
grant execute on function public.cbt_submit(uuid) to authenticated;
