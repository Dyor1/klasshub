"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  addFeeItem,
  raiseInvoices,
  recordPayment,
  type FeeState,
} from "./actions";
import { ErrorNote, LabelledField, inputClass, btnPrimary, btnGhost } from "@/components/ui";

const initial: FeeState = { error: null };

const TERMS = [
  { value: "first", label: "First Term" },
  { value: "second", label: "Second Term" },
  { value: "third", label: "Third Term" },
];

function Submit({ label, busyLabel }: { label: string; busyLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={btnPrimary}>
      {pending ? busyLabel : label}
    </button>
  );
}

function Note({ state }: { state: FeeState }) {
  if (state.error) return <ErrorNote message={state.error} />;
  if (state.ok && state.message)
    return (
      <p className="rounded-lg border border-emerald-500/35 bg-emerald-500/12 px-3.5 py-2.5 text-sm text-emerald-800 dark:text-emerald-200">
        {state.message}
      </p>
    );
  return null;
}

/* ------------------------------------------------------------------ fee item */

export function FeeItemForm({
  classes,
  term,
  academicYear,
}: {
  classes: { id: string; name: string }[];
  term: string;
  academicYear: string;
}) {
  const [state, formAction] = useActionState(addFeeItem, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <input type="hidden" name="term" value={term} />
      <input type="hidden" name="academic_year" value={academicYear} />
      <Note state={state} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <LabelledField label="Item">
          <input name="name" required placeholder="Tuition" className={inputClass} />
        </LabelledField>
        <LabelledField label="Amount (₦)">
          <input
            name="amount"
            type="number"
            min={0}
            step="0.01"
            required
            placeholder="50000"
            className={inputClass}
          />
        </LabelledField>
        <LabelledField label="Applies to">
          <select name="class_id" defaultValue="" className={inputClass}>
            <option value="">Every class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </LabelledField>
        <div className="flex items-end pb-1">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-muted">
            <input name="is_optional" type="checkbox" className="h-4 w-4 rounded border-line-strong" />
            Optional levy
          </label>
        </div>
      </div>

      <Submit label="Add fee item" busyLabel="Adding…" />
      <p className="text-xs text-ink-subtle">
        Optional levies are left off generated invoices — add them per student
        when a parent opts in.
      </p>
    </form>
  );
}

/* ----------------------------------------------------------------- invoicing */

export function RaiseInvoicesForm({
  classes,
  term,
  academicYear,
}: {
  classes: { id: string; name: string }[];
  term: string;
  academicYear: string;
}) {
  const [state, formAction] = useActionState(raiseInvoices, initial);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="term" value={term} />
      <input type="hidden" name="academic_year" value={academicYear} />
      <Note state={state} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <LabelledField label="Class to bill">
            <select name="class_id" required defaultValue="" className={inputClass}>
              <option value="">Select…</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </LabelledField>
        </div>
        <Submit label="Raise invoices" busyLabel="Raising…" />
      </div>

      <p className="text-xs text-ink-subtle">
        Safe to re-run — students already billed for this term are skipped, not
        billed twice.
      </p>
    </form>
  );
}

/* ------------------------------------------------------------------ payment */

export function PaymentForm({
  invoiceId,
  studentName,
  balance,
}: {
  invoiceId: string;
  studentName: string;
  balance: number;
}) {
  const [state, formAction] = useActionState(recordPayment, initial);
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setOpen(false);
    }
  }, [state.ok]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-hover"
      >
        Record payment
      </button>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="w-full space-y-3 sm:w-auto">
      <input type="hidden" name="invoice_id" value={invoiceId} />
      <Note state={state} />

      <p className="text-xs text-ink-muted">
        {studentName} owes{" "}
        <span className="font-semibold text-ink">
          ₦{balance.toLocaleString()}
        </span>
      </p>

      <div className="flex flex-wrap items-end gap-2">
        <input
          name="amount"
          type="number"
          min={1}
          max={balance}
          step="0.01"
          required
          placeholder="Amount"
          className="h-10 w-32 rounded-lg border border-line px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
        />
        <select
          name="method"
          defaultValue="transfer"
          className="h-10 rounded-lg border border-line bg-card px-3 text-sm"
        >
          <option value="transfer">Transfer</option>
          <option value="cash">Cash</option>
          <option value="pos">POS</option>
          <option value="online">Online</option>
          <option value="cheque">Cheque</option>
          <option value="waiver">Waiver</option>
        </select>
        <input
          name="reference"
          placeholder="Ref (optional)"
          className="h-10 w-32 rounded-lg border border-line px-3 text-sm"
        />
        <Submit label="Save" busyLabel="Saving…" />
        <button type="button" onClick={() => setOpen(false)} className={btnGhost}>
          Cancel
        </button>
      </div>
    </form>
  );
}
