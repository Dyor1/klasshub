"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { createExam, type CbtState } from "./actions";
import { ErrorNote, LabelledField, inputClass, btnPrimary, btnGhost } from "@/components/ui";

const initial: CbtState = { error: null };

const TERMS = [
  { value: "first", label: "First Term" },
  { value: "second", label: "Second Term" },
  { value: "third", label: "Third Term" },
];

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={btnPrimary}>
      {pending ? "Creating…" : "Create exam"}
    </button>
  );
}

export default function ExamForm({
  classes,
  subjects,
  defaultYear,
}: {
  classes: { id: string; name: string }[];
  subjects: { id: string; name: string }[];
  defaultYear: string;
}) {
  const [state, formAction] = useActionState(createExam, initial);
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
        New exam
      </button>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <ErrorNote message={state.error} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LabelledField label="Title">
            <input name="title" required placeholder="Mathematics Quiz 1" className={inputClass} />
          </LabelledField>
        </div>
        <LabelledField label="Duration (minutes)">
          <input
            name="duration_minutes"
            type="number"
            min={1}
            max={600}
            defaultValue={30}
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
        <div className="lg:col-span-2">
          <LabelledField label="Instructions">
            <input name="instructions" placeholder="Optional" className={inputClass} />
          </LabelledField>
        </div>
        <div className="flex items-end pb-1">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input
              name="shuffle_questions"
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300"
            />
            Shuffle question order
          </label>
        </div>
      </div>

      <div className="flex gap-2">
        <Submit />
        <button type="button" onClick={() => setOpen(false)} className={btnGhost}>
          Cancel
        </button>
      </div>

      <p className="text-xs text-slate-400">
        Exams start as drafts. Add questions, then publish when you&apos;re ready
        for the class to sit it.
      </p>
    </form>
  );
}
