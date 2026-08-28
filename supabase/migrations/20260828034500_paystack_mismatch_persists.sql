-- An amount mismatch used to `raise`, right after marking the attempt failed.
-- The raise unwound that mark along with everything else, so the attempt was
-- left 'pending': invisible to an admin, and retried by Paystack forever even
-- though a mismatch can never resolve itself on a retry. Found by asserting on
-- the attempt's status after the fact rather than on the exception.
--
-- Now the mismatch is a durable outcome instead of an exception. Nothing is
-- credited either way, but the attempt is recorded as failed so a human can
-- see it, and the webhook can acknowledge the delivery so Paystack stops.
create or replace function public.record_paystack_payment(
  p_reference    text,
  p_paystack_ref text,
  p_amount_kobo  bigint,
  p_channel      text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.payment_attempts%rowtype;
  v_naira   numeric(12,2);
begin
  -- Claiming the attempt with a conditional UPDATE ... RETURNING is what makes
  -- this idempotent: Paystack retries webhooks, and only the first delivery
  -- finds a row still 'pending'.
  update public.payment_attempts
  set status = 'success',
      paystack_ref = p_paystack_ref,
      channel = p_channel,
      paid_at = now()
  where reference = p_reference
    and status = 'pending'
  returning * into v_attempt;

  if not found then
    if exists (select 1 from public.payment_attempts where reference = p_reference) then
      return 'already recorded';
    end if;
    return 'unknown reference';
  end if;

  -- Paystack counts in kobo.
  v_naira := p_amount_kobo::numeric / 100;

  if v_naira <> v_attempt.amount then
    -- Returning rather than raising, so this survives the transaction.
    update public.payment_attempts
    set status = 'failed',
        paystack_ref = p_paystack_ref,
        paid_at = null
    where id = v_attempt.id;
    return 'amount mismatch: expected ' || v_attempt.amount || ', got ' || v_naira;
  end if;

  -- Recorded even if it now exceeds the balance, which happens when the school
  -- takes a cash payment while the payer is on the checkout page. The money
  -- genuinely moved; a credit the school can see and refund is honest, and
  -- silently dropping a real payment is not.
  insert into public.payments
    (school_id, invoice_id, student_id, amount, method, reference, receipt_no, note)
  values
    (v_attempt.school_id, v_attempt.invoice_id, v_attempt.student_id, v_naira,
     'online', p_paystack_ref, '',
     'Paid online via Paystack');

  return 'recorded';
end;
$$;

revoke all on function public.record_paystack_payment(text, text, bigint, text)
  from public, anon, authenticated;
grant execute on function public.record_paystack_payment(text, text, bigint, text)
  to service_role;
