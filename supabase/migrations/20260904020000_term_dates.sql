-- When each term runs.
--
-- Report cards carry a closing date and a resumption date, and parents plan
-- around them. Until now neither existed in the data, so the card either
-- omitted them or would have had to invent them.
--
-- This also makes "days present out of days the school opened" computable for
-- the first time. Attendance rows are dated but terms were not, so there was
-- no way to say which marks belonged to which term.

create table public.term_dates (
  school_id           uuid not null references public.schools (id) on delete cascade,
  academic_year       text not null,
  term                public.term not null,
  starts_on           date not null,
  ends_on             date not null,
  -- Optional. For the first two terms this is the next term's starts_on and is
  -- derived rather than typed. The third term's "next" belongs to an academic
  -- year that usually has no rows yet at the point the card is printed, which
  -- is exactly when a school needs to print the date — so it can be set
  -- explicitly.
  next_term_starts_on date,
  updated_at          timestamptz not null default now(),
  primary key (school_id, academic_year, term),
  constraint term_ends_after_it_starts check (ends_on > starts_on),
  constraint resumption_after_close
    check (next_term_starts_on is null or next_term_starts_on > ends_on)
);

comment on table public.term_dates is
  'Start, end and resumption dates per term. Drives report card dates and '
  'per-term attendance.';

create index term_dates_school_idx on public.term_dates (school_id, academic_year);

alter table public.term_dates enable row level security;

-- Everyone in the school can read them: they appear on report cards, which
-- students and parents see.
create policy "school reads term dates" on public.term_dates
  for select to authenticated
  using ( school_id = (select private.current_school_id()) );
create policy "admins insert term dates" on public.term_dates
  for insert to authenticated
  with check ( school_id = (select private.current_school_id()) and (select private.is_admin()) );
create policy "admins update term dates" on public.term_dates
  for update to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_admin()) )
  with check ( school_id = (select private.current_school_id()) );
create policy "admins delete term dates" on public.term_dates
  for delete to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_admin()) );

-- Supabase grants ALL on new public tables to anon and authenticated by
-- default, so narrow it deliberately rather than relying on the grant that is
-- already there.
revoke all on public.term_dates from anon, authenticated;
grant select, insert, update, delete on public.term_dates to authenticated;

create trigger touch_term_dates before update on public.term_dates
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- What a report card needs, resolved in one place: the term's own dates, the
-- resumption date (explicit or derived from the following term), and the
-- pupil's attendance inside the window.
-- ---------------------------------------------------------------------------
create or replace function public.report_card_term_context(
  p_student       uuid,
  p_academic_year text,
  p_term          public.term
)
returns table (
  starts_on     date,
  ends_on       date,
  resumes_on    date,
  days_open     bigint,
  days_present  bigint,
  days_absent   bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with td as (
    select t.starts_on, t.ends_on,
           coalesce(
             t.next_term_starts_on,
             -- Whichever term in this school and year begins after this one
             -- ends. Nulls out for the third term unless set explicitly.
             (select min(n.starts_on)
                from public.term_dates n
               where n.school_id = t.school_id
                 and n.academic_year = t.academic_year
                 and n.starts_on > t.ends_on)
           ) as resumes_on
    from public.term_dates t
    join public.students s
      on s.school_id = t.school_id
    where s.id = p_student
      and t.academic_year = p_academic_year
      and t.term = p_term
  )
  select
    td.starts_on,
    td.ends_on,
    td.resumes_on,
    -- "Days the school opened" is how many distinct days this class was
    -- marked, not how many weekdays fall in the range: a school that did not
    -- open cannot count the day against a child.
    (select count(distinct a.date)
       from public.attendance a
       join public.students s2 on s2.id = p_student
      where a.class_id = s2.class_id
        and a.date between td.starts_on and td.ends_on),
    (select count(*) from public.attendance a
      where a.student_id = p_student
        and a.date between td.starts_on and td.ends_on
        and a.status in ('present', 'late')),
    (select count(*) from public.attendance a
      where a.student_id = p_student
        and a.date between td.starts_on and td.ends_on
        and a.status = 'absent')
  from td;
$$;

revoke all on function public.report_card_term_context(uuid, text, public.term)
  from public, anon;
grant execute on function public.report_card_term_context(uuid, text, public.term)
  to authenticated;
