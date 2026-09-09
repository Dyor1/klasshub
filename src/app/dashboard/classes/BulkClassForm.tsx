"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createClassesBulk, type BulkState } from "./actions";
import { ErrorNote, SuccessNote, inputClass } from "@/components/ui";

const initial: BulkState = { error: null };

function Save() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-11 rounded-xl bg-brand-gradient px-5 text-sm font-semibold text-white shadow-brand transition-all hover:brightness-110 disabled:opacity-60"
    >
      {pending ? "Creating…" : "Create classes"}
    </button>
  );
}

export default function BulkClassForm({ defaultYear }: { defaultYear: string }) {
  const [state, formAction] = useActionState(createClassesBulk, initial);

  return (
    <form action={formAction} className="space-y-4">
      <ErrorNote message={state.error} />

      {state.created !== undefined && (
        <SuccessNote>
          {state.created > 0
            ? `Created ${state.created} class${state.created === 1 ? "" : "es"}.`
            : "Nothing new to create."}
          {state.skipped && state.skipped.length > 0 && (
            <>
              {" "}
              Skipped {state.skipped.length} that already exist for this session:{" "}
              <span className="font-semibold">{state.skipped.join(", ")}</span>.
            </>
          )}
        </SuccessNote>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-muted">
            Grade level
          </span>
          <input name="grade_level" required placeholder="JSS 1" className={inputClass} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-muted">Arms</span>
          <input name="arms" placeholder="A, B, C" className={inputClass} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-muted">Session</span>
          <input
            name="academic_year"
            required
            defaultValue={defaultYear}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-muted">
            Capacity <span className="text-ink-subtle">(optional)</span>
          </span>
          <input name="capacity" type="number" min={1} placeholder="30" className={inputClass} />
        </label>
      </div>

      <p className="text-xs text-ink-subtle">
        &ldquo;JSS 1&rdquo; with arms &ldquo;A, B, C&rdquo; creates JSS 1A, JSS 1B
        and JSS 1C. Leave arms empty for a single class. Names that already exist
        in this session are skipped — a class of the same name in a different
        session is not a clash.
      </p>

      <Save />
    </form>
  );
}
