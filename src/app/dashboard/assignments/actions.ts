"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import { FILE_BUCKET } from "@/lib/files";
import type { Database } from "@/lib/supabase/database.types";

type Term = Database["public"]["Enums"]["term"];
type Status = Database["public"]["Enums"]["assignment_status"];

export type HwState = { error: string | null; ok?: boolean; message?: string };

/* ------------------------------------------------------------------ setting */

export async function createAssignment(
  _prev: HwState,
  formData: FormData
): Promise<HwState> {
  const viewer = await requireViewer();
  if (!viewer.isStaff) return { error: "Only staff can set assignments." };

  const title = String(formData.get("title") ?? "").trim();
  const classId = String(formData.get("class_id") ?? "");
  const subjectId = String(formData.get("subject_id") ?? "").trim();
  const instructions = String(formData.get("instructions") ?? "").trim();
  const dueAt = String(formData.get("due_at") ?? "").trim();
  const maxScore = Number(formData.get("max_score") ?? 10);
  const term = String(formData.get("term") ?? "") as Term;
  const academicYear = String(formData.get("academic_year") ?? "").trim();
  const allowFile = String(formData.get("allow_file") ?? "") === "on";
  const allowText = String(formData.get("allow_text") ?? "") === "on";

  if (!title || !classId || !term || !academicYear) {
    return { error: "Title, class, term and session are required." };
  }
  if (!Number.isFinite(maxScore) || maxScore <= 0) {
    return { error: "Maximum score must be above zero." };
  }
  if (!allowFile && !allowText) {
    return { error: "Allow at least one way to submit — typed answer or file." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("assignments").insert({
    school_id: viewer.schoolId,
    class_id: classId,
    subject_id: subjectId || null,
    teacher_id: viewer.id,
    title,
    instructions: instructions || null,
    due_at: dueAt ? new Date(dueAt).toISOString() : null,
    max_score: maxScore,
    allow_file: allowFile,
    allow_text: allowText,
    term,
    academic_year: academicYear,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/assignments");
  return { error: null, ok: true };
}

export async function setAssignmentStatus(formData: FormData) {
  const viewer = await requireViewer();
  if (!viewer.isStaff) return;

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as Status;
  if (!id || !["draft", "published", "closed"].includes(status)) return;

  const supabase = await createClient();
  await supabase.from("assignments").update({ status }).eq("id", id);

  revalidatePath("/dashboard/assignments");
  revalidatePath(`/dashboard/assignments/${id}`);
}

export async function deleteAssignment(formData: FormData) {
  const viewer = await requireViewer();
  if (!viewer.isStaff) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("assignments").delete().eq("id", id);
  revalidatePath("/dashboard/assignments");
}

/* --------------------------------------------------------------- submitting */

/** Saves a student's work. The database independently refuses a score or
 *  feedback from a student, and refuses any edit once graded — this action
 *  simply never sends those fields. */
export async function submitWork(
  _prev: HwState,
  formData: FormData
): Promise<HwState> {
  const viewer = await requireViewer();
  if (viewer.isStaff) return { error: "Staff don't submit assignments." };

  const assignmentId = String(formData.get("assignment_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const filePath = String(formData.get("file_path") ?? "");
  const fileName = String(formData.get("file_name") ?? "");
  const fileSize = Number(formData.get("file_size") ?? 0);

  if (!assignmentId) return { error: "Which assignment is this for?" };
  if (!body && !filePath) return { error: "Type an answer or attach a file." };
  if (filePath && !filePath.startsWith(`${viewer.schoolId}/assignments/${viewer.id}/`)) {
    return { error: "That file path is not valid for your account." };
  }

  const supabase = await createClient();

  const { data: me } = await supabase
    .from("students")
    .select("id")
    .eq("profile_id", viewer.id)
    .maybeSingle();

  if (!me) {
    return { error: "Your account isn't linked to a student record yet." };
  }

  const { error } = await supabase.from("assignment_submissions").upsert(
    {
      school_id: viewer.schoolId,
      assignment_id: assignmentId,
      student_id: me.id,
      body: body || null,
      file_path: filePath || null,
      file_name: fileName || null,
      file_size: fileSize || null,
      submitted_at: new Date().toISOString(),
    },
    { onConflict: "assignment_id,student_id" }
  );

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/assignments/${assignmentId}`);
  revalidatePath("/dashboard/assignments");
  return { error: null, ok: true, message: "Your work has been submitted." };
}

/* ----------------------------------------------------------------- grading */

export async function gradeSubmission(
  _prev: HwState,
  formData: FormData
): Promise<HwState> {
  const viewer = await requireViewer();
  if (!viewer.isStaff) return { error: "Only staff can grade." };

  const id = String(formData.get("submission_id") ?? "");
  const assignmentId = String(formData.get("assignment_id") ?? "");
  const scoreRaw = String(formData.get("score") ?? "").trim();
  const feedback = String(formData.get("feedback") ?? "").trim();
  const maxScore = Number(formData.get("max_score") ?? 0);

  if (!id) return { error: "Which submission?" };

  const score = scoreRaw === "" ? null : Number(scoreRaw);
  if (score !== null && (!Number.isFinite(score) || score < 0)) {
    return { error: "Score must be zero or more." };
  }
  if (score !== null && maxScore > 0 && score > maxScore) {
    return { error: `Score cannot exceed the maximum of ${maxScore}.` };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("assignment_submissions")
    .update({
      score,
      feedback: feedback || null,
      graded_by: viewer.id,
      graded_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/assignments/${assignmentId}`);
  return { error: null, ok: true, message: "Graded." };
}

export async function deleteSubmission(formData: FormData) {
  const viewer = await requireViewer();
  if (!viewer.isStaff) return;

  const id = String(formData.get("id") ?? "");
  const path = String(formData.get("path") ?? "");
  const assignmentId = String(formData.get("assignment_id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("assignment_submissions").delete().eq("id", id);
  if (path && path.startsWith(`${viewer.schoolId}/`)) {
    await supabase.storage.from(FILE_BUCKET).remove([path]);
  }

  revalidatePath(`/dashboard/assignments/${assignmentId}`);
}
