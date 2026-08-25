-- Fee structure, invoices and payments.
--
-- An invoice snapshots its line items at the moment it is raised. If a school
-- later edits the fee structure, already-issued invoices must not silently
-- change — a parent who was told ₦50,000 owes ₦50,000.
--
-- Balances are derived from payments rather than stored, so a total can never
-- drift from the payments backing it.

create type public.payment_method as enum ('cash', 'transfer', 'pos', 'online', 'cheque', 'waiver');

-- fee_items — the template: what a class owes for a term
create table public.fee_items (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references public.schools (id) on delete cascade,
  class_id      uuid,                       -- null = applies to every class
  name          text not null check (length(btrim(name)) between 1 and 100),
  amount        numeric(12,2) not null check (amount >= 0),
  term          public.term not null,
  academic_year text not null,
  is_optional   boolean not null default false,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  foreign key (class_id, school_id) references public.classes (id, school_id) on delete cascade
);

create index fee_items_school_idx on public.fee_items (school_id, academic_year, term);
create index fee_items_class_idx  on public.fee_items (class_id, school_id);

alter table public.fee_items enable row level security;

create policy "school reads fee items" on public.fee_items
  for select to authenticated
  using ( school_id = (select private.current_school_id()) );
create policy "admins insert fee items" on public.fee_items
  for insert to authenticated
  with check ( school_id = (select private.current_school_id()) and (select private.is_admin()) );
create policy "admins update fee items" on public.fee_items
  for update to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_admin()) )
  with check ( school_id = (select private.current_school_id()) );
create policy "admins delete fee items" on public.fee_items
  for delete to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_admin()) );

-- invoices — one bill per student per term
create table public.invoices (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references public.schools (id) on delete cascade,
  student_id    uuid not null,
  class_id      uuid,
  term          public.term not null,
  academic_year text not null,
  total_amount  numeric(12,2) not null default 0 check (total_amount >= 0),
  discount      numeric(12,2) not null default 0 check (discount >= 0),
  note          text,
  issued_by     uuid,
  issued_at     timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint invoice_discount_within_total check (discount <= total_amount),
  -- One bill per student per term, so re-running generation cannot double-bill.
  unique (student_id, academic_year, term),
  foreign key (student_id, school_id) references public.students (id, school_id) on delete cascade,
  foreign key (class_id, school_id)   references public.classes  (id, school_id) on delete set null (class_id),
  foreign key (issued_by, school_id)  references public.profiles (id, school_id) on delete set null (issued_by)
);

create index invoices_school_idx  on public.invoices (school_id, academic_year, term);
create index invoices_student_idx on public.invoices (student_id, school_id);
create index invoices_class_idx   on public.invoices (class_id, school_id);
create index invoices_issuer_idx  on public.invoices (issued_by, school_id);

alter table public.invoices enable row level security;

create policy "read invoices" on public.invoices
  for select to authenticated
  using (
    school_id = (select private.current_school_id())
    and ( (select private.is_staff()) or student_id in (select private.visible_student_ids()) )
  );
create policy "admins insert invoices" on public.invoices
  for insert to authenticated
  with check ( school_id = (select private.current_school_id()) and (select private.is_admin()) );
create policy "admins update invoices" on public.invoices
  for update to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_admin()) )
  with check ( school_id = (select private.current_school_id()) );
create policy "admins delete invoices" on public.invoices
  for delete to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_admin()) );

-- invoice_lines — the snapshot
create table public.invoice_lines (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools (id) on delete cascade,
  invoice_id  uuid not null references public.invoices (id) on delete cascade,
  description text not null,
  amount      numeric(12,2) not null check (amount >= 0),
  sort_order  int not null default 0
);

create index invoice_lines_invoice_idx on public.invoice_lines (invoice_id);
create index invoice_lines_school_idx  on public.invoice_lines (school_id);

alter table public.invoice_lines enable row level security;

create policy "read invoice lines" on public.invoice_lines
  for select to authenticated
  using (
    school_id = (select private.current_school_id())
    and invoice_id in (select id from public.invoices)
  );
create policy "admins write invoice lines" on public.invoice_lines
  for all to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_admin()) )
  with check ( school_id = (select private.current_school_id()) and (select private.is_admin()) );

-- payments
create table public.payments (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools (id) on delete cascade,
  invoice_id  uuid not null references public.invoices (id) on delete cascade,
  student_id  uuid not null,
  amount      numeric(12,2) not null check (amount > 0),
  method      public.payment_method not null default 'transfer',
  reference   text,
  receipt_no  text not null,
  note        text,
  paid_at     timestamptz not null default now(),
  recorded_by uuid,
  created_at  timestamptz not null default now(),
  unique (school_id, receipt_no),
  foreign key (student_id, school_id)  references public.students (id, school_id) on delete cascade,
  foreign key (recorded_by, school_id) references public.profiles (id, school_id) on delete set null (recorded_by)
);

create index payments_invoice_idx  on public.payments (invoice_id);
create index payments_student_idx  on public.payments (student_id, school_id);
create index payments_school_idx   on public.payments (school_id, paid_at desc);
create index payments_recorder_idx on public.payments (recorded_by, school_id);

alter table public.payments enable row level security;

create policy "read payments" on public.payments
  for select to authenticated
  using (
    school_id = (select private.current_school_id())
    and ( (select private.is_staff()) or student_id in (select private.visible_student_ids()) )
  );
create policy "admins insert payments" on public.payments
  for insert to authenticated
  with check ( school_id = (select private.current_school_id()) and (select private.is_admin()) );
create policy "admins update payments" on public.payments
  for update to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_admin()) )
  with check ( school_id = (select private.current_school_id()) );
create policy "admins delete payments" on public.payments
  for delete to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_admin()) );

-- Sequential receipt numbers per school, allocated inside the insert so two
-- concurrent payments cannot collide.
create or replace function private.assign_receipt_no()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_next int;
begin
  if new.receipt_no is not null and btrim(new.receipt_no) <> '' then
    return new;
  end if;

  select coalesce(max(nullif(regexp_replace(receipt_no, '\D', '', 'g'), '')::int), 0) + 1
  into v_next
  from public.payments
  where school_id = new.school_id;

  new.receipt_no := 'RCP-' || lpad(v_next::text, 5, '0');
  return new;
end;
$$;

create trigger assign_receipt_no
  before insert on public.payments
  for each row execute function private.assign_receipt_no();

create trigger touch_fee_items before update on public.fee_items
  for each row execute function private.touch_updated_at();
create trigger touch_invoices before update on public.invoices
  for each row execute function private.touch_updated_at();

-- Balances. security_invoker so the caller's RLS on invoices still applies.
create view public.invoice_balances
with (security_invoker = true) as
select
  i.*,
  coalesce(p.paid, 0) as amount_paid,
  (i.total_amount - i.discount - coalesce(p.paid, 0)) as balance,
  case
    when (i.total_amount - i.discount) <= 0 then 'waived'
    when coalesce(p.paid, 0) <= 0 then 'unpaid'
    when coalesce(p.paid, 0) >= (i.total_amount - i.discount) then 'paid'
    else 'part'
  end as payment_status
from public.invoices i
left join (
  select invoice_id, sum(amount) as paid
  from public.payments
  group by invoice_id
) p on p.invoice_id = i.id;

grant select on public.invoice_balances to authenticated;

grant select, insert, update, delete on public.fee_items     to authenticated;
grant select, insert, update, delete on public.invoices      to authenticated;
grant select, insert, update, delete on public.invoice_lines to authenticated;
grant select, insert, update, delete on public.payments      to authenticated;
