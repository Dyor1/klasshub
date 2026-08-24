"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { createRoute, type RouteState } from "./actions";
import { ErrorNote, LabelledField, inputClass, btnPrimary, btnGhost } from "@/components/ui";

const initial: RouteState = { error: null };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={btnPrimary}>
      {pending ? "Saving…" : "Add route"}
    </button>
  );
}

export default function RouteForm() {
  const [state, formAction] = useActionState(createRoute, initial);
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
        Add route
      </button>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <ErrorNote message={state.error} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <LabelledField label="Route name">
          <input name="name" required placeholder="Mowe Route" className={inputClass} />
        </LabelledField>
        <LabelledField label="Vehicle number">
          <input name="vehicle_number" placeholder="ABC-123XY" className={inputClass} />
        </LabelledField>
        <LabelledField label="Capacity">
          <input name="capacity" type="number" min={1} placeholder="Optional" className={inputClass} />
        </LabelledField>
        <LabelledField label="Driver name">
          <input name="driver_name" placeholder="Mr Danjuma" className={inputClass} />
        </LabelledField>
        <LabelledField label="Driver phone">
          <input name="driver_phone" placeholder="080…" className={inputClass} />
        </LabelledField>
        <LabelledField label="Pickup points" hint="Separate with commas.">
          <input name="pickup_points" placeholder="Lotto, Simawa, Ibafo" className={inputClass} />
        </LabelledField>
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
