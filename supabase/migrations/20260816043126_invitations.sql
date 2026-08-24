-- Invitations let an admin add teachers/students/parents to an EXISTING school.
--
-- Threat model: joining an existing tenant with a chosen role is exactly the
-- escalation path the signup trigger deliberately refuses. So the ONLY way to
-- do it is by presenting an unguessable token that an admin of that school
-- created. school_id and role are read from the invitation row, never from
-- anything the invitee supplies.
--
-- Only a SHA-256 hash of the token is stored, so a database dump does not
-- yield usable invitation links. The raw token exists only in the invite URL.

create table public.invitations (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools (id) on delete cascade,
  email       text not null check (position('@' in email) > 1),
  role        public.user_role not null,
  token_hash  bytea not null unique,
  invited_by  uuid,
  expires_at  timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  foreign key (invited_by, school_id)
    references public.profiles (id, school_id) on delete set null (invited_by)
);

comment on table public.invitations is
  'Pending invites to join an existing school. Stores only a hash of the token.';

create unique index invitations_pending_email_idx
  on public.invitations (school_id, lower(email))
  where accepted_at is null;

create index invitations_school_idx     on public.invitations (school_id);
create index invitations_invited_by_idx on public.invitations (invited_by, school_id);

alter table public.invitations enable row level security;

-- Only admins of the school ever see or manage its invitations. The invitee
-- never reads this table: the signup trigger resolves the token for them.
create policy "admins read invitations" on public.invitations
  for select to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_admin()) );
create policy "admins create invitations" on public.invitations
  for insert to authenticated
  with check ( school_id = (select private.current_school_id()) and (select private.is_admin()) );
create policy "admins delete invitations" on public.invitations
  for delete to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_admin()) );

grant select, insert, delete on public.invitations to authenticated;

-- ---------------------------------------------------------------------------
-- Signup now handles two paths:
--   school_name      -> found a brand new school, become its admin
--   invitation_token -> join an existing school with the invited role
-- ---------------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_school_name text;
  v_token       text;
  v_hash        bytea;
  v_inv         public.invitations%rowtype;
  v_base_slug   text;
  v_slug        text;
  v_school_id   uuid;
  v_suffix      int := 0;
begin
  v_school_name := nullif(btrim(new.raw_user_meta_data ->> 'school_name'), '');
  v_token       := nullif(btrim(new.raw_user_meta_data ->> 'invitation_token'), '');

  ------------------------------------------------------------------ invited
  if v_token is not null then
    v_hash := extensions.digest(v_token, 'sha256');

    select * into v_inv
    from public.invitations
    where token_hash = v_hash
    for update;

    if not found then
      raise exception 'This invitation link is not valid.' using errcode = '22023';
    end if;
    if v_inv.accepted_at is not null then
      raise exception 'This invitation has already been used.' using errcode = '22023';
    end if;
    if v_inv.expires_at <= now() then
      raise exception 'This invitation has expired.' using errcode = '22023';
    end if;
    if lower(btrim(v_inv.email)) is distinct from lower(btrim(new.email)) then
      raise exception 'This invitation was sent to a different email address.'
        using errcode = '22023';
    end if;

    -- role and school come from the invitation, never from the invitee.
    insert into public.profiles (id, school_id, role, full_name, email)
    values (
      new.id,
      v_inv.school_id,
      v_inv.role,
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      new.email
    );

    update public.invitations
    set accepted_at = now(), accepted_by = new.id
    where id = v_inv.id;

    return new;
  end if;

  ------------------------------------------------------------ founding admin
  if v_school_name is null then
    return new;
  end if;

  v_base_slug := private.slugify(v_school_name);
  if v_base_slug = '' then
    v_base_slug := 'school';
  end if;

  v_slug := v_base_slug;
  while exists (select 1 from public.schools where slug = v_slug) loop
    v_suffix := v_suffix + 1;
    v_slug := v_base_slug || '-' || v_suffix::text;
  end loop;

  insert into public.schools (name, slug)
  values (v_school_name, v_slug)
  returning id into v_school_id;

  insert into public.profiles (id, school_id, role, full_name, email)
  values (
    new.id,
    v_school_id,
    'admin',
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    new.email
  );

  return new;
end;
$$;
