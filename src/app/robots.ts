import type { MetadataRoute } from "next";
import { isProduction } from "@/lib/deploy-env";

const siteUrl = "https://klasshub.ng";

/** The marketing pages are the whole point of being indexed; nothing behind a
 *  login is. `/dashboard` and `/invite` are already unreachable without a
 *  session, but a crawler that follows a stale link there wastes crawl budget
 *  on redirects, and an invite token has no business sitting in a search
 *  index even expired. */
export default function robots(): MetadataRoute.Robots {
  // Anything that is not the production deployment refuses every crawler
  // outright. A preview carries unfilled legal placeholders and fixture pupils
  // with invented names; neither belongs in a search index, and getting a page
  // *out* of one is far more work than keeping it out.
  if (!isProduction) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/auth/", "/invite/", "/login", "/reset-password"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
