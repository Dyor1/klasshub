"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { saveRegister, type RegisterState } from "./actions";
import { ErrorNote, Avatar, btnPrimary } from "@/components/ui";

const initial: RegisterState = { error: null };

type Row = {
  studentId: string;
  name: string;
  admissionNumber: string;
  status: string;
};

/** Selected fills are chosen for legibility, not just for hue.
 *
 *  White on emerald-600 measures 3.77:1 and white on amber-500 only 2.15:1 —
 *  both below the 4.5 a small label needs, and amber-on-white is the classic
 *  version of this mistake. Emerald goes one step darker. Amber keeps its
 *  brightness, which is what makes "late" scannable down a column of thirty
 *  pupils, and takes dark text instead: 7.81:1. */
const OPTIONS = [
  { value: "present", label: "Present", on: "bg-emerald-700 text-white", off: "text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/12" },
  { value: "absent", label: "Absent", on: "bg-red-600 text-white", off: "text-red-700 dark:text-red-300 hover:bg-red-500/10" },
  { value: "late", label: "Late", on: "bg-amber-500 text-sand-950", off: "text-amber-700 dark:text-amber-300 hover:bg-amber-500/12" },
  { value: "excused", label: "Excused", on: "bg-ink-muted text-ink-inverse", off: "text-ink-muted hover:bg-hover" },
];

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={btnPrimary}>
      {pending ? "Saving…" : "Save register"}
    </button>
  );
}

export default function Register({
  rows,
  classId,
  date,
}: {
  rows: Row[];
  classId: string;
  date: string;
}) {
  const [state, formAction] = useActionState(saveRegister, initial);
  const [marks, setMarks] = useState<Record<string, string>>(
    Object.fromEntries(rows.map((r) => [r.studentId, r.status]))
  );

  const counts = OPTIONS.map((o) => ({
    ...o,
    n: Object.values(marks).filter((m) => m === o.value).length,
  }));

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="class_id" value={classId} />
      <input type="hidden" name="date" value={date} />

      <ErrorNote message={state.error} />
      {state.saved ? (
        <p className="rounded-lg border border-emerald-500/35 bg-emerald-500/12 px-3.5 py-2.5 text-sm text-emerald-800 dark:text-emerald-200">
          Register saved for {state.saved} student{state.saved === 1 ? "" : "s"}.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {counts.map((c) => (
          <span
            key={c.value}
            className="rounded-full bg-sunken px-3 py-1 text-xs font-semibold text-ink-muted"
          >
            {c.label}: {c.n}
          </span>
        ))}
        <button
          type="button"
          onClick={() =>
            setMarks(Object.fromEntries(rows.map((r) => [r.studentId, "present"])))
          }
          className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-ink-muted hover:bg-hover"
        >
          Mark all present
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-card">
        <ul className="divide-y divide-line-soft">
          {rows.map((r) => (
            <li
              key={r.studentId}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <input type="hidden" name="student_id" value={r.studentId} />
              <input
                type="hidden"
                name={`status_${r.studentId}`}
                value={marks[r.studentId] ?? "present"}
              />

              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={r.name} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{r.name}</p>
                  <p className="font-mono text-xs text-ink-subtle">{r.admissionNumber}</p>
                </div>
              </div>

              <div className="flex overflow-hidden rounded-lg border border-line">
                {OPTIONS.map((o) => {
                  const active = (marks[r.studentId] ?? "present") === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() =>
                        setMarks((m) => ({ ...m, [r.studentId]: o.value }))
                      }
                      className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                        active ? o.on : `bg-card ${o.off}`
                      }`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <Submit />
    </form>
  );
}
