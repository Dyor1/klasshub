"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { linkGuardian, type LinkState } from "./actions";
import { ErrorNote, LabelledField, inputClass, btnPrimary } from "@/components/ui";

const initial: LinkState = { error: null };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={btnPrimary}>
      {pending ? "Linking…" : "Link guardian"}
    </button>
  );
}

export default function LinkForm({
  students,
  parents,
}: {
  students: { id: string; label: string }[];
  parents: { id: string; label: string }[];
}) {
  const [state, formAction] = useActionState(linkGuardian, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  if (parents.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No parent accounts yet. Invite a parent from the Team page first — they
        appear here once they accept.
      </p>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <ErrorNote message={state.error} />

      <div className="grid gap-4 sm:grid-cols-3">
        <LabelledField label="Student">
          <select name="student_id" required defaultValue="" className={inputClass}>
            <option value="">Select…</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </LabelledField>
        <LabelledField label="Parent account">
          <select name="profile_id" required defaultValue="" className={inputClass}>
            <option value="">Select…</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </LabelledField>
        <LabelledField label="Relationship">
          <select name="relationship" defaultValue="" className={inputClass}>
            <option value="">Not specified</option>
            <option value="Mother">Mother</option>
            <option value="Father">Father</option>
            <option value="Guardian">Guardian</option>
          </select>
        </LabelledField>
      </div>

      <Submit />
    </form>
  );
}
