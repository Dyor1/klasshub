-- Classes, subjects, students and results.
--
-- Tenant integrity: every FK between tenant tables is COMPOSITE and carries
-- school_id, so a row in school A cannot reference a row in school B even if
-- application code or a policy were buggy. This is enforced by Postgres, not
-- by RLS, so it holds for service_role and backend jobs too.

create type public.term as enum ('first', 'second', 'third');
create type public.student_status as enum ('active', 'graduated', 'withdrawn', 'suspended');

-- Needed as the target of composite FKs.
alter table public.profiles add constraint profiles_id_school_unique unique (id, school_id);

-- Staff = anyone who may write academic records.
create or replace function private.is_staff()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('admin', 'teacher')
  );
$$;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create table public.subjects (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references public.schools (id) on delete cascade,
  name       text not null check (length(btrim(name)) between 1 and 100),
  code       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, name),
  unique (id, school_id)
);

create table public.classes (
  id               uuid primary key default gen_random_uuid(),
  school_id        uuid not null references public.schools (id) on delete cascade,
  name             text not null check (length(btrim(name)) between 1 and 60),
  grade_level      text not null,
  section          text,
  academic_year    text not null,
  class_teacher_id uuid,
  capacity         int check (capacity is null or capacity > 0),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (school_id, name, academic_year),
  unique (id, school_id),
  foreign key (class_teacher_id, school_id)
    references public.profiles (id, school_id) on delete set null
);

create table public.students (
  id               uuid primary key default gen_random_uuid(),
  school_id        uuid not null references public.schools (id) on delete cascade,
  class_id         uuid,
  profile_id       uuid,
  admission_number text not null,
  surname          text not null check (length(btrim(surname)) > 0),
  first_name       text not null check (length(btrim(first_name)) > 0),
  other_names      text,
  gender           text check (gender in ('male', 'female')),
  date_of_birth    date,
  admission_date   date not null default current_date,
  status           public.student_status not null default 'active',
  guardian_name    text,
  guardian_phone   text,
  guardian_email   text,
  address          text,
  photo_url        text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (school_id, admission_number),
  unique (id, school_id),
  foreign key (class_id, school_id)
    references public.classes (id, school_id) on delete set null,
  foreign key (profile_id, school_id)
    references public.profiles (id, school_id) on delete set null
);

-- Nigerian CA + Exam model, one row per student/subject/term.
create table public.results (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references public.schools (id) on delete cascade,
  student_id    uuid not null,
  subject_id    uuid not null,
  class_id      uuid not null,
  academic_year text not null,
  term          public.term not null,

  ca_score   numeric(5,2) not null default 0 check (ca_score   >= 0),
  ca_max     numeric(5,2) not null default 40 check (ca_max    >  0),
  exam_score numeric(5,2) not null default 0 check (exam_score >= 0),
  exam_max   numeric(5,2) not null default 60 check (exam_max  >  0),

  -- Derived, so a total can never drift from its parts.
  total_score numeric(6,2) generated always as (ca_score + exam_score) stored,
  percentage  numeric(5,2) generated always as (
    round(((ca_score + exam_score) / (ca_max + exam_max)) * 100, 2)
  ) stored,

  grade       text,
  position    int check (position is null or position > 0),
  remarks     text,
  published   boolean not null default false,
  recorded_by uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint results_ca_within_max   check (ca_score   <= ca_max),
  constraint results_exam_within_max check (exam_score <= exam_max),
  unique (student_id, subject_id, academic_year, term),

  foreign key (student_id, school_id) references public.students (id, school_id) on delete cascade,
  foreign key (subject_id, school_id) references public.subjects (id, school_id) on delete cascade,
  foreign key (class_id,   school_id) references public.classes  (id, school_id) on delete cascade,
  foreign key (recorded_by, school_id) references public.profiles (id, school_id) on delete set null
);

create index subjects_school_idx    on public.subjects (school_id);
create index classes_school_idx     on public.classes  (school_id);
create index classes_teacher_idx    on public.classes  (class_teacher_id);
create index students_school_idx    on public.students (school_id);
create index students_class_idx     on public.students (class_id);
create index students_profile_idx   on public.students (profile_id);
create index results_school_idx     on public.results  (school_id);
create index results_student_idx    on public.results  (student_id);
create index results_class_term_idx on public.results  (class_id, academic_year, term);

create trigger touch_subjects before update on public.subjects
  for each row execute function private.touch_updated_at();
create trigger touch_classes  before update on public.classes
  for each row execute function private.touch_updated_at();
create trigger touch_students before update on public.students
  for each row execute function private.touch_updated_at();
create trigger touch_results  before update on public.results
  for each row execute function private.touch_updated_at();

alter table public.subjects enable row level security;
alter table public.classes  enable row level security;
alter table public.students enable row level security;
alter table public.results  enable row level security;

create policy "school reads subjects" on public.subjects
  for select to authenticated
  using ( school_id = (select private.current_school_id()) );
create policy "staff write subjects" on public.subjects
  for all to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_staff()) )
  with check ( school_id = (select private.current_school_id()) and (select private.is_staff()) );

create policy "school reads classes" on public.classes
  for select to authenticated
  using ( school_id = (select private.current_school_id()) );
create policy "staff write classes" on public.classes
  for all to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_staff()) )
  with check ( school_id = (select private.current_school_id()) and (select private.is_staff()) );

create policy "staff read students" on public.students
  for select to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_staff()) );
create policy "student reads own record" on public.students
  for select to authenticated
  using ( school_id = (select private.current_school_id()) and profile_id = (select auth.uid()) );
create policy "staff write students" on public.students
  for all to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_staff()) )
  with check ( school_id = (select private.current_school_id()) and (select private.is_staff()) );

create policy "staff read results" on public.results
  for select to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_staff()) );
create policy "student reads own published results" on public.results
  for select to authenticated
  using (
    school_id = (select private.current_school_id())
    and published
    and student_id in (
      select id from public.students where profile_id = (select auth.uid())
    )
  );
create policy "staff write results" on public.results
  for all to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_staff()) )
  with check ( school_id = (select private.current_school_id()) and (select private.is_staff()) );

grant select, insert, update, delete on public.subjects to authenticated;
grant select, insert, update, delete on public.classes  to authenticated;
grant select, insert, update, delete on public.students to authenticated;
grant select, insert, update, delete on public.results  to authenticated;
