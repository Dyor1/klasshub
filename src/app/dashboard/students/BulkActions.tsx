"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { moveStudentsBulk, type BulkMoveState } from "./actions";
import { ErrorNote, SuccessNote, inputClass } from "@/components/ui";

const initial: BulkMoveState = { error: null };

/** The id the row checkboxes point at with their `form` attribute.
 *
 *  They cannot be nested inside this form: each row already contains a delete
 *  form, and a form inside a form is invalid HTML that browsers silently
 *  discard. HTML's `form="…"` attribute lets an input belong to a form
 *  elsewhere in the document, which keeps the table server-rendered and the
 *  delete buttons working. */
export const BULK_FORM_ID = "student-bulk-move";

function Apply({ count }: { count: number }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || count === 0}
      className="h-11 rounded-2xl bg-brand-gradient px-5 text-sm font-semibold text-white kh-clay-brand kh-clay-press transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Applying…" : count === 0 ? "Select students" : `Apply to ${count}`}
    </button>
  );
}

export default function BulkActions({
  classes,
}: {
  classes: { id: string; name: string }[];
}) {
  const [state, formAction] = useActionState(moveStudentsBulk, initial);
  const [count, setCount] = useState(0);

  // The checkboxes live in the table, not in this component, so the count is
  // read from the document rather than from React state. Listening on the
  // document keeps this working however the table is re-rendered.
  useEffect(() => {
    const recount = () => {
      const boxes = document.querySelectorAll<HTMLInputElement>(
        `input[form="${BULK_FORM_ID}"][name="student_id"]`
      );
      setCount([...boxes].filter((b) => b.checked).length);
    };
    recount();
    document.addEventListener("change", recount);
    return () => document.removeEventListener("change", recount);
  }, [state]);

  return (
    <form
      id={BULK_FORM_ID}
      action={formAction}
      className="mb-4 rounded-2xl border border-line-soft bg-card p-4 kh-clay"
    >
      <ErrorNote message={state.error} />
      {state.moved !== undefined && (
        <SuccessNote>
          Updated {state.moved} student{state.moved === 1 ? "" : "s"}.
          {state.note ? ` ${state.note}` : ""}
        </SuccessNote>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-44">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
            Move to class
          </span>
          <select name="target_class" defaultValue="" className={`${inputClass} h-11`}>
            <option value="">Leave class unchanged</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            {/* An explicit choice, so clearing a class can never happen by
                leaving the dropdown alone. */}
            <option value="unassign">— Remove from class —</option>
          </select>
        </label>

        <label className="min-w-40">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
            Set status
          </span>
          <select name="target_status" defaultValue="" className={`${inputClass} h-11`}>
            <option value="">Leave status unchanged</option>
            <option value="active">Active</option>
            <option value="graduated">Graduated</option>
            <option value="withdrawn">Withdrawn</option>
            <option value="suspended">Suspended</option>
          </select>
        </label>

        <Apply count={count} />

        <p className="text-sm text-ink-muted">
          {count === 0
            ? "Tick students in the list below."
            : `${count} selected.`}
        </p>
      </div>
    </form>
  );
}

/** Ticks or clears every checkbox currently rendered.
 *
 *  "Every rendered row" is the honest scope: with a filter on, the list is a
 *  subset, and selecting rows the user cannot see would be a surprising way to
 *  graduate a year group. */
export function SelectAll() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const boxes = document.querySelectorAll<HTMLInputElement>(
      `input[form="${BULK_FORM_ID}"][name="student_id"]`
    );
    const allChecked = boxes.length > 0 && [...boxes].every((b) => b.checked);
    if (allChecked !== on) setOn(allChecked);
    // Only mirrors the row state; the toggle itself is handled below.
  }, [on]);

  return (
    <input
      type="checkbox"
      aria-label="Select all students shown"
      checked={on}
      onChange={(e) => {
        const next = e.target.checked;
        setOn(next);
        document
          .querySelectorAll<HTMLInputElement>(
            `input[form="${BULK_FORM_ID}"][name="student_id"]`
          )
          .forEach((b) => {
            b.checked = next;
          });
        document.dispatchEvent(new Event("change", { bubbles: true }));
      }}
      className="h-4 w-4 rounded border-line accent-brand-500"
    />
  );
}
