-- Enquiries from the public contact form.
--
-- Written before the email is attempted, not after. The whole argument for
-- having a form rather than a mailto: is that it must not lose anything, and a
-- form that sends straight to a provider drops every message that provider
-- rejects. Here the row exists first and the send is a status on it — same
-- shape as message_outbox, for the same reason.
--
-- Not tenant-scoped. This is the marketing site, so there is no school_id and
-- no RLS policy: nobody reaches it through PostgREST at all. The Edge Function
-- uses the service role, which bypasses RLS.

create table public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(btrim(name)) between 2 and 100),
  email      text not null check (position('@' in email) > 1 and length(email) <= 254),
  topic      text not null check (topic in ('sales', 'support', 'privacy', 'security', 'other')),
  message    text not null check (length(btrim(message)) between 10 and 5000),

  -- Hashed, never raw. An IP address is personal data and we only need it to
  -- count submissions, which a one-way hash does just as well. The salt lives
  -- in the Edge Function, so a database dump cannot be walked back to
  -- addresses even though the space of IPv4 is small enough to brute force.
  ip_hash    text,
  user_agent text,

  status     text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  error      text,
  created_at timestamptz not null default now(),
  sent_at    timestamptz
);

comment on table public.contact_messages is
  'Public contact form submissions. Recorded before the notification email is '
  'attempted, so a provider outage cannot lose an enquiry.';

create index contact_messages_created_idx on public.contact_messages (created_at desc);
create index contact_messages_ip_idx      on public.contact_messages (ip_hash, created_at desc);
create index contact_messages_pending_idx on public.contact_messages (status)
  where status <> 'sent';

-- RLS on with no policies: authenticated and anon get nothing, ever. Supabase
-- grants ALL on new public tables to both by default, so the grant is removed
-- rather than merely unused.
alter table public.contact_messages enable row level security;
revoke all on public.contact_messages from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Insert with rate limiting, in one statement so two simultaneous submissions
-- cannot both pass the check and then both insert.
-- ---------------------------------------------------------------------------
create or replace function public.record_contact_message(
  p_name       text,
  p_email      text,
  p_topic      text,
  p_message    text,
  p_ip_hash    text,
  p_user_agent text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id           uuid;
  v_from_ip      int;
  v_from_email   int;
  v_recent_total int;
begin
  -- Three limits, because they fail differently. One address hammering the
  -- form is the common case; one person retrying from several networks is
  -- the determined case; and the global cap is what stops a distributed flood
  -- turning into a Brevo bill.
  select count(*) into v_from_ip
  from public.contact_messages
  where ip_hash = p_ip_hash
    and p_ip_hash is not null
    and created_at > now() - interval '1 hour';

  select count(*) into v_from_email
  from public.contact_messages
  where lower(email) = lower(btrim(p_email))
    and created_at > now() - interval '1 hour';

  select count(*) into v_recent_total
  from public.contact_messages
  where created_at > now() - interval '1 hour';

  if v_from_ip >= 3 or v_from_email >= 3 then
    raise exception 'Too many messages from here in the last hour.'
      using errcode = '53400';
  end if;

  if v_recent_total >= 60 then
    raise exception 'The contact form is temporarily busy.'
      using errcode = '53400';
  end if;

  insert into public.contact_messages (name, email, topic, message, ip_hash, user_agent)
  values (
    btrim(p_name),
    lower(btrim(p_email)),
    p_topic,
    btrim(p_message),
    p_ip_hash,
    left(coalesce(p_user_agent, ''), 400)
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- Only the service role, which is only ever held by the Edge Function. The
-- grant is written out rather than left to Supabase's default privileges: the
-- revoke above is one line away, and "which roles can call this" should not
-- have to be inferred from what was not removed.
revoke all on function public.record_contact_message(text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.record_contact_message(text, text, text, text, text, text)
  to service_role;
