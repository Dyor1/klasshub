import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Next.js 16 renamed middleware to proxy. Refreshes the Supabase session on
 *  every request and gates the authenticated area.
 *
 *  The subtlety that matters here: refreshing a session writes new cookies, and
 *  a redirect is a *different* response object from the one those cookies were
 *  written to. Returning a bare NextResponse.redirect() therefore discards
 *  them — and because Supabase rotates refresh tokens and treats each as
 *  single-use, the discarded token is the only valid one while the browser
 *  keeps the spent one. The next request fails to refresh, redirects again,
 *  and the two rules below bounce the user between /login and /dashboard until
 *  the browser gives up with "redirected too many times".
 *
 *  Every redirect out of here therefore has to carry the cookies forward. */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getClaims verifies the token, unlike getSession which must not be trusted
  // in server code. `data` is null when there is no valid session.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  const { pathname } = request.nextUrl;
  const isAuthPage = pathname === "/login" || pathname === "/register";
  // /platform is guarded again inside the page, and every platform function
  // re-checks membership in SQL. This is only here so an anonymous visitor is
  // sent to sign in rather than rendering a shell first.
  const isProtected =
    pathname.startsWith("/dashboard") || pathname.startsWith("/platform");

  /** A redirect that keeps whatever the session refresh just wrote. */
  const redirectTo = (url: URL) => {
    const redirect = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    return redirect;
  };

  if (!claims && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return redirectTo(url);
  }

  if (claims && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return redirectTo(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets and image files.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
