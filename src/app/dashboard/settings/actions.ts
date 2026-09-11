"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import {
  FILE_BUCKET,
  IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  buildFilePath,
  formatBytes,
} from "@/lib/files";

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

const ALL_TERMS = ["first", "second", "third"] as const;
type TermValue = (typeof ALL_TERMS)[number];

/** When each term of a session runs. Report cards print the closing and
 *  resumption dates from this, and per-term attendance is only computable
 *  because of it — attendance rows are dated, but without a window there is no
 *  way to say which marks belong to which term. */
export async function saveTermDates(
  _prev: ScaleState,
  formData: FormData
): Promise<ScaleState> {
  const viewer = await requireViewer();
  if (!viewer.isAdmin) {
    return { error: "Only administrators can change term dates." };
  }

  const year = String(formData.get("academic_year") ?? "").trim();
  if (!/^\d{4}\/\d{4}$/.test(year)) {
    return { error: "Academic year must look like 2025/2026." };
  }
  const [from, to] = year.split("/").map(Number);
  if (to !== from + 1) {
    return { error: `A session runs across two consecutive years — did you mean ${from}/${from + 1}?` };
  }

  const resumes = String(formData.get("next_term_starts_on") ?? "").trim();

  const rows: {
    school_id: string;
    academic_year: string;
    term: TermValue;
    starts_on: string;
    ends_on: string;
    next_term_starts_on: string | null;
  }[] = [];
  const cleared: TermValue[] = [];

  for (const term of ALL_TERMS) {
    const starts = String(formData.get(`${term}_starts_on`) ?? "").trim();
    const ends = String(formData.get(`${term}_ends_on`) ?? "").trim();

    // Both blank means "this term isn't set" — a legitimate state while a
    // school is filling the session in one term at a time.
    if (!starts && !ends) {
      cleared.push(term);
      continue;
    }
    if (!starts || !ends) {
      return { error: `Give both a start and an end date for the ${term} term, or leave both blank.` };
    }
    if (ends <= starts) {
      return { error: `The ${term} term ends on or before it starts.` };
    }

    rows.push({
      school_id: viewer.schoolId,
      academic_year: year,
      term,
      starts_on: starts,
      ends_on: ends,
      // Only the third term carries this. The first two derive their
      // resumption from the term that follows them.
      next_term_starts_on: term === "third" && resumes ? resumes : null,
    });
  }

  if (rows.length === 0 && cleared.length === 3) {
    return { error: "Set at least one term, or there is nothing to save." };
  }

  // Terms must not overlap: an attendance date inside two windows would be
  // counted on two different report cards.
  const ordered = [...rows].sort((a, b) => a.starts_on.localeCompare(b.starts_on));
  for (let i = 1; i < ordered.length; i++) {
    if (ordered[i].starts_on <= ordered[i - 1].ends_on) {
      return {
        error: `The ${ordered[i - 1].term} and ${ordered[i].term} terms overlap.`,
      };
    }
  }

  const third = rows.find((r) => r.term === "third");
  if (resumes && third && resumes <= third.ends_on) {
    return { error: "The next session cannot begin before the third term ends." };
  }
  if (resumes && !third) {
    return { error: "Set the third term's dates before saying when the next session begins." };
  }

  const supabase = await createClient();

  if (rows.length > 0) {
    const { error } = await supabase
      .from("term_dates")
      .upsert(rows, { onConflict: "school_id,academic_year,term" });
    if (error) return { error: error.message };
  }

  // A term emptied in the form is a term removed, not one left untouched.
  if (cleared.length > 0) {
    const { error } = await supabase
      .from("term_dates")
      .delete()
      .eq("academic_year", year)
      .in("term", cleared);
    if (error) return { error: error.message };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/report-cards");
  return { error: null, ok: true, saved: rows.length };
}

export async function resetGradingScale(): Promise<void> {
  const viewer = await requireViewer();
  if (!viewer.isAdmin) return;

  const supabase = await createClient();
  await supabase.rpc("replace_grade_bands", { p_bands: DEFAULT_BANDS });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/report-cards");
}

export type LogoState = { error: string | null; ok?: boolean; removed?: boolean };

/** The school's own logo, used on report cards.
 *
 *  Stored as an object path rather than a URL: the bucket is private, so links
 *  are signed at read time and expire. Persisting a URL would freeze a link
 *  that outlives the file it points at. */
export async function saveSchoolLogo(
  _prev: LogoState,
  formData: FormData
): Promise<LogoState> {
  const viewer = await requireViewer();
  if (!viewer.isAdmin) {
    return { error: "Only administrators can change the school logo." };
  }

  const supabase = await createClient();

  const { data: school } = await supabase
    .from("schools")
    .select("logo_path")
    .eq("id", viewer.schoolId)
    .single();
  const previous = school?.logo_path ?? null;

  // Removing is its own explicit action, so a logo cannot be cleared by
  // submitting the form without picking a file.
  if (String(formData.get("remove") ?? "") === "true") {
    if (previous) await supabase.storage.from(FILE_BUCKET).remove([previous]);
    await supabase.from("schools").update({ logo_path: null }).eq("id", viewer.schoolId);
    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/report-cards");
    return { error: null, ok: true, removed: true };
  }

  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image file first." };
  }
  if (!IMAGE_TYPES.includes(file.type)) {
    return { error: "Use a JPG, PNG or WebP image." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: `That image is ${formatBytes(file.size)}. Keep it under 2 MB.` };
  }

  const path = buildFilePath(viewer.schoolId, "branding", file.name);
  const { error: uploadError } = await supabase.storage
    .from(FILE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) return { error: uploadError.message };

  const { error } = await supabase
    .from("schools")
    .update({ logo_path: path })
    .eq("id", viewer.schoolId);

  if (error) {
    // The row is the source of truth, so an orphaned object is worse than no
    // upload: it would sit in the bucket referenced by nothing.
    await supabase.storage.from(FILE_BUCKET).remove([path]);
    return { error: error.message };
  }

  // Only once the new path is safely recorded.
  if (previous) await supabase.storage.from(FILE_BUCKET).remove([previous]);

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/report-cards");
  return { error: null, ok: true };
}
