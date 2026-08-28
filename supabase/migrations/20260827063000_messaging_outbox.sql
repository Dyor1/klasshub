-- Email and SMS delivery.
--
-- Notifications are created by database triggers, so at the moment a notice
-- comes into existence there is no HTTP request in flight to piggyback a send
-- onto. Sending inline from a trigger is worse still: it would put a network
-- call inside the transaction that records a result or marks a register, so a
-- slow provider would block a teacher's save and a failed one could roll it
-- back.
--
-- So: the trigger writes an outbox row and commits. A separate worker drains
-- the outbox and talks to Brevo and Termii. The message survives a provider
-- outage, retries are bounded, and nothing a school does in the UI can be held
-- up by someone else's API.

create type public.message_channel as enum ('email', 'sms');
create type public.message_status  as enum ('queued', 'sending', 'sent', 'failed', 'skipped');

-- ---------------------------------------------------------------------------
-- Phone numbers. SMS to a malformed number fails silently at the provider, so
-- normalise once on the way in rather than discovering it in a delivery log.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column phone text check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$');

comment on column public.profiles.phone is
  'E.164, e.g. +2348012345678. Normalised by private.normalize_phone on the way in.';

/** Nigerian numbers get written a dozen ways: 08012345678, 234 801 234 5678,
 *  +234-801-234-5678. Returns E.164 or null if it cannot be made sense of,
 *  because a wrong number is worse than a missing one. */
create or replace function private.normalize_phone(p_raw text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v text;
begin
  if p_raw is null then return null; end if;
  v := regexp_replace(p_raw, '[^0-9+]', '', 'g');
  if v = '' then return null; end if;

  if left(v, 1) = '+' then
    v := '+' || regexp_replace(substring(v from 2), '[^0-9]', '', 'g');
  elsif left(v, 3) = '234' then
    v := '+' || v;
  elsif left(v, 1) = '0' then
    -- Local Nigerian format: drop the trunk 0, add the country code.
    v := '+234' || substring(v from 2);
  else
    return null;
  end if;

  if v ~ '^\+[1-9][0-9]{7,14}$' then
    return v;
  end if;
  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Who wants what. Two independent switches:
--   notification_routes      - the school decides which events use which channel
--   notification_preferences - the individual can opt out of either channel
-- A message goes out only if both agree. The school cannot force SMS onto
-- someone who has turned it off.
-- ---------------------------------------------------------------------------
create table public.notification_routes (
  school_id  uuid not null references public.schools (id) on delete cascade,
  kind       public.notification_kind not null,
  email      boolean not null default true,
  sms        boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (school_id, kind)
);

comment on table public.notification_routes is
  'Per-school channel routing. Absent row means email on, SMS off.';

alter table public.notification_routes enable row level security;

create policy "school reads routes" on public.notification_routes
  for select to authenticated
  using ( school_id = (select private.current_school_id()) );
create policy "admins insert routes" on public.notification_routes
  for insert to authenticated
  with check ( school_id = (select private.current_school_id()) and (select private.is_admin()) );
create policy "admins update routes" on public.notification_routes
  for update to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_admin()) )
  with check ( school_id = (select private.current_school_id()) );
create policy "admins delete routes" on public.notification_routes
  for delete to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_admin()) );

create table public.notification_preferences (
  profile_id    uuid primary key references public.profiles (id) on delete cascade,
  school_id     uuid not null references public.schools (id) on delete cascade,
  email_enabled boolean not null default true,
  sms_enabled   boolean not null default true,
  updated_at    timestamptz not null default now()
);

comment on table public.notification_preferences is
  'Per-person opt-out. Absent row means both channels allowed.';

create index notification_preferences_school_idx
  on public.notification_preferences (school_id);

alter table public.notification_preferences enable row level security;

-- Strictly your own. An admin cannot read or change what someone else has
-- opted out of, matching how notifications themselves are scoped.
create policy "read own preferences" on public.notification_preferences
  for select to authenticated
  using ( profile_id = (select auth.uid()) );
create policy "insert own preferences" on public.notification_preferences
  for insert to authenticated
  with check (
    profile_id = (select auth.uid())
    and school_id = (select private.current_school_id())
  );
create policy "update own preferences" on public.notification_preferences
  for update to authenticated
  using ( profile_id = (select auth.uid()) )
  with check ( profile_id = (select auth.uid()) );

-- ---------------------------------------------------------------------------
-- The outbox.
-- ---------------------------------------------------------------------------
create table public.message_outbox (
  id              uuid primary key default gen_random_uuid(),
  school_id       uuid not null references public.schools (id) on delete cascade,
  notification_id uuid references public.notifications (id) on delete set null,
  recipient_id    uuid,
  channel         public.message_channel not null,
  -- Captured at enqueue time: if someone changes their number tomorrow we
  -- still know where this one actually went.
  destination     text not null,
  subject         text,
  body            text not null,
  status          public.message_status not null default 'queued',
  attempts        int not null default 0,
  error           text,
  provider        text,
  provider_ref    text,
  queued_at       timestamptz not null default now(),
  sent_at         timestamptz,
  updated_at      timestamptz not null default now(),
  -- One send per notification per channel, so a worker that crashes
  -- mid-batch and reruns cannot double-send.
  unique (notification_id, channel),
  foreign key (recipient_id, school_id)
    references public.profiles (id, school_id) on delete set null (recipient_id)
);

-- The worker's claim query: oldest queued first.
create index message_outbox_pending_idx
  on public.message_outbox (status, queued_at)
  where status in ('queued', 'sending');
create index message_outbox_school_idx on public.message_outbox (school_id, queued_at desc);
create index message_outbox_recipient_idx on public.message_outbox (recipient_id, school_id);

alter table public.message_outbox enable row level security;

-- Admins need to answer "did the fee reminders actually go out?", so they can
-- see delivery status. They must NOT see content: notifications are already
-- scoped so that not even an admin can read another person's inbox, and a
-- readable outbox would be a back door around exactly that.
--
-- Two mechanisms, because RLS alone cannot do this. RLS filters rows, not
-- columns, so the row policy below limits an admin to their own school and a
-- column-level GRANT withholds destination, subject and body. Anyone reading
-- those needs the service role, which is what the worker runs as.
create policy "admins read delivery status" on public.message_outbox
  for select to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_admin()) );

grant select (
  id, school_id, recipient_id, channel, status, attempts, error, provider,
  queued_at, sent_at, updated_at
) on public.message_outbox to authenticated;

create view public.message_delivery_log
with (security_invoker = true) as
select
  o.id,
  o.school_id,
  o.recipient_id,
  o.channel,
  o.status,
  o.attempts,
  o.error,
  o.provider,
  o.queued_at,
  o.sent_at
from public.message_outbox o;

comment on view public.message_delivery_log is
  'Delivery status without message content. security_invoker, so the column '
  'grant above is what keeps body and destination unreadable.';

-- ---------------------------------------------------------------------------
-- Fan-out. Runs after a notification is written.
-- ---------------------------------------------------------------------------
create or replace function private.enqueue_delivery()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email      text;
  v_phone      text;
  v_pref_email boolean;
  v_pref_sms   boolean;
  v_route_email boolean;
  v_route_sms   boolean;
  v_school_name text;
begin
  select p.email, p.phone into v_email, v_phone
  from public.profiles p
  where p.id = new.recipient_id;

  select np.email_enabled, np.sms_enabled into v_pref_email, v_pref_sms
  from public.notification_preferences np
  where np.profile_id = new.recipient_id;

  select r.email, r.sms into v_route_email, v_route_sms
  from public.notification_routes r
  where r.school_id = new.school_id and r.kind = new.kind;

  select s.name into v_school_name from public.schools s where s.id = new.school_id;

  -- No row for either means "not configured", which is not the same as "off".
  -- Email defaults on because it is free; SMS defaults off because it is not.
  v_pref_email  := coalesce(v_pref_email, true);
  v_pref_sms    := coalesce(v_pref_sms, true);
  v_route_email := coalesce(v_route_email, true);
  v_route_sms   := coalesce(v_route_sms, false);

  if v_route_email and v_pref_email and v_email is not null then
    insert into public.message_outbox
      (school_id, notification_id, recipient_id, channel, destination, subject, body)
    values
      (new.school_id, new.id, new.recipient_id, 'email', v_email,
       new.title,
       coalesce(new.body, new.title))
    on conflict (notification_id, channel) do nothing;
  end if;

  if v_route_sms and v_pref_sms and v_phone is not null then
    insert into public.message_outbox
      (school_id, notification_id, recipient_id, channel, destination, subject, body)
    values
      (new.school_id, new.id, new.recipient_id, 'sms', v_phone,
       null,
       -- One segment where possible: an SMS over 160 chars bills as two.
       left(coalesce(v_school_name || ': ', '') || new.title ||
            coalesce(' - ' || new.body, ''), 300))
    on conflict (notification_id, channel) do nothing;
  end if;

  return new;
end;
$$;

create trigger enqueue_delivery
  after insert on public.notifications
  for each row execute function private.enqueue_delivery();

create trigger touch_routes before update on public.notification_routes
  for each row execute function private.touch_updated_at();
create trigger touch_preferences before update on public.notification_preferences
  for each row execute function private.touch_updated_at();
create trigger touch_outbox before update on public.message_outbox
  for each row execute function private.touch_updated_at();

grant select, insert, update, delete on public.notification_routes      to authenticated;
grant select, insert, update, delete on public.notification_preferences to authenticated;
grant select on public.message_delivery_log to authenticated;
-- message_outbox itself gets only the column-level select granted above:
-- no insert, no update, no delete. Writes belong to the trigger and the worker.

-- ---------------------------------------------------------------------------
-- Transactional mail that is not a notification: an invite has no recipient
-- profile yet, so it cannot go through the trigger above.
-- ---------------------------------------------------------------------------
create or replace function public.enqueue_email(
  p_to      text,
  p_subject text,
  p_body    text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_school uuid;
  v_id uuid;
begin
  -- Runs as definer, so it must establish the caller's own school itself
  -- rather than trusting an argument.
  v_school := private.current_school_id();
  if v_school is null then
    raise exception 'Not signed in to a school.' using errcode = '42501';
  end if;
  if not private.is_staff() then
    raise exception 'Only staff can send school mail.' using errcode = '42501';
  end if;
  if p_to is null or p_to !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'That is not a valid email address.' using errcode = '22023';
  end if;

  insert into public.message_outbox
    (school_id, channel, destination, subject, body)
  values (v_school, 'email', p_to, p_subject, p_body)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.enqueue_email(text, text, text) from public, anon;
grant execute on function public.enqueue_email(text, text, text) to authenticated;
