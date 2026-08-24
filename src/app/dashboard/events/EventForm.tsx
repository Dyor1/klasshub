"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { createEvent, type EventState } from "./actions";
import { ErrorNote, LabelledField, inputClass, btnPrimary, btnGhost } from "@/components/ui";

const initial: EventState = { error: null };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={btnPrimary}>
      {pending ? "Saving…" : "Add event"}
    </button>
  );
}

export default function EventForm() {
  const [state, formAction] = useActionState(createEvent, initial);
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
        Add event
      </button>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <ErrorNote message={state.error} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <LabelledField label="Title">
            <input name="title" required placeholder="Inter-house Sports" className={inputClass} />
          </LabelledField>
        </div>
        <LabelledField label="Date">
          <input name="event_date" type="date" required className={inputClass} />
        </LabelledField>
        <LabelledField label="Time">
          <input name="event_time" type="time" className={inputClass} />
        </LabelledField>
        <div className="lg:col-span-2">
          <LabelledField label="Location">
            <input name="location" placeholder="School field" className={inputClass} />
          </LabelledField>
        </div>
        <div className="lg:col-span-2">
          <LabelledField label="Description">
            <input name="description" placeholder="Optional" className={inputClass} />
          </LabelledField>
        </div>
      </div>

      <div className="flex gap-2">
        <Submit />
        <button type="button" onClick={() => setOpen(false)} className={btnGhost}>
          Cancel
        </button>
      </div>
    </form>
  );
}
