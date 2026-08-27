import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireViewer, currentAcademicYear, TERMS } from "@/lib/auth";
import { PageHeader, Card, StatCard, EmptyState, Chip, Table, inputClass } from "@/components/ui";
import { IconTrend, IconCheckCircle, IconUsers, IconWallet } from "@/components/icons";
import { BarRow, Columns, Sparkline, StackedBar, naira, toneFor } from "./charts";

export const metadata = { title: "Analytics — KlassHub" };

type Search = { class?: string; term?: string; year?: string };
type TermValue = (typeof TERMS)[number]["value"];

/** Postgres cannot prove a column coming out of a view is non-null, so every
 *  aggregate arrives as `| null`. Everything here is a count or a sum, and an
 *  absent one means zero. */
const n = (v: string | number | null | undefined) => (v == null ? 0 : Number(v));

/** Attendance rate counts 'late' as present — the student was in school. */
function attendanceRate(r: { present: number; late: number; marked: number }): number | null {
  return r.marked > 0 ? ((r.present + r.late) / r.marked) * 100 : null;
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const viewer = await requireViewer();
  // Every view below is security_invoker, so a parent would get a "class
  // average" computed over their own child alone — true, but meaningless.
  if (!viewer.isStaff) redirect("/dashboard");

  const sp = await searchParams;
  const supabase = await createClient();

  const year = sp.year?.trim() || currentAcademicYear();
  const termValues = TERMS.map((t) => t.value);
  const term: TermValue = termValues.includes(sp.term as TermValue)
    ? (sp.term as TermValue)
    : "first";
  const classId = sp.class || "";

  // Built up rather than composed through a helper: supabase-js query builders
  // carry their row type in the generic, and routing them through a wrapper
  // collapses it to a union of every table in the schema.
  let subjectQ = supabase
    .from("class_subject_performance")
    .select("subject_id, entries, avg_percentage, passed, lowest_percentage, highest_percentage")
    .eq("academic_year", year)
    .eq("term", term);
  if (classId) subjectQ = subjectQ.eq("class_id", classId);

  let gradeQ = supabase
    .from("grade_distribution")
    .select("grade, entries")
    .eq("academic_year", year)
    .eq("term", term);
  if (classId) gradeQ = gradeQ.eq("class_id", classId);

  let feeQ = supabase
    .from("fee_summary")
    .select("billed, collected, outstanding, unpaid")
    .eq("academic_year", year)
    .eq("term", term);
  if (classId) feeQ = feeQ.eq("class_id", classId);

  // Only the tail of the distribution is needed, so this fetch is bounded by
  // the limit rather than by enrolment.
  let weakestQ = supabase
    .from("student_term_summary")
    .select("student_id, class_id, avg_percentage, subjects_taken, subjects_failed")
    .eq("academic_year", year)
    .eq("term", term)
    .order("avg_percentage", { ascending: true })
    .limit(10);
  if (classId) weakestQ = weakestQ.eq("class_id", classId);

  const [
    { data: classes },
    { data: subjects },
    { data: classTerms },
    { data: subjectRows },
    { data: gradeRows },
    { data: feeRows },
    { data: attDays },
    { data: attMonths },
    { data: weakest },
    { data: students },
    { data: school },
  ] = await Promise.all([
    supabase.from("classes").select("id, name").order("name"),
    supabase.from("subjects").select("id, name").order("name"),
    // The whole session, so the term-on-term trend comes from the same fetch.
    supabase
      .from("class_term_summary")
      .select("class_id, term, students, entries, avg_percentage, passed")
      .eq("academic_year", year),
    subjectQ,
    gradeQ,
    feeQ,
    supabase
      .from("attendance_daily")
      .select("date, marked, present, late")
      .order("date", { ascending: false })
      .limit(40),
    supabase.from("attendance_monthly").select("class_id, marked, present, late"),
    weakestQ,
    supabase.from("students").select("id, surname, first_name, admission_number"),
    supabase.from("schools").select("name, pass_mark").single(),
  ]);

  const passMark = n(school?.pass_mark ?? 40);
  const className = new Map((classes ?? []).map((c) => [c.id, c.name]));
  const subjectName = new Map((subjects ?? []).map((s) => [s.id, s.name]));
  const studentById = new Map((students ?? []).map((s) => [s.id, s]));

  /* ------------------------------------------------------ headline numbers */
  const thisTerm = (classTerms ?? []).filter(
    (r) => r.term === term && (!classId || r.class_id === classId)
  );
  const entries = thisTerm.reduce((sum, r) => sum + n(r.entries), 0);
  const passed = thisTerm.reduce((sum, r) => sum + n(r.passed), 0);
  // Weighted by entries, so a 4-student class does not swing the school mean
  // as hard as a 40-student one.
  const avgPct =
    entries > 0
      ? thisTerm.reduce((sum, r) => sum + n(r.avg_percentage) * n(r.entries), 0) / entries
      : null;
  const passRate = entries > 0 ? (passed / entries) * 100 : null;

  const attTotals = (attDays ?? []).reduce(
    (acc, d) => ({
      marked: acc.marked + n(d.marked),
      present: acc.present + n(d.present),
      late: acc.late + n(d.late),
    }),
    { marked: 0, present: 0, late: 0 }
  );
  const attRate = attendanceRate(attTotals);

  // Explicit accumulator type: the zeroed seed is assignable to the row type,
  // so without it TS infers the (nullable) row shape as the accumulator.
  const fees = (feeRows ?? []).reduce<{
    billed: number;
    collected: number;
    outstanding: number;
    unpaid: number;
  }>(
    (acc, f) => ({
      billed: acc.billed + n(f.billed),
      collected: acc.collected + n(f.collected),
      outstanding: acc.outstanding + n(f.outstanding),
      unpaid: acc.unpaid + n(f.unpaid),
    }),
    { billed: 0, collected: 0, outstanding: 0, unpaid: 0 }
  );
  const collectionRate = fees.billed > 0 ? (fees.collected / fees.billed) * 100 : null;

  /* ----------------------------------------------------------- derivations */
  // class_subject_performance is per class, so a school-wide view has one row
  // per class per subject. Fold them back together, weighting by entries.
  const subjectFold = new Map<
    string,
    { entries: number; weighted: number; passed: number; lowest: number; highest: number }
  >();
  for (const r of subjectRows ?? []) {
    const name = subjectName.get(r.subject_id ?? "") ?? "—";
    const cur = subjectFold.get(name) ?? {
      entries: 0,
      weighted: 0,
      passed: 0,
      lowest: 100,
      highest: 0,
    };
    cur.entries += n(r.entries);
    cur.weighted += n(r.avg_percentage) * n(r.entries);
    cur.passed += n(r.passed);
    cur.lowest = Math.min(cur.lowest, n(r.lowest_percentage));
    cur.highest = Math.max(cur.highest, n(r.highest_percentage));
    subjectFold.set(name, cur);
  }

  // Worst subject first: this list exists to be acted on.
  const subjectStats = [...subjectFold.entries()]
    .map(([name, s]) => ({
      name,
      entries: s.entries,
      avg: s.entries > 0 ? s.weighted / s.entries : 0,
      passRate: s.entries > 0 ? (s.passed / s.entries) * 100 : 0,
      lowest: s.lowest,
      highest: s.highest,
    }))
    .sort((a, b) => a.avg - b.avg);

  const attByClass = new Map<string, { marked: number; present: number; late: number }>();
  for (const m of attMonths ?? []) {
    if (!m.class_id) continue;
    const cur = attByClass.get(m.class_id) ?? { marked: 0, present: 0, late: 0 };
    cur.marked += n(m.marked);
    cur.present += n(m.present);
    cur.late += n(m.late);
    attByClass.set(m.class_id, cur);
  }

  const classStats = (classes ?? [])
    .map((c) => {
      const row = thisTerm.find((r) => r.class_id === c.id);
      const att = attByClass.get(c.id);
      const rowEntries = n(row?.entries);
      return {
        id: c.id,
        name: c.name,
        students: n(row?.students),
        entries: rowEntries,
        avg: row ? n(row.avg_percentage) : null,
        passRate: rowEntries > 0 ? (n(row?.passed) / rowEntries) * 100 : null,
        attendance: att ? attendanceRate(att) : null,
      };
    })
    .filter((c) => c.entries > 0 || c.attendance != null)
    .sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1));

  const trend = TERMS.map((t) => {
    const rows = (classTerms ?? []).filter(
      (r) => r.term === t.value && (!classId || r.class_id === classId)
    );
    const count = rows.reduce((sum, r) => sum + n(r.entries), 0);
    return {
      label: t.label.replace(" Term", ""),
      entries: count,
      avg:
        count > 0
          ? rows.reduce((sum, r) => sum + n(r.avg_percentage) * n(r.entries), 0) / count
          : null,
      passRate:
        count > 0 ? (rows.reduce((sum, r) => sum + n(r.passed), 0) / count) * 100 : null,
    };
  });

  const gradeTotals = new Map<string, number>();
  for (const g of gradeRows ?? []) {
    if (g.grade) gradeTotals.set(g.grade, (gradeTotals.get(g.grade) ?? 0) + n(g.entries));
  }
  const gradeData = [...gradeTotals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([grade, count]) => ({
      label: grade,
      value: count,
      // Fail letters read red regardless of where the school drew the line.
      color: grade.toUpperCase().startsWith("F") ? "#dc2626" : "#4f46e5",
    }));

  const attTrend = [...(attDays ?? [])].reverse().map((d) => ({
    label: new Date(d.date ?? "").toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    }),
    value:
      attendanceRate({ marked: n(d.marked), present: n(d.present), late: n(d.late) }) ?? 0,
  }));

  const atRisk = (weakest ?? [])
    .filter((s) => n(s.avg_percentage) < passMark || n(s.subjects_failed) >= 2)
    .map((s) => {
      const st = studentById.get(s.student_id ?? "");
      return {
        id: s.student_id ?? "",
        name: st ? `${st.surname} ${st.first_name}` : "Unknown",
        admissionNumber: st?.admission_number ?? "",
        className: className.get(s.class_id ?? "") ?? "—",
        avg: n(s.avg_percentage),
        failed: n(s.subjects_failed),
        taken: n(s.subjects_taken),
      };
    });

  const termLabel = TERMS.find((t) => t.value === term)?.label ?? "Term";
  const noData = entries === 0 && attTotals.marked === 0 && fees.billed === 0;

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle={`How ${school?.name ?? "your school"} is doing. A pass is ${passMark}% or above.`}
        action={
          <Link
            href="/dashboard/settings"
            className="text-sm font-medium text-slate-500 hover:text-brand-600"
          >
            Change pass mark
          </Link>
        }
      />

      <Card className="mb-6">
        <form method="get" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-600">Class</span>
            <select name="class" defaultValue={classId} className={inputClass}>
              <option value="">All classes</option>
              {(classes ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-600">Term</span>
            <select name="term" defaultValue={term} className={inputClass}>
              {TERMS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-600">Session</span>
            <input name="year" defaultValue={year} className={inputClass} />
          </label>
          <button
            type="submit"
            className="h-11 rounded-lg border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Apply
          </button>
        </form>
      </Card>

      {noData ? (
        <EmptyState
          title="Nothing to measure yet"
          hint="Analytics builds itself from results, attendance and fees. Record some for this term and the numbers appear here."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label={`Average of ${entries} result${entries === 1 ? "" : "s"}`}
              value={avgPct == null ? "—" : `${avgPct.toFixed(1)}%`}
              tone="brand"
              icon={<IconTrend />}
            />
            <StatCard
              label="Pass rate"
              value={passRate == null ? "—" : `${passRate.toFixed(1)}%`}
              tone="green"
              icon={<IconCheckCircle />}
            />
            <StatCard
              label={`Attendance, last ${attDays?.length ?? 0} days`}
              value={attRate == null ? "—" : `${attRate.toFixed(1)}%`}
              href="/dashboard/attendance"
              tone="blue"
              icon={<IconUsers />}
            />
            <StatCard
              label="Fees collected"
              value={collectionRate == null ? "—" : `${collectionRate.toFixed(0)}%`}
              href="/dashboard/fees"
              tone="amber"
              icon={<IconWallet />}
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card
              title="Subjects, weakest first"
              description={`Average score per subject${classId ? "" : ", across every class"}.`}
            >
              {subjectStats.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">
                  No results recorded for this term.
                </p>
              ) : (
                <div className="divide-y divide-slate-50">
                  {subjectStats.map((s) => (
                    <BarRow
                      key={s.name}
                      label={s.name}
                      sublabel={`${s.entries} entries · ${s.passRate.toFixed(0)}% passed · ${s.lowest}–${s.highest}%`}
                      value={s.avg}
                    />
                  ))}
                </div>
              )}
            </Card>

            <Card title="Grade spread" description={`Every grade awarded in ${termLabel.toLowerCase()}.`}>
              {gradeData.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">No grades awarded yet.</p>
              ) : (
                <Columns data={gradeData} />
              )}
            </Card>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card title="Term on term" description={`Averages across ${year}.`}>
              <div className="divide-y divide-slate-50">
                {trend.map((t) =>
                  t.avg == null ? (
                    <div key={t.label} className="flex items-center gap-3 py-2">
                      <span className="w-36 shrink-0 text-sm font-medium text-slate-400 sm:w-44">
                        {t.label}
                      </span>
                      <span className="text-xs text-slate-400">Not recorded</span>
                    </div>
                  ) : (
                    <BarRow
                      key={t.label}
                      label={t.label}
                      sublabel={`${t.entries} entries · ${t.passRate?.toFixed(0)}% passed`}
                      value={t.avg}
                    />
                  )
                )}
              </div>
            </Card>

            <Card
              title="Attendance trend"
              description={
                classId
                  ? "Present or late as a share of everyone marked. Whole school — attendance is not split by class here."
                  : "Present or late, as a share of everyone marked that day."
              }
            >
              <Sparkline points={attTrend} />
            </Card>
          </div>

          <Card title="Fee collection" description={`${termLabel}, ${year}.`} className="mt-6">
            {fees.billed === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">
                No invoices issued for this term.
              </p>
            ) : (
              <>
                <StackedBar
                  segments={[
                    { label: "Collected", value: fees.collected, color: "#059669" },
                    { label: "Outstanding", value: fees.outstanding, color: "#e2e8f0" },
                  ]}
                />
                <p className="mt-4 text-sm text-slate-500">
                  {naira(fees.billed)} billed.{" "}
                  {fees.unpaid > 0 && (
                    <span className="font-medium text-amber-700">
                      {fees.unpaid} student{fees.unpaid === 1 ? " has" : "s have"} paid nothing
                      yet.
                    </span>
                  )}
                </p>
              </>
            )}
          </Card>

          {!classId && classStats.length > 0 && (
            <div className="mt-6">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                By class
              </h2>
              <Table head={["Class", "Students", "Average", "Pass rate", "Attendance"]}>
                {classStats.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-semibold text-slate-900">{c.name}</td>
                    <td className="px-4 py-3 text-slate-600">{c.students || "—"}</td>
                    <td className="px-4 py-3">
                      {c.avg == null ? (
                        <span className="text-slate-300">—</span>
                      ) : (
                        <span className={`font-bold tabular-nums ${toneFor(c.avg).text}`}>
                          {c.avg.toFixed(1)}%
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-600">
                      {c.passRate == null ? "—" : `${c.passRate.toFixed(0)}%`}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-600">
                      {c.attendance == null ? "—" : `${c.attendance.toFixed(1)}%`}
                    </td>
                  </tr>
                ))}
              </Table>
            </div>
          )}

          <div className="mt-6">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
              Needs attention
            </h2>
            {atRisk.length === 0 ? (
              <Card>
                <p className="text-sm text-slate-500">
                  No student is below {passMark}% or failing two or more subjects this term.
                </p>
              </Card>
            ) : (
              <Table head={["Student", "Class", "Average", "Failed", ""]}>
                {atRisk.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{s.name}</p>
                      <p className="text-xs text-slate-400">{s.admissionNumber}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.className}</td>
                    <td className="px-4 py-3">
                      <span className={`font-bold tabular-nums ${toneFor(s.avg).text}`}>
                        {s.avg.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Chip tone={s.failed >= 3 ? "red" : "amber"}>
                        {s.failed} of {s.taken}
                      </Chip>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/report-cards/${s.id}`}
                        className="text-sm font-semibold text-brand-600 hover:text-brand-700"
                      >
                        Report card
                      </Link>
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </div>
        </>
      )}
    </>
  );
}
