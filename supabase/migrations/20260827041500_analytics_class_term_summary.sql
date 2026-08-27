-- Per class, per term. student_term_summary could serve the same headline
-- numbers, but it grows with enrolment and would reach PostgREST's 1000-row
-- cap at roughly 330 students across three terms. This one grows with the
-- number of classes instead, so the dashboard totals stay correct at any size.
create view public.class_term_summary
with (security_invoker = true) as
select
  r.school_id,
  r.class_id,
  r.academic_year,
  r.term,
  count(distinct r.student_id)::int                          as students,
  count(*)::int                                              as entries,
  round(avg(r.percentage), 2)                                as avg_percentage,
  count(*) filter (where r.percentage >= sc.pass_mark)::int   as passed,
  count(*) filter (where r.published)::int                    as published_count
from public.results r
join public.schools sc on sc.id = r.school_id
group by r.school_id, r.class_id, r.academic_year, r.term;

comment on view public.class_term_summary is
  'One row per class per term: enrolment covered, average, and passes.';

grant select on public.class_term_summary to authenticated;
