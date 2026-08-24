"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import type { Database } from "@/lib/supabase/database.types";

type Term = Database["public"]["Enums"]["term"];

export type SaveState = { error: string | null; saved?: number };

/** Upserts a whole class's marks for one subject/term in a single round trip.
 *  Scores are validated here as well as by CHECK constraints in the database —
 *  the constraints are the real guarantee, this just gives a better message. */
export async function saveResults(
  _prev: SaveState,
  formData: FormData
): Promise<SaveState> {
  const viewer = await requireViewer();
  if (!viewer.isStaff) return { error: "Only staff can record results." };

  const classId = String(formData.get("class_id") ?? "");
  const subjectId = String(formData.get("subject_id") ?? "");
  const academicYear = String(formData.get("academic_year") ?? "").trim();
  const term = String(formData.get("term") ?? "") as Term;
  const caMax = Number(formData.get("ca_max") ?? 40);
  const examMax = Number(formData.get("exam_max") ?? 60);

  if (!classId || !subjectId || !academicYear || !term) {
    return { error: "Pick a class, subject, session and term first." };
  }
  if (!Number.isFinite(caMax) || caMax <= 0 || !Number.isFinite(examMax) || examMax <= 0) {
    return { error: "Maximum scores must be greater than zero." };
  }

  const studentIds = formData.getAll("student_id").map(String);
  const rows: {
    school_id: string;
    student_id: string;
    subject_id: string;
    class_id: string;
    academic_year: string;
    term: Term;
    ca_score: number;
    ca_max: number;
    exam_score: number;
    exam_max: number;
    recorded_by: string;
  }[] = [];

  for (const sid of studentIds) {
    const caRaw = String(formData.get(`ca_${sid}`) ?? "").trim();
    const examRaw = String(formData.get(`exam_${sid}`) ?? "").trim();

    // A student left entirely blank is skipped rather than stored as zero,
    // so "not yet marked" stays distinguishable from "scored nothing".
    if (caRaw === "" && examRaw === "") continue;

    const ca = caRaw === "" ? 0 : Number(caRaw);
    const exam = examRaw === "" ? 0 : Number(examRaw);

    if (!Number.isFinite(ca) || !Number.isFinite(exam) || ca < 0 || exam < 0) {
      return { error: "Scores must be positive numbers." };
    }
    if (ca > caMax) return { error: `A CA score exceeds the maximum of ${caMax}.` };
    if (exam > examMax) return { error: `An exam score exceeds the maximum of ${examMax}.` };

    rows.push({
      school_id: viewer.schoolId,
      student_id: sid,
      subject_id: subjectId,
      class_id: classId,
      academic_year: academicYear,
      term,
      ca_score: ca,
      ca_max: caMax,
      exam_score: exam,
      exam_max: examMax,
      recorded_by: viewer.id,
    });
  }

  if (rows.length === 0) return { error: "Enter at least one score." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("results")
    .upsert(rows, { onConflict: "student_id,subject_id,academic_year,term" });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/results");
  return { error: null, saved: rows.length };
}

/** Publishing is what makes results visible to students — RLS hides anything
 *  unpublished from them. */
export async function setPublished(formData: FormData) {
  const viewer = await requireViewer();
  if (!viewer.isStaff) return;

  const classId = String(formData.get("class_id") ?? "");
  const subjectId = String(formData.get("subject_id") ?? "");
  const academicYear = String(formData.get("academic_year") ?? "");
  const term = String(formData.get("term") ?? "") as Term;
  const published = String(formData.get("published") ?? "") === "true";

  if (!classId || !subjectId || !academicYear || !term) return;

  const supabase = await createClient();
  await supabase
    .from("results")
    .update({ published })
    .eq("class_id", classId)
    .eq("subject_id", subjectId)
    .eq("academic_year", academicYear)
    .eq("term", term);

  revalidatePath("/dashboard/results");
}
