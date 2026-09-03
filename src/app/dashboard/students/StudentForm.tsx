"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { createStudent, type FormState } from "./actions";
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
      {pending ? "Saving…" : "Enrol student"}
    </button>
  );
}

export default function StudentForm({
  classes,
}: {
  classes: { id: string; name: string; academic_year: string }[];
}) {
  const [state, formAction] = useActionState(createStudent, initial);
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
        className="h-11 rounded-lg bg-brand-gradient px-5 text-sm font-semibold text-white shadow-brand transition-all hover:brightness-110"
      >
        Enrol a student
      </button>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <ErrorNote message={state.error} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <LabelledField label="Admission number">
          <input name="admission_number" required placeholder="ADM-001" className={inputClass} />
        </LabelledField>
        <LabelledField label="Surname">
          <input name="surname" required placeholder="Okafor" className={inputClass} />
        </LabelledField>
        <LabelledField label="First name">
          <input name="first_name" required placeholder="Chidinma" className={inputClass} />
        </LabelledField>
        <LabelledField label="Other names">
          <input name="other_names" placeholder="Optional" className={inputClass} />
        </LabelledField>
        <LabelledField label="Gender">
          <select name="gender" defaultValue="" className={inputClass}>
            <option value="">Not specified</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
        </LabelledField>
        <LabelledField label="Date of birth">
          <input name="date_of_birth" type="date" className={inputClass} />
        </LabelledField>
        <LabelledField label="Class">
          <select name="class_id" defaultValue="" className={inputClass}>
            <option value="">Unassigned</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.academic_year})
              </option>
            ))}
          </select>
        </LabelledField>
        <LabelledField label="Guardian name">
          <input name="guardian_name" placeholder="Mrs Okafor" className={inputClass} />
        </LabelledField>
        <LabelledField label="Guardian phone">
          <input name="guardian_phone" placeholder="080…" className={inputClass} />
        </LabelledField>
        <LabelledField label="Guardian email">
          <input name="guardian_email" type="email" placeholder="Optional" className={inputClass} />
        </LabelledField>
      </div>

      <div className="flex gap-2">
        <Submit />
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="h-11 rounded-lg px-5 text-sm font-semibold text-ink-muted hover:bg-hover"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
