-- create_subscription_attempt is security invoker, so it ran as `authenticated`
-- — a role that had `revoke all on schema private` applied to it in the very
-- first migration. Every call died on `permission denied for schema private`
-- before reaching any of its own checks, so the function never worked at all,
-- for admins or anyone else.
--
-- Nearly missed: the student and admin calls both errored, which looks like a
-- passing authorisation test until you read the messages and find they are the
-- same error, and the wrong one.
--
-- Fixed by reading the caller's school and role from public.profiles instead,
-- which is readable under RLS. Staying security invoker is the point: the
-- INSERT continues to go through the "admins start own subscription" policy,
-- so the policy remains the authority rather than a check inside a definer
-- function that could drift away from it.
--
-- (create_payment_attempt was unaffected: it only ever touched auth.uid() and
-- the invoice_balances view, never the private schema.)
create or replace function public.create_subscription_attempt(p_plan public.school_plan)
returns table (reference text, amount numeric, payer_email text)
language plpgsql
set search_path = ''
as $$
declare
  v_school uuid;
  v_role   public.user_role;
  v_price  bigint;
  v_self   boolean;
  v_ref    text;
  v_email  text;
begin
  select school_id, role, email into v_school, v_role, v_email
  from public.profiles
  where id = (select auth.uid());

  if v_school is null or v_role <> 'admin' then
    raise exception 'Only administrators can change the plan.' using errcode = '42501';
  end if;

  select price_kobo, self_serve into v_price, v_self
  from public.plan_limits where plan = p_plan;

  if not found or not v_self or v_price is null then
    raise exception 'That plan is arranged with our sales team, not paid online.'
      using errcode = '22023';
  end if;

  if v_email is null or v_email = '' then
    raise exception 'Add an email address to your account before paying.'
      using errcode = '22023';
  end if;

  v_ref := 'KHSUB-' || replace(gen_random_uuid()::text, '-', '');

  insert into public.subscription_payments
    (school_id, plan, reference, amount, initiated_by)
  values
    (v_school, p_plan, v_ref, v_price::numeric / 100, (select auth.uid()));

  return query select v_ref, (v_price::numeric / 100), v_email;
end;
$$;

revoke all on function public.create_subscription_attempt(public.school_plan) from public, anon;
grant execute on function public.create_subscription_attempt(public.school_plan) to authenticated;
