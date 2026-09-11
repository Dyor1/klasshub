import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { missingProfileRedirect } from "@/lib/routing";

export type Role = Database["public"]["Enums"]["user_role"];

export type Viewer = {
  id: string;
  schoolId: string;
  role: Role;
  fullName: string | null;
  isStaff: boolean;
  isAdmin: boolean;
};

/** Resolves the signed-in user's profile.
 *
 *  No session goes to /login. A session with no profile row goes to /logout
 *  instead, and that difference is load-bearing: sending it to /login creates
 *  an unbreakable redirect loop, because the proxy sees a valid token there and
 *  sends it straight back to /dashboard, which lands here again. The browser
 *  gives up with "redirected too many times" and the person is locked out with
 *  no way to sign in as anyone else.
 *
 *  /logout is outside the protected area and needs no profile, so it always
 *  terminates: it clears the session and explains what happened.
 *
 *  A valid token with no profile is rare but real — a sign-up where the
 *  provisioning trigger did not run, a profile deleted while its owner was
 *  still signed in, or an auth user created straight in the database. */
export async function requireViewer(): Promise<Viewer> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims?.sub;
  if (!uid) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, school_id, role, full_name")
    .eq("id", uid)
    .single();

  if (!profile) {
    // A platform operator legitimately has no school, and sign-in lands
    // everyone on /dashboard, so without this the founder would be signed out
    // every time they opened the app. Checked only on the way to failing, so
    // the ordinary path still costs one query.
    const { error } = await supabase.rpc("platform_schools");
    redirect(missingProfileRedirect(!error));
  }

  return {
    id: profile.id,
    schoolId: profile.school_id,
    role: profile.role,
    fullName: profile.full_name,
    isStaff: profile.role === "admin" || profile.role === "teacher",
    isAdmin: profile.role === "admin",
  };
}

/** Current Nigerian-style session label, e.g. "2026/2027". Sessions roll over
 *  in September. */
export function currentAcademicYear(date = new Date()): string {
  const year = date.getFullYear();
  const start = date.getMonth() >= 8 ? year : year - 1;
  return `${start}/${start + 1}`;
}

export const TERMS = [
  { value: "first", label: "First Term" },
  { value: "second", label: "Second Term" },
  { value: "third", label: "Third Term" },
] as const;

/** Gate for the platform area.
 *
 *  Membership is decided in the database by private.is_platform_operator(),
 *  reached only through the SECURITY DEFINER functions the area uses — there
 *  is no roster to read from the app and no claim to trust.
 *
 *  Deliberately does not call requireViewer. An operator belongs to the
 *  platform, not to a school, so requiring a profiles row would lock out
 *  exactly the accounts this area exists for: an operator added straight to
 *  the roster has no school and needs none. The two notions of identity are
 *  separate and the check has to stay separate with them.
 *
 *  This is a convenience for rendering, not the security boundary. Every
 *  platform function re-checks membership itself, so a page that forgot to
 *  call this still cannot read or change anything. */
export async function requirePlatformOperator() {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/login?next=/platform");

  const { data: schools, error } = await supabase.rpc("platform_schools");

  // 42501 is the function's own refusal: this account is not on the roster, so
  // it goes to its own dashboard rather than being shown a refusal, because
  // whether this area exists is not something a school's admin needs to learn.
  //
  // Only that code. Redirecting on *any* error means a timeout or a dropped
  // connection is reported to a real operator as though their access had been
  // taken away, and bounces them out of the tool with no way to tell the
  // difference. Other errors are returned for the caller to show.
  if (error?.code === "42501") redirect("/dashboard");

  // Returned rather than discarded: the page needs exactly this list, and
  // fetching it here only to throw it away meant querying every school twice
  // on every render.
  return { schools, error };
}
