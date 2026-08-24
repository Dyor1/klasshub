-- A school founded after this point gets the default grading scale, so grades
-- resolve from the very first result entered. Body is identical to the
-- previous handle_new_user apart from the seed_grade_bands call.
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

  if v_token is not null then
    v_hash := extensions.digest(v_token, 'sha256');

    select * into v_inv from public.invitations where token_hash = v_hash for update;

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

    insert into public.profiles (id, school_id, role, full_name, email)
    values (
      new.id, v_inv.school_id, v_inv.role,
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), new.email
    );

    update public.invitations
    set accepted_at = now(), accepted_by = new.id
    where id = v_inv.id;

    return new;
  end if;

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

  perform private.seed_grade_bands(v_school_id);

  insert into public.profiles (id, school_id, role, full_name, email)
  values (
    new.id, v_school_id, 'admin',
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), new.email
  );

  return new;
end;
$$;
