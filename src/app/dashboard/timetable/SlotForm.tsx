"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { addSlot, type SlotState } from "./actions";
import { ErrorNote, LabelledField, inputClass, btnPrimary, btnGhost } from "@/components/ui";

const initial: SlotState = { error: null };

const DAYS = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
];

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={btnPrimary}>
      {pending ? "Adding…" : "Add period"}
    </button>
  );
}

export default function SlotForm({
  classId,
  academicYear,
  subjects,
  teachers,
}: {
  classId: string;
  academicYear: string;
  subjects: { id: string; name: string }[];
  teachers: { id: string; full_name: string | null }[];
}) {
  const [state, formAction] = useActionState(addSlot, initial);
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className={btnPrimary}>
        Add period
      </button>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <input type="hidden" name="class_id" value={classId} />
      <input type="hidden" name="academic_year" value={academicYear} />
      <ErrorNote message={state.error} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <LabelledField label="Day">
          <select name="day_of_week" defaultValue="monday" className={inputClass}>
            {DAYS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </LabelledField>
        <LabelledField label="Starts">
          <input name="start_time" type="time" required defaultValue="08:00" className={inputClass} />
        </LabelledField>
        <LabelledField label="Ends">
          <input name="end_time" type="time" required defaultValue="08:45" className={inputClass} />
        </LabelledField>
        <LabelledField label="Subject">
          <select name="subject_id" defaultValue="" className={inputClass}>
            <option value="">None (e.g. break)</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </LabelledField>
        <LabelledField label="Teacher">
          <select name="teacher_id" defaultValue="" className={inputClass}>
            <option value="">Unassigned</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name ?? "Unnamed"}
              </option>
            ))}
          </select>
        </LabelledField>
        <LabelledField label="Room">
          <input name="room" placeholder="Optional" className={inputClass} />
        </LabelledField>
        <LabelledField label="Label">
          <input name="period_label" placeholder="e.g. Break" className={inputClass} />
        </LabelledField>
      </div>

      <div className="flex gap-2">
        <Submit />
        <button type="button" onClick={() => setOpen(false)} className={btnGhost}>
          Done
        </button>
      </div>
    </form>
  );
}
