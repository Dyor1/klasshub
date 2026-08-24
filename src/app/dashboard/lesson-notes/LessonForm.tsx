"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { submitLessonNote, type LessonState } from "./actions";
import FileField, { type UploadedFile } from "@/components/FileField";
import { ErrorNote, LabelledField, inputClass, btnPrimary, btnGhost } from "@/components/ui";

const initial: LessonState = { error: null };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={btnPrimary}>
      {pending ? "Submitting…" : "Submit for review"}
    </button>
  );
}

export default function LessonForm({
  schoolId,
  classes,
  subjects,
  defaultYear,
}: {
  schoolId: string;
  classes: { id: string; name: string }[];
  subjects: { id: string; name: string }[];
  defaultYear: string;
}) {
  const [state, formAction] = useActionState(submitLessonNote, initial);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<UploadedFile | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setFile(null);
      setOpen(false);
    }
  }, [state.ok]);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className={btnPrimary}>
        New lesson note
      </button>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <ErrorNote message={state.error} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LabelledField label="Topic">
            <input name="topic" required placeholder="Quadratic equations" className={inputClass} />
          </LabelledField>
        </div>
        <LabelledField label="Week">
          <input name="week_number" type="number" min={1} max={20} placeholder="1–20" className={inputClass} />
        </LabelledField>
        <LabelledField label="Class">
          <select name="class_id" defaultValue="" className={inputClass}>
            <option value="">Not specified</option>
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
            <option value="first">First Term</option>
            <option value="second">Second Term</option>
            <option value="third">Third Term</option>
          </select>
        </LabelledField>
        <LabelledField label="Session">
          <input name="academic_year" required defaultValue={defaultYear} className={inputClass} />
        </LabelledField>
        <div className="lg:col-span-2">
          <LabelledField label="Notes for the reviewer">
            <input name="description" placeholder="Optional" className={inputClass} />
          </LabelledField>
        </div>
      </div>

      <FileField
        schoolId={schoolId}
        kind="lesson-notes"
        value={file}
        onChange={setFile}
        label="Lesson plan (optional)"
      />

      <div className="flex gap-2">
        <Submit />
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setFile(null);
          }}
          className={btnGhost}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
