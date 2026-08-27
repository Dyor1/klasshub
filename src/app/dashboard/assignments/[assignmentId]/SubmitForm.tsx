"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { submitWork, type HwState } from "../actions";
import FileField, { type UploadedFile } from "@/components/FileField";
import { ErrorNote, LabelledField, btnPrimary } from "@/components/ui";

const initial: HwState = { error: null };

function Submit({ resubmit }: { resubmit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={btnPrimary}>
      {pending ? "Submitting…" : resubmit ? "Resubmit work" : "Submit work"}
    </button>
  );
}

export default function SubmitForm({
  assignmentId,
  schoolId,
  profileId,
  allowText,
  allowFile,
  existingBody,
  existingFileName,
  overdue,
}: {
  assignmentId: string;
  schoolId: string;
  profileId: string;
  allowText: boolean;
  allowFile: boolean;
  existingBody: string | null;
  existingFileName: string | null;
  overdue: boolean;
}) {
  const [state, formAction] = useActionState(submitWork, initial);
  const [file, setFile] = useState<UploadedFile | null>(null);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="assignment_id" value={assignmentId} />
      <ErrorNote message={state.error} />
      {state.ok && state.message && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800">
          {state.message}
        </p>
      )}

      {overdue && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
          The deadline has passed — you can still submit, but it will be marked
          late.
        </p>
      )}

      {allowText && (
        <LabelledField label="Your answer">
          <textarea
            name="body"
            rows={8}
            defaultValue={existingBody ?? ""}
            placeholder="Type your work here…"
            className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
          />
        </LabelledField>
      )}

      {allowFile && (
        <>
          <FileField
            schoolId={schoolId}
            kind="assignments"
            owner={profileId}
            value={file}
            onChange={setFile}
            label="Attach a file"
          />
          {existingFileName && !file && (
            <p className="text-xs text-slate-500">
              Currently attached: <span className="font-medium">{existingFileName}</span> —
              choosing a new file replaces it.
            </p>
          )}
        </>
      )}

      <Submit resubmit={Boolean(existingBody || existingFileName)} />
    </form>
  );
}
