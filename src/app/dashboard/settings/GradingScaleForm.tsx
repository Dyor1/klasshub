"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { saveGradingScale, resetGradingScale, type ScaleState } from "./actions";
import { ErrorNote, btnPrimary, btnGhost } from "@/components/ui";
import { IconClose } from "@/components/icons";

const initial: ScaleState = { error: null };

type Row = { key: string; grade: string; min: string; max: string; remark: string };

let seq = 0;
const newKey = () => `row-${seq++}`;

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={btnPrimary}>
      {pending ? "Saving…" : "Save scale"}
    </button>
  );
}

const cell =
  "h-10 w-full rounded-lg border border-line px-3 text-sm focus:border-brand-500 " +
  "focus:outline-none focus:ring-4 focus:ring-brand-500/10";

export default function GradingScaleForm({
  bands,
}: {
  bands: { grade: string; min_score: number; max_score: number; remark: string | null }[];
}) {
  const [state, formAction] = useActionState(saveGradingScale, initial);
  const [rows, setRows] = useState<Row[]>(
    bands.map((b) => ({
      key: newKey(),
      grade: b.grade,
      min: String(b.min_score),
      max: String(b.max_score),
      remark: b.remark ?? "",
    }))
  );

  function update(key: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  // Coverage preview, mirroring the server's validation so problems are
  // visible before saving rather than as an error afterwards.
  const parsed = rows
    .filter((r) => r.grade.trim() !== "")
    .map((r) => ({ grade: r.grade, min: Number(r.min), max: Number(r.max) }))
    .sort((a, b) => a.min - b.min);

  let coverage: string | null = null;
  if (parsed.length > 0) {
    if (parsed[0].min !== 0) coverage = "Scale does not start at 0";
    else if (parsed[parsed.length - 1].max !== 100) coverage = "Scale does not reach 100";
    else {
      for (let i = 1; i < parsed.length; i++) {
        if (parsed[i].min <= parsed[i - 1].max) {
          coverage = `${parsed[i - 1].grade} and ${parsed[i].grade} overlap`;
          break;
        }
        if (parsed[i].min - parsed[i - 1].max > 0.011) {
          coverage = `Gap between ${parsed[i - 1].grade} and ${parsed[i].grade}`;
          break;
        }
      }
    }
  }

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-4">
        <ErrorNote message={state.error} />
        {state.ok && (
          <p className="rounded-lg border border-emerald-500/35 bg-emerald-500/12 px-3.5 py-2.5 text-sm text-emerald-800 dark:text-emerald-200">
            Scale saved with {state.saved} bands. Existing results were re-graded.
          </p>
        )}

        <div className="kh-scroll-x overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b border-line-soft bg-sunken">
              <tr>
                {["Grade", "From %", "To %", "Remark", ""].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {rows.map((r) => (
                <tr key={r.key}>
                  <td className="w-24 px-3 py-2">
                    <input
                      name="grade"
                      value={r.grade}
                      onChange={(e) => update(r.key, { grade: e.target.value })}
                      maxLength={4}
                      placeholder="A"
                      className={`${cell} font-bold uppercase`}
                    />
                  </td>
                  <td className="w-28 px-3 py-2">
                    <input
                      name="min_score"
                      value={r.min}
                      onChange={(e) => update(r.key, { min: e.target.value })}
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      className={cell}
                    />
                  </td>
                  <td className="w-28 px-3 py-2">
                    <input
                      name="max_score"
                      value={r.max}
                      onChange={(e) => update(r.key, { max: e.target.value })}
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      className={cell}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      name="remark"
                      value={r.remark}
                      onChange={(e) => update(r.key, { remark: e.target.value })}
                      placeholder="Excellent"
                      className={cell}
                    />
                  </td>
                  <td className="w-12 px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                      aria-label={`Remove grade ${r.grade || "row"}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-subtle transition-colors hover:bg-red-500/10 hover:text-red-600 dark:text-red-400"
                    >
                      <IconClose className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() =>
              setRows((rs) => [
                ...rs,
                { key: newKey(), grade: "", min: "", max: "", remark: "" },
              ])
            }
            className={btnGhost}
          >
            Add band
          </button>
          <Submit />
          {coverage && (
            <span className="text-xs font-medium text-amber-700 dark:text-amber-300">⚠ {coverage}</span>
          )}
        </div>
      </form>

      <form action={resetGradingScale}>
        <button
          type="submit"
          className="text-xs font-medium text-ink-muted underline-offset-2 hover:text-ink hover:underline"
        >
          Reset to the default Nigerian scale
        </button>
      </form>
    </div>
  );
}
