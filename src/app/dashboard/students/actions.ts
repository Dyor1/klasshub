"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";

export type FormState = { error: string | null; ok?: boolean };

export async function createStudent(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const viewer = await requireViewer();
  if (!viewer.isStaff) return { error: "Only staff can enrol students." };

  const get = (k: string) => String(formData.get(k) ?? "").trim();

  const admissionNumber = get("admission_number");
  const surname = get("surname");
  const firstName = get("first_name");
  const gender = get("gender");
  const dob = get("date_of_birth");
  const classId = get("class_id");

  if (!admissionNumber || !surname || !firstName) {
    return { error: "Admission number, surname and first name are required." };
  }
  if (gender && gender !== "male" && gender !== "female") {
    return { error: "Gender must be male or female." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("students").insert({
    school_id: viewer.schoolId,
    admission_number: admissionNumber,
    surname,
    first_name: firstName,
    other_names: get("other_names") || null,
    gender: gender || null,
    date_of_birth: dob || null,
    class_id: classId || null,
    guardian_name: get("guardian_name") || null,
    guardian_phone: get("guardian_phone") || null,
    guardian_email: get("guardian_email") || null,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: `Admission number “${admissionNumber}” is already in use.` };
    }
    return { error: error.message };
  }

  revalidatePath("/dashboard/students");
  return { error: null, ok: true };
}

export async function deleteStudent(formData: FormData) {
  const viewer = await requireViewer();
  if (!viewer.isStaff) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("students").delete().eq("id", id);
  revalidatePath("/dashboard/students");
}

export type BulkMoveState = { error: string | null; moved?: number; note?: string };

/** Moves or graduates the selected pupils in one go.
 *
 *  This is the end-of-session job. Doing it a pupil at a time is forty form
 *  submissions per class, which is why schools put it off and why the roll
 *  drifts out of date.
 *
 *  Nothing here widens what the caller can touch: the ids come from a list the
 *  caller was already shown, and RLS re-checks every one of them against their
 *  school. A hand-edited id belonging to another school updates no rows. */
export async function moveStudentsBulk(
  _prev: BulkMoveState,
  formData: FormData
): Promise<BulkMoveState> {
  const viewer = await requireViewer();
  if (!viewer.isStaff) return { error: "Only staff can move students." };

  const ids = formData.getAll("student_id").map(String).filter(Boolean);
  if (ids.length === 0) return { error: "Select at least one student first." };

  const target = String(formData.get("target_class") ?? "");
  const status = String(formData.get("target_status") ?? "").trim();

  const STATUSES = ["active", "graduated", "withdrawn", "suspended"] as const;
  const nextStatus = STATUSES.find((s) => s === status);

  // "unassign" is a deliberate choice rather than an empty select, so clearing
  // a class cannot happen by leaving the dropdown untouched.
  const changesClass = target !== "";
  if (!changesClass && !nextStatus) {
    return { error: "Choose a class to move them to, or a status to set." };
  }

  const patch: { class_id?: string | null; status?: (typeof STATUSES)[number] } = {};
  if (changesClass) patch.class_id = target === "unassign" ? null : target;
  if (nextStatus) patch.status = nextStatus;

  const supabase = await createClient();

  // Returning the rows tells us how many actually changed. An .in() update
  // that matches nothing reports success, so counting the response is the only
  // way to know a stale selection did anything at all.
  const { data, error } = await supabase
    .from("students")
    .update(patch)
    .in("id", ids)
    .select("id");

  if (error) return { error: error.message };

  const moved = data?.length ?? 0;
  revalidatePath("/dashboard/students");

  return {
    error: null,
    moved,
    note:
      moved < ids.length
        ? `${ids.length - moved} of the selected students could not be updated — they may have been changed or removed since the page loaded.`
        : undefined,
  };
}
