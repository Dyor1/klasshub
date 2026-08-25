"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { saveAnswer, submitExam } from "../../actions";
import { btnPrimary } from "@/components/ui";

type Question = {
  question_id: string;
  question_number: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string | null;
  option_d: string | null;
  marks: number;
  selected: "a" | "b" | "c" | "d" | null;
};

function SubmitButton({ answered, total }: { answered: number; total: number }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={btnPrimary}>
      {pending ? "Submitting…" : `Submit test (${answered}/${total} answered)`}
    </button>
  );
}

/** Counts down against the server-issued expiry. This is a convenience only —
 *  the server refuses answers past expiry regardless of what the clock shows,
 *  so tampering with it achieves nothing. */
function Countdown({ expiresAt }: { expiresAt: string }) {
  const [left, setLeft] = useState(() =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
  );

  useEffect(() => {
    const id = setInterval(() => {
      setLeft(Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const mins = Math.floor(left / 60);
  const secs = left % 60;
  const urgent = left <= 120;

  return (
    <div
      className={`rounded-xl px-4 py-2 text-center font-mono text-lg font-bold tabular-nums ${
        left === 0
          ? "bg-red-100 text-red-700"
          : urgent
            ? "bg-amber-100 text-amber-800"
            : "bg-slate-100 text-slate-700"
      }`}
    >
      {left === 0 ? "Time up" : `${mins}:${String(secs).padStart(2, "0")}`}
    </div>
  );
}

export default function Paper({
  sessionId,
  questions,
  expiresAt,
}: {
  sessionId: string;
  questions: Question[];
  expiresAt: string;
}) {
  // Local echo of what's been chosen, so the UI updates instantly while the
  // server action persists in the background.
  const [chosen, setChosen] = useState<Record<string, string>>(
    Object.fromEntries(
      questions.filter((q) => q.selected).map((q) => [q.question_id, q.selected as string])
    )
  );

  const answered = Object.keys(chosen).length;

  return (
    <div className="space-y-6">
      <div className="sticky top-16 z-10 flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-brand-900">{answered}</span> of{" "}
          {questions.length} answered
        </p>
        <Countdown expiresAt={expiresAt} />
      </div>

      {questions.map((q) => (
        <div key={q.question_id} className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="mb-3 text-sm font-semibold text-brand-900">
            {q.question_number}. {q.question_text}
            <span className="ml-2 text-xs font-normal text-slate-400">
              ({q.marks} mark{Number(q.marks) === 1 ? "" : "s"})
            </span>
          </p>

          <div className="space-y-2">
            {(["a", "b", "c", "d"] as const).map((l) => {
              const value = q[`option_${l}` as const];
              if (!value) return null;
              const picked = chosen[q.question_id] === l;

              return (
                <form key={l} action={saveAnswer}>
                  <input type="hidden" name="session_id" value={sessionId} />
                  <input type="hidden" name="question_id" value={q.question_id} />
                  <input type="hidden" name="selected" value={l} />
                  <button
                    type="submit"
                    onClick={() => setChosen((c) => ({ ...c, [q.question_id]: l }))}
                    className={`flex w-full items-center gap-3 rounded-lg border-2 px-3.5 py-2.5 text-left text-sm transition-colors ${
                      picked
                        ? "border-brand-500 bg-brand-50/60 text-brand-900"
                        : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-[11px] font-bold uppercase ${
                        picked ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {l}
                    </span>
                    {value}
                  </button>
                </form>
              );
            })}
          </div>
        </div>
      ))}

      <form action={submitExam} className="flex justify-end pb-4">
        <input type="hidden" name="session_id" value={sessionId} />
        <SubmitButton answered={answered} total={questions.length} />
      </form>
    </div>
  );
}
