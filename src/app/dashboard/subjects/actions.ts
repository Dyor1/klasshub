"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";

export type FormState = { error: string | null; ok?: boolean };

export async function createSubject(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const viewer = await requireViewer();
  if (!viewer.isStaff) return { error: "Only staff can add subjects." };

  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  if (!name) return { error: "Subject name is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("subjects").insert({
    school_id: viewer.schoolId,
    name,
    code: code || null,
  });

  if (error) {
    if (error.code === "23505") return { error: `“${name}” already exists.` };
    return { error: error.message };
  }

  revalidatePath("/dashboard/subjects");
  return { error: null, ok: true };
}

export async function deleteSubject(formData: FormData) {
  const viewer = await requireViewer();
  if (!viewer.isStaff) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("subjects").delete().eq("id", id);
  revalidatePath("/dashboard/subjects");
}
