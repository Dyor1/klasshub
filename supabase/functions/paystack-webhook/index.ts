// The only thing in this system allowed to say a fee was paid.
//
// Paystack also redirects the payer back to the app after checkout, but that
// redirect is just a URL: anyone can visit it having paid nothing. So the
// callback page only reads the ledger, and this — a request carrying an HMAC
// that only our secret key could have produced — is what writes to it.
//
// Deploy with verify_jwt: false. Paystack does not send a Supabase JWT; the
// signature below is the authentication.
//
// Secrets: supabase secrets set PAYSTACK_SECRET_KEY=sk_live_...

import { createClient } from "jsr:@supabase/supabase-js@2";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");

/** HMAC-SHA512 of the raw body, per Paystack's spec.
 *
 *  Two things matter here. It must hash the exact bytes received — re-encoding
 *  the parsed JSON would reorder keys and change the digest. And it compares in
 *  constant time, because a byte-by-byte early return leaks the expected digest
 *  to anyone willing to time the responses. */
async function signatureValid(rawBody: string, header: string | null): Promise<boolean> {
  if (!header || !PAYSTACK_SECRET_KEY) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(PAYSTACK_SECRET_KEY),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );

  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expected = [...new Uint8Array(mac)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (expected.length !== header.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ header.charCodeAt(i);
  }
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  if (!PAYSTACK_SECRET_KEY) {
    // Fail closed. Without the key no signature can be checked, and accepting
    // unverified events would let anyone mark any invoice paid.
    console.error("PAYSTACK_SECRET_KEY is not configured; refusing webhook");
    return new Response("Not configured", { status: 503 });
  }

  const raw = await req.text();

  if (!(await signatureValid(raw, req.headers.get("x-paystack-signature")))) {
    console.warn("Rejected webhook with a bad or missing signature");
    return new Response("Invalid signature", { status: 401 });
  }

  let event: {
    event?: string;
    data?: {
      reference?: string;
      amount?: number;
      channel?: string;
      currency?: string;
      status?: string;
    };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  const reference = event.data?.reference;
  if (!reference) {
    return new Response("No reference", { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  // Everything below returns 200 once the signature checks out. Paystack retries
  // on any non-2xx, and none of these outcomes improve on a retry — a duplicate
  // is already handled, an unknown reference will stay unknown, and a mismatch
  // needs a human. Retrying them forever would only bury the real failures.
  if (event.event === "charge.success" && event.data?.status === "success") {
    // Guard the currency here rather than in SQL: a NGN ledger crediting a USD
    // charge at face value would silently under-collect by about 1500x.
    if (event.data.currency && event.data.currency !== "NGN") {
      console.error(`Refusing non-NGN charge ${reference}: ${event.data.currency}`);
      await supabase.rpc("fail_payment_attempt", {
        p_reference: reference,
        p_status: "failed",
      });
      return Response.json({ handled: "wrong currency" });
    }

    const { data, error } = await supabase.rpc("record_paystack_payment", {
      p_reference: reference,
      p_paystack_ref: String(event.data.reference),
      p_amount_kobo: event.data.amount ?? 0,
      p_channel: event.data.channel ?? null,
    });

    if (error) {
      // A genuine database failure is the one case worth retrying.
      console.error(`record_paystack_payment failed for ${reference}: ${error.message}`);
      return Response.json({ error: error.message }, { status: 500 });
    }

    console.log(`${reference}: ${data}`);
    return Response.json({ handled: data });
  }

  if (event.event === "charge.failed") {
    await supabase.rpc("fail_payment_attempt", {
      p_reference: reference,
      p_status: "failed",
    });
    return Response.json({ handled: "marked failed" });
  }

  return Response.json({ ignored: event.event ?? "unknown" });
});
