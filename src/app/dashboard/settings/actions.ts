"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";

export type ScaleState = { error: string | null; ok?: boolean; saved?: number };

export type BandInput = {
  grade: string;
  min_score: number;
  max_score: number;
  remark: string;
};

const DEFAULT_BANDS: BandInput[] = [
  { grade: "A", min_score: 70, max_score: 100, remark: "Excellent" },
  { grade: "B", min_score: 60, max_score: 69.99, remark: "Very Good" },
  { grade: "C", min_score: 50, max_score: 59.99, remark: "Good" },
  { grade: "D", min_score: 45, max_score: 49.99, remark: "Fair" },
  { grade: "E", min_score: 40, max_score: 44.99, remark: "Pass" },
  { grade: "F", min_score: 0, max_score: 39.99, remark: "Fail" },
];

/** Validates that a scale is usable before it replaces the live one.
 *  A gap would leave results with no grade at all, and an overlap would make
 *  the grade depend on row order — both are silent failures on a report card,
 *  so they're rejected up front. */
function validate(bands: BandInput[]): string | null {
  if (bands.length === 0) return "Add at least one grade band.";

  const seen = new Set<string>();
  for (const b of bands) {
    if (!b.grade) return "Every band needs a grade letter.";
    const key = b.grade.toUpperCase();
    if (seen.has(key)) return `Grade “${b.grade}” appears more than once.`;
    seen.add(key);

    if (!Number.isFinite(b.min_score) || !Number.isFinite(b.max_score)) {
      return `Grade “${b.grade}” has a non-numeric score.`;
    }
    if (b.min_score < 0 || b.max_score > 100) {
      return `Grade “${b.grade}” must sit between 0 and 100.`;
    }
    if (b.min_score > b.max_score) {
      return `Grade “${b.grade}” has its minimum above its maximum.`;
    }
  }

  const sorted = [...bands].sort((a, b) => a.min_score - b.min_score);

  if (sorted[0].min_score !== 0) {
    return "The scale must start at 0 — otherwise low scores get no grade.";
  }
  if (sorted[sorted.length - 1].max_score !== 100) {
    return "The scale must reach 100 — otherwise top scores get no grade.";
  }

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    if (cur.min_score <= prev.max_score) {
      return `“${prev.grade}” and “${cur.grade}” overlap.`;
    }
    // Bands are inclusive, so anything more than a hundredth apart is a hole.
    if (cur.min_score - prev.max_score > 0.011) {
      return `There is a gap between “${prev.grade}” and “${cur.grade}” — scores in between would get no grade.`;
    }
  }

  return null;
}

function parseBands(formData: FormData): BandInput[] {
  const grades = formData.getAll("grade").map(String);
  const mins = formData.getAll("min_score").map(String);
  const maxes = formData.getAll("max_score").map(String);
  const remarks = formData.getAll("remark").map(String);

  return grades
    .map((g, i) => ({
      grade: g.trim().toUpperCase(),
      min_score: Number(mins[i]),
      max_score: Number(maxes[i]),
      remark: (remarks[i] ?? "").trim(),
    }))
    .filter((b) => b.grade !== "");
}

export async function saveGradingScale(
  _prev: ScaleState,
  formData: FormData
): Promise<ScaleState> {
  const viewer = await requireViewer();
  if (!viewer.isAdmin) {
    return { error: "Only administrators can change the grading scale." };
  }

  const bands = parseBands(formData);
  const problem = validate(bands);
  if (problem) return { error: problem };

  // Sorted high-to-low so sort_order matches how the scale reads.
  const ordered = [...bands].sort((a, b) => b.min_score - a.min_score);

  const supabase = await createClient();
  const { error } = await supabase.rpc("replace_grade_bands", {
    p_bands: ordered,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/report-cards");
  return { error: null, ok: true, saved: ordered.length };
}

/** The line between a pass and a fail, used by every analytics view. Stored on
 *  the school rather than inferred from the grading scale, because the lowest
 *  non-fail band and the pass mark are not always the same number. */
export async function savePassMark(
  _prev: ScaleState,
  formData: FormData
): Promise<ScaleState> {
  const viewer = await requireViewer();
  if (!viewer.isAdmin) {
    return { error: "Only administrators can change the pass mark." };
  }

  const passMark = Number(formData.get("pass_mark"));
  if (!Number.isFinite(passMark) || passMark < 0 || passMark > 100) {
    return { error: "The pass mark must be a number between 0 and 100." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("schools")
    .update({ pass_mark: passMark })
    .eq("id", viewer.schoolId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/analytics");
  return { error: null, ok: true };
}

export async function resetGradingScale(): Promise<void> {
  const viewer = await requireViewer();
  if (!viewer.isAdmin) return;

  const supabase = await createClient();
  await supabase.rpc("replace_grade_bands", { p_bands: DEFAULT_BANDS });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/report-cards");
}
