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
