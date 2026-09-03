"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { parseCsv, toRows, templateCsv, type ImportRow } from "@/lib/csv";
import {
  validateImport,
  commitImport,
  type ValidationResult,
  type RowError,
} from "./actions";
import { Card, ErrorNote, SuccessNote, btnPrimary, btnGhost, Table } from "@/components/ui";

export default function ImportWizard({ classNames }: { classNames: string[] }) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [unmapped, setUnmapped] = useState<string[]>([]);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [done, setDone] = useState<number | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function reset() {
    setRows([]);
    setUnmapped([]);
    setResult(null);
    setDone(null);
    setFatal(null);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    reset();
    setFileName(file.name);

    // Parsed in the browser so the preview is immediate and a 400-row file
    // never has to make a round trip before someone learns column 3 is wrong.
    const text = await file.text();
    const { rows: parsed, unmapped: extra } = toRows(parseCsv(text));
    setRows(parsed);
    setUnmapped(extra);

    start(async () => {
      const r = await validateImport(parsed);
      setResult(r);
      if (r.error) setFatal(r.error);
    });
  }

  function onCommit() {
    start(async () => {
      const r = await commitImport(rows);
      if (r.error) setFatal(r.error);
      else {
        setDone(r.inserted ?? 0);
        setResult(null);
        setRows([]);
      }
    });
  }

  function downloadTemplate() {
    const blob = new Blob([templateCsv(classNames)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "klasshub-students-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (done !== null) {
    return (
      <Card>
        <SuccessNote>
          Enrolled {done} student{done === 1 ? "" : "s"}.
        </SuccessNote>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/dashboard/students" className={btnPrimary}>
            View students
          </Link>
          <button type="button" onClick={reset} className={btnGhost}>
            Import another file
          </button>
        </div>
      </Card>
    );
  }

  const errors = result?.errors ?? [];
  const byLine = new Map<number, RowError[]>();
  for (const e of errors) {
    byLine.set(e.line, [...(byLine.get(e.line) ?? []), e]);
  }

  return (
    <>
      <Card
        title="1. Get the file right"
        description="A spreadsheet exported as CSV. Admission number, surname and first name are required; everything else is optional."
        className="mb-6"
      >
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={downloadTemplate} className={btnGhost}>
            Download template
          </button>
        </div>
        {classNames.length > 0 && (
          <p className="mt-4 text-xs leading-relaxed text-ink-muted">
            The <span className="font-medium">Class</span> column must match a class you
            already have: {classNames.join(", ")}.
          </p>
        )}
      </Card>

      <Card title="2. Choose your file" className="mb-6">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={onFile}
          className="block w-full text-sm text-ink-muted file:mr-4 file:h-10 file:cursor-pointer file:rounded-lg file:border-0 file:bg-brand-gradient file:px-5 file:text-sm file:font-semibold file:text-white hover:file:brightness-110"
        />
        {fileName && (
          <p className="mt-3 text-sm text-ink-muted">
            <span className="font-medium">{fileName}</span>
            {rows.length > 0 && ` — ${rows.length} row${rows.length === 1 ? "" : "s"}`}
          </p>
        )}
        {unmapped.length > 0 && (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
            Ignoring {unmapped.length} column{unmapped.length === 1 ? "" : "s"} we don&apos;t
            recognise: {unmapped.join(", ")}
          </p>
        )}
      </Card>

      <ErrorNote message={fatal} />

      {pending && (
        <p className="py-4 text-sm text-ink-muted">Checking…</p>
      )}

      {result && !result.error && (
        <Card
          title="3. Check before importing"
          description="Nothing has been saved yet."
          className="mt-6"
        >
          {result.capMessage && (
            <div className="mb-4 rounded-xl border border-amber-500/35 bg-amber-500/12 px-4 py-3">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                This is more than your plan allows
              </p>
              <p className="mt-1 text-sm leading-relaxed text-amber-800 dark:text-amber-200">
                {result.capMessage}
              </p>
              <Link
                href="/dashboard/billing"
                className="mt-2 inline-block text-sm font-semibold text-amber-800 dark:text-amber-200 underline"
              >
                Open Billing
              </Link>
            </div>
          )}

          {errors.length > 0 ? (
            <>
              <p className="mb-3 text-sm font-semibold text-red-700 dark:text-red-300">
                {errors.length === 100 ? "First 100 problems" : `${errors.length} problem${errors.length === 1 ? "" : "s"}`}{" "}
                across {byLine.size} line{byLine.size === 1 ? "" : "s"}. Nothing was imported.
              </p>
              <div className="max-h-80 overflow-y-auto rounded-xl border border-line">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-sunken">
                    <tr>
                      <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                        Line
                      </th>
                      <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                        Column
                      </th>
                      <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                        Problem
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-soft">
                    {errors.map((e, i) => (
                      <tr key={`${e.line}-${e.field}-${i}`}>
                        <td className="px-3 py-2 tabular-nums text-ink-muted">{e.line}</td>
                        <td className="px-3 py-2 font-mono text-xs text-ink-muted">
                          {e.field.replace(/_/g, " ")}
                        </td>
                        <td className="px-3 py-2 text-ink">{e.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : !result.capMessage ? (
            <>
              <SuccessNote>
                {result.total} student{result.total === 1 ? "" : "s"} ready to enrol. No
                problems found.
              </SuccessNote>
              {result.sample && result.sample.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    First few rows
                  </p>
                  <Table head={["Line", "Name", "Admission no.", "Class"]}>
                    {result.sample.map((s) => (
                      <tr key={s.line}>
                        <td className="px-4 py-2 tabular-nums text-ink-muted">{s.line}</td>
                        <td className="px-4 py-2 font-medium text-ink">{s.name}</td>
                        <td className="px-4 py-2 font-mono text-xs text-ink-muted">
                          {s.admission}
                        </td>
                        <td className="px-4 py-2 text-ink-muted">{s.className || "—"}</td>
                      </tr>
                    ))}
                  </Table>
                </div>
              )}
              <button
                type="button"
                onClick={onCommit}
                disabled={pending}
                className={`${btnPrimary} mt-5`}
              >
                {pending ? "Enrolling…" : `Enrol ${result.total} students`}
              </button>
              <p className="mt-2 text-xs text-ink-muted">
                All of them, or none. If any row fails, nothing is saved.
              </p>
            </>
          ) : null}
        </Card>
      )}
    </>
  );
}
