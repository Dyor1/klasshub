"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import { FILE_BUCKET } from "@/lib/files";
import type { Database } from "@/lib/supabase/database.types";

type Term = Database["public"]["Enums"]["term"];
type Status = Database["public"]["Enums"]["lesson_note_status"];

export type LessonState = { error: string | null; ok?: boolean };

export async function submitLessonNote(
  _prev: LessonState,
  formData: FormData
): Promise<LessonState> {
  const viewer = await requireViewer();
  if (!viewer.isStaff) return { error: "Only teachers can submit lesson notes." };

  const topic = String(formData.get("topic") ?? "").trim();
  const term = String(formData.get("term") ?? "") as Term;
  const academicYear = String(formData.get("academic_year") ?? "").trim();
  const classId = String(formData.get("class_id") ?? "").trim();
  const subjectId = String(formData.get("subject_id") ?? "").trim();
  const weekRaw = String(formData.get("week_number") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const filePath = String(formData.get("file_path") ?? "");
  const fileName = String(formData.get("file_name") ?? "");
  const fileSize = Number(formData.get("file_size") ?? 0);
  const fileType = String(formData.get("file_type") ?? "");

  if (!topic || !term || !academicYear) {
    return { error: "Topic, term and session are required." };
  }

  const week = weekRaw ? Number(weekRaw) : null;
  if (week !== null && (!Number.isInteger(week) || week < 1 || week > 20)) {
    return { error: "Week must be a number between 1 and 20." };
  }
  if (filePath && !filePath.startsWith(`${viewer.schoolId}/lesson-notes/`)) {
    return { error: "That file path is not valid for your school." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("lesson_notes").insert({
    school_id: viewer.schoolId,
    teacher_id: viewer.id,
    topic,
    term,
    academic_year: academicYear,
    class_id: classId || null,
    subject_id: subjectId || null,
    week_number: week,
    description: description || null,
    file_path: filePath || null,
    file_name: fileName || null,
    file_size: fileSize || null,
    file_type: fileType || null,
    status: "submitted",
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/lesson-notes");
  return { error: null, ok: true };
}

/** Approve or send back a note. The database trigger independently refuses
 *  this for non-admins, so the check here is for the message, not the rule. */
export async function reviewLessonNote(formData: FormData) {
  const viewer = await requireViewer();
  if (!viewer.isAdmin) return;

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as Status;
  const feedback = String(formData.get("admin_feedback") ?? "").trim();

  if (!id || !["approved", "rejected", "submitted"].includes(status)) return;

  const supabase = await createClient();
  await supabase
    .from("lesson_notes")
    .update({
      status,
      admin_feedback: feedback || null,
      reviewed_by: viewer.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  revalidatePath("/dashboard/lesson-notes");
}

export async function deleteLessonNote(formData: FormData) {
  const viewer = await requireViewer();
  if (!viewer.isStaff) return;

  const id = String(formData.get("id") ?? "");
  const path = String(formData.get("path") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("lesson_notes").delete().eq("id", id);

  if (path && path.startsWith(`${viewer.schoolId}/`)) {
    await supabase.storage.from(FILE_BUCKET).remove([path]);
  }

  revalidatePath("/dashboard/lesson-notes");
}
