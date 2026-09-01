import type { NextConfig } from "next";
import path from "node:path";

/** Sent on every response.
 *
 *  This is a portal holding children's records, so the defaults are not good
 *  enough. Set here rather than in vercel.json so they survive a change of
 *  host — headers that only exist in one provider's config are headers you
 *  lose the day you move. */
const securityHeaders = [
  // Clickjacking. A school portal framed inside another page could have a
  // parent tricked into clicking something they cannot see.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  // Stop browsers second-guessing a Content-Type, which is how an uploaded
  // file gets served as something executable.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Invite links carry a single-use token in the path. Without this the whole
  // URL leaks to any third-party host in a Referer header.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Nothing here uses these, and saying so stops an embedded script asking.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  turbopack: {
    // Pin the workspace root. Without this, Turbopack walks up and picks up a
    // stray package-lock.json in the user's home directory.
    root: path.resolve(__dirname),
  },
  // Stated explicitly because the tempting fix for a red deploy is to flip
  // this to true. A type error that reaches production in a system holding
  // school records is not worth the deploy it unblocks.
  typescript: { ignoreBuildErrors: false },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
