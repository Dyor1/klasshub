-- Raises invoices for every active student in a class for one term, copying
-- the current fee structure into immutable line items.
--
-- Atomic by being a single function: a partial run would leave some students
-- billed and others not. Students who already have an invoice for the term are
-- skipped rather than duplicated, so this is safe to re-run after enrolling
-- more students.
--
-- SECURITY DEFINER in an exposed schema on the same terms as the other RPCs:
-- the school comes from the caller's own profile, never from an argument, and
-- the admin check is inside.
create or replace function public.generate_invoices(
  p_class_id uuid,
  p_term public.term,
  p_academic_year text
)
returns table (created int, skipped int)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_school   uuid;
  v_student  record;
  v_invoice  uuid;
  v_total    numeric(12,2);
  v_created  int := 0;
  v_skipped  int := 0;
begin
  if not private.is_admin() then
    raise exception 'Only administrators can raise invoices.' using errcode = '42501';
  end if;

  v_school := private.current_school_id();
  if v_school is null then
    raise exception 'No school for this account.' using errcode = '42501';
  end if;

  if p_academic_year is null or btrim(p_academic_year) = '' then
    raise exception 'A session is required.' using errcode = '22023';
  end if;

  -- The class must belong to the caller's school.
  if not exists (
    select 1 from public.classes
    where id = p_class_id and school_id = v_school
  ) then
    raise exception 'That class does not belong to your school.' using errcode = '42501';
  end if;

  for v_student in
    select id from public.students
    where class_id = p_class_id
      and school_id = v_school
      and status = 'active'
  loop
    if exists (
      select 1 from public.invoices
      where student_id = v_student.id
        and academic_year = p_academic_year
        and term = p_term
    ) then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    -- Compulsory items only; optional levies are added per student by hand.
    select coalesce(sum(amount), 0) into v_total
    from public.fee_items
    where school_id = v_school
      and term = p_term
      and academic_year = p_academic_year
      and is_optional = false
      and (class_id is null or class_id = p_class_id);

    insert into public.invoices (
      school_id, student_id, class_id, term, academic_year, total_amount, issued_by
    )
    values (
      v_school, v_student.id, p_class_id, p_term, p_academic_year, v_total, (select auth.uid())
    )
    returning id into v_invoice;

    insert into public.invoice_lines (school_id, invoice_id, description, amount, sort_order)
    select v_school, v_invoice, fi.name, fi.amount, fi.sort_order
    from public.fee_items fi
    where fi.school_id = v_school
      and fi.term = p_term
      and fi.academic_year = p_academic_year
      and fi.is_optional = false
      and (fi.class_id is null or fi.class_id = p_class_id);

    v_created := v_created + 1;
  end loop;

  return query select v_created, v_skipped;
end;
$$;

revoke all on function public.generate_invoices(uuid, public.term, text) from public, anon;
grant execute on function public.generate_invoices(uuid, public.term, text) to authenticated;
