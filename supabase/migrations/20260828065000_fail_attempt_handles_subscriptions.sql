-- fail_payment_attempt only ever looked at payment_attempts. Now that schools
-- pay KlassHub through the same webhook, a declined subscription charge — or
-- one refused for wrong currency — would have left subscription_payments stuck
-- on 'pending' indefinitely: no error anywhere, just a school that appears to
-- be mid-payment forever and never gets chased.
--
-- References are unique across both tables and carry distinct prefixes, so one
-- function can settle whichever it belongs to without the webhook needing to
-- know which it is.
create or replace function public.fail_payment_attempt(
  p_reference text,
  p_status    public.payment_attempt_status default 'failed'
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hit text := 'no pending attempt';
begin
  update public.payment_attempts
  set status = p_status
  where reference = p_reference and status = 'pending';
  if found then v_hit := 'invoice attempt updated'; end if;

  update public.subscription_payments
  set status = p_status
  where reference = p_reference and status = 'pending';
  if found then v_hit := 'subscription attempt updated'; end if;

  return v_hit;
end;
$$;

revoke all on function public.fail_payment_attempt(text, public.payment_attempt_status)
  from public, anon, authenticated;
grant execute on function public.fail_payment_attempt(text, public.payment_attempt_status)
  to service_role;
