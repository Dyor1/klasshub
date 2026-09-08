import type { MetadataRoute } from "next";

const siteUrl = "https://klasshub.ng";

/** The marketing pages are the whole point of being indexed; nothing behind a
 *  login is. `/dashboard` and `/invite` are already unreachable without a
 *  session, but a crawler that follows a stale link there wastes crawl budget
 *  on redirects, and an invite token has no business sitting in a search
 *  index even expired. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/auth/", "/invite/", "/login", "/reset-password"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
