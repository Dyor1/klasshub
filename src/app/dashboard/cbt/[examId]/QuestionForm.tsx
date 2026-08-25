"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { addQuestion, type CbtState } from "../actions";
import { ErrorNote, LabelledField, inputClass, btnPrimary } from "@/components/ui";

const initial: CbtState = { error: null };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={btnPrimary}>
      {pending ? "Adding…" : "Add question"}
    </button>
  );
}

const LETTERS = ["a", "b", "c", "d"] as const;

export default function QuestionForm({ examId }: { examId: string }) {
  const [state, formAction] = useActionState(addQuestion, initial);
  const [correct, setCorrect] = useState<string>("a");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setCorrect("a");
    }
  }, [state.ok]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <input type="hidden" name="exam_id" value={examId} />
      <input type="hidden" name="correct_option" value={correct} />
      <ErrorNote message={state.error} />

      <LabelledField label="Question">
        <textarea
          name="question_text"
          required
          rows={2}
          placeholder="What is 2 + 2?"
          className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
        />
      </LabelledField>

      <div className="space-y-2">
        <span className="block text-xs font-medium text-slate-600">
          Options — click the letter to mark the correct answer
        </span>
        {LETTERS.map((l) => {
          const isCorrect = correct === l;
          const required = l === "a" || l === "b";
          return (
            <div key={l} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCorrect(l)}
                aria-label={`Mark option ${l.toUpperCase()} correct`}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold uppercase transition-colors ${
                  isCorrect
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {l}
              </button>
              <input
                name={`option_${l}`}
                required={required}
                placeholder={required ? `Option ${l.toUpperCase()}` : `Option ${l.toUpperCase()} (optional)`}
                className={inputClass}
              />
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-28">
          <LabelledField label="Marks">
            <input
              name="marks"
              type="number"
              min={0.5}
              step="0.5"
              defaultValue={1}
              className={inputClass}
            />
          </LabelledField>
        </div>
        <Submit />
      </div>
    </form>
  );
}
