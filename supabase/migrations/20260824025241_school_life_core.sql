-- Announcements, events, timetable and attendance: the features every logged-in
-- role touches. Same tenancy rules as the academic tables — composite FKs
-- carrying school_id, and RLS scoped through private helpers.

create type public.announcement_audience as enum ('everyone', 'staff', 'students', 'parents');
create type public.attendance_status as enum ('present', 'absent', 'late', 'excused');
create type public.weekday as enum ('monday','tuesday','wednesday','thursday','friday','saturday');

-- Students the caller may see: their own record, plus any child they guard.
create or replace function private.visible_student_ids()
returns setof uuid
language sql
security definer
stable
set search_path = ''
as $$
  select id from public.students where profile_id = (select auth.uid())
  union
  select student_id from public.student_guardians where profile_id = (select auth.uid());
$$;

-- Classes those students sit in — used to target announcements.
create or replace function private.visible_class_ids()
returns setof uuid
language sql
security definer
stable
set search_path = ''
as $$
  select distinct class_id
  from public.students
  where class_id is not null
    and id in (select private.visible_student_ids());
$$;

-- ---------------------------------------------------------------------------
-- announcements
-- ---------------------------------------------------------------------------
create table public.announcements (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references public.schools (id) on delete cascade,
  title      text not null check (length(btrim(title)) between 1 and 160),
  body       text not null check (length(btrim(body)) > 0),
  audience   public.announcement_audience not null default 'everyone',
  class_id   uuid,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (class_id, school_id) references public.classes (id, school_id) on delete cascade,
  foreign key (created_by, school_id) references public.profiles (id, school_id) on delete set null (created_by)
);

create index announcements_school_idx  on public.announcements (school_id, created_at desc);
create index announcements_class_idx   on public.announcements (class_id, school_id);
create index announcements_creator_idx on public.announcements (created_by, school_id);

alter table public.announcements enable row level security;

create policy "read announcements" on public.announcements
  for select to authenticated
  using (
    school_id = (select private.current_school_id())
    and (
      (select private.is_staff())
      or (
        -- audience must match the reader's role
        (
          audience = 'everyone'
          or (audience = 'students' and (select private.current_role()) = 'student')
          or (audience = 'parents'  and (select private.current_role()) = 'parent')
        )
        -- and, if targeted at a class, that class must be relevant to them
        and (class_id is null or class_id in (select private.visible_class_ids()))
      )
    )
  );

create policy "staff insert announcements" on public.announcements
  for insert to authenticated
  with check ( school_id = (select private.current_school_id()) and (select private.is_staff()) );
create policy "staff update announcements" on public.announcements
  for update to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_staff()) )
  with check ( school_id = (select private.current_school_id()) );
create policy "staff delete announcements" on public.announcements
  for delete to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_staff()) );

-- ---------------------------------------------------------------------------
-- events  (school calendar — visible to the whole school)
-- ---------------------------------------------------------------------------
create table public.events (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools (id) on delete cascade,
  title       text not null check (length(btrim(title)) between 1 and 160),
  description text,
  event_date  date not null,
  event_time  time,
  location    text,
  created_by  uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  foreign key (created_by, school_id) references public.profiles (id, school_id) on delete set null (created_by)
);

create index events_school_date_idx on public.events (school_id, event_date);
create index events_creator_idx     on public.events (created_by, school_id);

alter table public.events enable row level security;

create policy "school reads events" on public.events
  for select to authenticated
  using ( school_id = (select private.current_school_id()) );
create policy "staff insert events" on public.events
  for insert to authenticated
  with check ( school_id = (select private.current_school_id()) and (select private.is_staff()) );
create policy "staff update events" on public.events
  for update to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_staff()) )
  with check ( school_id = (select private.current_school_id()) );
create policy "staff delete events" on public.events
  for delete to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_staff()) );

-- ---------------------------------------------------------------------------
-- timetable
-- ---------------------------------------------------------------------------
create table public.timetable (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references public.schools (id) on delete cascade,
  class_id      uuid not null,
  subject_id    uuid,
  teacher_id    uuid,
  day_of_week   public.weekday not null,
  start_time    time not null,
  end_time      time not null,
  room          text,
  period_label  text,
  academic_year text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint timetable_time_order check (start_time < end_time),
  foreign key (class_id, school_id)   references public.classes  (id, school_id) on delete cascade,
  foreign key (subject_id, school_id) references public.subjects (id, school_id) on delete set null (subject_id),
  foreign key (teacher_id, school_id) references public.profiles (id, school_id) on delete set null (teacher_id)
);

create index timetable_class_idx   on public.timetable (class_id, school_id, day_of_week);
create index timetable_subject_idx on public.timetable (subject_id, school_id);
create index timetable_teacher_idx on public.timetable (teacher_id, school_id);
create index timetable_school_idx  on public.timetable (school_id);

alter table public.timetable enable row level security;

-- A timetable is not sensitive; everyone in the school can read it.
create policy "school reads timetable" on public.timetable
  for select to authenticated
  using ( school_id = (select private.current_school_id()) );
create policy "staff insert timetable" on public.timetable
  for insert to authenticated
  with check ( school_id = (select private.current_school_id()) and (select private.is_staff()) );
create policy "staff update timetable" on public.timetable
  for update to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_staff()) )
  with check ( school_id = (select private.current_school_id()) );
create policy "staff delete timetable" on public.timetable
  for delete to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_staff()) );

-- ---------------------------------------------------------------------------
-- attendance
-- ---------------------------------------------------------------------------
create table public.attendance (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools (id) on delete cascade,
  student_id  uuid not null,
  class_id    uuid not null,
  date        date not null,
  status      public.attendance_status not null default 'present',
  remarks     text,
  recorded_by uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (student_id, date),
  foreign key (student_id, school_id)  references public.students (id, school_id) on delete cascade,
  foreign key (class_id, school_id)    references public.classes  (id, school_id) on delete cascade,
  foreign key (recorded_by, school_id) references public.profiles (id, school_id) on delete set null (recorded_by)
);

create index attendance_student_idx    on public.attendance (student_id, school_id);
create index attendance_class_date_idx on public.attendance (class_id, date);
create index attendance_recorder_idx   on public.attendance (recorded_by, school_id);
create index attendance_school_idx     on public.attendance (school_id);

alter table public.attendance enable row level security;

create policy "read attendance" on public.attendance
  for select to authenticated
  using (
    school_id = (select private.current_school_id())
    and (
      (select private.is_staff())
      or student_id in (select private.visible_student_ids())
    )
  );
create policy "staff insert attendance" on public.attendance
  for insert to authenticated
  with check ( school_id = (select private.current_school_id()) and (select private.is_staff()) );
create policy "staff update attendance" on public.attendance
  for update to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_staff()) )
  with check ( school_id = (select private.current_school_id()) );
create policy "staff delete attendance" on public.attendance
  for delete to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_staff()) );

-- updated_at upkeep
create trigger touch_announcements before update on public.announcements
  for each row execute function private.touch_updated_at();
create trigger touch_events before update on public.events
  for each row execute function private.touch_updated_at();
create trigger touch_timetable before update on public.timetable
  for each row execute function private.touch_updated_at();
create trigger touch_attendance before update on public.attendance
  for each row execute function private.touch_updated_at();

grant select, insert, update, delete on public.announcements to authenticated;
grant select, insert, update, delete on public.events        to authenticated;
grant select, insert, update, delete on public.timetable     to authenticated;
grant select, insert, update, delete on public.attendance    to authenticated;
