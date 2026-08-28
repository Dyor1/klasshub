-- Subscription billing: KlassHub charging schools.
--
-- Until now `plan` and `trial_ends_at` were decoration. `trial_ends_at` was read
-- in exactly one place, to render "N days left", and nothing consulted it again
-- — so every trial ran forever and every plan was unlimited. This makes both
-- mean something.
--
-- Two rules, deliberately separated:
--   * a plan LIMIT caps how many students a school may hold
--   * a plan STATE decides whether the school may write at all
-- They fail differently and a school hits them at different times, so they get
-- different messages rather than one generic "upgrade" wall.

-- ---------------------------------------------------------------------------
-- Tiers as data, not code. Changing a price or a cap is one UPDATE — no
-- migration, no redeploy, no chance of the marketing page and the biller
-- disagreeing about what a plan costs.
-- ---------------------------------------------------------------------------
create table public.plan_limits (
  plan         public.school_plan primary key,
  label        text not null,
  max_students int check (max_students is null or max_students > 0),
  price_kobo   bigint check (price_kobo is null or price_kobo >= 0),
  self_serve   boolean not null default true,
  sort_order   int not null default 0
);

comment on table public.plan_limits is
  'Plan pricing and caps. max_students null = unlimited; price_kobo null = sales-led.';

insert into public.plan_limits (plan, label, max_students, price_kobo, self_serve, sort_order) values
  -- The trial gets the Standard cap rather than the Starter one on purpose: a
  -- 400-pupil school that cannot finish importing its roll during the trial
  -- never reaches the point of choosing a plan at all.
  ('trial',    'Free trial', 600,  0,       false, 0),
  ('starter',  'Starter',    150,  3500000, true,  1),
  ('standard', 'Standard',   600,  8500000, true,  2),
  ('group',    'Group',      null, null,    false, 3);

alter table public.plan_limits enable row level security;
create policy "anyone signed in reads plans" on public.plan_limits
  for select to authenticated using (true);

revoke all on public.plan_limits from anon, authenticated;
grant select on public.plan_limits to authenticated;

-- ---------------------------------------------------------------------------
-- What a school has actually paid for.
-- ---------------------------------------------------------------------------
alter table public.schools
  add column paid_until timestamptz;

comment on column public.schools.paid_until is
  'End of the paid period. Null means never paid — the school is on trial.';

create table public.subscription_payments (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references public.schools (id) on delete cascade,
  plan          public.school_plan not null,
  reference     text not null unique check (length(reference) between 8 and 100),
  amount        numeric(12,2) not null check (amount >= 0),
  status        public.payment_attempt_status not null default 'pending',
  period_start  timestamptz,
  period_end    timestamptz,
  paystack_ref  text,
  initiated_by  uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  paid_at       timestamptz,
  foreign key (initiated_by, school_id)
    references public.profiles (id, school_id) on delete set null (initiated_by)
);

create index subscription_payments_school_idx
  on public.subscription_payments (school_id, created_at desc);

alter table public.subscription_payments enable row level security;

-- Admins see their own school's billing history. Nobody writes through the API:
-- 'success' is set by the webhook alone, running as the service role.
create policy "admins read own billing" on public.subscription_payments
  for select to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_admin()) );

create policy "admins start own subscription" on public.subscription_payments
  for insert to authenticated
  with check ( school_id = (select private.current_school_id()) and (select private.is_admin()) );

revoke all on public.subscription_payments from anon, authenticated;
grant select, insert on public.subscription_payments to authenticated;

-- ---------------------------------------------------------------------------
-- Access state.
--
-- 'grace' exists so a school is never locked out mid-morning over a transfer
-- that is still clearing. Losing a week of revenue is cheaper than a head
-- teacher unable to mark a register in front of a room of children.
-- ---------------------------------------------------------------------------
create type public.school_access_state as enum ('trial', 'active', 'grace', 'locked');

create or replace function private.school_access(p_school uuid default null)
returns public.school_access_state
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_school uuid;
  s        record;
  v_expiry timestamptz;
begin
  v_school := coalesce(p_school, private.current_school_id());
  if v_school is null then return 'locked'; end if;

  select plan, trial_ends_at, paid_until into s
  from public.schools where id = v_school;

  if not found then return 'locked'; end if;

  if s.paid_until is not null and s.paid_until > now() then
    return 'active';
  end if;
  if s.plan = 'trial' and s.trial_ends_at > now() then
    return 'trial';
  end if;

  -- Whichever entitlement ran out most recently starts the grace clock.
  v_expiry := greatest(coalesce(s.paid_until, '-infinity'::timestamptz), s.trial_ends_at);
  if v_expiry + interval '7 days' > now() then
    return 'grace';
  end if;

  return 'locked';
end;
$$;

create or replace function private.school_student_limit(p_school uuid default null)
returns int
language sql
security definer
stable
set search_path = ''
as $$
  select pl.max_students
  from public.schools s
  join public.plan_limits pl on pl.plan = s.plan
  where s.id = coalesce(p_school, private.current_school_id());
$$;

-- Exposed so the billing page can show the same numbers the triggers enforce,
-- rather than a second copy of the rules that could drift from them.
create or replace function public.my_school_billing()
returns table (
  plan          public.school_plan,
  label         text,
  access        public.school_access_state,
  max_students  int,
  student_count bigint,
  price_kobo    bigint,
  trial_ends_at timestamptz,
  paid_until    timestamptz
)
language sql
security definer
stable
set search_path = ''
as $$
  select
    s.plan,
    pl.label,
    private.school_access(s.id),
    pl.max_students,
    (select count(*) from public.students st where st.school_id = s.id),
    pl.price_kobo,
    s.trial_ends_at,
    s.paid_until
  from public.schools s
  join public.plan_limits pl on pl.plan = s.plan
  where s.id = (select private.current_school_id());
$$;

revoke all on function public.my_school_billing() from public, anon;
grant execute on function public.my_school_billing() to authenticated;

-- ---------------------------------------------------------------------------
-- Enforcement. In the database rather than the app: a limit that lives only in
-- a server action is one direct REST call away from not existing.
-- ---------------------------------------------------------------------------
create or replace function private.enforce_student_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit int;
  v_count bigint;
begin
  v_limit := private.school_student_limit(new.school_id);
  if v_limit is null then return new; end if;  -- unlimited

  select count(*) into v_count from public.students where school_id = new.school_id;

  if v_count >= v_limit then
    raise exception
      'Your plan covers % students and you have %. Upgrade to add more.',
      v_limit, v_count
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger enforce_student_limit
  before insert on public.students
  for each row execute function private.enforce_student_limit();

create or replace function private.assert_school_writable()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.school_access(new.school_id) = 'locked' then
    raise exception
      'Your KlassHub subscription has ended. Your records are safe and readable — renew from Settings to start recording again.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- Applied to the tables where a school's day-to-day work lands. Deliberately
-- INSERT and UPDATE only: a school that stops paying keeps full read access and
-- can still delete or export its own data. Locking someone out of their own
-- children's records to extract payment would be indefensible.
create trigger assert_writable before insert or update on public.students
  for each row execute function private.assert_school_writable();
create trigger assert_writable before insert or update on public.results
  for each row execute function private.assert_school_writable();
create trigger assert_writable before insert or update on public.attendance
  for each row execute function private.assert_school_writable();
create trigger assert_writable before insert or update on public.invoices
  for each row execute function private.assert_school_writable();
create trigger assert_writable before insert or update on public.announcements
  for each row execute function private.assert_school_writable();
create trigger assert_writable before insert or update on public.assignments
  for each row execute function private.assert_school_writable();

create trigger touch_subscription_payments before update on public.subscription_payments
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Paying for a term. Mirrors the invoice flow: the admin records an intent, the
-- signed webhook is the only thing that turns it into an entitlement.
-- ---------------------------------------------------------------------------
create or replace function public.create_subscription_attempt(p_plan public.school_plan)
returns table (reference text, amount numeric, payer_email text)
language plpgsql
set search_path = ''
as $$
declare
  v_school uuid;
  v_price  bigint;
  v_self   boolean;
  v_ref    text;
  v_email  text;
begin
  v_school := private.current_school_id();
  if v_school is null or not private.is_admin() then
    raise exception 'Only administrators can change the plan.' using errcode = '42501';
  end if;

  select price_kobo, self_serve into v_price, v_self
  from public.plan_limits where plan = p_plan;

  if not found or not v_self or v_price is null then
    raise exception 'That plan is arranged with our sales team, not paid online.'
      using errcode = '22023';
  end if;

  select email into v_email from public.profiles where id = (select auth.uid());
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

create or replace function public.record_subscription_payment(
  p_reference    text,
  p_paystack_ref text,
  p_amount_kobo  bigint
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row   public.subscription_payments%rowtype;
  v_naira numeric(12,2);
  v_from  timestamptz;
begin
  update public.subscription_payments
  set status = 'success', paystack_ref = p_paystack_ref, paid_at = now()
  where reference = p_reference and status = 'pending'
  returning * into v_row;

  if not found then
    if exists (select 1 from public.subscription_payments where reference = p_reference) then
      return 'already recorded';
    end if;
    return 'unknown reference';
  end if;

  v_naira := p_amount_kobo::numeric / 100;

  if v_naira <> v_row.amount then
    update public.subscription_payments
    set status = 'failed', paid_at = null where id = v_row.id;
    return 'amount mismatch: expected ' || v_row.amount || ', got ' || v_naira;
  end if;

  -- Extend from whichever is later: an early renewal adds to the remaining
  -- period instead of throwing it away, so paying ahead is never a penalty.
  select greatest(coalesce(paid_until, now()), now()) into v_from
  from public.schools where id = v_row.school_id;

  update public.schools
  set plan = v_row.plan,
      paid_until = v_from + interval '4 months'   -- one Nigerian school term
  where id = v_row.school_id;

  update public.subscription_payments
  set period_start = v_from, period_end = v_from + interval '4 months'
  where id = v_row.id;

  return 'recorded';
end;
$$;

revoke all on function public.record_subscription_payment(text, text, bigint)
  from public, anon, authenticated;
grant execute on function public.record_subscription_payment(text, text, bigint)
  to service_role;
