"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import { FILE_BUCKET } from "@/lib/files";
import type { Database } from "@/lib/supabase/database.types";

type Term = Database["public"]["Enums"]["term"];

export type NoteState = { error: string | null; ok?: boolean };

/** Records a note whose file the browser has already uploaded to Storage.
 *  Uploading client-side keeps large files out of the Server Action body,
 *  which has a size cap. */
export async function saveClassNote(
  _prev: NoteState,
  formData: FormData
): Promise<NoteState> {
  const viewer = await requireViewer();
  if (!viewer.isStaff) return { error: "Only staff can upload class notes." };

  const title = String(formData.get("title") ?? "").trim();
  const classId = String(formData.get("class_id") ?? "");
  const subjectId = String(formData.get("subject_id") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const academicYear = String(formData.get("academic_year") ?? "").trim();
  const term = String(formData.get("term") ?? "").trim() as Term | "";
  const filePath = String(formData.get("file_path") ?? "");
  const fileName = String(formData.get("file_name") ?? "");
  const fileSize = Number(formData.get("file_size") ?? 0);
  const fileType = String(formData.get("file_type") ?? "");

  if (!title || !classId || !academicYear) {
    return { error: "Title, class and session are required." };
  }
  if (!filePath || !fileName) {
    return { error: "Attach a file before saving." };
  }
  // The path prefix is what storage RLS keys on; refuse anything that doesn't
  // belong to this school rather than trusting the client's value.
  if (!filePath.startsWith(`${viewer.schoolId}/class-notes/`)) {
    return { error: "That file path is not valid for your school." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("class_notes").insert({
    school_id: viewer.schoolId,
    class_id: classId,
    subject_id: subjectId || null,
    title,
    description: description || null,
    academic_year: academicYear,
    term: term || null,
    file_path: filePath,
    file_name: fileName,
    file_size: fileSize || null,
    file_type: fileType || null,
    uploaded_by: viewer.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/class-notes");
  return { error: null, ok: true };
}

export async function deleteClassNote(formData: FormData) {
  const viewer = await requireViewer();
  if (!viewer.isStaff) return;

  const id = String(formData.get("id") ?? "");
  const path = String(formData.get("path") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("class_notes").delete().eq("id", id);

  // Remove the file too, so deleting a note doesn't leave storage orphans.
  if (path.startsWith(`${viewer.schoolId}/`)) {
    await supabase.storage.from(FILE_BUCKET).remove([path]);
  }

  revalidatePath("/dashboard/class-notes");
}
