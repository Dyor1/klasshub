"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { createAssignment, type HwState } from "./actions";
import { ErrorNote, LabelledField, inputClass, btnPrimary, btnGhost } from "@/components/ui";

const initial: HwState = { error: null };

const TERMS = [
  { value: "first", label: "First Term" },
  { value: "second", label: "Second Term" },
  { value: "third", label: "Third Term" },
];

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={btnPrimary}>
      {pending ? "Saving…" : "Set assignment"}
    </button>
  );
}

export default function AssignmentForm({
  classes,
  subjects,
  defaultYear,
}: {
  classes: { id: string; name: string }[];
  subjects: { id: string; name: string }[];
  defaultYear: string;
}) {
  const [state, formAction] = useActionState(createAssignment, initial);
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
      <button onClick={() => setOpen(true)} className={btnPrimary}>
        Set assignment
      </button>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <ErrorNote message={state.error} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LabelledField label="Title">
            <input name="title" required placeholder="Essay on Lagos" className={inputClass} />
          </LabelledField>
        </div>
        <LabelledField label="Marked out of">
          <input
            name="max_score"
            type="number"
            min={1}
            step="0.5"
            defaultValue={10}
            required
            className={inputClass}
          />
        </LabelledField>
        <LabelledField label="Class">
          <select name="class_id" required defaultValue="" className={inputClass}>
            <option value="">Select…</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </LabelledField>
        <LabelledField label="Subject">
          <select name="subject_id" defaultValue="" className={inputClass}>
            <option value="">Not specified</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </LabelledField>
        <LabelledField label="Due" hint="Late submissions are flagged automatically.">
          <input name="due_at" type="datetime-local" className={inputClass} />
        </LabelledField>
        <LabelledField label="Term">
          <select name="term" defaultValue="first" className={inputClass}>
            {TERMS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </LabelledField>
        <LabelledField label="Session">
          <input name="academic_year" required defaultValue={defaultYear} className={inputClass} />
        </LabelledField>
      </div>

      <LabelledField label="Instructions">
        <textarea
          name="instructions"
          rows={3}
          placeholder="What should students do?"
          className="w-full rounded-lg border border-line px-3.5 py-2.5 text-sm placeholder:text-ink-subtle focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
        />
      </LabelledField>

      <div className="flex flex-wrap gap-5">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-muted">
          <input name="allow_text" type="checkbox" defaultChecked className="h-4 w-4 rounded border-line-strong" />
          Allow typed answer
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-muted">
          <input name="allow_file" type="checkbox" defaultChecked className="h-4 w-4 rounded border-line-strong" />
          Allow file upload
        </label>
      </div>

      <div className="flex gap-2">
        <Submit />
        <button type="button" onClick={() => setOpen(false)} className={btnGhost}>
          Cancel
        </button>
      </div>

      <p className="text-xs text-ink-subtle">
        Assignments start as drafts — students see nothing until you publish.
      </p>
    </form>
  );
}
