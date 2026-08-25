-- School transport: routes, and which student rides which route.
-- Route details (driver name and phone) are readable school-wide because
-- parents need them; only staff can change anything.

create type public.route_status as enum ('active', 'inactive');
create type public.board_status as enum ('not_boarded', 'boarded', 'dropped_off');

create table public.transport_routes (
  id             uuid primary key default gen_random_uuid(),
  school_id      uuid not null references public.schools (id) on delete cascade,
  name           text not null check (length(btrim(name)) between 1 and 120),
  vehicle_number text,
  driver_name    text,
  driver_phone   text,
  capacity       int check (capacity is null or capacity > 0),
  pickup_points  text[] not null default '{}',
  status         public.route_status not null default 'active',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (school_id, name),
  unique (id, school_id)
);

create index transport_routes_school_idx on public.transport_routes (school_id);

alter table public.transport_routes enable row level security;

create policy "school reads routes" on public.transport_routes
  for select to authenticated
  using ( school_id = (select private.current_school_id()) );
create policy "staff insert routes" on public.transport_routes
  for insert to authenticated
  with check ( school_id = (select private.current_school_id()) and (select private.is_staff()) );
create policy "staff update routes" on public.transport_routes
  for update to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_staff()) )
  with check ( school_id = (select private.current_school_id()) );
create policy "staff delete routes" on public.transport_routes
  for delete to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_staff()) );

-- One route per student — a rider can't be on two buses at once.
create table public.student_transport (
  id               uuid primary key default gen_random_uuid(),
  school_id        uuid not null references public.schools (id) on delete cascade,
  student_id       uuid not null,
  route_id         uuid not null,
  pickup_point     text,
  board_status     public.board_status not null default 'not_boarded',
  board_updated_at timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (student_id),
  foreign key (student_id, school_id) references public.students         (id, school_id) on delete cascade,
  foreign key (route_id, school_id)   references public.transport_routes (id, school_id) on delete cascade
);

create index student_transport_route_idx   on public.student_transport (route_id, school_id);
create index student_transport_student_idx on public.student_transport (student_id, school_id);
create index student_transport_school_idx  on public.student_transport (school_id);

alter table public.student_transport enable row level security;

create policy "read student transport" on public.student_transport
  for select to authenticated
  using (
    school_id = (select private.current_school_id())
    and (
      (select private.is_staff())
      or student_id in (select private.visible_student_ids())
    )
  );
create policy "staff insert student transport" on public.student_transport
  for insert to authenticated
  with check ( school_id = (select private.current_school_id()) and (select private.is_staff()) );
create policy "staff update student transport" on public.student_transport
  for update to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_staff()) )
  with check ( school_id = (select private.current_school_id()) );
create policy "staff delete student transport" on public.student_transport
  for delete to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_staff()) );

-- Stamp when boarding changes, so "boarded" always carries a time with it.
create or replace function private.touch_board_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.board_status is distinct from old.board_status then
    new.board_updated_at := now();
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger touch_student_transport before update on public.student_transport
  for each row execute function private.touch_board_status();
create trigger touch_transport_routes before update on public.transport_routes
  for each row execute function private.touch_updated_at();

grant select, insert, update, delete on public.transport_routes  to authenticated;
grant select, insert, update, delete on public.student_transport to authenticated;
