"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import type { Database } from "@/lib/supabase/database.types";

type Term = Database["public"]["Enums"]["term"];
type Method = Database["public"]["Enums"]["payment_method"];

export type FeeState = { error: string | null; ok?: boolean; message?: string };

const METHODS: Method[] = ["cash", "transfer", "pos", "online", "cheque", "waiver"];

export async function addFeeItem(
  _prev: FeeState,
  formData: FormData
): Promise<FeeState> {
  const viewer = await requireViewer();
  if (!viewer.isAdmin) return { error: "Only administrators can set fees." };

  const name = String(formData.get("name") ?? "").trim();
  const amount = Number(formData.get("amount") ?? 0);
  const term = String(formData.get("term") ?? "") as Term;
  const academicYear = String(formData.get("academic_year") ?? "").trim();
  const classId = String(formData.get("class_id") ?? "").trim();
  const isOptional = String(formData.get("is_optional") ?? "") === "on";

  if (!name || !term || !academicYear) {
    return { error: "Name, term and session are required." };
  }
  if (!Number.isFinite(amount) || amount < 0) {
    return { error: "Amount must be zero or more." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("fee_items").insert({
    school_id: viewer.schoolId,
    class_id: classId || null,
    name,
    amount,
    term,
    academic_year: academicYear,
    is_optional: isOptional,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/fees");
  return { error: null, ok: true };
}

export async function deleteFeeItem(formData: FormData) {
  const viewer = await requireViewer();
  if (!viewer.isAdmin) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("fee_items").delete().eq("id", id);
  revalidatePath("/dashboard/fees");
}

/** Raises invoices for a class. The heavy lifting is a single SQL function so
 *  a partial run can't leave half a class billed. */
export async function raiseInvoices(
  _prev: FeeState,
  formData: FormData
): Promise<FeeState> {
  const viewer = await requireViewer();
  if (!viewer.isAdmin) return { error: "Only administrators can raise invoices." };

  const classId = String(formData.get("class_id") ?? "");
  const term = String(formData.get("term") ?? "") as Term;
  const academicYear = String(formData.get("academic_year") ?? "").trim();

  if (!classId || !term || !academicYear) {
    return { error: "Pick a class, term and session." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("generate_invoices", {
    p_class_id: classId,
    p_term: term,
    p_academic_year: academicYear,
  });

  if (error) return { error: error.message };

  const row = Array.isArray(data) ? data[0] : data;
  const created = row?.created ?? 0;
  const skipped = row?.skipped ?? 0;

  revalidatePath("/dashboard/fees");
  return {
    error: null,
    ok: true,
    message:
      created === 0
        ? `No new invoices — all ${skipped} student${skipped === 1 ? "" : "s"} already billed for this term.`
        : `Raised ${created} invoice${created === 1 ? "" : "s"}${skipped ? `, skipped ${skipped} already billed` : ""}.`,
  };
}

export async function recordPayment(
  _prev: FeeState,
  formData: FormData
): Promise<FeeState> {
  const viewer = await requireViewer();
  if (!viewer.isAdmin) return { error: "Only administrators can record payments." };

  const invoiceId = String(formData.get("invoice_id") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  const method = String(formData.get("method") ?? "transfer") as Method;
  const reference = String(formData.get("reference") ?? "").trim();

  if (!invoiceId) return { error: "Which invoice is this against?" };
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Enter an amount greater than zero." };
  }
  if (!METHODS.includes(method)) return { error: "Pick a valid payment method." };

  const supabase = await createClient();

  // Read the balance first so an overpayment is refused with a useful message
  // rather than quietly producing a negative balance.
  const { data: inv } = await supabase
    .from("invoice_balances")
    .select("student_id, balance")
    .eq("id", invoiceId)
    .single();

  if (!inv) return { error: "That invoice could not be found." };
  if (Number(inv.balance) <= 0) return { error: "That invoice is already settled." };
  if (amount > Number(inv.balance)) {
    return {
      error: `That is more than the outstanding balance of ₦${Number(inv.balance).toLocaleString()}.`,
    };
  }

  const { error } = await supabase.from("payments").insert({
    school_id: viewer.schoolId,
    invoice_id: invoiceId,
    student_id: inv.student_id,
    amount,
    method,
    reference: reference || null,
    recorded_by: viewer.id,
    receipt_no: "",
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/fees");
  return { error: null, ok: true, message: `Recorded ₦${amount.toLocaleString()}.` };
}
