"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { createClass, type FormState } from "./actions";
import { ErrorNote, LabelledField, inputClass } from "@/components/ui";

const initial: FormState = { error: null };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-11 rounded-lg bg-brand-gradient px-5 text-sm font-semibold text-white shadow-brand transition-all hover:brightness-110 disabled:opacity-60"
    >
      {pending ? "Saving…" : "Add class"}
    </button>
  );
}

export default function ClassForm({
  teachers,
  defaultYear,
}: {
  teachers: { id: string; full_name: string | null }[];
  defaultYear: string;
}) {
  const [state, formAction] = useActionState(createClass, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <ErrorNote message={state.error} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <LabelledField label="Class name">
          <input name="name" required placeholder="JSS 1A" className={inputClass} />
        </LabelledField>
        <LabelledField label="Grade level">
          <input name="grade_level" required placeholder="JSS1" className={inputClass} />
        </LabelledField>
        <LabelledField label="Section">
          <input name="section" placeholder="A (optional)" className={inputClass} />
        </LabelledField>
        <LabelledField label="Session">
          <input
            name="academic_year"
            required
            defaultValue={defaultYear}
            placeholder="2026/2027"
            className={inputClass}
          />
        </LabelledField>
        <LabelledField label="Capacity">
          <input
            name="capacity"
            type="number"
            min={1}
            placeholder="Optional"
            className={inputClass}
          />
        </LabelledField>
        <LabelledField label="Class teacher">
          <select name="class_teacher_id" defaultValue="" className={inputClass}>
            <option value="">Unassigned</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name ?? "Unnamed"}
              </option>
            ))}
          </select>
        </LabelledField>
      </div>

      <Submit />
    </form>
  );
}
