"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";

export type SubscribeState = { error: string | null };

async function callbackUrl(): Promise<string> {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (explicit) return `${explicit}/dashboard/billing`;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}/dashboard/billing`;
}

/** Sends an admin to Paystack to pay for a term.
 *
 *  Whether they may is decided in SQL by create_subscription_attempt, reached
 *  through the Edge Function with their own session — the same arrangement the
 *  fee-payment flow uses, so there is one answer to "who may pay" rather than
 *  one per call site. */
export async function subscribe(
  _prev: SubscribeState,
  formData: FormData
): Promise<SubscribeState> {
  const viewer = await requireViewer();
  if (!viewer.isAdmin) return { error: "Only administrators can change the plan." };

  const plan = String(formData.get("plan") ?? "");
  if (!plan) return { error: "Pick a plan." };

  const supabase = await createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) return { error: "Your session expired. Please sign in again." };

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  let authorizationUrl: string;

  try {
    const res = await fetch(`${base}/functions/v1/paystack-subscribe`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ plan, callback_url: await callbackUrl() }),
    });

    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload?.authorization_url) {
      return { error: payload?.error ?? "Could not start that payment." };
    }
    authorizationUrl = payload.authorization_url;
  } catch {
    return { error: "Could not reach the payment service. Please try again." };
  }

  // Outside the try: redirect() signals by throwing.
  redirect(authorizationUrl);
}
