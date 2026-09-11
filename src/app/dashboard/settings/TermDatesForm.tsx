"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { saveTermDates, type ScaleState } from "./actions";
import { ErrorNote, SuccessNote, inputClass } from "@/components/ui";

const initial: ScaleState = { error: null };

export type TermDateRow = {
  academic_year: string;
  term: string;
  starts_on: string;
  ends_on: string;
  next_term_starts_on: string | null;
};

const TERM_ROWS = [
  { value: "first", label: "First term" },
  { value: "second", label: "Second term" },
  { value: "third", label: "Third term" },
] as const;

function Save() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-11 rounded-2xl bg-brand-gradient px-5 text-sm font-semibold text-white kh-clay-brand kh-clay-press transition-all hover:brightness-110 disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save term dates"}
    </button>
  );
}

export default function TermDatesForm({
  terms,
  currentYear,
}: {
  terms: TermDateRow[];
  currentYear: string;
}) {
  const [state, formAction] = useActionState(saveTermDates, initial);
  const [year, setYear] = useState(currentYear);

  const forYear = terms.filter((t) => t.academic_year === year);
  const find = (term: string) => forYear.find((t) => t.term === term);
  const resumes = find("third")?.next_term_starts_on ?? "";

  const years = Array.from(new Set(terms.map((t) => t.academic_year))).sort().reverse();

  return (
    <form action={formAction} className="space-y-5">
      <ErrorNote message={state.error} />
      {state.ok && <SuccessNote>Term dates saved.</SuccessNote>}

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-ink-muted">
          Academic session
        </span>
        <input
          name="academic_year"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          list="known-sessions"
          placeholder="2025/2026"
          className={`${inputClass} w-40`}
        />
        <datalist id="known-sessions">
          {years.map((y) => (
            <option key={y} value={y} />
          ))}
        </datalist>
      </label>

      {/* Remounted when the session changes so each set of dates loads into
          the inputs rather than the first one sticking. */}
      <div key={year} className="space-y-3">
        {TERM_ROWS.map((t) => {
          const row = find(t.value);
          return (
            <div
              key={t.value}
              className="grid gap-3 rounded-xl bg-sunken px-4 py-3 sm:grid-cols-[8rem_1fr_1fr] sm:items-center"
            >
              <span className="text-sm font-semibold text-ink">{t.label}</span>
              <label className="block">
                <span className="mb-1 block text-[11px] uppercase tracking-wide text-ink-subtle">
                  Begins
                </span>
                <input
                  type="date"
                  name={`${t.value}_starts_on`}
                  defaultValue={row?.starts_on ?? ""}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] uppercase tracking-wide text-ink-subtle">
                  Ends
                </span>
                <input
                  type="date"
                  name={`${t.value}_ends_on`}
                  defaultValue={row?.ends_on ?? ""}
                  className={inputClass}
                />
              </label>
            </div>
          );
        })}

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-muted">
            Next session resumes
          </span>
          <input
            type="date"
            name="next_term_starts_on"
            defaultValue={resumes}
            className={`${inputClass} w-52`}
          />
          <span className="mt-1.5 block text-xs text-ink-subtle">
            Printed on third-term cards. The first and second terms take their
            resumption date from the term that follows, so they need nothing
            here.
          </span>
        </label>
      </div>

      <Save />
    </form>
  );
}
