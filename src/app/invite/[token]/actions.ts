"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AcceptState = { error: string | null };

/** Accepts an invitation by signing up with the token attached.
 *
 *  The token is passed through to the on_auth_user_created trigger, which
 *  validates it and derives school_id + role from the invitation row. Nothing
 *  here decides what the user becomes — deliberately. */
export async function acceptInvite(
  _prev: AcceptState,
  formData: FormData
): Promise<AcceptState> {
  const token = String(formData.get("token") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!token) return { error: "This invitation link is incomplete." };
  if (!email || !fullName || !password) {
    return { error: "Please fill in every field." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { invitation_token: token, full_name: fullName } },
  });

  if (error) {
    // Supabase Auth collapses trigger exceptions into a generic message, so
    // translate it. The page already validated the token, meaning if we land
    // here it was almost certainly claimed in the meantime.
    if (/database error saving new user/i.test(error.message)) {
      return {
        error:
          "This invitation could not be accepted — it may have just been used or expired. Ask your administrator for a new link.",
      };
    }
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
