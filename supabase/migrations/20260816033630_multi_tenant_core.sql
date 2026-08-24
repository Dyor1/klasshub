-- KlassHub multi-tenant core.
--
-- Isolation model: every tenant-owned row carries school_id. RLS policies
-- compare it against the caller's school, resolved through a SECURITY DEFINER
-- helper that lives in a private (unexposed) schema.
--
-- Why not read school_id from the JWT: Supabase's raw_user_meta_data is
-- user-editable and surfaces in auth.jwt(), so trusting it for tenancy would
-- let any user re-point themselves at another school.

create schema if not exists private;
revoke all on schema private from anon, authenticated;

create type public.school_plan as enum ('trial', 'starter', 'standard', 'group');
create type public.user_role as enum ('admin', 'teacher', 'student', 'parent');

create table public.schools (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (length(btrim(name)) between 2 and 120),
  slug          text not null unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$'),
  plan          public.school_plan not null default 'trial',
  trial_ends_at timestamptz not null default (now() + interval '30 days'),
  created_at    timestamptz not null default now()
);

comment on table public.schools is 'One row per tenant.';

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  school_id  uuid not null references public.schools (id) on delete cascade,
  role       public.user_role not null default 'admin',
  full_name  text,
  email      text,
  created_at timestamptz not null default now()
);

comment on table public.profiles is
  'Maps an auth user to exactly one school. Source of truth for tenancy - never trust JWT metadata for school_id.';

create index profiles_school_id_idx on public.profiles (school_id);

-- Tenancy helpers. SECURITY DEFINER so they read profiles without triggering
-- that table's own RLS, which would recurse.
create or replace function private.current_school_id()
returns uuid
language sql
security definer
stable
set search_path = ''
as $$
  select school_id from public.profiles where id = (select auth.uid());
$$;

create or replace function private.current_role()
returns public.user_role
language sql
security definer
stable
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

create or replace function private.is_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

alter table public.schools  enable row level security;
alter table public.profiles enable row level security;

create policy "members read own school"
  on public.schools for select to authenticated
  using ( id = (select private.current_school_id()) );

create policy "admins update own school"
  on public.schools for update to authenticated
  using ( id = (select private.current_school_id()) and (select private.is_admin()) )
  with check ( id = (select private.current_school_id()) );

create policy "read profiles in own school"
  on public.profiles for select to authenticated
  using ( school_id = (select private.current_school_id()) );

create policy "update own profile"
  on public.profiles for update to authenticated
  using ( id = (select auth.uid()) )
  with check ( id = (select auth.uid()) and school_id = (select private.current_school_id()) );

create policy "admins update profiles in own school"
  on public.profiles for update to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_admin()) )
  with check ( school_id = (select private.current_school_id()) );

-- Signup provisioning. Reading school_name from raw_user_meta_data is safe
-- here because we only ever CREATE a new school from it: the user cannot
-- supply a school_id or role, so this can't join or escalate into an existing
-- tenant.
create or replace function private.slugify(input text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(both '-' from
    regexp_replace(lower(coalesce(input, '')), '[^a-z0-9]+', '-', 'g')
  );
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_school_name text;
  v_base_slug   text;
  v_slug        text;
  v_school_id   uuid;
  v_suffix      int := 0;
begin
  v_school_name := nullif(btrim(new.raw_user_meta_data ->> 'school_name'), '');

  -- Users invited into an existing school get their profile from the
  -- invitation flow, not here.
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

grant usage on schema public to anon, authenticated;
grant select, update on public.schools  to authenticated;
grant select, update on public.profiles to authenticated;
