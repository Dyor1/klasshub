import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { siteOrigin } from "@/lib/site-url";
import { internalPath } from "@/lib/redirect-path";

/** Where an emailed auth link lands. Turns the one-time token into a session
 *  cookie and forwards to `next`.
 *
 *  Two shapes are accepted because Supabase sends whichever the project's
 *  email template asks for:
 *
 *    ?code=…                      the PKCE flow the default template produces.
 *                                 Needs the verifier cookie this app set when
 *                                 the reset was requested, so it only works in
 *                                 the browser that asked.
 *    ?token_hash=…&type=recovery  what a template using {{ .TokenHash }}
 *                                 sends. No verifier, so it survives the very
 *                                 common case of a link opened on a phone
 *                                 after being requested on a laptop.
 *
 *  Handling both means switching the template later is a dashboard edit rather
 *  than a code change.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const origin = await siteOrigin();
  const next = internalPath(searchParams.get("next"));

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  // Expired, already used, or opened in a different browser than the one that
  // asked. All three are the same thing to the person holding the link: ask
  // again. Saying which would tell an attacker whether the token was real.
  return NextResponse.redirect(`${origin}/forgot-password?expired=1`);
}
