-- Supabase Auth collapses any trigger exception into the generic
-- "Database error saving new user", so an invitee with a bad link sees that
-- instead of a useful reason. This lets the accept page validate the token
-- BEFORE attempting signup, and show who the invite is for.
--
-- This is a SECURITY DEFINER function in an exposed schema, which is normally
-- avoided — but an RPC has to be callable to be useful. It is safe because:
--   * it takes only a token and returns zero rows unless that exact token
--     matches a pending, unexpired invitation
--   * it is STABLE, so it cannot mutate anything
--   * it reveals nothing to someone who does not already hold the token
create or replace function public.invitation_preview(p_token text)
returns table (
  school_name   text,
  invited_email text,
  invited_role  public.user_role,
  expires_at    timestamptz
)
language sql
security definer
stable
set search_path = ''
as $$
  select s.name, i.email, i.role, i.expires_at
  from public.invitations i
  join public.schools s on s.id = i.school_id
  where i.token_hash = extensions.digest(p_token, 'sha256')
    and i.accepted_at is null
    and i.expires_at > now();
$$;

revoke all on function public.invitation_preview(text) from public;
grant execute on function public.invitation_preview(text) to anon, authenticated;
