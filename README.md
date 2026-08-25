# KlassHub

Multi-tenant school management portal. Schools register, invite their staff,
and run classes, attendance, results and report cards from one place.

Next.js 16 · React 19 · TypeScript · Tailwind v4 · Supabase.

---

## Running locally

```bash
npm install
cp .env.example .env.local   # fill in from Supabase → Project Settings → API
npm run dev
```

Open http://localhost:3000 and register a school.

## Environment

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | Publishable key (`sb_publishable_…`) |
| `NEXT_PUBLIC_SITE_URL` | no | Only needed if the public URL differs from the request host, e.g. behind a proxy. Invite links otherwise derive from the request. |

Never put the `service_role` key in a `NEXT_PUBLIC_` variable — it ships to the
browser and bypasses RLS entirely.

## Database

Migrations live in `supabase/migrations` and are applied in filename order.

```bash
npx supabase link --project-ref <ref>
npx supabase db push
npx supabase db advisors      # check for RLS/perf issues after any change
```

### Tenancy model

Every tenant-owned row carries `school_id`. RLS resolves the caller's school
through `SECURITY DEFINER` helpers in an unexposed `private` schema.

Two rules the whole design rests on:

1. **`school_id` is never read from the JWT.** Supabase's `raw_user_meta_data`
   is user-editable and surfaces in `auth.jwt()`, so trusting it would let any
   user re-point themselves at another school. `public.profiles` is the only
   source of truth.
2. **Every FK between tenant tables is composite and carries `school_id`** —
   e.g. `(subject_id, school_id) → subjects(id, school_id)`. A row in school A
   therefore cannot reference school B even if application code is wrong. This
   is enforced by Postgres, so it holds for `service_role` and backend jobs
   too.

RLS constrains *rows*, not *columns*. Where a column needs protecting —
`profiles.role`, `lesson_notes.status` — there is an explicit trigger.

### Roles

| Role | Sees |
| --- | --- |
| `admin` | Everything in their school, plus settings and invitations |
| `teacher` | Everything academic; only their own lesson notes |
| `student` | Their own record and **published** results only |
| `parent` | Only children linked via `student_guardians`, published results only |

### Storage

One private bucket, `school-files`, with the tenant baked into the object path:

```
{school_id}/{class-notes|lesson-notes}/{file}
```

Storage RLS reads the school from the first path segment and the kind from the
second, so class notes are readable by the whole school while lesson notes stay
staff-only. Downloads use short-lived signed URLs.

## Deploying

1. Set the two required environment variables on the host.
2. Point the host at `main`; the build command is `npm run build`.
3. Add your production URL to Supabase → Authentication → URL Configuration,
   otherwise auth redirects will fail.
