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

const OPTIONS = [
  { value: "present", label: "Present", on: "bg-emerald-600 text-white", off: "text-emerald-700 hover:bg-emerald-50" },
  { value: "absent", label: "Absent", on: "bg-red-600 text-white", off: "text-red-700 hover:bg-red-50" },
  { value: "late", label: "Late", on: "bg-amber-500 text-white", off: "text-amber-700 hover:bg-amber-50" },
  { value: "excused", label: "Excused", on: "bg-slate-600 text-white", off: "text-slate-600 hover:bg-slate-100" },
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
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800">
          Register saved for {state.saved} student{state.saved === 1 ? "" : "s"}.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {counts.map((c) => (
          <span
            key={c.value}
            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
          >
            {c.label}: {c.n}
          </span>
        ))}
        <button
          type="button"
          onClick={() =>
            setMarks(Object.fromEntries(rows.map((r) => [r.studentId, "present"])))
          }
          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          Mark all present
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <ul className="divide-y divide-slate-100">
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
                  <p className="truncate text-sm font-medium text-slate-900">{r.name}</p>
                  <p className="font-mono text-xs text-slate-400">{r.admissionNumber}</p>
                </div>
              </div>

              <div className="flex overflow-hidden rounded-lg border border-slate-200">
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
                        active ? o.on : `bg-white ${o.off}`
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
