// Opens a Paystack checkout for a school paying KlassHub for a term.
//
// Deliberately separate from paystack-init, which is a parent paying their
// child's fees. Same provider, opposite direction of money, different
// authority (school admin vs any payer), different consequence (an entitlement
// vs a ledger entry). Folding them into one function behind a flag would put
// two unrelated authorisation rules in one place.
//
// The webhook is shared, though — one URL to register with Paystack. It tells
// the two apart by the KHSUB- prefix on the reference.
//
// Deploy with verify_jwt: true.
// Secrets: supabase secrets set PAYSTACK_SECRET_KEY=sk_live_...

import { createClient } from "jsr:@supabase/supabase-js@2";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  if (!PAYSTACK_SECRET_KEY) {
    return Response.json(
      { error: "Card payment is not configured yet. Contact us to pay by transfer." },
      { status: 503 }
    );
  }

  const authorization = req.headers.get("authorization") ?? "";
  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: { plan?: string; callback_url?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }
  if (!body.plan) {
    return Response.json({ error: "Which plan?" }, { status: 400 });
  }

  // The caller's own session, so create_subscription_attempt runs under their
  // RLS and its own admin check. Not the service role.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    }
  );

  const { data, error } = await supabase.rpc("create_subscription_attempt", {
    p_plan: body.plan,
  });

  if (error) {
    // Deliberate, user-facing messages raised in SQL.
    return Response.json({ error: error.message }, { status: 400 });
  }

  const attempt = Array.isArray(data) ? data[0] : data;
  if (!attempt?.reference) {
    return Response.json({ error: "Could not start that payment." }, { status: 400 });
  }

  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      email: attempt.payer_email,
      amount: Math.round(Number(attempt.amount) * 100),
      currency: "NGN",
      reference: attempt.reference,
      callback_url: body.callback_url,
      metadata: {
        kind: "subscription",
        plan: body.plan,
        custom_fields: [
          { display_name: "Plan", variable_name: "plan", value: body.plan },
        ],
      },
    }),
  });

  const payload = await res.json().catch(() => null);

  if (!res.ok || !payload?.status) {
    console.error(
      `Paystack initialize failed for ${attempt.reference}: ${payload?.message ?? res.status}`
    );
    return Response.json(
      { error: "Could not reach the payment provider. Please try again." },
      { status: 502 }
    );
  }

  return Response.json({
    authorization_url: payload.data.authorization_url,
    reference: attempt.reference,
  });
});
