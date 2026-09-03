"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { sendFeeReminders, type ReminderState } from "./actions";
import { ErrorNote, inputClass, btnPrimary } from "@/components/ui";

const initial: ReminderState = { error: null };

const TERMS = [
  { value: "first", label: "First Term" },
  { value: "second", label: "Second Term" },
  { value: "third", label: "Third Term" },
];

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={btnPrimary}>
      {pending ? "Sending…" : "Send reminders"}
    </button>
  );
}

export default function ReminderForm({ defaultYear }: { defaultYear: string }) {
  const [state, formAction] = useActionState(sendFeeReminders, initial);

  return (
    <form action={formAction} className="space-y-4">
      <ErrorNote message={state.error} />
      {state.ok && state.message && (
        <p className="rounded-lg border border-emerald-500/35 bg-emerald-500/12 px-3.5 py-2.5 text-sm text-emerald-800 dark:text-emerald-200">
          {state.message}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-muted">Term</span>
          <select name="term" defaultValue="first" className={inputClass}>
            {TERMS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-muted">Session</span>
          <input name="academic_year" defaultValue={defaultYear} className={inputClass} />
        </label>
        <Submit />
      </div>

      <p className="text-xs text-ink-subtle">
        Notifies the student and every linked guardian of anyone with an
        outstanding balance. Nobody who has paid in full is contacted.
      </p>
    </form>
  );
}
