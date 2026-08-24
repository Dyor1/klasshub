-- Grading bands, automatic grades, and ranked results for report cards.

create table public.grade_bands (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references public.schools (id) on delete cascade,
  grade      text not null check (length(btrim(grade)) between 1 and 4),
  min_score  numeric(5,2) not null check (min_score >= 0 and min_score <= 100),
  max_score  numeric(5,2) not null check (max_score >= 0 and max_score <= 100),
  remark     text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  constraint grade_band_range check (min_score <= max_score),
  unique (school_id, grade)
);

comment on table public.grade_bands is
  'Percentage bands a school grades against. Seeded with a standard Nigerian scale at signup.';

create index grade_bands_school_idx on public.grade_bands (school_id, min_score);

alter table public.grade_bands enable row level security;

create policy "school reads grade bands" on public.grade_bands
  for select to authenticated
  using ( school_id = (select private.current_school_id()) );
create policy "admins insert grade bands" on public.grade_bands
  for insert to authenticated
  with check ( school_id = (select private.current_school_id()) and (select private.is_admin()) );
create policy "admins update grade bands" on public.grade_bands
  for update to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_admin()) )
  with check ( school_id = (select private.current_school_id()) );
create policy "admins delete grade bands" on public.grade_bands
  for delete to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_admin()) );

grant select, insert, update, delete on public.grade_bands to authenticated;

-- Default scale for a new school.
create or replace function private.seed_grade_bands(p_school_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.grade_bands (school_id, grade, min_score, max_score, remark, sort_order)
  values
    (p_school_id, 'A', 70, 100, 'Excellent',  1),
    (p_school_id, 'B', 60, 69.99, 'Very Good', 2),
    (p_school_id, 'C', 50, 59.99, 'Good',      3),
    (p_school_id, 'D', 45, 49.99, 'Fair',      4),
    (p_school_id, 'E', 40, 44.99, 'Pass',      5),
    (p_school_id, 'F', 0,  39.99, 'Fail',      6);
$$;

-- Stamp the grade whenever marks change.
--
-- percentage is a GENERATED column and is not populated yet inside a BEFORE
-- trigger, so the percentage is recomputed here from the raw scores rather
-- than read from NEW.percentage.
create or replace function private.apply_grade()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pct numeric(6,2);
begin
  v_pct := round(
    ((new.ca_score + new.exam_score) / nullif(new.ca_max + new.exam_max, 0)) * 100,
    2
  );

  select gb.grade into new.grade
  from public.grade_bands gb
  where gb.school_id = new.school_id
    and v_pct >= gb.min_score
    and v_pct <= gb.max_score
  order by gb.sort_order
  limit 1;

  return new;
end;
$$;

create trigger apply_grade_on_results
  before insert or update of ca_score, exam_score, ca_max, exam_max
  on public.results
  for each row execute function private.apply_grade();

-- Ranked view. security_invoker so the caller's RLS on results still applies —
-- without it a view would bypass RLS entirely.
create view public.results_ranked
with (security_invoker = true) as
select
  r.*,
  rank() over (
    partition by r.class_id, r.subject_id, r.academic_year, r.term
    order by r.total_score desc
  ) as subject_position,
  count(*) over (
    partition by r.class_id, r.subject_id, r.academic_year, r.term
  ) as subject_cohort
from public.results r;

grant select on public.results_ranked to authenticated;

-- Seed bands for any school that already exists.
do $$
declare s record;
begin
  for s in select id from public.schools loop
    perform private.seed_grade_bands(s.id);
  end loop;
end $$;
