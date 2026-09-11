import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { siteOrigin } from "@/lib/site-url";

/** An escape hatch you can reach when the app itself will not load.
 *
 *  The Sign out button lives inside the dashboard, which is no use at all when
 *  a broken session is what is stopping the dashboard from rendering — the
 *  exact situation a refresh-token problem creates. This route is outside the
 *  protected area, so it answers even mid-redirect-loop.
 *
 *  It does not rely on signOut() alone. If the refresh token is already spent,
 *  signOut can fail server-side and leave the cookie in place, so every
 *  Supabase cookie on the request is deleted by name afterwards regardless.
 *
 *  GET rather than POST on purpose: the whole point is that you can type it
 *  into the address bar. The cost is that a third-party page could force a
 *  sign-out by embedding it, which is an annoyance rather than a breach — it
 *  reveals nothing and destroys nothing.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // Best effort. A spent refresh token makes this fail, which is precisely
  // the case this route exists for, so its result is not checked.
  await supabase.auth.signOut().catch(() => {});

  const origin = await siteOrigin();
  const response = NextResponse.redirect(`${origin}/login?signedout=1`);

  // Supabase chunks large auth cookies into `.0`, `.1` and so on, so this
  // matches on the prefix rather than an exact name — missing a chunk leaves
  // the browser holding half a token, which is how the loop survives a
  // "clear cookies" that only removed the one people know about.
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith("sb-")) {
      response.cookies.set(cookie.name, "", { path: "/", maxAge: 0 });
    }
  }

  return response;
}
