"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createSubjectsBulk, type BulkState } from "./actions";
import { ErrorNote, SuccessNote } from "@/components/ui";

const initial: BulkState = { error: null };

function Save() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-11 rounded-xl bg-brand-gradient px-5 text-sm font-semibold text-white shadow-brand transition-all hover:brightness-110 disabled:opacity-60"
    >
      {pending ? "Adding…" : "Add all"}
    </button>
  );
}

export default function BulkSubjectForm() {
  const [state, formAction] = useActionState(createSubjectsBulk, initial);

  return (
    <form action={formAction} className="space-y-4">
      <ErrorNote message={state.error} />

      {state.created !== undefined && (
        <SuccessNote>
          {state.created > 0
            ? `Added ${state.created} subject${state.created === 1 ? "" : "s"}.`
            : "Nothing new to add."}
          {state.skipped && state.skipped.length > 0 && (
            <>
              {" "}
              Skipped {state.skipped.length} already on the list:{" "}
              <span className="font-semibold">{state.skipped.join(", ")}</span>.
            </>
          )}
        </SuccessNote>
      )}

      <label className="block">
        <span className="mb-1.5 block text-[13px] font-semibold text-ink">
          One subject per line
        </span>
        <textarea
          name="bulk"
          rows={8}
          required
          placeholder={"Mathematics, MTH\nEnglish Language, ENG\nBasic Science\nCivic Education"}
          className="w-full rounded-xl border border-line bg-card px-4 py-3 font-mono text-sm leading-relaxed text-ink transition-all placeholder:text-ink-subtle focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/12"
        />
        <span className="mt-1.5 block text-xs text-ink-subtle">
          A code after a comma or tab is optional. Numbering, bullets and blank
          lines are ignored, so a list pasted straight out of a document works.
          Subjects already on the list are skipped and named back to you.
        </span>
      </label>

      <Save />
    </form>
  );
}
