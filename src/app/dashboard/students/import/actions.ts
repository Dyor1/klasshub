"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import type { ImportRow } from "@/lib/csv";
import {
  validateRows,
  capMessage,
  type RowError,
} from "@/lib/student-import";

export type { RowError };

export type ValidationResult = {
  error: string | null;
  ready?: boolean;
  total?: number;
  errors?: RowError[];
  capMessage?: string | null;
  classNames?: string[];
  sample?: { line: number; name: string; admission: string; className: string }[];
};

export type CommitResult = { error: string | null; inserted?: number };

async function context() {
  const supabase = await createClient();
  const [{ data: classes }, { data: existing }, { data: billingRows }] = await Promise.all([
    supabase.from("classes").select("id, name"),
    supabase.from("students").select("admission_number"),
    supabase.rpc("my_school_billing"),
  ]);

  return {
    supabase,
    classByName: new Map((classes ?? []).map((c) => [c.name.toLowerCase().trim(), c.id])),
    classNames: (classes ?? []).map((c) => c.name),
    existingAdmissions: new Set(
      (existing ?? []).map((s) => s.admission_number.toLowerCase())
    ),
    billing: Array.isArray(billingRows) ? billingRows[0] : billingRows,
  };
}

export async function validateImport(rows: ImportRow[]): Promise<ValidationResult> {
  const viewer = await requireViewer();
  if (!viewer.isStaff) return { error: "Only staff can import students." };
  if (rows.length === 0) return { error: "That file has no rows in it." };
  if (rows.length > 2000) {
    return { error: "That is more than 2,000 rows. Split the file and import it in parts." };
  }

  const { classByName, classNames, existingAdmissions, billing } = await context();
  const { errors } = validateRows(rows, classByName, existingAdmissions);
  const cap = capMessage(billing, rows.length);

  return {
    error: null,
    ready: errors.length === 0 && !cap,
    total: rows.length,
    errors: errors.slice(0, 100),
    capMessage: cap,
    classNames,
    sample: rows.slice(0, 8).map((r) => ({
      line: r.line,
      name: [r.surname, r.first_name, r.other_names].filter(Boolean).join(" "),
      admission: r.admission_number,
      className: r.class_name,
    })),
  };
}

export async function commitImport(rows: ImportRow[]): Promise<CommitResult> {
  const viewer = await requireViewer();
  if (!viewer.isStaff) return { error: "Only staff can import students." };

  const { supabase, classByName, existingAdmissions, billing } = await context();

  // Re-validated here, not trusted from the preview: the browser could send
  // anything, and the roll may have changed since the dry run.
  const { errors, prepared } = validateRows(rows, classByName, existingAdmissions);
  if (errors.length > 0) {
    return { error: `${errors.length} row${errors.length === 1 ? "" : "s"} still have problems. Check the file again.` };
  }
  const cap = capMessage(billing, rows.length);
  if (cap) return { error: cap };

  // One statement, so it is one transaction: either the whole roll lands or
  // none of it does. A half-imported roll is worse than a rejected one —
  // nobody can tell which half is missing.
  const { error, count } = await supabase
    .from("students")
    .insert(prepared.map((p) => ({ ...p, school_id: viewer.schoolId })), { count: "exact" });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/students");
  revalidatePath("/dashboard/billing");
  return { error: null, inserted: count ?? prepared.length };
}
