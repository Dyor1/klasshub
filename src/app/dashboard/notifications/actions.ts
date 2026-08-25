"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import type { Database } from "@/lib/supabase/database.types";

type Term = Database["public"]["Enums"]["term"];

export type ReminderState = { error: string | null; ok?: boolean; message?: string };

export async function markAllRead() {
  const viewer = await requireViewer();
  const supabase = await createClient();

  // RLS already limits this to the caller's own rows; the filter just avoids
  // rewriting ones already read.
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", viewer.id)
    .is("read_at", null);

  revalidatePath("/dashboard", "layout");
}

export async function markRead(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/dashboard", "layout");
}

export async function dismiss(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("notifications").delete().eq("id", id);
  revalidatePath("/dashboard", "layout");
}

/** Chases every unpaid balance for a term. Deliberately admin-triggered — an
 *  automatic nightly blast to every parent would do more harm than good. */
export async function sendFeeReminders(
  _prev: ReminderState,
  formData: FormData
): Promise<ReminderState> {
  const viewer = await requireViewer();
  if (!viewer.isAdmin) return { error: "Only administrators can send reminders." };

  const term = String(formData.get("term") ?? "") as Term;
  const academicYear = String(formData.get("academic_year") ?? "").trim();
  if (!term || !academicYear) return { error: "Pick a term and session." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("send_fee_reminders", {
    p_term: term,
    p_academic_year: academicYear,
  });

  if (error) return { error: error.message };

  const row = Array.isArray(data) ? data[0] : data;
  const students = row?.students ?? 0;
  const recipients = row?.recipients ?? 0;

  revalidatePath("/dashboard", "layout");

  if (students === 0) {
    return { error: null, ok: true, message: "Nobody owes anything for this term." };
  }
  return {
    error: null,
    ok: true,
    message:
      recipients === 0
        ? `${students} student${students === 1 ? "" : "s"} owe fees, but none have a linked student or parent account to notify.`
        : `Reminded ${recipients} recipient${recipients === 1 ? "" : "s"} across ${students} student${students === 1 ? "" : "s"}.`,
  };
}
