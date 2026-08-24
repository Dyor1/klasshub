-- Links a parent profile to the students they are responsible for, and opens
-- up exactly enough of students/results for them to see those children.

create table public.student_guardians (
  id           uuid primary key default gen_random_uuid(),
  school_id    uuid not null references public.schools (id) on delete cascade,
  student_id   uuid not null,
  profile_id   uuid not null,
  relationship text,
  is_primary   boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (student_id, profile_id),
  foreign key (student_id, school_id) references public.students (id, school_id) on delete cascade,
  foreign key (profile_id, school_id) references public.profiles (id, school_id) on delete cascade
);

comment on table public.student_guardians is
  'Which parent profiles may view which students. A parent with no row here sees nothing.';

create index student_guardians_profile_idx on public.student_guardians (profile_id, school_id);
create index student_guardians_student_idx on public.student_guardians (student_id, school_id);

alter table public.student_guardians enable row level security;

-- SECURITY DEFINER so policies on students/results can consult this table
-- without recursing through its own RLS.
create or replace function private.guarded_student_ids()
returns setof uuid
language sql
security definer
stable
set search_path = ''
as $$
  select student_id
  from public.student_guardians
  where profile_id = (select auth.uid());
$$;

create policy "read guardian links" on public.student_guardians
  for select to authenticated
  using (
    school_id = (select private.current_school_id())
    and ( (select private.is_staff()) or profile_id = (select auth.uid()) )
  );
create policy "staff insert guardian links" on public.student_guardians
  for insert to authenticated
  with check ( school_id = (select private.current_school_id()) and (select private.is_staff()) );
create policy "staff delete guardian links" on public.student_guardians
  for delete to authenticated
  using ( school_id = (select private.current_school_id()) and (select private.is_staff()) );

grant select, insert, delete on public.student_guardians to authenticated;

-- Widen the student and result read policies to include guardians.
-- Everything else about them is unchanged.
drop policy "read students in own school" on public.students;
create policy "read students in own school" on public.students
  for select to authenticated
  using (
    school_id = (select private.current_school_id())
    and (
      (select private.is_staff())
      or profile_id = (select auth.uid())
      or id in (select private.guarded_student_ids())
    )
  );

drop policy "read results in own school" on public.results;
create policy "read results in own school" on public.results
  for select to authenticated
  using (
    school_id = (select private.current_school_id())
    and (
      (select private.is_staff())
      or (
        published
        and (
          student_id in (
            select id from public.students where profile_id = (select auth.uid())
          )
          -- A guardian sees the same published marks their child sees.
          or student_id in (select private.guarded_student_ids())
        )
      )
    )
  );
