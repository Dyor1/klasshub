"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { savePassMark, type ScaleState } from "./actions";
import { ErrorNote, SuccessNote, inputClass } from "@/components/ui";

const initial: ScaleState = { error: null };

function Save() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-11 rounded-xl bg-brand-gradient px-5 text-sm font-semibold text-white shadow-brand transition-all hover:brightness-110 disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save"}
    </button>
  );
}

export default function PassMarkForm({ passMark }: { passMark: number }) {
  const [state, formAction] = useActionState(savePassMark, initial);

  return (
    <form action={formAction} className="space-y-4">
      <ErrorNote message={state.error} />
      {state.ok && <SuccessNote>Pass mark saved.</SuccessNote>}

      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-muted">
            Pass mark (%)
          </span>
          <input
            name="pass_mark"
            type="number"
            min={0}
            max={100}
            step="0.5"
            defaultValue={passMark}
            className={`${inputClass} w-32`}
          />
        </label>
        <Save />
      </div>
    </form>
  );
}
