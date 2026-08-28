-- The worker claims a batch by flipping it to 'sending' before doing any
-- network work. Two workers running at once would otherwise both read the same
-- queued rows and send every message twice, which for SMS costs real money.
--
-- SKIP LOCKED is what makes concurrent workers safe: the second worker steps
-- over rows the first has locked instead of blocking on them.
create or replace function public.claim_outbox_batch(p_limit int default 50)
returns table (
  id          uuid,
  channel     public.message_channel,
  destination text,
  subject     text,
  body        text,
  attempts    int
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with claimed as (
    select o.id
    from public.message_outbox o
    where o.status = 'queued'
       or (o.status = 'sending' and o.claimed_at < now() - interval '15 minutes')
    order by o.queued_at
    limit greatest(1, least(p_limit, 200))
    for update skip locked
  )
  update public.message_outbox o
  set status = 'sending',
      attempts = o.attempts + 1,
      claimed_at = now()
  from claimed c
  where o.id = c.id
  returning o.id, o.channel, o.destination, o.subject, o.body, o.attempts;
end;
$$;

-- Functions grant EXECUTE to public by default, and this one hands back phone
-- numbers and message bodies. Only the worker's service role may call it.
revoke all on function public.claim_outbox_batch(int) from public, anon, authenticated;
grant execute on function public.claim_outbox_batch(int) to service_role;
