"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";

export type PayState = { error: string | null };

/** Where Paystack sends the payer back to. Derived from the request rather
 *  than an env var, for the same reason invite links are. */
async function callbackUrl(): Promise<string> {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (explicit) return `${explicit}/dashboard/fees/callback`;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}/dashboard/fees/callback`;
}

/** Opens a Paystack checkout and sends the payer to it.
 *
 *  Nothing here decides whether the payer is allowed to pay this invoice — the
 *  Edge Function forwards their session to create_payment_attempt, which runs
 *  under their own RLS. That keeps one authority for the question instead of a
 *  check here that could drift from the one in SQL. */
export async function startPayment(
  _prev: PayState,
  formData: FormData
): Promise<PayState> {
  await requireViewer();

  const invoiceId = String(formData.get("invoice_id") ?? "");
  if (!invoiceId) return { error: "Which invoice?" };

  const supabase = await createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) return { error: "Your session expired. Please sign in again." };

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  let authorizationUrl: string;

  try {
    const res = await fetch(`${base}/functions/v1/paystack-init`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        invoice_id: invoiceId,
        callback_url: await callbackUrl(),
      }),
    });

    const payload = await res.json().catch(() => null);

    if (!res.ok || !payload?.authorization_url) {
      return {
        error:
          payload?.error ??
          "Could not start that payment. Please try again in a moment.",
      };
    }
    authorizationUrl = payload.authorization_url;
  } catch {
    return { error: "Could not reach the payment service. Please try again." };
  }

  // Outside the try: redirect() works by throwing, so catching around it would
  // swallow the redirect and report a payment failure that never happened.
  redirect(authorizationUrl);
}
