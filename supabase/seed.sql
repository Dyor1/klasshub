-- Demo school for local development.
--
-- `supabase db reset` runs this after every migration, so a fresh clone gets a
-- school you can sign into instead of an empty database and a sign-up form.
--
-- This is a *definition* of a demo school, not a dump of anyone's data. Every
-- name here is invented.
--
-- LOCAL ONLY. It creates accounts with a known password, so it refuses to run
-- against a database that already has a school in it. That guard is the only
-- thing standing between this file and a production database, so leave it in.
--
-- ---------------------------------------------------------------------------
-- NOT YET EXECUTED. This was written against the migrations rather than run,
-- because no local Postgres was available at the time. The shape is right and
-- the guard makes a wrong run harmless, but expect to fix small things the
-- first time you `supabase db reset` — most likely candidates are the exact
-- column set auth.users wants on your CLI version, and whether pgcrypto is
-- reachable as extensions.crypt.
--
-- Delete this notice once it has run clean.
-- ---------------------------------------------------------------------------
--
-- Sign in with any of these — password is the same for all four:
--
--   admin@numamu.test     Mrs Folake Adebayo   admin
--   teacher@numamu.test   Mr Chinedu Obi       teacher
--   student@numamu.test   Nwosu Chidi          student
--   parent@numamu.test    Mr Ikenna Nwosu      parent (Chidi's father)
--
--   password: klasshub-demo

do $$
declare
  -- Fixed ids so report-card and results URLs stay stable between resets and
  -- you can bookmark one.
  c_1a       constant uuid := '11111111-1111-4111-8111-00000000000a';
  c_1b       constant uuid := '11111111-1111-4111-8111-00000000000b';
  s_maths    constant uuid := '22222222-2222-4222-8222-000000000001';
  s_english  constant uuid := '22222222-2222-4222-8222-000000000002';
  s_science  constant uuid := '22222222-2222-4222-8222-000000000003';
  s_civic    constant uuid := '22222222-2222-4222-8222-000000000004';
  p_chidi    constant uuid := '33333333-3333-4333-8333-000000000001';
  p_aisha    constant uuid := '33333333-3333-4333-8333-000000000002';
  p_emeka    constant uuid := '33333333-3333-4333-8333-000000000003';
  p_tunde    constant uuid := '33333333-3333-4333-8333-000000000004';
  p_ngozi    constant uuid := '33333333-3333-4333-8333-000000000005';
  p_fatima   constant uuid := '33333333-3333-4333-8333-000000000006';
  u_admin    constant uuid := '44444444-4444-4444-8444-000000000001';
  u_teacher  constant uuid := '44444444-4444-4444-8444-000000000002';
  u_student  constant uuid := '44444444-4444-4444-8444-000000000003';
  u_parent   constant uuid := '44444444-4444-4444-8444-000000000004';

  v_school   uuid;
  v_year     constant text := '2025/2026';
begin
  if exists (select 1 from public.schools) then
    raise notice 'seed.sql: this database already has a school - skipping.';
    return;
  end if;

  -- --------------------------------------------------------------- accounts
  -- The admin goes through the app's real provisioning path: handle_new_user
  -- reads school_name from the metadata and creates the school, the default
  -- grading scale and the admin profile. Seeding those by hand would let this
  -- file drift away from what a genuine sign-up produces.
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000', u_admin, 'authenticated', 'authenticated',
    'admin@numamu.test',
    extensions.crypt('klasshub-demo', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'school_name', 'Numamu International Schools',
      'full_name',   'Mrs Folake Adebayo'
    ),
    now(), now()
  );

  select school_id into v_school from public.profiles where id = u_admin;

  -- The other three carry no school_name, so the trigger leaves them alone and
  -- their profiles are written here with the role they need. Going through
  -- invitations instead would mean minting and accepting three tokens to end up
  -- in exactly this state.
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  )
  select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated',
         u.email, extensions.crypt('klasshub-demo', extensions.gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb,
         jsonb_build_object('full_name', u.full_name),
         now(), now()
  from (values
    (u_teacher, 'teacher@numamu.test', 'Mr Chinedu Obi'),
    (u_student, 'student@numamu.test', 'Nwosu Chidi'),
    (u_parent,  'parent@numamu.test',  'Mr Ikenna Nwosu')
  ) as u(id, email, full_name);

  insert into public.profiles (id, school_id, role, full_name, email)
  values
    (u_teacher, v_school, 'teacher', 'Mr Chinedu Obi',  'teacher@numamu.test'),
    (u_student, v_school, 'student', 'Nwosu Chidi',     'student@numamu.test'),
    (u_parent,  v_school, 'parent',  'Mr Ikenna Nwosu', 'parent@numamu.test');

  -- Email/password sign-in needs an identity row alongside the user; without
  -- it GoTrue finds the account but no way to authenticate against it.
  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  )
  select gen_random_uuid(), u.id,
         jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
         'email', u.id::text, now(), now(), now()
  from auth.users u
  where u.id in (u_admin, u_teacher, u_student, u_parent);

  -- ------------------------------------------------------ classes, subjects
  insert into public.subjects (id, school_id, name, code) values
    (s_maths,   v_school, 'Mathematics',      'MTH'),
    (s_english, v_school, 'English Language', 'ENG'),
    (s_science, v_school, 'Basic Science',    'BSC'),
    (s_civic,   v_school, 'Civic Education',  'CIV');

  insert into public.classes
    (id, school_id, name, grade_level, section, academic_year, class_teacher_id, capacity)
  values
    (c_1a, v_school, 'JSS 1A', 'JSS 1', 'A', v_year, u_teacher, 30),
    (c_1b, v_school, 'JSS 1B', 'JSS 1', 'B', v_year, u_teacher, 30);

  -- --------------------------------------------------------------- students
  -- Chidi is the only one with a login, so signing in as the student shows a
  -- pupil who has results rather than an empty account.
  insert into public.students (
    id, school_id, class_id, profile_id, admission_number,
    surname, first_name, gender, date_of_birth, admission_date
  ) values
    (p_chidi,  v_school, c_1a, u_student, 'KH/26/001', 'Nwosu',   'Chidi',  'male',   '2014-03-11', '2025-09-15'),
    (p_aisha,  v_school, c_1a, null,      'KH/26/002', 'Bello',   'Aisha',  'female', '2014-07-02', '2025-09-15'),
    (p_emeka,  v_school, c_1a, null,      'KH/26/003', 'Okafor',  'Emeka',  'male',   '2013-11-24', '2025-09-15'),
    (p_tunde,  v_school, c_1b, null,      'KH/26/004', 'Adeyemi', 'Tunde',  'male',   '2014-01-19', '2025-09-15'),
    (p_ngozi,  v_school, c_1b, null,      'KH/26/005', 'Eze',     'Ngozi',  'female', '2014-05-30', '2025-09-15'),
    (p_fatima, v_school, c_1b, null,      'KH/26/006', 'Ibrahim', 'Fatima', 'female', '2013-12-08', '2025-09-15');

  insert into public.student_guardians (school_id, student_id, profile_id, relationship, is_primary)
  values (v_school, p_chidi, u_parent, 'Father', true);

  -- ------------------------------------------------------------- term dates
  -- First and second deliberately leave next_term_starts_on null so the report
  -- card exercises the derived path; the third sets it explicitly because the
  -- session that follows has no rows yet.
  insert into public.term_dates
    (school_id, academic_year, term, starts_on, ends_on, next_term_starts_on)
  values
    (v_school, v_year, 'first',  '2025-09-15', '2025-12-12', null),
    (v_school, v_year, 'second', '2026-01-06', '2026-04-03', null),
    (v_school, v_year, 'third',  '2026-04-20', '2026-07-24', '2026-09-14');

  -- ---------------------------------------------------------------- results
  -- First and third term only. The gap is deliberate: it leaves the "no
  -- results for this term" state reachable without deleting anything, and two
  -- terms is enough for the analytics trend to have a shape.
  --
  -- Grades are not set here. A trigger derives them from the school's own
  -- grading scale, and writing them by hand would let the seed disagree with
  -- the scale it ships with.
  insert into public.results (
    school_id, student_id, subject_id, class_id, academic_year, term,
    ca_score, ca_max, exam_score, exam_max, published, recorded_by
  )
  select v_school, r.student, r.subject, r.class, v_year, r.term,
         r.ca, 40, r.exam, 60, true, u_teacher
  from (values
    -- first term, JSS 1A
    (p_chidi,  s_maths,   c_1a, 'first'::public.term, 34.0, 51.0),
    (p_chidi,  s_english, c_1a, 'first', 28.0, 42.0),
    (p_chidi,  s_science, c_1a, 'first', 22.0, 33.0),
    (p_chidi,  s_civic,   c_1a, 'first', 36.0, 54.0),
    (p_aisha,  s_maths,   c_1a, 'first', 30.0, 45.0),
    (p_aisha,  s_english, c_1a, 'first', 26.0, 38.0),
    (p_aisha,  s_science, c_1a, 'first', 26.0, 39.0),
    (p_aisha,  s_civic,   c_1a, 'first', 33.0, 48.0),
    (p_emeka,  s_maths,   c_1a, 'first', 24.0, 36.0),
    (p_emeka,  s_english, c_1a, 'first', 22.0, 32.0),
    (p_emeka,  s_science, c_1a, 'first', 20.0, 29.0),
    (p_emeka,  s_civic,   c_1a, 'first', 28.0, 41.0),
    -- first term, JSS 1B. Tunde starts the session in real trouble so the
    -- lower grade bands and the attention list are populated out of the box.
    (p_tunde,  s_maths,   c_1b, 'first', 15.0, 22.0),
    (p_tunde,  s_english, c_1b, 'first', 13.2, 19.8),
    (p_tunde,  s_science, c_1b, 'first', 16.0, 24.0),
    (p_tunde,  s_civic,   c_1b, 'first', 11.6, 17.4),
    (p_ngozi,  s_maths,   c_1b, 'first', 31.0, 47.0),
    (p_ngozi,  s_english, c_1b, 'first', 29.0, 43.0),
    (p_ngozi,  s_science, c_1b, 'first', 27.0, 40.0),
    (p_ngozi,  s_civic,   c_1b, 'first', 30.0, 44.0),
    (p_fatima, s_maths,   c_1b, 'first', 25.0, 37.0),
    (p_fatima, s_english, c_1b, 'first', 23.0, 34.0),
    (p_fatima, s_science, c_1b, 'first', 21.0, 31.0),
    (p_fatima, s_civic,   c_1b, 'first', 24.0, 36.0),
    -- third term. Tunde improves without catching up, which is what a real
    -- intervention looks like and keeps a D and an E on a card.
    (p_chidi,  s_maths,   c_1a, 'third', 36.0, 52.0),
    (p_chidi,  s_english, c_1a, 'third', 31.0, 46.0),
    (p_chidi,  s_science, c_1a, 'third', 25.0, 38.0),
    (p_chidi,  s_civic,   c_1a, 'third', 35.0, 53.0),
    (p_aisha,  s_maths,   c_1a, 'third', 30.0, 44.0),
    (p_aisha,  s_english, c_1a, 'third', 34.0, 50.0),
    (p_aisha,  s_science, c_1a, 'third', 28.0, 41.0),
    (p_aisha,  s_civic,   c_1a, 'third', 32.0, 47.0),
    (p_emeka,  s_maths,   c_1a, 'third', 24.0, 35.0),
    (p_emeka,  s_english, c_1a, 'third', 26.0, 38.0),
    (p_emeka,  s_science, c_1a, 'third', 21.0, 30.0),
    (p_emeka,  s_civic,   c_1a, 'third', 29.0, 43.0),
    (p_tunde,  s_maths,   c_1b, 'third', 18.0, 27.0),
    (p_tunde,  s_english, c_1b, 'third', 20.0, 30.0),
    (p_tunde,  s_science, c_1b, 'third', 17.0, 25.0),
    (p_tunde,  s_civic,   c_1b, 'third', 22.0, 33.0),
    (p_ngozi,  s_maths,   c_1b, 'third', 33.0, 49.0),
    (p_ngozi,  s_english, c_1b, 'third', 30.0, 45.0),
    (p_ngozi,  s_science, c_1b, 'third', 29.0, 43.0),
    (p_ngozi,  s_civic,   c_1b, 'third', 31.0, 46.0),
    (p_fatima, s_maths,   c_1b, 'third', 27.0, 40.0),
    (p_fatima, s_english, c_1b, 'third', 25.0, 37.0),
    (p_fatima, s_science, c_1b, 'third', 23.0, 34.0),
    (p_fatima, s_civic,   c_1b, 'third', 26.0, 39.0)
  ) as r(student, subject, class, term, ca, exam);

  -- ------------------------------------------------------------- attendance
  -- The last ten school days of the third term, so the attendance block on a
  -- third-term report card has something to count. Marks dated outside every
  -- term would be correct but would render as no attendance at all, which
  -- looks like a bug in a demo.
  insert into public.attendance (school_id, student_id, class_id, date, status, recorded_by)
  select v_school, s.id, s.class_id, d::date,
         case
           when s.id = p_tunde  and d::date in ('2026-07-14','2026-07-16','2026-07-21','2026-07-23')
             then 'absent'::public.attendance_status
           when s.id = p_emeka  and d::date = '2026-07-20' then 'absent'
           when s.id = p_emeka  and d::date = '2026-07-15' then 'late'
           when s.id = p_fatima and d::date = '2026-07-22' then 'excused'
           else 'present'
         end,
         u_teacher
  from public.students s
  cross join generate_series('2026-07-13'::date, '2026-07-24'::date, interval '1 day') d
  where s.school_id = v_school
    and extract(isodow from d) < 6;   -- weekdays only

  raise notice 'seed.sql: created % (%).', 'Numamu International Schools', v_school;
end $$;
