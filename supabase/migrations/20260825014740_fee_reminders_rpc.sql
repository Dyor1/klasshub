-- Sends an outstanding-balance reminder to every debtor for a term.
--
-- Admin-triggered rather than automatic: a school decides when to chase, and
-- an accidental nightly blast to every parent would be worse than useless.
create or replace function public.send_fee_reminders(
  p_term public.term,
  p_academic_year text
)
returns table (students int, recipients int)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_school     uuid;
  v_row        record;
  v_recipients uuid[];
  v_students   int := 0;
  v_sent       int := 0;
  v_n          int;
begin
  if not private.is_admin() then
    raise exception 'Only administrators can send fee reminders.' using errcode = '42501';
  end if;

  v_school := private.current_school_id();
  if v_school is null then
    raise exception 'No school for this account.' using errcode = '42501';
  end if;

  for v_row in
    select b.student_id, b.balance, s.surname, s.first_name
    from public.invoice_balances b
    join public.students s on s.id = b.student_id
    where b.school_id = v_school
      and b.term = p_term
      and b.academic_year = p_academic_year
      and b.balance > 0
  loop
    select array_agg(r) into v_recipients
    from private.profiles_for_student(v_row.student_id) as r;

    -- A student with no linked account and no guardian has nobody to tell;
    -- count them as a student processed but not as a recipient.
    if v_recipients is null then
      v_students := v_students + 1;
      continue;
    end if;

    v_n := private.notify(
      v_school, v_recipients, 'fees',
      'Outstanding school fees',
      v_row.surname || ' ' || v_row.first_name || ' has an outstanding balance of NGN ' ||
        to_char(v_row.balance, 'FM999,999,999.00') || ' for ' || p_term::text ||
        ' term, ' || p_academic_year || '.',
      '/dashboard/fees'
    );

    v_students := v_students + 1;
    v_sent := v_sent + coalesce(v_n, 0);
  end loop;

  return query select v_students, v_sent;
end;
$$;

revoke all on function public.send_fee_reminders(public.term, text) from public, anon;
grant execute on function public.send_fee_reminders(public.term, text) to authenticated;
