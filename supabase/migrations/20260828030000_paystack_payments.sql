-- Online fee payment through Paystack.
--
-- The rule that shapes all of this: the browser is never told a payment
-- succeeded. Paystack redirects the payer back to us after checkout, but that
-- redirect is just a URL — anyone can visit it without having paid a kobo. The
-- only thing that may move money in this ledger is the signed webhook, which
-- carries an HMAC of the request body that only our secret key can produce.
--
-- So a payment lands in two stages:
--   1. create_payment_attempt   runs as the payer, under RLS, and records what
--                               they are about to try to pay
--   2. record_paystack_payment  runs only for the webhook, matches the attempt
--                               by reference, checks the amount, and writes the
--                               real payment row
--
-- The callback page merely says "we're checking" and reads the ledger.

create type public.payment_attempt_status as enum
  ('pending', 'success', 'failed', 'abandoned');

create table public.payment_attempts (
  id           uuid primary key default gen_random_uuid(),
  school_id    uuid not null references public.schools (id) on delete cascade,
  invoice_id   uuid not null references public.invoices (id) on delete cascade,
  student_id   uuid not null,
  -- Ours, generated before Paystack ever hears about it, so a webhook can be
  -- tied back to an invoice without trusting anything in the payload.
  reference    text not null unique check (length(reference) between 8 and 100),
  amount       numeric(12,2) not null check (amount > 0),
  status       public.payment_attempt_status not null default 'pending',
  paystack_ref text,
  channel      text,
  initiated_by uuid,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  paid_at      timestamptz,
  foreign key (student_id, school_id)   references public.students (id, school_id) on delete cascade,
  foreign key (initiated_by, school_id) references public.profiles (id, school_id) on delete set null (initiated_by)
);

create index payment_attempts_invoice_idx on public.payment_attempts (invoice_id);
create index payment_attempts_school_idx  on public.payment_attempts (school_id, created_at desc);
create index payment_attempts_student_idx on public.payment_attempts (student_id, school_id);
create index payment_attempts_payer_idx   on public.payment_attempts (initiated_by, school_id);

alter table public.payment_attempts enable row level security;

-- Same visibility as the invoice it belongs to: staff see the school's,
-- a parent sees their children's, a student sees their own.
create policy "read payment attempts" on public.payment_attempts
  for select to authenticated
  using (
    school_id = (select private.current_school_id())
    and ( (select private.is_staff()) or student_id in (select private.visible_student_ids()) )
  );

-- Starting an attempt is allowed for anyone who can see the invoice. A bogus
-- attempt is inert — no money moves without a signed webhook — so this needs
-- no stronger guard than "you can see what you are paying for".
create policy "start own payment attempt" on public.payment_attempts
  for insert to authenticated
  with check (
    school_id = (select private.current_school_id())
    and ( (select private.is_staff()) or student_id in (select private.visible_student_ids()) )
  );

-- Deliberately no update or delete policy. Only the webhook, running as the
-- service role, may move an attempt out of 'pending'. A payer who could set
-- their own attempt to 'success' would be writing their own receipt.

grant select, insert on public.payment_attempts to authenticated;
revoke all on public.payment_attempts from anon;

-- ---------------------------------------------------------------------------
-- Step 1: the payer says what they intend to pay.
--
-- security invoker on purpose: it reads invoice_balances and inserts through
-- the policies above, so a parent cannot open a checkout against a bill that
-- is not theirs. There is no way to pass someone else's invoice id and have it
-- work.
-- ---------------------------------------------------------------------------
create or replace function public.create_payment_attempt(p_invoice_id uuid)
returns table (reference text, amount numeric, payer_email text)
language plpgsql
set search_path = ''
as $$
declare
  v_school   uuid;
  v_student  uuid;
  v_balance  numeric;
  v_ref      text;
  v_email    text;
begin
  select b.school_id, b.student_id, b.balance
  into v_school, v_student, v_balance
  from public.invoice_balances b
  where b.id = p_invoice_id;

  if not found then
    raise exception 'That invoice could not be found.' using errcode = '42501';
  end if;
  if v_balance <= 0 then
    raise exception 'That invoice is already settled.' using errcode = '22023';
  end if;

  -- Prefer the signed-in payer's own address; fall back to whatever the school
  -- holds for the student's guardian. Paystack requires an email.
  select coalesce(
           (select p.email from public.profiles p where p.id = (select auth.uid())),
           (select s.guardian_email from public.students s where s.id = v_student)
         )
  into v_email;

  if v_email is null or v_email = '' then
    raise exception 'Add an email address to your account before paying online.'
      using errcode = '22023';
  end if;

  v_ref := 'KH-' || replace(gen_random_uuid()::text, '-', '');

  insert into public.payment_attempts
    (school_id, invoice_id, student_id, reference, amount, initiated_by)
  values
    (v_school, p_invoice_id, v_student, v_ref, v_balance, (select auth.uid()));

  return query select v_ref, v_balance, v_email;
end;
$$;

revoke all on function public.create_payment_attempt(uuid) from public, anon;
grant execute on function public.create_payment_attempt(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Step 2: the webhook says it actually happened.
--
-- security definer, and executable only by the service role the webhook runs
-- as. This is the single place a payment row is created from an online
-- transaction.
-- ---------------------------------------------------------------------------
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
  -- Claim the attempt. Doing this as a conditional UPDATE ... RETURNING is what
  -- makes the whole function idempotent: Paystack retries webhooks, and only
  -- the first call finds a row still 'pending'. A duplicate delivery falls
  -- through to 'already recorded' without writing a second payment.
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

  -- The signature already proves Paystack sent this, so a mismatch means our
  -- own bug rather than an attack. Refuse it loudly instead of crediting an
  -- amount nobody agreed to.
  if v_naira <> v_attempt.amount then
    update public.payment_attempts set status = 'failed' where id = v_attempt.id;
    raise exception 'Amount mismatch on %: expected %, got %',
      p_reference, v_attempt.amount, v_naira using errcode = '22023';
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

-- Marks an attempt that Paystack told us went nowhere.
create or replace function public.fail_payment_attempt(
  p_reference text,
  p_status    public.payment_attempt_status default 'failed'
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.payment_attempts
  set status = p_status
  where reference = p_reference and status = 'pending';

  return case when found then 'updated' else 'no pending attempt' end;
end;
$$;

revoke all on function public.fail_payment_attempt(text, public.payment_attempt_status)
  from public, anon, authenticated;
grant execute on function public.fail_payment_attempt(text, public.payment_attempt_status)
  to service_role;

create trigger touch_payment_attempts before update on public.payment_attempts
  for each row execute function private.touch_updated_at();
