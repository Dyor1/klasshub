import { headers } from "next/headers";

/** Where links that leave the app should point back to — invite emails, the
 *  Paystack return URL, the password-reset link.
 *
 *  Derived from the incoming request so it is correct on any host without
 *  configuration; an unset env var used to make production quietly hand out
 *  http://localhost:3000 links. An explicit NEXT_PUBLIC_SITE_URL still wins,
 *  for custom domains behind a proxy. */
export async function siteOrigin(): Promise<string> {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (explicit) return explicit;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
