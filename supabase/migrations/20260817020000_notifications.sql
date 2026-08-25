-- In-app notifications, delivered by database triggers so a notice can never
-- be missed because application code forgot to send it.
--
-- Email/SMS fan-out is a separate concern layered on top; this table is the
-- record of what should have reached whom.

create type public.notification_kind as enum (
  'announcement', 'result', 'attendance', 'fees', 'lesson_note', 'general'
);

create table public.notifications (
  id           uuid primary key default gen_random_uuid(),
  school_id    uuid not null references public.schools (id) on delete cascade,
  recipient_id uuid not null,
  kind         public.notification_kind not null default 'general',
  title        text not null check (length(btrim(title)) between 1 and 160),
  body         text,
  link         text,
  read_at      timestamptz,
  created_at   timestamptz not null default now(),
  foreign key (recipient_id, school_id)
    references public.profiles (id, school_id) on delete cascade
);

-- The unread badge queries this constantly, so it gets a partial index.
create index notifications_unread_idx
  on public.notifications (recipient_id, created_at desc)
  where read_at is null;
create index notifications_recipient_idx on public.notifications (recipient_id, school_id, created_at desc);
create index notifications_school_idx    on public.notifications (school_id);

alter table public.notifications enable row level security;

-- You only ever see your own. Even an admin cannot read another user's inbox.
create policy "read own notifications" on public.notifications
  for select to authenticated
  using ( recipient_id = (select auth.uid()) );
create policy "update own notifications" on public.notifications
  for update to authenticated
  using ( recipient_id = (select auth.uid()) )
  with check ( recipient_id = (select auth.uid()) );
create policy "delete own notifications" on public.notifications
  for delete to authenticated
  using ( recipient_id = (select auth.uid()) );
create policy "staff insert notifications" on public.notifications
  for insert to authenticated
  with check ( school_id = (select private.current_school_id()) and (select private.is_staff()) );

grant select, insert, update, delete on public.notifications to authenticated;

-- Who should hear about a given student: the student's own account plus any
-- guardian linked to them.
create or replace function private.profiles_for_student(p_student uuid)
returns setof uuid
language sql
security definer
stable
set search_path = ''
as $$
  select profile_id from public.students
  where id = p_student and profile_id is not null
  union
  select profile_id from public.student_guardians where student_id = p_student;
$$;

create or replace function private.notify(
  p_school uuid,
  p_recipients uuid[],
  p_kind public.notification_kind,
  p_title text,
  p_body text,
  p_link text
)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  insert into public.notifications (school_id, recipient_id, kind, title, body, link)
  select p_school, r, p_kind, p_title, p_body, p_link
  from unnest(p_recipients) as r
  -- Never notify someone who no longer belongs to the school.
  where exists (
    select 1 from public.profiles pr where pr.id = r and pr.school_id = p_school
  );
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Announcement posted -> everyone it was addressed to
create or replace function private.notify_on_announcement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recipients uuid[];
begin
  select array_agg(p.id) into v_recipients
  from public.profiles p
  where p.school_id = new.school_id
    -- Don't notify the author about their own post.
    and p.id is distinct from new.created_by
    and (
      new.audience = 'everyone'
      or (new.audience = 'staff'    and p.role in ('admin','teacher'))
      or (new.audience = 'students' and p.role = 'student')
      or (new.audience = 'parents'  and p.role = 'parent')
    )
    and (
      new.class_id is null
      or exists (
        select 1 from public.students s
        where s.class_id = new.class_id
          and (
            s.profile_id = p.id
            or exists (
              select 1 from public.student_guardians g
              where g.student_id = s.id and g.profile_id = p.id
            )
          )
      )
      -- Staff are not filtered by class.
      or p.role in ('admin','teacher')
    );

  if v_recipients is not null then
    perform private.notify(
      new.school_id, v_recipients, 'announcement',
      new.title, left(coalesce(new.body, ''), 240), '/dashboard/announcements'
    );
  end if;

  return null;
end;
$$;

create trigger notify_on_announcement
  after insert on public.announcements
  for each row execute function private.notify_on_announcement();

-- Marked absent or late -> the student and their guardians
create or replace function private.notify_on_absence()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recipients uuid[];
  v_name text;
begin
  if new.status not in ('absent', 'late') then
    return null;
  end if;
  -- On update, only fire when the status actually changed into absent/late.
  if tg_op = 'UPDATE' and old.status = new.status then
    return null;
  end if;

  select array_agg(r) into v_recipients
  from private.profiles_for_student(new.student_id) as r;

  if v_recipients is null then
    return null;
  end if;

  select surname || ' ' || first_name into v_name
  from public.students where id = new.student_id;

  perform private.notify(
    new.school_id, v_recipients, 'attendance',
    case when new.status = 'absent' then 'Marked absent' else 'Marked late' end,
    coalesce(v_name, 'A student') || ' was marked ' || new.status::text ||
      ' on ' || to_char(new.date, 'DD Mon YYYY') || '.',
    '/dashboard/attendance'
  );

  return null;
end;
$$;

create trigger notify_on_absence
  after insert or update of status on public.attendance
  for each row execute function private.notify_on_absence();

-- Results published -> the student and their guardians
create or replace function private.notify_on_result_published()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recipients uuid[];
begin
  -- Only on the transition into published, so re-saving marks stays quiet.
  if new.published is not true or old.published is true then
    return null;
  end if;

  select array_agg(r) into v_recipients
  from private.profiles_for_student(new.student_id) as r;

  if v_recipients is null then
    return null;
  end if;

  perform private.notify(
    new.school_id, v_recipients, 'result',
    'New result published',
    'A result has been published for ' || new.term::text || ' term, ' ||
      new.academic_year || '.',
    '/dashboard/results'
  );

  return null;
end;
$$;

create trigger notify_on_result_published
  after update of published on public.results
  for each row execute function private.notify_on_result_published();
