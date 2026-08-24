"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { saveClassNote, type NoteState } from "./actions";
import FileField, { type UploadedFile } from "@/components/FileField";
import { ErrorNote, LabelledField, inputClass, btnPrimary, btnGhost } from "@/components/ui";

const initial: NoteState = { error: null };

const TERMS = [
  { value: "", label: "Any term" },
  { value: "first", label: "First Term" },
  { value: "second", label: "Second Term" },
  { value: "third", label: "Third Term" },
];

function Submit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} className={btnPrimary}>
      {pending ? "Saving…" : "Publish note"}
    </button>
  );
}

export default function NoteForm({
  schoolId,
  classes,
  subjects,
  defaultYear,
}: {
  schoolId: string;
  classes: { id: string; name: string; academic_year: string }[];
  subjects: { id: string; name: string }[];
  defaultYear: string;
}) {
  const [state, formAction] = useActionState(saveClassNote, initial);
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
        Upload note
      </button>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <ErrorNote message={state.error} />

      <div className="grid gap-4 sm:grid-cols-2">
        <LabelledField label="Title">
          <input name="title" required placeholder="Algebra — week 3" className={inputClass} />
        </LabelledField>
        <LabelledField label="Class">
          <select name="class_id" required defaultValue="" className={inputClass}>
            <option value="">Select…</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.academic_year})
              </option>
            ))}
          </select>
        </LabelledField>
        <LabelledField label="Subject">
          <select name="subject_id" defaultValue="" className={inputClass}>
            <option value="">General</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </LabelledField>
        <LabelledField label="Term">
          <select name="term" defaultValue="" className={inputClass}>
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
        <LabelledField label="Description">
          <input name="description" placeholder="Optional" className={inputClass} />
        </LabelledField>
      </div>

      <FileField
        schoolId={schoolId}
        kind="class-notes"
        value={file}
        onChange={setFile}
        label="Attachment"
        required
      />

      <div className="flex gap-2">
        <Submit disabled={!file} />
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
