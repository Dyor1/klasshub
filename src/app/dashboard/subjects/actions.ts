"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import { parseLines, parseNameAndCode } from "@/lib/bulk";

export type FormState = { error: string | null; ok?: boolean };

export async function createSubject(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const viewer = await requireViewer();
  if (!viewer.isStaff) return { error: "Only staff can add subjects." };

  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  if (!name) return { error: "Subject name is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("subjects").insert({
    school_id: viewer.schoolId,
    name,
    code: code || null,
  });

  if (error) {
    if (error.code === "23505") return { error: `“${name}” already exists.` };
    return { error: error.message };
  }

  revalidatePath("/dashboard/subjects");
  return { error: null, ok: true };
}

export async function deleteSubject(formData: FormData) {
  const viewer = await requireViewer();
  if (!viewer.isStaff) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("subjects").delete().eq("id", id);
  revalidatePath("/dashboard/subjects");
}

export type BulkState = {
  error: string | null;
  created?: number;
  skipped?: string[];
};

/** Adds many subjects from a pasted list.
 *
 *  Reports what it skipped rather than just what it created. A bulk form that
 *  says "12 added" when it quietly dropped four already-present names leaves
 *  someone to discover the gap when a result cannot be recorded, and by then
 *  the paste is gone. */
export async function createSubjectsBulk(
  _prev: BulkState,
  formData: FormData
): Promise<BulkState> {
  const viewer = await requireViewer();
  if (!viewer.isStaff) return { error: "Only staff can add subjects." };

  const lines = parseLines(String(formData.get("bulk") ?? ""));
  if (lines.length === 0) {
    return { error: "Paste at least one subject, one per line." };
  }
  if (lines.length > 200) {
    return { error: `That is ${lines.length} subjects. Add at most 200 at a time.` };
  }

  const parsed = lines.map(parseNameAndCode).filter((p) => p.name.length > 0);

  const supabase = await createClient();

  // Existing names are read first so a clash can be named. Relying on the
  // unique constraint instead would abort the whole insert on the first
  // duplicate and create nothing.
  const { data: existing } = await supabase.from("subjects").select("name");
  const taken = new Set((existing ?? []).map((s) => s.name.toLowerCase()));

  const fresh = parsed.filter((p) => !taken.has(p.name.toLowerCase()));
  const skipped = parsed
    .filter((p) => taken.has(p.name.toLowerCase()))
    .map((p) => p.name);

  if (fresh.length === 0) {
    return { error: null, created: 0, skipped };
  }

  const { error } = await supabase.from("subjects").insert(
    fresh.map((p) => ({
      school_id: viewer.schoolId,
      name: p.name,
      code: p.code,
    }))
  );

  if (error) return { error: error.message };

  revalidatePath("/dashboard/subjects");
  return { error: null, created: fresh.length, skipped };
}
