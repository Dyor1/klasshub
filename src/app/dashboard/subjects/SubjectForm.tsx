"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { createSubject, type FormState } from "./actions";
import { ErrorNote, LabelledField, inputClass } from "@/components/ui";

const initial: FormState = { error: null };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-11 shrink-0 rounded-lg bg-brand-gradient px-5 text-sm font-semibold text-white shadow-brand transition-all hover:brightness-110 disabled:opacity-60"
    >
      {pending ? "Saving…" : "Add subject"}
    </button>
  );
}

export default function SubjectForm() {
  const [state, formAction] = useActionState(createSubject, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <ErrorNote message={state.error} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <LabelledField label="Subject name">
            <input name="name" required placeholder="Mathematics" className={inputClass} />
          </LabelledField>
        </div>
        <div className="sm:w-40">
          <LabelledField label="Code">
            <input name="code" placeholder="MTH" className={inputClass} />
          </LabelledField>
        </div>
        <Submit />
      </div>
    </form>
  );
}
