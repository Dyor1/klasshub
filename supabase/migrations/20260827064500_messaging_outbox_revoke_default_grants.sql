-- Supabase ships ALTER DEFAULT PRIVILEGES granting ALL on every new table in
-- `public` to anon and authenticated. A column-level GRANT therefore does not
-- narrow anything, it only adds to a grant that is already total.
--
-- Without this revoke, the column list in the previous migration was cosmetic:
-- any admin could select body and destination straight off message_outbox and
-- read every notification and phone number in their school, which is the exact
-- thing notifications' own RLS is written to prevent. Verified by doing it.
revoke all on public.message_outbox from anon, authenticated;

grant select (
  id, school_id, recipient_id, channel, status, attempts, error, provider,
  queued_at, sent_at, updated_at
) on public.message_outbox to authenticated;

-- The outbox holds phone numbers and message text; anon has no business here
-- at all, and neither table is reachable without a session.
revoke all on public.notification_preferences from anon;
revoke all on public.notification_routes      from anon;
