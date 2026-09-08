"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { siteOrigin } from "@/lib/site-url";
import { internalPath } from "@/lib/redirect-path";

export type AuthState = { error: string | null };
export type ResetRequestState = { error: string | null; sent: boolean };

function readAuthFields(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };
}

export async function login(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const { email, password } = readAuthFields(formData);
  const next = String(formData.get("next") ?? "/dashboard");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect(internalPath(next));
}

export async function register(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const { email, password } = readAuthFields(formData);
  const schoolName = String(formData.get("school_name") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();

  if (!schoolName || !fullName || !email || !password) {
    return { error: "Please fill in every field." };
  }
  if (schoolName.length < 2) {
    return { error: "School name is too short." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();

  // school_name and full_name are read by the on_auth_user_created trigger,
  // which provisions the school and this user's admin profile. The trigger
  // only ever creates a NEW school from this value — it can't be used to join
  // an existing tenant or pick a role.
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { school_name: schoolName, full_name: fullName } },
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/** Sends a reset link.
 *
 *  The answer is the same whether or not that address has an account. A form
 *  that says "no user with that email" is a membership oracle: anyone can sit
 *  on it and learn which staff at a school are registered, which is exactly
 *  the list you would want before writing a phishing mail. Supabase does not
 *  distinguish either, so there is nothing to leak by accident — but the
 *  errors it *can* return (rate limits, SMTP failures) would, so they are
 *  swallowed too. */
export async function requestPasswordReset(
  _prev: ResetRequestState,
  formData: FormData
): Promise<ResetRequestState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter your email address.", sent: false };

  const supabase = await createClient();
  const origin = await siteOrigin();

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  return { error: null, sent: true };
}

/** Sets a new password, using the short-lived session the reset link created. */
export async function updatePassword(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  // Asked for twice because the field is masked. A typo here does not bounce
  // off a login form later — it silently becomes the password.
  if (password !== confirm) {
    return { error: "Those two passwords do not match." };
  }

  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    return {
      error: "This reset link has expired. Request a new one and try again.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  // Every session, everywhere — not just this one. Someone resetting a
  // password may be doing it *because* another party is in the account, and
  // leaving that party signed in would defeat the whole exercise. It also
  // retires the recovery session, so the emailed link cannot be replayed.
  await supabase.auth.signOut({ scope: "global" });

  revalidatePath("/", "layout");
  redirect("/login?reset=done");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
