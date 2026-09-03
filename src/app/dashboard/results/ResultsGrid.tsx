"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { saveResults, type SaveState } from "./actions";
import { ErrorNote } from "@/components/ui";

const initial: SaveState = { error: null };

type Row = {
  studentId: string;
  name: string;
  admissionNumber: string;
  ca: number | null;
  exam: number | null;
};

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-11 rounded-lg bg-brand-gradient px-6 text-sm font-semibold text-white shadow-brand transition-all hover:brightness-110 disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save marks"}
    </button>
  );
}

export default function ResultsGrid({
  rows,
  classId,
  subjectId,
  academicYear,
  term,
  caMax,
  examMax,
}: {
  rows: Row[];
  classId: string;
  subjectId: string;
  academicYear: string;
  term: string;
  caMax: number;
  examMax: number;
}) {
  const [state, formAction] = useActionState(saveResults, initial);
  const [live, setLive] = useState<Record<string, { ca: string; exam: string }>>(
    Object.fromEntries(
      rows.map((r) => [
        r.studentId,
        { ca: r.ca?.toString() ?? "", exam: r.exam?.toString() ?? "" },
      ])
    )
  );

  const total = (id: string) => {
    const v = live[id];
    if (!v || (v.ca === "" && v.exam === "")) return null;
    return (Number(v.ca) || 0) + (Number(v.exam) || 0);
  };

  const pct = (id: string) => {
    const t = total(id);
    if (t === null) return null;
    return Math.round((t / (caMax + examMax)) * 1000) / 10;
  };

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="class_id" value={classId} />
      <input type="hidden" name="subject_id" value={subjectId} />
      <input type="hidden" name="academic_year" value={academicYear} />
      <input type="hidden" name="term" value={term} />
      <input type="hidden" name="ca_max" value={caMax} />
      <input type="hidden" name="exam_max" value={examMax} />

      <ErrorNote message={state.error} />
      {state.saved ? (
        <p className="rounded-lg border border-emerald-500/35 bg-emerald-500/12 px-3.5 py-2.5 text-sm text-emerald-800 dark:text-emerald-200">
          Saved marks for {state.saved} student{state.saved === 1 ? "" : "s"}.
        </p>
      ) : null}

      <div className="kh-scroll-x overflow-x-auto rounded-xl border border-line bg-card">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="border-b border-line-soft bg-sunken">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Student
              </th>
              <th className="w-32 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                CA / {caMax}
              </th>
              <th className="w-32 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Exam / {examMax}
              </th>
              <th className="w-24 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Total
              </th>
              <th className="w-24 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                %
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {rows.map((r) => {
              const t = total(r.studentId);
              const p = pct(r.studentId);
              return (
                <tr key={r.studentId} className="hover:bg-hover">
                  <td className="px-4 py-2.5">
                    <input type="hidden" name="student_id" value={r.studentId} />
                    <p className="font-medium text-ink">{r.name}</p>
                    <p className="font-mono text-xs text-ink-subtle">
                      {r.admissionNumber}
                    </p>
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      name={`ca_${r.studentId}`}
                      type="number"
                      min={0}
                      max={caMax}
                      step="0.01"
                      value={live[r.studentId]?.ca ?? ""}
                      onChange={(e) =>
                        setLive((s) => ({
                          ...s,
                          [r.studentId]: { ...s[r.studentId], ca: e.target.value },
                        }))
                      }
                      className="h-10 w-24 rounded-lg border border-line px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      name={`exam_${r.studentId}`}
                      type="number"
                      min={0}
                      max={examMax}
                      step="0.01"
                      value={live[r.studentId]?.exam ?? ""}
                      onChange={(e) =>
                        setLive((s) => ({
                          ...s,
                          [r.studentId]: { ...s[r.studentId], exam: e.target.value },
                        }))
                      }
                      className="h-10 w-24 rounded-lg border border-line px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
                    />
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-ink">
                    {t === null ? <span className="text-ink-subtle">—</span> : t}
                  </td>
                  <td className="px-4 py-2.5 text-ink-muted">
                    {p === null ? <span className="text-ink-subtle">—</span> : `${p}%`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Submit />
    </form>
  );
}
