-- Test harness for the safety properties this system depends on.
--
-- Deliberately not pgTAP: that would put a test framework's several hundred
-- functions into the production database to check a few dozen assertions. This
-- is plain plpgsql, runs anywhere psql runs, and adds nothing to the API
-- surface — the tests schema is granted to nobody.
--
-- The important helper is assert_denied. Every refusal in this suite must name
-- the error it expects, because "it threw" is not the same as "it refused for
-- the right reason". That distinction is not academic: create_subscription_attempt
-- shipped broken behind two probes that both errored, and both looked like
-- passes until the messages were read.

create schema if not exists tests;
revoke all on schema tests from public, anon, authenticated;

create or replace function tests.fail(p_message text)
returns void language plpgsql as $$
begin
  raise exception 'ASSERTION FAILED: %', p_message using errcode = 'P0001';
end;
$$;

create or replace function tests.assert(p_condition boolean, p_message text)
returns void language plpgsql as $$
begin
  if p_condition is not true then
    perform tests.fail(p_message);
  end if;
end;
$$;

create or replace function tests.assert_eq(p_actual anyelement, p_expected anyelement, p_message text)
returns void language plpgsql as $$
begin
  if p_actual is distinct from p_expected then
    perform tests.fail(format('%s (expected %L, got %L)', p_message, p_expected, p_actual));
  end if;
end;
$$;

/** Runs p_sql and requires it to fail with an error matching p_expect.
 *
 *  p_expect is not optional on purpose. A test that accepts any error passes
 *  when the code is broken in an unrelated way — a permission-denied on the
 *  wrong schema reads identically to a correctly enforced authorisation rule. */
create or replace function tests.assert_denied(p_sql text, p_expect text, p_message text)
returns void language plpgsql as $$
declare
  v_err text;
begin
  begin
    execute p_sql;
  exception when others then
    v_err := sqlerrm;
  end;

  if v_err is null then
    perform tests.fail(format('%s — expected refusal, but it succeeded', p_message));
  end if;

  if v_err not like p_expect then
    perform tests.fail(
      format('%s — refused, but for the wrong reason. Wanted %L, got %L',
             p_message, p_expect, v_err));
  end if;
end;
$$;

/** Runs p_sql and requires it to succeed. The positive control beside every
 *  refusal: without it, a suite of denials passes just as well when the whole
 *  feature is broken. */
create or replace function tests.assert_allowed(p_sql text, p_message text)
returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    perform tests.fail(format('%s — expected to succeed, got %L', p_message, sqlerrm));
  end;
end;
$$;

-- ---------------------------------------------------------------------------
-- Impersonation. Mirrors what PostgREST does with a user's JWT.
-- ---------------------------------------------------------------------------
create or replace function tests.authenticate_as(p_uid uuid)
returns void language plpgsql as $$
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', p_uid::text, 'role', 'authenticated')::text,
    true
  );
  set local role authenticated;
end;
$$;

create or replace function tests.authenticate_as_anon()
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role','anon')::text, true);
  set local role anon;
end;
$$;

create or replace function tests.clear_auth()
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', null, true);
  reset role;
end;
$$;

-- ---------------------------------------------------------------------------
-- Two complete tenants.
--
-- Every isolation check written by hand up to now compared a student against a
-- teacher inside ONE school. The product's central promise — that one school
-- cannot see another — had never been exercised. This exists so it is.
-- ---------------------------------------------------------------------------
create or replace function tests.make_user(
  p_email  text,
  p_school uuid,
  p_role   public.user_role,
  p_name   text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := gen_random_uuid();
begin
  -- No school_name in the metadata, so handle_new_user leaves this alone and
  -- the profile below decides the tenancy.
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data,
                          created_at, updated_at)
  values (v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated',
          'authenticated', p_email, '{}'::jsonb, now(), now());

  insert into public.profiles (id, school_id, role, full_name, email)
  values (v_uid, p_school, p_role, p_name, p_email);

  return v_uid;
end;
$$;

/** Builds one self-contained tenant and returns every id the tests need. */
create or replace function tests.make_tenant(p_tag text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v jsonb;
  v_school uuid;
  v_admin uuid; v_teacher uuid; v_student_user uuid;
  v_class uuid; v_subject uuid; v_student uuid; v_invoice uuid;
begin
  insert into public.schools (name, slug, trial_ends_at)
  values (p_tag || ' School', p_tag || '-' || substr(gen_random_uuid()::text, 1, 8),
          now() + interval '30 days')
  returning id into v_school;

  v_admin       := tests.make_user(p_tag || '.admin@test.invalid',   v_school, 'admin',   p_tag || ' Admin');
  v_teacher     := tests.make_user(p_tag || '.teacher@test.invalid', v_school, 'teacher', p_tag || ' Teacher');
  v_student_user:= tests.make_user(p_tag || '.student@test.invalid', v_school, 'student', p_tag || ' Student');

  insert into public.classes (school_id, name, grade_level, academic_year)
  values (v_school, p_tag || ' Class', 'JSS 1', '2025/2026')
  returning id into v_class;

  insert into public.subjects (school_id, name)
  values (v_school, p_tag || ' Maths')
  returning id into v_subject;

  insert into public.students (school_id, class_id, profile_id, admission_number, surname, first_name)
  values (v_school, v_class, v_student_user, p_tag || '/001', 'Pupil', p_tag)
  returning id into v_student;

  insert into public.results (school_id, student_id, subject_id, class_id, academic_year, term,
                              ca_score, exam_score, published)
  values (v_school, v_student, v_subject, v_class, '2025/2026', 'first', 30, 45, true);

  insert into public.attendance (school_id, student_id, class_id, date, status)
  values (v_school, v_student, v_class, current_date - 1, 'present');

  insert into public.invoices (school_id, student_id, class_id, term, academic_year, total_amount)
  values (v_school, v_student, v_class, 'first', '2025/2026', 50000)
  returning id into v_invoice;

  insert into public.notifications (school_id, recipient_id, kind, title, body)
  values (v_school, v_admin, 'general', p_tag || ' private notice', 'body for ' || p_tag);

  v := jsonb_build_object(
    'school', v_school, 'admin', v_admin, 'teacher', v_teacher,
    'student_user', v_student_user, 'student', v_student,
    'class', v_class, 'subject', v_subject, 'invoice', v_invoice
  );
  return v;
end;
$$;

revoke all on all functions in schema tests from public, anon, authenticated;
