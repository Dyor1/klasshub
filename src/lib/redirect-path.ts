/** Narrows a caller-supplied `?next=` to a path inside this app.
 *
 *  A bare `startsWith("/")` is not enough: `//evil.example` also starts with a
 *  slash and is a protocol-relative URL, so a redirect to it leaves the site
 *  entirely. That is the standard way a login page gets turned into a
 *  credible-looking phishing hop. Backslashes are rejected too, because some
 *  browsers normalise `/\evil.example` the same way.
 *
 *  Deliberately kept free of Next imports so it can be unit-tested on its own —
 *  the rule is pure string handling and does not need a request to check. */
export function internalPath(
  value: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (!value) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  if (value.includes("\\")) return fallback;
  return value;
}
