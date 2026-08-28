-- Reclaiming a stranded row was originally keyed off updated_at, which the
-- generic touch_updated_at trigger owns and bumps on every write. Any future
-- code that touched an outbox row would have silently shifted the reclaim
-- window. Give the claim its own clock, which only the claim function writes.
alter table public.message_outbox add column claimed_at timestamptz;

comment on column public.message_outbox.claimed_at is
  'When a worker took this row. Used to reclaim rows stranded by a dead worker.';

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
       -- A worker that died mid-batch leaves rows stranded in 'sending'.
       -- 15 minutes rather than 5: a live worker still grinding through a
       -- slow batch must never have its rows stolen, because a double claim
       -- means a double SMS and SMS costs real money. Recovering a genuinely
       -- dead worker's rows ten minutes later is the cheaper mistake.
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

revoke all on function public.claim_outbox_batch(int) from public, anon, authenticated;
grant execute on function public.claim_outbox_batch(int) to service_role;

grant select (claimed_at) on public.message_outbox to authenticated;
