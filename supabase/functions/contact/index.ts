// Public contact form handler.
//
// Not called by the browser. The Next.js server action calls this with a
// shared secret, which means there is no CORS surface and no publicly
// hammerable endpoint — the rate limiting below is a second line, not the
// only one.
//
// Deploy:  supabase functions deploy contact --no-verify-jwt
// Secrets: supabase secrets set CONTACT_SECRET=... CONTACT_TO=you@yourdomain.ng \
//            CONTACT_IP_SALT="$(openssl rand -hex 32)"
//          (BREVO_API_KEY and MAIL_FROM are already set for dispatch-messages.)
//
// The message is recorded before Brevo is called. If the send fails the row is
// still there marked 'failed', so an enquiry is never lost to a provider
// outage — which is the only reason to prefer a form over a mailto: link.

import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  validate,
  escapeHtml,
  TOPIC_LABEL,
  type Topic,
  type Body,
  type Submission,
} from "./validate.ts";

const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const FROM_EMAIL = Deno.env.get("MAIL_FROM") ?? "no-reply@klasshub.ng";
const FROM_NAME = Deno.env.get("MAIL_FROM_NAME") ?? "KlassHub";
const CONTACT_TO = Deno.env.get("CONTACT_TO");
const CONTACT_IP_SALT = Deno.env.get("CONTACT_IP_SALT") ?? "";

/** What arrives on the wire: the fields validate() checks, plus two the server
 *  action adds because only it can see them. */
type RequestBody = Body & { ip?: unknown; user_agent?: unknown };

/** Fails closed, like every other function here. verify_jwt is off because the
 *  caller is our own server rather than a signed-in user, so the gate is the
 *  shared secret. An unset secret means nobody gets in — not everybody. */
function authorized(req: Request): boolean {
  const secret = Deno.env.get("CONTACT_SECRET");
  if (secret && req.headers.get("x-contact-secret") === secret) return true;

  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  return bearer.length > 0 && bearer === SERVICE_ROLE_KEY;
}

/** One-way, and salted outside the database. IPv4 is small enough to brute
 *  force exhaustively, so an unsalted hash of an address is barely better than
 *  the address; the salt is a function secret so a database dump alone cannot
 *  be walked back. */
async function hashIp(ip: string | null): Promise<string | null> {
  if (!ip) return null;
  const data = new TextEncoder().encode(`${CONTACT_IP_SALT}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function notify(row: Submission & { id: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!BREVO_API_KEY) return { ok: false, error: "BREVO_API_KEY not configured" };
  if (!CONTACT_TO) return { ok: false, error: "CONTACT_TO not configured" };

  const subject = `[${TOPIC_LABEL[row.topic]}] ${row.name}`;
  const text =
    `${TOPIC_LABEL[row.topic]}\n\n` +
    `From: ${row.name} <${row.email}>\n` +
    `Ref:  ${row.id}\n\n` +
    row.message;

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": BREVO_API_KEY,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { email: FROM_EMAIL, name: FROM_NAME },
      // Only ever our own inbox. Never the submitter, and never an address
      // from the request body — a form that mails arbitrary recipients on
      // demand is an open relay wearing a nicer hat.
      to: [{ email: CONTACT_TO }],
      // So hitting reply in the inbox answers the person who wrote in.
      replyTo: { email: row.email, name: row.name },
      subject,
      textContent: text,
      htmlContent:
        `<p><strong>${escapeHtml(TOPIC_LABEL[row.topic])}</strong></p>` +
        `<p>From: ${escapeHtml(row.name)} &lt;${escapeHtml(row.email)}&gt;<br>` +
        `Ref: ${escapeHtml(row.id)}</p><hr>` +
        `<p style="white-space:pre-wrap">${escapeHtml(row.message)}</p>`,
    }),
  });

  if (res.ok) return { ok: true };
  return { ok: false, error: `Brevo ${res.status}: ${(await res.text()).slice(0, 300)}` };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!authorized(req)) return new Response("Forbidden", { status: 403 });

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Malformed request." }, { status: 400 });
  }

  const checked = validate(body);
  if (!checked.ok) {
    // The honeypot verdict looks like success to the sender on purpose.
    if ("silent" in checked) return Response.json({ ok: true });
    return Response.json({ error: checked.error }, { status: 400 });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const ipHash = await hashIp(typeof body.ip === "string" ? body.ip : null);

  const { data: id, error: insertError } = await supabase.rpc("record_contact_message", {
    p_name: checked.value.name,
    p_email: checked.value.email,
    p_topic: checked.value.topic,
    p_message: checked.value.message,
    p_ip_hash: ipHash,
    p_user_agent: typeof body.user_agent === "string" ? body.user_agent : null,
  });

  if (insertError) {
    // 53400 is the rate limiter. Anything else is ours, not theirs.
    const rateLimited = insertError.code === "53400";
    return Response.json(
      {
        error: rateLimited
          ? "You have sent a few messages already. Try again in an hour, or email us directly."
          : "We could not record your message. Please email us directly.",
      },
      { status: rateLimited ? 429 : 500 }
    );
  }

  const sent = await notify({ id: id as string, ...checked.value });

  await supabase
    .from("contact_messages")
    .update(
      sent.ok
        ? { status: "sent", sent_at: new Date().toISOString(), error: null }
        : { status: "failed", error: sent.error }
    )
    .eq("id", id);

  // The message is saved either way, so the person who wrote in gets the same
  // answer whether or not Brevo was reachable. Telling them "delivery failed"
  // would invite a resend that duplicates an enquiry we already hold.
  return Response.json({ ok: true, id });
});
