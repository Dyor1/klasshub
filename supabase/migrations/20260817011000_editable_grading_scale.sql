-- Editing the grading scale has to re-grade existing results. Grades are
-- stamped when marks are written, so without this a school that changes its
-- scale would keep seeing the old letters on every past report card.

create or replace function private.regrade_school(p_school_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Only the grade column is touched, so the apply_grade trigger (which fires
  -- on score columns) does not re-run.
  update public.results r
  set grade = (
    select gb.grade
    from public.grade_bands gb
    where gb.school_id = r.school_id
      and round(((r.ca_score + r.exam_score) / nullif(r.ca_max + r.exam_max, 0)) * 100, 2)
          between gb.min_score and gb.max_score
    order by gb.sort_order
    limit 1
  )
  where r.school_id = p_school_id;
end;
$$;

create or replace function private.regrade_on_band_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.regrade_school(coalesce(new.school_id, old.school_id));
  return null;
end;
$$;

create trigger regrade_after_band_change
  after insert or update or delete on public.grade_bands
  for each row execute function private.regrade_on_band_change();

-- Replace the whole scale atomically.
--
-- supabase-js cannot wrap a delete+insert in one transaction, and a failure
-- between them would leave a school with no scale at all. A function body is
-- atomic, so the replace happens or it doesn't.
--
-- SECURITY DEFINER in an exposed schema is justified here on the same terms as
-- invitation_preview: the school is derived from the caller's own profile and
-- never accepted as an argument, and the admin check is inside the function.
create or replace function public.replace_grade_bands(p_bands jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_school uuid;
  v_count  int;
begin
  if not private.is_admin() then
    raise exception 'Only administrators can change the grading scale.'
      using errcode = '42501';
  end if;

  v_school := private.current_school_id();
  if v_school is null then
    raise exception 'No school for this account.' using errcode = '42501';
  end if;

  select count(*) into v_count from jsonb_array_elements(p_bands);
  if v_count < 1 then
    raise exception 'Provide at least one grade band.' using errcode = '22023';
  end if;

  delete from public.grade_bands where school_id = v_school;

  insert into public.grade_bands (school_id, grade, min_score, max_score, remark, sort_order)
  select
    v_school,
    btrim(b ->> 'grade'),
    (b ->> 'min_score')::numeric,
    (b ->> 'max_score')::numeric,
    nullif(btrim(coalesce(b ->> 'remark', '')), ''),
    ord::int
  from jsonb_array_elements(p_bands) with ordinality as t(b, ord);

  perform private.regrade_school(v_school);
end;
$$;

revoke all on function public.replace_grade_bands(jsonb) from public, anon;
grant execute on function public.replace_grade_bands(jsonb) to authenticated;
