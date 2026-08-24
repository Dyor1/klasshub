"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { assignRider, type AssignState } from "./actions";
import { ErrorNote, LabelledField, inputClass, btnPrimary } from "@/components/ui";

const initial: AssignState = { error: null };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={btnPrimary}>
      {pending ? "Assigning…" : "Assign rider"}
    </button>
  );
}

export default function AssignForm({
  students,
  routes,
}: {
  students: { id: string; label: string }[];
  routes: { id: string; name: string; pickup_points: string[] }[];
}) {
  const [state, formAction] = useActionState(assignRider, initial);
  const [routeId, setRouteId] = useState(routes[0]?.id ?? "");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  const points = routes.find((r) => r.id === routeId)?.pickup_points ?? [];

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

        <LabelledField label="Route">
          <select
            name="route_id"
            required
            value={routeId}
            onChange={(e) => setRouteId(e.target.value)}
            className={inputClass}
          >
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </LabelledField>

        <LabelledField label="Pickup point">
          {points.length > 0 ? (
            <select name="pickup_point" defaultValue="" className={inputClass}>
              <option value="">Not set</option>
              {points.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          ) : (
            <input name="pickup_point" placeholder="e.g. Lotto" className={inputClass} />
          )}
        </LabelledField>
      </div>

      <Submit />
    </form>
  );
}
