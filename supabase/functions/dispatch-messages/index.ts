// Drains message_outbox and hands each row to Brevo (email) or Termii (SMS).
//
// Runs as an Edge Function rather than inside the Next.js app because the
// notifications this sends are created by database triggers — when a teacher
// marks a register, twenty notices come into existence with no HTTP request
// attached to them. A scheduled worker is the only thing that can pick those
// up.
//
// Deploy:  supabase functions deploy dispatch-messages
// Secrets: supabase secrets set BREVO_API_KEY=... TERMII_API_KEY=...
//
// Missing credentials are not an error. A row whose provider is unconfigured
// is marked 'skipped' with the reason recorded, so the pipeline can be run and
// inspected end to end before either account exists.

import { createClient } from "jsr:@supabase/supabase-js@2";

const BATCH_SIZE = 50;
const MAX_ATTEMPTS = 3;

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const TERMII_API_KEY = Deno.env.get("TERMII_API_KEY");

// Termii requires a sender ID pre-registered with the Nigerian networks;
// "N-Alert" is their shared one and works without approval.
const TERMII_SENDER = Deno.env.get("TERMII_SENDER_ID") ?? "N-Alert";
const FROM_EMAIL = Deno.env.get("MAIL_FROM") ?? "no-reply@klasshub.ng";
const FROM_NAME = Deno.env.get("MAIL_FROM_NAME") ?? "KlassHub";

type Outbox = {
  id: string;
  channel: "email" | "sms";
  destination: string;
  subject: string | null;
  body: string;
  attempts: number;
};

type Sent = { ok: true; ref?: string } | { ok: false; error: string; retryable: boolean };

/** Brevo's transactional endpoint. 4xx other than 429 means the message itself
 *  is wrong (bad address, blocked contact) and retrying cannot fix it. */
async function sendEmail(m: Outbox): Promise<Sent> {
  if (!BREVO_API_KEY) {
    return { ok: false, error: "BREVO_API_KEY not configured", retryable: false };
  }

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": BREVO_API_KEY,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { email: FROM_EMAIL, name: FROM_NAME },
      to: [{ email: m.destination }],
      subject: m.subject ?? "Notice from your school",
      htmlContent: renderEmail(m.subject ?? "", m.body),
      textContent: m.body,
    }),
  });

  if (res.ok) {
    const data = await res.json().catch(() => ({}));
    return { ok: true, ref: data?.messageId };
  }

  const text = await res.text();
  return {
    ok: false,
    error: `brevo ${res.status}: ${text.slice(0, 400)}`,
    retryable: res.status === 429 || res.status >= 500,
  };
}

/** Termii answers 200 with a body describing the failure, so the HTTP status
 *  alone is not enough to decide whether this worked. */
async function sendSms(m: Outbox): Promise<Sent> {
  if (!TERMII_API_KEY) {
    return { ok: false, error: "TERMII_API_KEY not configured", retryable: false };
  }

  const res = await fetch("https://api.ng.termii.com/api/sms/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      api_key: TERMII_API_KEY,
      // Termii wants no leading '+'.
      to: m.destination.replace(/^\+/, ""),
      from: TERMII_SENDER,
      sms: m.body,
      type: "plain",
      channel: "generic",
    }),
  });

  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(text);
  } catch {
    return {
      ok: false,
      error: `termii ${res.status}: unparseable response ${text.slice(0, 200)}`,
      retryable: res.status >= 500,
    };
  }

  if (res.ok && typeof data.message_id === "string") {
    return { ok: true, ref: data.message_id };
  }

  const message = String(data.message ?? text).slice(0, 400);
  return {
    ok: false,
    error: `termii ${res.status}: ${message}`,
    // A DND-blocked number will never accept a generic-channel message, so
    // burning two more attempts on it just costs time.
    retryable: res.status >= 500 || /timeout|rate/i.test(message),
  };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );
}

function renderEmail(subject: string, body: string): string {
  // Inline styles only: Gmail strips <style> blocks.
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f8fafc;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;">
  <table role="presentation" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;">
    <tr><td style="padding:28px 28px 8px;">
      <h1 style="margin:0 0 12px;font-size:18px;line-height:1.35;color:#14134a;">${escapeHtml(subject)}</h1>
      <p style="margin:0;font-size:14px;line-height:1.6;color:#475569;white-space:pre-wrap;">${escapeHtml(body)}</p>
    </td></tr>
    <tr><td style="padding:20px 28px 28px;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">Sent by your school through KlassHub. You can turn these off under Settings in your portal.</p>
    </td></tr>
  </table>
</body></html>`;
}

const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/** Fails closed. verify_jwt is off on this function because a valid JWT here
 *  would mean the publishable key, which is public — so the gate has to be in
 *  the body. An earlier revision treated DISPATCH_SECRET as optional, which
 *  left the endpoint open to anyone who knew the URL: they could not inject a
 *  message, but they could drain the queue on demand and burn SMS credit. */
function authorized(req: Request): boolean {
  const secret = Deno.env.get("DISPATCH_SECRET");
  if (secret && req.headers.get("x-dispatch-secret") === secret) return true;

  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  return bearer.length > 0 && bearer === SERVICE_ROLE_KEY;
}

Deno.serve(async (req) => {
  if (!authorized(req)) {
    return new Response("Forbidden", { status: 403 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  // Claim a batch by flipping it to 'sending' first. Two workers overlapping
  // would otherwise both read the same queued rows and send twice.
  const { data: claimed, error: claimError } = await supabase
    .rpc("claim_outbox_batch", { p_limit: BATCH_SIZE })
    .returns<Outbox[]>();

  if (claimError) {
    return Response.json({ error: claimError.message }, { status: 500 });
  }

  const messages = claimed ?? [];
  const counts = { sent: 0, failed: 0, skipped: 0 };

  for (const m of messages) {
    const result = m.channel === "email" ? await sendEmail(m) : await sendSms(m);
    const provider = m.channel === "email" ? "brevo" : "termii";

    if (result.ok) {
      counts.sent++;
      await supabase
        .from("message_outbox")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          provider,
          provider_ref: result.ref ?? null,
          error: null,
        })
        .eq("id", m.id);
      continue;
    }

    // Out of retries, or a failure that retrying cannot fix. `attempts` comes
    // back from the claim already incremented, so it counts this try.
    const done = !result.retryable || m.attempts >= MAX_ATTEMPTS;
    const status = !result.retryable && /not configured/.test(result.error)
      ? "skipped"
      : done
        ? "failed"
        : "queued";

    if (status === "skipped") counts.skipped++;
    else if (status === "failed") counts.failed++;

    await supabase
      .from("message_outbox")
      .update({ status, error: result.error, provider })
      .eq("id", m.id);
  }

  return Response.json({ claimed: messages.length, ...counts });
});
