"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";

export type FormState = { error: string | null; ok?: boolean };

export async function createClass(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const viewer = await requireViewer();
  if (!viewer.isStaff) return { error: "Only staff can create classes." };

  const name = String(formData.get("name") ?? "").trim();
  const gradeLevel = String(formData.get("grade_level") ?? "").trim();
  const section = String(formData.get("section") ?? "").trim();
  const academicYear = String(formData.get("academic_year") ?? "").trim();
  const capacityRaw = String(formData.get("capacity") ?? "").trim();
  const teacherId = String(formData.get("class_teacher_id") ?? "").trim();

  if (!name || !gradeLevel || !academicYear) {
    return { error: "Class name, grade level and session are required." };
  }

  const capacity = capacityRaw ? Number(capacityRaw) : null;
  if (capacity !== null && (!Number.isFinite(capacity) || capacity <= 0)) {
    return { error: "Capacity must be a positive number." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("classes").insert({
    school_id: viewer.schoolId,
    name,
    grade_level: gradeLevel,
    section: section || null,
    academic_year: academicYear,
    capacity,
    class_teacher_id: teacherId || null,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: `“${name}” already exists for ${academicYear}.` };
    }
    return { error: error.message };
  }

  revalidatePath("/dashboard/classes");
  return { error: null, ok: true };
}

export async function deleteClass(formData: FormData) {
  const viewer = await requireViewer();
  if (!viewer.isStaff) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("classes").delete().eq("id", id);
  revalidatePath("/dashboard/classes");
}
