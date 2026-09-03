import Link from "next/link";
import { notFound } from "next/navigation";
import { LogoMark } from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";
import { requireViewer, currentAcademicYear, TERMS } from "@/lib/auth";
import { EmptyState, btnGhost, btnPrimary } from "@/components/ui";
import PrintButton from "./PrintButton";

export const metadata = { title: "Report card — KlassHub" };

export default async function ReportCardPage({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ year?: string; term?: string }>;
}) {
  const { studentId } = await params;
  const sp = await searchParams;
  await requireViewer();
  const supabase = await createClient();

  const year = sp.year?.trim() || currentAcademicYear();
  const termValues = TERMS.map((t) => t.value);
  const term = termValues.includes(sp.term as (typeof termValues)[number])
    ? (sp.term as (typeof termValues)[number])
    : "first";
  const termLabel = TERMS.find((t) => t.value === term)?.label ?? "Term";

  // RLS decides visibility: staff see any student in their school, a student
  // only their own record and only published marks.
  const { data: student } = await supabase
    .from("students")
    .select("id, surname, first_name, other_names, admission_number, class_id, gender")
    .eq("id", studentId)
    .maybeSingle();

  if (!student) notFound();

  const [{ data: school }, { data: rows }, { data: bands }, { data: klass }] =
    await Promise.all([
      supabase.from("schools").select("name, slug").single(),
      supabase
        .from("results_ranked")
        .select(
          "subject_id, ca_score, ca_max, exam_score, exam_max, total_score, percentage, grade, subject_position, subject_cohort, published, remarks"
        )
        .eq("student_id", studentId)
        .eq("academic_year", year)
        .eq("term", term),
      supabase
        .from("grade_bands")
        .select("grade, min_score, max_score, remark")
        .order("sort_order"),
      student.class_id
        ? supabase
            .from("classes")
            .select("name, section, grade_level")
            .eq("id", student.class_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const { data: subjects } = await supabase.from("subjects").select("id, name");
  const subjectName = new Map((subjects ?? []).map((s) => [s.id, s.name]));

  const results = (rows ?? []).sort((a, b) =>
    (subjectName.get(a.subject_id ?? "") ?? "").localeCompare(
      subjectName.get(b.subject_id ?? "") ?? ""
    )
  );

  const fullName = [student.surname, student.first_name, student.other_names]
    .filter(Boolean)
    .join(" ");

  const obtained = results.reduce((sum, r) => sum + Number(r.total_score ?? 0), 0);
  const obtainable = results.reduce(
    (sum, r) => sum + Number(r.ca_max) + Number(r.exam_max),
    0
  );
  const average = obtainable > 0 ? Math.round((obtained / obtainable) * 1000) / 10 : 0;
  const overallGrade =
    (bands ?? []).find((b) => average >= Number(b.min_score) && average <= Number(b.max_score)) ??
    null;
  const anyDraft = results.some((r) => !r.published);

  return (
    <>
      {/* Controls — never printed */}
      <div className="kh-no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/dashboard/report-cards?class=${student.class_id ?? ""}&year=${encodeURIComponent(year)}&term=${term}`}
          className="text-sm text-ink-muted hover:text-brand-600 dark:text-brand-300"
        >
          &larr; Back to report cards
        </Link>
        <div className="flex items-center gap-2">
          {TERMS.map((t) => (
            <Link
              key={t.value}
              href={`/dashboard/report-cards/${studentId}?year=${encodeURIComponent(year)}&term=${t.value}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                t.value === term
                  ? "bg-brand-500/10 text-brand-700 dark:text-brand-300"
                  : "text-ink-muted hover:bg-hover"
              }`}
            >
              {t.label.replace(" Term", "")}
            </Link>
          ))}
          <PrintButton className={btnPrimary} />
        </div>
      </div>

      {anyDraft && (
        <p className="kh-no-print mb-4 rounded-lg border border-amber-500/35 bg-amber-500/12 px-3.5 py-2.5 text-sm text-amber-800 dark:text-amber-200">
          Some subjects on this card are still unpublished — students cannot see them yet.
        </p>
      )}

      {results.length === 0 ? (
        <EmptyState
          title={`No results for ${termLabel}`}
          hint="Record marks for this term first, then come back."
          action={
            <Link href="/dashboard/results" className={btnGhost}>
              Go to results
            </Link>
          }
        />
      ) : (
        <article className="kh-print-sheet mx-auto max-w-3xl rounded-2xl border border-line-soft bg-white p-8 shadow-card">
          {/* Masthead */}
          <header className="flex items-start justify-between gap-4 border-b-2 border-brand-900 pb-4">
            <div className="flex items-center gap-3">
              <LogoMark className="h-12 w-12" />
              <div>
                <h1 className="text-xl font-extrabold leading-tight text-brand-900">
                  {school?.name ?? "School"}
                </h1>
                <p className="text-[11px] uppercase tracking-widest text-ink-muted">
                  Termly Report Card
                </p>
              </div>
            </div>
            <div className="text-right text-xs text-ink-muted">
              <p className="font-semibold text-ink">{termLabel}</p>
              <p>{year}</p>
            </div>
          </header>

          {/* Student */}
          <dl className="grid grid-cols-2 gap-x-8 gap-y-2 border-b border-line py-4 text-sm sm:grid-cols-4">
            <div className="col-span-2">
              <dt className="text-[11px] uppercase tracking-wide text-ink-subtle">Student</dt>
              <dd className="font-bold text-ink">{fullName}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-ink-subtle">Admission no.</dt>
              <dd className="font-mono text-xs font-semibold text-ink">
                {student.admission_number}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-ink-subtle">Class</dt>
              <dd className="font-semibold text-ink">
                {klass ? `${klass.name}${klass.section ? ` ${klass.section}` : ""}` : "—"}
              </dd>
            </div>
          </dl>

          {/* Subjects */}
          <table className="mt-5 w-full text-sm">
            <thead>
              <tr className="border-b border-line-strong text-[11px] uppercase tracking-wide text-ink-muted">
                <th className="pb-2 text-left font-semibold">Subject</th>
                <th className="pb-2 text-right font-semibold">CA</th>
                <th className="pb-2 text-right font-semibold">Exam</th>
                <th className="pb-2 text-right font-semibold">Total</th>
                <th className="pb-2 text-right font-semibold">%</th>
                <th className="pb-2 text-center font-semibold">Grade</th>
                <th className="pb-2 text-right font-semibold">Position</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {results.map((r) => (
                <tr key={r.subject_id}>
                  <td className="py-2 font-medium text-ink">
                    {subjectName.get(r.subject_id ?? "") ?? "—"}
                  </td>
                  <td className="py-2 text-right text-ink-muted">{r.ca_score}</td>
                  <td className="py-2 text-right text-ink-muted">{r.exam_score}</td>
                  <td className="py-2 text-right font-semibold text-ink">
                    {r.total_score}
                  </td>
                  <td className="py-2 text-right text-ink-muted">{r.percentage}%</td>
                  <td className="py-2 text-center">
                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-brand-500/10 px-1.5 text-xs font-bold text-brand-700 dark:text-brand-300">
                      {r.grade ?? "—"}
                    </span>
                  </td>
                  <td className="py-2 text-right text-ink-muted">
                    {r.subject_position}
                    <span className="text-ink-subtle">/{r.subject_cohort}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Summary */}
          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            {[
              { label: "Subjects", value: results.length },
              { label: "Marks obtained", value: `${obtained} / ${obtainable}` },
              { label: "Average", value: `${average}%` },
              { label: "Overall grade", value: overallGrade?.grade ?? "—" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-sunken px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wide text-ink-subtle">
                  {item.label}
                </p>
                <p className="text-sm font-bold text-brand-900">{item.value}</p>
              </div>
            ))}
          </div>

          {overallGrade?.remark && (
            <p className="mt-4 rounded-xl border border-brand-500/25 bg-brand-500/10 px-4 py-3 text-sm text-brand-900">
              <span className="font-semibold">Overall remark:</span> {overallGrade.remark}
            </p>
          )}

          {/* Grading key */}
          <div className="mt-6 border-t border-line pt-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-ink-subtle">
              Grading scale
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-muted">
              {(bands ?? []).map((b) => (
                <span key={b.grade}>
                  <span className="font-bold text-ink">{b.grade}</span> {b.min_score}–
                  {b.max_score}
                  {b.remark ? ` (${b.remark})` : ""}
                </span>
              ))}
            </div>
          </div>

          {/* Signatures */}
          <div className="mt-10 grid grid-cols-2 gap-10">
            {["Class teacher", "Head teacher"].map((role) => (
              <div key={role}>
                <div className="h-10 border-b border-line-strong" />
                <p className="mt-1 text-[11px] uppercase tracking-wide text-ink-muted">{role}</p>
              </div>
            ))}
          </div>
        </article>
      )}
    </>
  );
}
