-- Analytics.
--
-- Every view here is a plain aggregate over tables that already have RLS, and
-- every one is security_invoker, so the caller's own policies decide which
-- rows get aggregated. That is the same pattern results_ranked and
-- invoice_balances already use. Nothing new is exposed: a teacher aggregates
-- the whole school because their policies already let them read the whole
-- school, and a parent aggregating would only ever see their own child.
--
-- That last case is why the analytics page is staff-only in the UI. A parent
-- calling these views directly leaks nothing, but a "class average" computed
-- over one child would be a misleading number to put in front of them.
--
-- Aggregating in SQL rather than in the app is not a preference. PostgREST
-- caps a response at max_rows = 1000, and a term of attendance for a mid-size
-- school is tens of thousands of rows, so app-side aggregation would silently
-- compute averages over a truncated page.

-- What counts as a pass. Schools disagree (40 and 50 are both common), so it
-- belongs to the school rather than to our code.
alter table public.schools
  add column pass_mark numeric(5,2) not null default 40
    check (pass_mark >= 0 and pass_mark <= 100);

comment on column public.schools.pass_mark is
  'Percentage at or above which a result counts as a pass in analytics.';

-- ---------------------------------------------------------------------------
-- Per student, per term. Powers the at-risk list and every school-wide
-- average. One row per student per term keeps this well inside max_rows.
-- ---------------------------------------------------------------------------
create view public.student_term_summary
with (security_invoker = true) as
select
  r.school_id,
  r.student_id,
  r.class_id,
  r.academic_year,
  r.term,
  count(*)::int                                                   as subjects_taken,
  round(avg(r.percentage), 2)                                     as avg_percentage,
  sum(r.total_score)                                              as total_score,
  count(*) filter (where r.percentage >= sc.pass_mark)::int        as subjects_passed,
  count(*) filter (where r.percentage <  sc.pass_mark)::int        as subjects_failed,
  count(*) filter (where r.published)::int                         as published_count,
  min(r.percentage)                                               as lowest_percentage,
  max(r.percentage)                                               as highest_percentage
from public.results r
join public.schools sc on sc.id = r.school_id
group by r.school_id, r.student_id, r.class_id, r.academic_year, r.term;

comment on view public.student_term_summary is
  'One row per student per term: subject count, average, passes and failures.';

-- ---------------------------------------------------------------------------
-- Per class and subject. Shows which subject is dragging a class down.
-- Rows = classes x subjects, so a few hundred at most.
-- ---------------------------------------------------------------------------
create view public.class_subject_performance
with (security_invoker = true) as
select
  r.school_id,
  r.class_id,
  r.subject_id,
  r.academic_year,
  r.term,
  count(*)::int                                             as entries,
  round(avg(r.percentage), 2)                               as avg_percentage,
  count(*) filter (where r.percentage >= sc.pass_mark)::int  as passed,
  min(r.percentage)                                         as lowest_percentage,
  max(r.percentage)                                         as highest_percentage,
  count(*) filter (where r.published)::int                   as published_count
from public.results r
join public.schools sc on sc.id = r.school_id
group by r.school_id, r.class_id, r.subject_id, r.academic_year, r.term;

comment on view public.class_subject_performance is
  'One row per class-subject-term: entries, average, passes and spread.';

-- ---------------------------------------------------------------------------
-- Grade spread, for the distribution chart.
-- ---------------------------------------------------------------------------
create view public.grade_distribution
with (security_invoker = true) as
select
  r.school_id,
  r.class_id,
  r.academic_year,
  r.term,
  r.grade,
  count(*)::int as entries
from public.results r
where r.grade is not null
group by r.school_id, r.class_id, r.academic_year, r.term, r.grade;

comment on view public.grade_distribution is
  'Count of results per letter grade, per class and term.';

-- ---------------------------------------------------------------------------
-- Attendance. Two shapes, because one view cannot serve both a daily trend
-- line and a per-class breakdown without blowing past max_rows:
--   attendance_daily   - whole school, one row per day (~200 rows a year)
--   attendance_monthly - per class, one row per month (~classes x 12)
-- 'Late' still means the student was in school, so both views expose it
-- separately and let the caller decide how to count it.
-- ---------------------------------------------------------------------------
create view public.attendance_daily
with (security_invoker = true) as
select
  a.school_id,
  a.date,
  count(*)::int                                       as marked,
  count(*) filter (where a.status = 'present')::int   as present,
  count(*) filter (where a.status = 'late')::int      as late,
  count(*) filter (where a.status = 'absent')::int    as absent,
  count(*) filter (where a.status = 'excused')::int   as excused
from public.attendance a
group by a.school_id, a.date;

comment on view public.attendance_daily is
  'Whole-school attendance counts for one day.';

create view public.attendance_monthly
with (security_invoker = true) as
select
  a.school_id,
  a.class_id,
  date_trunc('month', a.date)::date                   as month,
  count(*)::int                                       as marked,
  count(*) filter (where a.status = 'present')::int   as present,
  count(*) filter (where a.status = 'late')::int      as late,
  count(*) filter (where a.status = 'absent')::int    as absent,
  count(*) filter (where a.status = 'excused')::int   as excused
from public.attendance a
group by a.school_id, a.class_id, date_trunc('month', a.date);

comment on view public.attendance_monthly is
  'Attendance counts per class per calendar month.';

-- ---------------------------------------------------------------------------
-- Fees, rolled up from invoice_balances so the definition of "paid" stays in
-- exactly one place.
-- ---------------------------------------------------------------------------
create view public.fee_summary
with (security_invoker = true) as
select
  b.school_id,
  b.class_id,
  b.academic_year,
  b.term,
  count(*)::int                                              as invoices,
  sum(b.total_amount - b.discount)                           as billed,
  sum(b.amount_paid)                                         as collected,
  sum(b.balance)                                             as outstanding,
  count(*) filter (where b.payment_status = 'paid')::int      as paid_in_full,
  count(*) filter (where b.payment_status = 'part')::int      as part_paid,
  count(*) filter (where b.payment_status = 'unpaid')::int    as unpaid
from public.invoice_balances b
group by b.school_id, b.class_id, b.academic_year, b.term;

comment on view public.fee_summary is
  'Billed, collected and outstanding per class and term.';

grant select on public.student_term_summary       to authenticated;
grant select on public.class_subject_performance  to authenticated;
grant select on public.grade_distribution         to authenticated;
grant select on public.attendance_daily           to authenticated;
grant select on public.attendance_monthly         to authenticated;
grant select on public.fee_summary                to authenticated;

-- The grouped scans above all filter on school and then on year/term or date.
create index if not exists results_year_term_idx
  on public.results (school_id, academic_year, term);
create index if not exists attendance_school_date_idx
  on public.attendance (school_id, date);
