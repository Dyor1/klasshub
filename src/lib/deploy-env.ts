/** Which deployment this build is running as.
 *
 *  Vercel sets VERCEL_ENV to "production", "preview" or "development". Nothing
 *  sets it locally, so `npm run dev` reads as neither production nor preview.
 *
 *  Everything here fails *closed*: anything that is not explicitly production
 *  is treated as not-production and gets blocked from search engines. If the
 *  variable is ever missing on a real production deploy the site quietly goes
 *  un-indexed, which is a bad day — but the opposite default is a preview full
 *  of unfilled legal placeholders showing up in Google, which is worse and
 *  much harder to undo.
 */
export const deployEnv = process.env.VERCEL_ENV ?? "development";

/** True only on the production deployment. */
export const isProduction = deployEnv === "production";

/** True on Vercel preview deployments — the ones built from a branch or a
 *  pull request. Used to show the "not the live site" banner. Deliberately
 *  false during local development, where a fixed banner is just in the way. */
export const isPreview = deployEnv === "preview";
