"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";

export type PrefState = { error: string | null; ok?: boolean; message?: string };

/** Mirrors private.normalize_phone in SQL. Duplicated on purpose: the database
 *  is the authority (its CHECK constraint is what actually holds the line) but
 *  rejecting a bad number here gives the person a useful message instead of a
 *  constraint violation. */
function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let v = trimmed.replace(/[^0-9+]/g, "");
  if (!v) return null;

  if (v.startsWith("+")) {
    v = "+" + v.slice(1).replace(/[^0-9]/g, "");
  } else if (v.startsWith("234")) {
    v = "+" + v;
  } else if (v.startsWith("0")) {
    // Local Nigerian format: drop the trunk 0, add the country code.
    v = "+234" + v.slice(1);
  } else {
    return null;
  }

  return /^\+[1-9][0-9]{7,14}$/.test(v) ? v : null;
}

export async function saveNotificationPreferences(
  _prev: PrefState,
  formData: FormData
): Promise<PrefState> {
  const viewer = await requireViewer();
  const supabase = await createClient();

  const rawPhone = String(formData.get("phone") ?? "");
  const emailEnabled = formData.get("email_enabled") === "on";
  const smsEnabled = formData.get("sms_enabled") === "on";

  let phone: string | null = null;
  if (rawPhone.trim()) {
    phone = normalizePhone(rawPhone);
    if (!phone) {
      return {
        error:
          "That does not look like a valid phone number. Use 08012345678 or +2348012345678.",
      };
    }
  }

  // Asking for SMS with no number on file would silently never send, so say so
  // rather than accepting a setting that cannot work.
  if (smsEnabled && !phone) {
    return { error: "Add a phone number before turning SMS on." };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ phone })
    .eq("id", viewer.id);

  if (profileError) return { error: profileError.message };

  const { error } = await supabase.from("notification_preferences").upsert(
    {
      profile_id: viewer.id,
      school_id: viewer.schoolId,
      email_enabled: emailEnabled,
      sms_enabled: smsEnabled,
    },
    { onConflict: "profile_id" }
  );

  if (error) return { error: error.message };

  revalidatePath("/dashboard/notifications");
  return { error: null, ok: true, message: "Saved." };
}

/** Per-school channel routing. Admin only — and enforced by RLS besides. */
export async function saveNotificationRoutes(
  _prev: PrefState,
  formData: FormData
): Promise<PrefState> {
  const viewer = await requireViewer();
  if (!viewer.isAdmin) {
    return { error: "Only administrators can change how notices are sent." };
  }

  const kinds = formData.getAll("kind").map(String);
  const rows = kinds.map((kind) => ({
    school_id: viewer.schoolId,
    kind: kind as "announcement" | "result" | "attendance" | "fees" | "lesson_note" | "general",
    email: formData.get(`email:${kind}`) === "on",
    sms: formData.get(`sms:${kind}`) === "on",
  }));

  if (rows.length === 0) return { error: "Nothing to save." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("notification_routes")
    .upsert(rows, { onConflict: "school_id,kind" });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings");
  return { error: null, ok: true, message: "Delivery settings saved." };
}
