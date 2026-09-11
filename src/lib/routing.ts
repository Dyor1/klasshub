/** The two redirect rules that, between them, decide where a signed-in person
 *  lands — and which together once formed an inescapable loop.
 *
 *  They live here rather than inline because neither is wrong on its own. The
 *  proxy sending a valid token away from /login is right. requireViewer
 *  refusing to render a dashboard for an account with no school is right. It is
 *  only the *pair* that can cycle, and a pair is not something you can see
 *  while reading either file. Pulled out like this, a test can walk the graph
 *  they actually form and prove it always terminates.
 *
 *  Both are pure: state in, destination or null out. No cookies, no database. */

/** Account state as the server finds it, in the order it becomes knowable. */
export type AccountState = {
  /** A verified token. Says nothing about who they are in the product. */
  hasClaims: boolean;
  /** A profiles row, i.e. membership of some school. */
  hasProfile: boolean;
  /** On the platform_operators roster. Independent of school membership: a
   *  founder normally has this and no profile at all. */
  isOperator: boolean;
};

/** The proxy's rule. Returns the path to redirect to, or null to let it
 *  through. Mirrors the two gates in proxy.ts. */
export function proxyRedirect(state: AccountState, pathname: string): string | null {
  const isAuthPage = pathname === "/login" || pathname === "/register";
  const isProtected =
    pathname.startsWith("/dashboard") || pathname.startsWith("/platform");

  if (!state.hasClaims && isProtected) return "/login";
  if (state.hasClaims && isAuthPage) return "/dashboard";
  return null;
}

/** Where requireViewer sends a session whose profile is missing.
 *
 *  Not /login, which is what caused the loop: the proxy sees the still-valid
 *  token there and sends it straight back. /logout is outside the protected
 *  area and needs no profile, so it is always terminal. */
export function missingProfileRedirect(isOperator: boolean): string {
  return isOperator ? "/platform" : "/logout?reason=no-profile";
}
