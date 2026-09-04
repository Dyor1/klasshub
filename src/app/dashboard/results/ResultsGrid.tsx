"use client";

import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react";
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

export type Band = {
  grade: string;
  min_score: number;
  max_score: number;
  remark: string | null;
};

type Field = "ca" | "exam";
type Cell = { ca: string; exam: string };

const asNum = (v: string) => (v.trim() === "" ? null : Number(v));

function Submit({ dirtyCount }: { dirtyCount: number }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || dirtyCount === 0}
      className="h-11 rounded-xl bg-brand-gradient px-6 text-sm font-semibold text-white shadow-brand transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending
        ? "Saving…"
        : dirtyCount === 0
          ? "No changes to save"
          : `Save ${dirtyCount} change${dirtyCount === 1 ? "" : "s"}`}
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
  bands = [],
}: {
  rows: Row[];
  classId: string;
  subjectId: string;
  academicYear: string;
  term: string;
  caMax: number;
  examMax: number;
  /** The school's own grading scale. Used only to preview a grade as marks are
   *  typed — the grade that gets stored is computed by a database trigger from
   *  the same table, so the preview cannot drift from the real thing. */
  bands?: Band[];
}) {
  const [state, formAction] = useActionState(saveResults, initial);

  const start = useMemo<Record<string, Cell>>(
    () =>
      Object.fromEntries(
        rows.map((r) => [
          r.studentId,
          { ca: r.ca?.toString() ?? "", exam: r.exam?.toString() ?? "" },
        ])
      ),
    [rows]
  );

  const [live, setLive] = useState<Record<string, Cell>>(start);
  useEffect(() => setLive(start), [start]);

  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const key = (id: string, f: Field) => `${id}:${f}`;

  /* ------------------------------------------------------------ dirtiness */
  const dirty = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      const a = start[r.studentId];
      const b = live[r.studentId];
      if (!a || !b) continue;
      if (a.ca !== b.ca) set.add(key(r.studentId, "ca"));
      if (a.exam !== b.exam) set.add(key(r.studentId, "exam"));
    }
    return set;
  }, [rows, start, live]);

  // Marks are the one thing in this app you cannot re-derive if they are lost:
  // a teacher who closes the tab mid-column has to find the paper again.
  useEffect(() => {
    if (dirty.size === 0) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty.size]);

  const set = useCallback((id: string, f: Field, v: string) => {
    setLive((s) => ({ ...s, [id]: { ...s[id], [f]: v } }));
  }, []);

  /* -------------------------------------------------------------- keyboard */
  const move = useCallback(
    (idx: number, f: Field, delta: number) => {
      const next = rows[idx + delta];
      if (next) inputs.current[key(next.studentId, f)]?.focus();
    },
    [rows]
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number, f: Field) => {
    // Down the column, not across the row. Marking is one subject at a time
    // with a paper register in the other hand — Enter should land on the next
    // pupil, which is what Tab notably does not do.
    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault();
      move(idx, f, 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(idx, f, -1);
    }
  };

  /* ----------------------------------------------------------------- paste */
  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>, idx: number, f: Field) => {
    const text = e.clipboardData.getData("text");
    if (!text.includes("\n") && !text.includes("\t")) return; // a single value: let it be

    // A column copied out of Excel arrives newline-separated. Filling down from
    // the focused cell turns a spreadsheet the school already keeps into an
    // import, without a file or a mapping step.
    e.preventDefault();
    const values = text
      .split(/\r?\n/)
      .map((line) => line.split("\t")[0].trim())
      .filter((v) => v !== "");

    setLive((s) => {
      const next = { ...s };
      values.forEach((v, i) => {
        const row = rows[idx + i];
        if (!row || Number.isNaN(Number(v))) return;
        next[row.studentId] = { ...next[row.studentId], [f]: v };
      });
      return next;
    });
  };

  const fillColumn = (f: Field, raw: string) => {
    const v = raw.trim();
    if (v === "" || Number.isNaN(Number(v))) return;
    setLive((s) => {
      const next = { ...s };
      for (const r of rows) next[r.studentId] = { ...next[r.studentId], [f]: v };
      return next;
    });
  };

  /* ------------------------------------------------------------ derivation */
  const outOf = caMax + examMax;

  const gradeFor = (pct: number | null) => {
    if (pct === null || bands.length === 0) return null;
    return bands.find((b) => pct >= Number(b.min_score) && pct <= Number(b.max_score)) ?? null;
  };

  const rowStats = (id: string) => {
    const v = live[id];
    if (!v || (v.ca.trim() === "" && v.exam.trim() === "")) {
      return { total: null, pct: null, band: null };
    }
    const total = (Number(v.ca) || 0) + (Number(v.exam) || 0);
    const pct = Math.round((total / outOf) * 1000) / 10;
    return { total, pct, band: gradeFor(pct) };
  };

  const over = (v: string, max: number) => {
    const n = asNum(v);
    return n !== null && n > max;
  };

  const anyOver = rows.some(
    (r) => over(live[r.studentId]?.ca ?? "", caMax) || over(live[r.studentId]?.exam ?? "", examMax)
  );

  // A live read on the class, so a teacher sees a mistyped 8 instead of 80
  // pulling the average down while they are still in the column.
  const summary = useMemo(() => {
    const pcts = rows
      .map((r) => rowStats(r.studentId).pct)
      .filter((p): p is number => p !== null);
    if (pcts.length === 0) return null;
    return {
      entered: pcts.length,
      of: rows.length,
      avg: pcts.reduce((a, b) => a + b, 0) / pcts.length,
      top: Math.max(...pcts),
      low: Math.min(...pcts),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, live, bands, caMax, examMax]);

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
        <p className="rounded-xl border border-emerald-500/35 bg-emerald-500/12 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200">
          Saved marks for {state.saved} student{state.saved === 1 ? "" : "s"}.
        </p>
      ) : null}

      {summary && (
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            { label: "Entered", value: `${summary.entered} / ${summary.of}` },
            { label: "Class average", value: `${summary.avg.toFixed(1)}%` },
            { label: "Highest", value: `${summary.top}%` },
            { label: "Lowest", value: `${summary.low}%` },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-line-soft bg-card px-4 py-3">
              <p className="text-lg font-extrabold tabular-nums text-ink">{s.value}</p>
              <p className="text-[11px] text-ink-subtle">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {anyOver && (
        <p className="rounded-xl border border-amber-500/35 bg-amber-500/12 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          Some marks are above the maximum. They are highlighted below and will be
          rejected on save.
        </p>
      )}

      <div className="kh-scroll-x overflow-x-auto rounded-2xl border border-line-soft bg-card shadow-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-line-soft bg-sunken">
            <tr>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.09em] text-ink-subtle">
                Student
              </th>
              <ColumnHead label={`CA / ${caMax}`} max={caMax} onFill={(v) => fillColumn("ca", v)} />
              <ColumnHead label={`Exam / ${examMax}`} max={examMax} onFill={(v) => fillColumn("exam", v)} />
              <th className="w-20 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.09em] text-ink-subtle">
                Total
              </th>
              <th className="w-20 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.09em] text-ink-subtle">
                %
              </th>
              <th className="w-28 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.09em] text-ink-subtle">
                Grade
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {rows.map((r, idx) => {
              const { total, pct, band } = rowStats(r.studentId);
              return (
                <tr key={r.studentId} className="hover:bg-hover">
                  <td className="px-4 py-2">
                    <input type="hidden" name="student_id" value={r.studentId} />
                    <p className="font-medium text-ink">{r.name}</p>
                    <p className="font-mono text-xs text-ink-subtle">{r.admissionNumber}</p>
                  </td>

                  {(["ca", "exam"] as const).map((f) => {
                    const max = f === "ca" ? caMax : examMax;
                    const value = live[r.studentId]?.[f] ?? "";
                    const isDirty = dirty.has(key(r.studentId, f));
                    const isOver = over(value, max);
                    return (
                      <td key={f} className="px-4 py-2">
                        <input
                          ref={(el) => {
                            inputs.current[key(r.studentId, f)] = el;
                          }}
                          name={`${f}_${r.studentId}`}
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={max}
                          step="0.01"
                          aria-label={`${f === "ca" ? "CA" : "Exam"} mark for ${r.name}`}
                          value={value}
                          onChange={(e) => set(r.studentId, f, e.target.value)}
                          onKeyDown={(e) => onKeyDown(e, idx, f)}
                          onPaste={(e) => onPaste(e, idx, f)}
                          // Selecting on focus means typing replaces rather than
                          // appends — otherwise every correction starts with a
                          // fight against the existing digits.
                          onFocus={(e) => e.currentTarget.select()}
                          className={`h-10 w-24 rounded-lg border px-3 text-sm tabular-nums transition-colors focus:outline-none focus:ring-4 focus:ring-brand-500/12 ${
                            isOver
                              ? "border-amber-500 bg-amber-500/10 text-amber-800 dark:text-amber-200"
                              : isDirty
                                ? "border-brand-400 bg-brand-500/8 font-semibold"
                                : "border-line bg-card focus:border-brand-500"
                          }`}
                        />
                      </td>
                    );
                  })}

                  <td className="px-4 py-2 font-semibold tabular-nums text-ink">
                    {total === null ? <span className="text-ink-subtle">—</span> : total}
                  </td>
                  <td className="px-4 py-2 tabular-nums text-ink-muted">
                    {pct === null ? <span className="text-ink-subtle">—</span> : `${pct}%`}
                  </td>
                  <td className="px-4 py-2">
                    {band ? (
                      <span
                        className="inline-flex items-center gap-1.5"
                        title={band.remark ?? undefined}
                      >
                        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-brand-500/12 px-1.5 text-xs font-bold text-brand-600 dark:text-brand-300">
                          {band.grade}
                        </span>
                        {band.remark && (
                          <span className="hidden text-xs text-ink-subtle lg:inline">
                            {band.remark}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-ink-subtle">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <Submit dirtyCount={dirty.size} />
        <p className="text-xs leading-relaxed text-ink-subtle">
          <Kbd>Enter</Kbd> or <Kbd>↓</Kbd> moves to the next pupil · <Kbd>↑</Kbd> goes
          back · paste a column straight from a spreadsheet
        </p>
      </div>
    </form>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-line bg-sunken px-1.5 py-0.5 font-mono text-[11px] text-ink-muted">
      {children}
    </kbd>
  );
}

/** Column header with a fill-down control. Marking a class where most pupils
 *  sat the same paper often starts from one number. */
function ColumnHead({
  label,
  max,
  onFill,
}: {
  label: string;
  max: number;
  onFill: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  return (
    <th className="w-40 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.09em] text-ink-subtle">
      <div className="flex items-center gap-2">
        <span>{label}</span>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="rounded px-1.5 py-0.5 text-[10px] font-semibold normal-case text-brand-600 hover:bg-brand-500/10 dark:text-brand-300"
        >
          Fill all
        </button>
      </div>
      {open && (
        <div className="mt-2 flex items-center gap-1.5">
          <input
            type="number"
            min={0}
            max={max}
            value={value}
            autoFocus
            placeholder={`0–${max}`}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onFill(value);
                setOpen(false);
                setValue("");
              }
              if (e.key === "Escape") setOpen(false);
            }}
            className="h-8 w-20 rounded-lg border border-line bg-card px-2 text-xs font-normal normal-case tabular-nums text-ink focus:border-brand-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => {
              onFill(value);
              setOpen(false);
              setValue("");
            }}
            className="h-8 rounded-lg bg-brand-500 px-2.5 text-[11px] font-semibold normal-case text-white hover:brightness-110"
          >
            Apply
          </button>
        </div>
      )}
    </th>
  );
}
