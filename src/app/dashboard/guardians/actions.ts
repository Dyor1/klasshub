"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";

export type LinkState = { error: string | null; ok?: boolean };

export async function linkGuardian(
  _prev: LinkState,
  formData: FormData
): Promise<LinkState> {
  const viewer = await requireViewer();
  if (!viewer.isStaff) return { error: "Only staff can link guardians." };

  const studentId = String(formData.get("student_id") ?? "");
  const profileId = String(formData.get("profile_id") ?? "");
  const relationship = String(formData.get("relationship") ?? "").trim();

  if (!studentId || !profileId) {
    return { error: "Pick both a student and a parent." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("student_guardians").insert({
    school_id: viewer.schoolId,
    student_id: studentId,
    profile_id: profileId,
    relationship: relationship || null,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "That parent is already linked to this student." };
    }
    return { error: error.message };
  }

  revalidatePath("/dashboard/guardians");
  return { error: null, ok: true };
}

export async function unlinkGuardian(formData: FormData) {
  const viewer = await requireViewer();
  if (!viewer.isStaff) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("student_guardians").delete().eq("id", id);
  revalidatePath("/dashboard/guardians");
}
