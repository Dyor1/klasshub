"use server";

import { headers } from "next/headers";

export type ContactState = { error: string | null; sent: boolean };

/** Hands the message to the `contact` Edge Function.
 *
 *  The browser never talks to that function directly. Keeping the hop
 *  server-side means there is no CORS surface, no endpoint anyone can hammer
 *  from a script, and the mail credentials stay where every other credential in
 *  this project lives — as Supabase function secrets rather than Next.js env
 *  vars.
 *
 *  The client IP is read here because only this side of the hop can see it. */
export async function sendContactMessage(
  _prev: ContactState,
  formData: FormData
): Promise<ContactState> {
  const secret = process.env.CONTACT_SECRET;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!secret || !base) {
    // Unconfigured is a deployment problem, not something to blame the visitor
    // for — and it must not look like a successful send.
    return {
      error: "The contact form is not available right now. Please email us directly.",
      sent: false,
    };
  }

  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    null;

  let res: Response;
  try {
    res = await fetch(`${base}/functions/v1/contact`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-contact-secret": secret },
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email"),
        topic: formData.get("topic"),
        message: formData.get("message"),
        website: formData.get("website"), // honeypot, expected empty
        ip,
        user_agent: h.get("user-agent"),
      }),
    });
  } catch {
    return {
      error: "We could not reach our servers. Please try again, or email us directly.",
      sent: false,
    };
  }

  if (res.ok) return { error: null, sent: true };

  const data = await res.json().catch(() => ({}));
  return {
    error:
      typeof data?.error === "string"
        ? data.error
        : "Something went wrong sending that. Please email us directly.",
    sent: false,
  };
}
