"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import type { Database } from "@/lib/supabase/database.types";

type Status = Database["public"]["Enums"]["attendance_status"];

export type RegisterState = { error: string | null; saved?: number };

const STATUSES: Status[] = ["present", "absent", "late", "excused"];

/** Saves a whole class register for one day in a single upsert. */
export async function saveRegister(
  _prev: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const viewer = await requireViewer();
  if (!viewer.isStaff) return { error: "Only staff can mark attendance." };

  const classId = String(formData.get("class_id") ?? "");
  const date = String(formData.get("date") ?? "");
  if (!classId || !date) return { error: "Pick a class and a date." };

  if (date > new Date().toISOString().slice(0, 10)) {
    return { error: "You can't mark attendance for a future date." };
  }

  const studentIds = formData.getAll("student_id").map(String);
  const rows = [];

  for (const sid of studentIds) {
    const status = String(formData.get(`status_${sid}`) ?? "") as Status;
    if (!status) continue;
    if (!STATUSES.includes(status)) return { error: "Invalid attendance status." };

    rows.push({
      school_id: viewer.schoolId,
      student_id: sid,
      class_id: classId,
      date,
      status,
      recorded_by: viewer.id,
    });
  }

  if (rows.length === 0) return { error: "No students to mark." };

  const supabase = await createClient();
  // One row per student per day, so re-saving corrects rather than duplicates.
  const { error } = await supabase
    .from("attendance")
    .upsert(rows, { onConflict: "student_id,date" });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/attendance");
  return { error: null, saved: rows.length };
}
