"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { gradeSubmission, type HwState } from "../actions";
import { ErrorNote } from "@/components/ui";

const initial: HwState = { error: null };

function Save() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-10 rounded-lg bg-brand-gradient px-4 text-xs font-semibold text-white shadow-brand transition-all hover:brightness-110 disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save grade"}
    </button>
  );
}

export default function GradeForm({
  submissionId,
  assignmentId,
  maxScore,
  score,
  feedback,
}: {
  submissionId: string;
  assignmentId: string;
  maxScore: number;
  score: number | null;
  feedback: string | null;
}) {
  const [state, formAction] = useActionState(gradeSubmission, initial);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="submission_id" value={submissionId} />
      <input type="hidden" name="assignment_id" value={assignmentId} />
      <input type="hidden" name="max_score" value={maxScore} />

      <ErrorNote message={state.error} />

      <div className="flex flex-wrap items-center gap-2">
        <input
          name="score"
          type="number"
          min={0}
          max={maxScore}
          step="0.5"
          defaultValue={score ?? ""}
          placeholder={`/ ${maxScore}`}
          className="h-10 w-24 rounded-lg border border-slate-200 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
        />
        <input
          name="feedback"
          defaultValue={feedback ?? ""}
          placeholder="Feedback (optional)"
          className="h-10 min-w-[12rem] flex-1 rounded-lg border border-slate-200 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
        />
        <Save />
      </div>

      {state.ok && state.message && (
        <p className="text-xs font-medium text-emerald-700">{state.message}</p>
      )}
    </form>
  );
}
