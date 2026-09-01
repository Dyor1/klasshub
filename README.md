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

## Tests

```bash
DATABASE_URL="postgresql://postgres:PASS@HOST:5432/postgres" npm run test:db
```

The suites in `supabase/tests/` cover the properties that fail silently: nothing
here throws a stack trace when it breaks, it just quietly shows one school
another school's children.

| Suite | Covers |
|---|---|
| `01_tenant_isolation` | Two complete schools. Neither can read, aggregate or write the other's rows — tables and analytics views alike. Plus `anon` seeing nothing at all. |
| `02_role_and_column_guards` | Rules RLS cannot express: a pupil owns their submission row but must not write the score on it, cannot edit after marking, cannot promote themselves. An admin sees delivery *status* but never message bodies or phone numbers. |
| `03_billing_enforcement` | The trial→grace→locked machine, plan caps, and that a locked school keeps every byte readable and deletable. |

Three conventions make these worth having:

**Every refusal names the error it expects.** `assert_denied` takes a pattern
and fails if the operation was refused for a *different* reason. This is not
pedantry — `create_subscription_attempt` once shipped completely broken behind
two probes that both errored and both looked like passes, until the messages
were read and turned out to be the same wrong error.

**Every refusal has a positive control beside it.** A suite of denials passes
just as well when the feature is broken outright. If a pupil is blocked from
grading themselves, the teacher must be shown succeeding at it.

**Silent denials are asserted on counts, not exceptions.** A cross-tenant
`UPDATE` does not raise; RLS matches no rows and reports success. The only
honest check is that the other school's row is unchanged.

Suites run inside a transaction that ends in `ROLLBACK`, so pointing them at a
database with real data is safe — that is also why they can create entire
schools. The harness lives in a `tests` schema no production role can reach;
each suite lends itself access for the length of its own transaction.

To confirm the suite can still fail, break something on purpose — swap a policy
for `using (true)` inside a transaction and watch `01` catch it.

## Email and SMS

Notifications are created by database triggers, so at the moment a notice comes
into existence there is no HTTP request to piggyback a send onto — and sending
from inside the trigger would put a network call in the transaction that records
a result or marks a register. Instead the trigger writes to `message_outbox` and
commits; a worker drains it.

```
notification row ─trigger─▶ message_outbox ─worker─▶ Brevo (email) / Termii (SMS)
```

Two independent switches decide whether a row is ever queued, and both must
agree:

| | Who controls it | Where |
|---|---|---|
| `notification_routes` | the school, per event | Settings → Email and SMS delivery |
| `notification_preferences` | the individual, per channel | Notifications → How you hear from us |

A school cannot force SMS onto someone who has turned it off.

**Setup.** The worker is the Edge Function in `supabase/functions/dispatch-messages`.
Its credentials are function secrets, never Next.js env vars, so they cannot
reach the browser bundle:

```bash
supabase functions deploy dispatch-messages
supabase secrets set BREVO_API_KEY=... TERMII_API_KEY=... \
  DISPATCH_SECRET="$(openssl rand -hex 32)" \
  MAIL_FROM=no-reply@yourdomain.ng MAIL_FROM_NAME="Your School"
```

Then schedule it. The function refuses any request without either the service
role key or `x-dispatch-secret`, so it is safe to leave publicly routable:

```sql
select cron.schedule('dispatch-messages', '* * * * *', $$
  select net.http_post(
    url     := 'https://<ref>.supabase.co/functions/v1/dispatch-messages',
    headers := '{"x-dispatch-secret":"<the secret you set>"}'::jsonb
  );
$$);
```

Before the provider keys exist the pipeline still runs end to end and marks each
message `skipped` with the reason, which surfaces under Settings → Recent
deliveries. That page shows delivery *status only* — `message_outbox` withholds
`subject`, `body` and `destination` from every role via a column-level grant, so
an admin can confirm a notice went out without being able to read anyone's mail.

> Note: Supabase's default privileges grant ALL on every new table in `public` to
> `anon` and `authenticated`. A column-level `GRANT` therefore *adds to* a total
> grant rather than narrowing it — the outbox has to `REVOKE ALL` first. See
> `20260827064500_messaging_outbox_revoke_default_grants.sql`.

## Online fee payment (Paystack)

The rule that shapes this: **the browser is never told a payment succeeded.**
Paystack redirects the payer back to `/dashboard/fees/callback` after checkout,
but that redirect is only a URL — anyone can visit it having paid nothing, and
Paystack appends the same reference whether the card cleared or was declined.
So the callback page just reads the ledger, and the ledger is written by one
thing only: the signed webhook.

```
payer ─▶ create_payment_attempt (their RLS) ─▶ Paystack checkout
                                                     │
                    ledger ◀── record_paystack_payment ◀── signed webhook
```

| | |
|---|---|
| `paystack-init` | `verify_jwt: true`. Forwards the payer's own session, so `create_payment_attempt` runs under their RLS — another family's invoice id returns "could not be found" from the database, not from a check in the function. |
| `paystack-webhook` | `verify_jwt: false`. Paystack sends no Supabase JWT; the HMAC-SHA512 signature over the raw body is the authentication. Fails closed if the key is unset. |

Idempotency is a conditional `UPDATE ... RETURNING` that claims the attempt only
while it is still `pending`, so Paystack's webhook retries cannot credit a bill
twice. The amount is re-checked against what we asked for, and a mismatch is
recorded as a failed attempt rather than raised — an exception would roll back
the very record that tells you it happened.

```bash
supabase functions deploy paystack-init
supabase functions deploy paystack-webhook --no-verify-jwt
supabase secrets set PAYSTACK_SECRET_KEY=sk_live_...
```

Then add the webhook URL in the Paystack dashboard under Settings → API Keys &
Webhooks:

```
https://<ref>.supabase.co/functions/v1/paystack-webhook
```

Use `sk_test_` keys and a test card first. Nothing else needs configuring — the
Pay button appears by itself on any bill with a balance.

## Deploying

1. Set the two required environment variables on the host.
2. Point the host at `main`; the build command is `npm run build`.
3. Add your production URL to Supabase → Authentication → URL Configuration,
   otherwise auth redirects will fail.
