"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import type { Database } from "@/lib/supabase/database.types";

type Term = Database["public"]["Enums"]["term"];
type Choice = Database["public"]["Enums"]["cbt_option"];
type ExamStatus = Database["public"]["Enums"]["cbt_status"];

export type CbtState = { error: string | null; ok?: boolean; message?: string };

/* --------------------------------------------------------------- authoring */

export async function createExam(
  _prev: CbtState,
  formData: FormData
): Promise<CbtState> {
  const viewer = await requireViewer();
  if (!viewer.isStaff) return { error: "Only staff can create exams." };

  const title = String(formData.get("title") ?? "").trim();
  const classId = String(formData.get("class_id") ?? "");
  const subjectId = String(formData.get("subject_id") ?? "").trim();
  const term = String(formData.get("term") ?? "") as Term;
  const academicYear = String(formData.get("academic_year") ?? "").trim();
  const duration = Number(formData.get("duration_minutes") ?? 30);
  const instructions = String(formData.get("instructions") ?? "").trim();
  const shuffle = String(formData.get("shuffle_questions") ?? "") === "on";

  if (!title || !classId || !term || !academicYear) {
    return { error: "Title, class, term and session are required." };
  }
  if (!Number.isInteger(duration) || duration < 1 || duration > 600) {
    return { error: "Duration must be between 1 and 600 minutes." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("cbt_exams").insert({
    school_id: viewer.schoolId,
    class_id: classId,
    subject_id: subjectId || null,
    title,
    term,
    academic_year: academicYear,
    duration_minutes: duration,
    instructions: instructions || null,
    shuffle_questions: shuffle,
    created_by: viewer.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/cbt");
  return { error: null, ok: true };
}

export async function addQuestion(
  _prev: CbtState,
  formData: FormData
): Promise<CbtState> {
  const viewer = await requireViewer();
  if (!viewer.isStaff) return { error: "Only staff can add questions." };

  const examId = String(formData.get("exam_id") ?? "");
  const text = String(formData.get("question_text") ?? "").trim();
  const a = String(formData.get("option_a") ?? "").trim();
  const b = String(formData.get("option_b") ?? "").trim();
  const c = String(formData.get("option_c") ?? "").trim();
  const d = String(formData.get("option_d") ?? "").trim();
  const correct = String(formData.get("correct_option") ?? "") as Choice;
  const marks = Number(formData.get("marks") ?? 1);

  if (!examId || !text || !a || !b) {
    return { error: "A question needs text and at least options A and B." };
  }
  if (!["a", "b", "c", "d"].includes(correct)) {
    return { error: "Mark which option is correct." };
  }
  if (correct === "c" && !c) return { error: "Option C is marked correct but empty." };
  if (correct === "d" && !d) return { error: "Option D is marked correct but empty." };
  if (!Number.isFinite(marks) || marks <= 0) return { error: "Marks must be above zero." };

  const supabase = await createClient();

  // Number questions sequentially within the exam.
  const { count } = await supabase
    .from("cbt_questions")
    .select("id", { count: "exact", head: true })
    .eq("exam_id", examId);

  const { error } = await supabase.from("cbt_questions").insert({
    school_id: viewer.schoolId,
    exam_id: examId,
    question_number: (count ?? 0) + 1,
    question_text: text,
    option_a: a,
    option_b: b,
    option_c: c || null,
    option_d: d || null,
    correct_option: correct,
    marks,
  });

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/cbt/${examId}`);
  return { error: null, ok: true };
}

export async function deleteQuestion(formData: FormData) {
  const viewer = await requireViewer();
  if (!viewer.isStaff) return;
  const id = String(formData.get("id") ?? "");
  const examId = String(formData.get("exam_id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("cbt_questions").delete().eq("id", id);
  revalidatePath(`/dashboard/cbt/${examId}`);
}

export async function setExamStatus(formData: FormData) {
  const viewer = await requireViewer();
  if (!viewer.isStaff) return;

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as ExamStatus;
  if (!id || !["draft", "published", "closed"].includes(status)) return;

  const supabase = await createClient();
  await supabase.from("cbt_exams").update({ status }).eq("id", id);

  revalidatePath("/dashboard/cbt");
  revalidatePath(`/dashboard/cbt/${id}`);
}

export async function deleteExam(formData: FormData) {
  const viewer = await requireViewer();
  if (!viewer.isStaff) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("cbt_exams").delete().eq("id", id);
  revalidatePath("/dashboard/cbt");
}

/* ------------------------------------------------------------ sitting an exam */

/** Starts or resumes an attempt. Every rule — published, in window, right
 *  class, not already submitted — is enforced inside the SQL function, so this
 *  wrapper only translates the outcome. */
export async function startExam(formData: FormData) {
  const examId = String(formData.get("exam_id") ?? "");
  if (!examId) return;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cbt_start", { p_exam_id: examId });

  if (error || !data) {
    redirect(`/dashboard/cbt?error=${encodeURIComponent(error?.message ?? "Could not start")}`);
  }
  redirect(`/dashboard/cbt/sit/${data}`);
}

export async function saveAnswer(formData: FormData) {
  const sessionId = String(formData.get("session_id") ?? "");
  const questionId = String(formData.get("question_id") ?? "");
  const selected = String(formData.get("selected") ?? "") as Choice;
  if (!sessionId || !questionId || !["a", "b", "c", "d"].includes(selected)) return;

  const supabase = await createClient();
  await supabase.rpc("cbt_answer", {
    p_session_id: sessionId,
    p_question_id: questionId,
    p_selected: selected,
  });

  revalidatePath(`/dashboard/cbt/sit/${sessionId}`);
}

export async function submitExam(formData: FormData) {
  const sessionId = String(formData.get("session_id") ?? "");
  if (!sessionId) return;

  const supabase = await createClient();
  // Grading happens entirely inside the function; nothing here computes a score.
  await supabase.rpc("cbt_submit", { p_session_id: sessionId });

  revalidatePath("/dashboard/cbt", "layout");
  redirect(`/dashboard/cbt/sit/${sessionId}?done=1`);
}
