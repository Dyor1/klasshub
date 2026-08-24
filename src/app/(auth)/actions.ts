"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error: string | null };

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
  redirect(next.startsWith("/") ? next : "/dashboard");
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

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
