// Opens a Paystack checkout for one invoice.
//
// Runs here rather than in the Next.js app so the Paystack secret key has a
// single home — the webhook needs an Edge Function regardless, and two copies
// of a key that can move money is one too many.
//
// Authorisation is the caller's own Supabase session, forwarded straight
// through: the client below is built with the payer's access token, so
// create_payment_attempt executes under their RLS. A parent passing another
// family's invoice id gets "could not be found" from the database, not from a
// check written here that could be forgotten.
//
// Deploy with verify_jwt: true — a valid session is required to reach it.
//
// Secrets: supabase secrets set PAYSTACK_SECRET_KEY=sk_live_...

import { createClient } from "jsr:@supabase/supabase-js@2";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  if (!PAYSTACK_SECRET_KEY) {
    return Response.json(
      { error: "Online payment is not set up for this school yet." },
      { status: 503 }
    );
  }

  const authorization = req.headers.get("authorization") ?? "";
  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: { invoice_id?: string; callback_url?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }

  if (!body.invoice_id) {
    return Response.json({ error: "Which invoice?" }, { status: 400 });
  }

  // Publishable key plus the caller's token: RLS applies exactly as it would in
  // the app. Note this is NOT the service role — using it here would silently
  // let anyone pay against any invoice in any school.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    }
  );

  const { data, error } = await supabase.rpc("create_payment_attempt", {
    p_invoice_id: body.invoice_id,
  });

  if (error) {
    // These are the deliberate, user-facing messages raised in SQL
    // ("already settled", "could not be found"), so pass them through.
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
      // Paystack counts in kobo, and rounds nothing for you.
      amount: Math.round(Number(attempt.amount) * 100),
      currency: "NGN",
      reference: attempt.reference,
      callback_url: body.callback_url,
      metadata: {
        invoice_id: body.invoice_id,
        // Shown on the Paystack dashboard so a school can reconcile by eye.
        custom_fields: [
          {
            display_name: "Invoice",
            variable_name: "invoice_id",
            value: body.invoice_id,
          },
        ],
      },
    }),
  });

  const payload = await res.json().catch(() => null);

  if (!res.ok || !payload?.status) {
    const detail = payload?.message ?? `HTTP ${res.status}`;
    console.error(`Paystack initialize failed for ${attempt.reference}: ${detail}`);
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
