"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import { expandArms } from "@/lib/bulk";

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

export type BulkState = {
  error: string | null;
  created?: number;
  skipped?: string[];
};

/** Creates a whole year group at once — "JSS 1" with arms "A, B, C".
 *
 *  Setting up a school means creating twenty-odd classes, and doing that one
 *  form at a time is the single most tedious thing about the first hour on any
 *  school portal. */
export async function createClassesBulk(
  _prev: BulkState,
  formData: FormData
): Promise<BulkState> {
  const viewer = await requireViewer();
  if (!viewer.isStaff) return { error: "Only staff can create classes." };

  const gradeLevel = String(formData.get("grade_level") ?? "").trim();
  const arms = String(formData.get("arms") ?? "");
  const academicYear = String(formData.get("academic_year") ?? "").trim();
  const capacityRaw = String(formData.get("capacity") ?? "").trim();

  if (!gradeLevel) return { error: "Give a grade level, e.g. JSS 1." };
  if (!academicYear) return { error: "Give a session, e.g. 2026/2027." };

  const capacity = capacityRaw ? Number(capacityRaw) : null;
  if (capacity !== null && (!Number.isFinite(capacity) || capacity <= 0)) {
    return { error: "Capacity must be a positive number." };
  }

  const wanted = expandArms(gradeLevel, arms);
  if (wanted.length === 0) return { error: "Nothing to create." };
  if (wanted.length > 40) {
    return { error: `That is ${wanted.length} classes at once. Try fewer arms.` };
  }

  const supabase = await createClient();

  // Uniqueness is (school, name, session), so an existing name in a *different*
  // session is not a clash and must not be skipped.
  const { data: existing } = await supabase
    .from("classes")
    .select("name")
    .eq("academic_year", academicYear);
  const taken = new Set((existing ?? []).map((c) => c.name.toLowerCase()));

  const fresh = wanted.filter((w) => !taken.has(w.name.toLowerCase()));
  const skipped = wanted
    .filter((w) => taken.has(w.name.toLowerCase()))
    .map((w) => w.name);

  if (fresh.length === 0) return { error: null, created: 0, skipped };

  const { error } = await supabase.from("classes").insert(
    fresh.map((w) => ({
      school_id: viewer.schoolId,
      name: w.name,
      grade_level: gradeLevel,
      section: w.section,
      academic_year: academicYear,
      capacity,
    }))
  );

  if (error) return { error: error.message };

  revalidatePath("/dashboard/classes");
  return { error: null, created: fresh.length, skipped };
}
