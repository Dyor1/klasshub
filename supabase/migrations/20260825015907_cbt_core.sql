-- Computer-based testing.
--
-- The hard requirement: a candidate must never be able to read the answer key.
-- RLS constrains rows, not columns, so no policy on cbt_questions could hide
-- correct_option while still letting students read the question text. Instead
-- students have NO access to cbt_questions at all — they go through RPCs that
-- return questions with the answer stripped, and grading happens server-side.

create type public.cbt_status as enum ('draft', 'published', 'closed');
create type public.cbt_session_status as enum ('in_progress', 'submitted', 'expired');
create type public.cbt_option as enum ('a', 'b', 'c', 'd');

create table public.cbt_exams (
  id               uuid primary key default gen_random_uuid(),
  school_id        uuid not null references public.schools (id) on delete cascade,
  class_id         uuid not null,
  subject_id       uuid,
  title            text not null check (length(btrim(title)) between 1 and 160),
  instructions     text,
  duration_minutes int not null default 30 check (duration_minutes between 1 and 600),
  term             public.term not null,
  academic_year    text not null,
  status           public.cbt_status not null default 'draft',
  opens_at         timestamptz,
  closes_at        timestamptz,
  shuffle_questions boolean not null default false,
  reveal_score     boolean not null default true,
  created_by       uuid,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint cbt_window_order check (opens_at is null or closes_at is null or opens_at < closes_at),
  foreign key (class_id, school_id)   references public.classes  (id, school_id) on delete cascade,
  foreign key (subject_id, school_id) references public.subjects (id, school_id) on delete set null (subject_id),
  foreign key (created_by, school_id) references public.profiles (id, school_id) on delete set null (created_by)
);

create index cbt_exams_school_idx  on public.cbt_exams (school_id, created_at desc);
create index cbt_exams_class_idx   on public.cbt_exams (class_id, school_id);
create index cbt_exams_subject_idx on public.cbt_exams (subject_id, school_id);
create index cbt_exams_creator_idx on public.cbt_exams (created_by, school_id);

alter table public.cbt_exams enable row level security;

-- Staff see every exam; a candidate sees only published exams for their class.
create policy "read cbt exams" on public.cbt_exams
  for select to authenticated
  using (
    school_id = (select private.current_school_id())
    and (
      (select private.is_staff())
      or (status = 'published' and class_id in (select private.visible_class_ids()))
    )
  );
create policy "staff insert cbt exams" on public.cbt_exams
  for insert to authenticated
  with check ( school_id = (select private.current_school_id()) and (select private.is_staff()) );
create policy "staff update cbt exams" on public.cbt_exams
  for update to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_staff()) )
  with check ( school_id = (select private.current_school_id()) );
create policy "staff delete cbt exams" on public.cbt_exams
  for delete to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_staff()) );

-- cbt_questions — STAFF ONLY. Candidates never select from this table.
create table public.cbt_questions (
  id              uuid primary key default gen_random_uuid(),
  school_id       uuid not null references public.schools (id) on delete cascade,
  exam_id         uuid not null references public.cbt_exams (id) on delete cascade,
  question_number int not null check (question_number > 0),
  question_text   text not null check (length(btrim(question_text)) > 0),
  option_a        text not null,
  option_b        text not null,
  option_c        text,
  option_d        text,
  correct_option  public.cbt_option not null,
  marks           numeric(6,2) not null default 1 check (marks > 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (exam_id, question_number)
);

create index cbt_questions_exam_idx   on public.cbt_questions (exam_id, question_number);
create index cbt_questions_school_idx on public.cbt_questions (school_id);

alter table public.cbt_questions enable row level security;

-- Deliberately no policy granting students any access whatsoever.
create policy "staff read cbt questions" on public.cbt_questions
  for select to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_staff()) );
create policy "staff write cbt questions" on public.cbt_questions
  for all to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_staff()) )
  with check ( school_id = (select private.current_school_id()) and (select private.is_staff()) );

-- cbt_sessions — one attempt per student per exam
create table public.cbt_sessions (
  id           uuid primary key default gen_random_uuid(),
  school_id    uuid not null references public.schools (id) on delete cascade,
  exam_id      uuid not null references public.cbt_exams (id) on delete cascade,
  student_id   uuid not null,
  status       public.cbt_session_status not null default 'in_progress',
  started_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  submitted_at timestamptz,
  score        numeric(8,2),
  total_marks  numeric(8,2),
  percentage   numeric(5,2),
  created_at   timestamptz not null default now(),
  unique (exam_id, student_id),
  foreign key (student_id, school_id) references public.students (id, school_id) on delete cascade
);

create index cbt_sessions_exam_idx    on public.cbt_sessions (exam_id);
create index cbt_sessions_student_idx on public.cbt_sessions (student_id, school_id);
create index cbt_sessions_school_idx  on public.cbt_sessions (school_id);

alter table public.cbt_sessions enable row level security;

-- Nobody writes directly: sessions are created and scored by the RPCs, so a
-- candidate cannot set their own score.
create policy "read cbt sessions" on public.cbt_sessions
  for select to authenticated
  using (
    school_id = (select private.current_school_id())
    and ( (select private.is_staff()) or student_id in (select private.visible_student_ids()) )
  );
create policy "staff delete cbt sessions" on public.cbt_sessions
  for delete to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_staff()) );

-- cbt_answers — is_correct stays NULL until submission, so an in-progress
-- candidate reading their own answers learns nothing.
create table public.cbt_answers (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools (id) on delete cascade,
  session_id  uuid not null references public.cbt_sessions (id) on delete cascade,
  question_id uuid not null references public.cbt_questions (id) on delete cascade,
  selected    public.cbt_option,
  is_correct  boolean,
  answered_at timestamptz not null default now(),
  unique (session_id, question_id)
);

create index cbt_answers_session_idx on public.cbt_answers (session_id);
create index cbt_answers_school_idx  on public.cbt_answers (school_id);

alter table public.cbt_answers enable row level security;

create policy "read cbt answers" on public.cbt_answers
  for select to authenticated
  using (
    school_id = (select private.current_school_id())
    and (
      (select private.is_staff())
      or session_id in (
        select s.id from public.cbt_sessions s
        where s.student_id in (select private.visible_student_ids())
      )
    )
  );
create policy "staff delete cbt answers" on public.cbt_answers
  for delete to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_staff()) );

create trigger touch_cbt_exams before update on public.cbt_exams
  for each row execute function private.touch_updated_at();
create trigger touch_cbt_questions before update on public.cbt_questions
  for each row execute function private.touch_updated_at();

grant select, insert, update, delete on public.cbt_exams     to authenticated;
grant select, insert, update, delete on public.cbt_questions to authenticated;
grant select, delete on public.cbt_sessions to authenticated;
grant select, delete on public.cbt_answers  to authenticated;
