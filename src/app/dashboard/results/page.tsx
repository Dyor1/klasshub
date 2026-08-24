import { createClient } from "@/lib/supabase/server";
import { requireViewer, currentAcademicYear, TERMS } from "@/lib/auth";
import { PageHeader, Card, EmptyState, Table, Chip, inputClass } from "@/components/ui";
import ResultsGrid from "./ResultsGrid";
import { setPublished } from "./actions";

export const metadata = { title: "Results — KlassHub" };

type Search = {
  class?: string;
  subject?: string;
  term?: string;
  year?: string;
};

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const viewer = await requireViewer();
  const supabase = await createClient();

  // ------------------------------------------------------- student / parent
  // Neither sees the entry grid. RLS hides unpublished rows, and limits a
  // parent to their linked children.
  if (!viewer.isStaff) {
    const isParent = viewer.role === "parent";

    const [{ data: mine }, { data: kids }] = await Promise.all([
      supabase
        .from("results")
        .select(
          "id, student_id, academic_year, term, ca_score, exam_score, total_score, percentage, grade, subjects(name)"
        )
        .order("academic_year", { ascending: false })
        .order("term"),
      supabase.from("students").select("id, surname, first_name"),
    ]);

    const childName = new Map(
      (kids ?? []).map((s) => [s.id, `${s.surname} ${s.first_name}`])
    );
    // Only worth naming the student when a parent has more than one child.
    const showWho = isParent && (kids?.length ?? 0) > 1;

    return (
      <>
        <PageHeader
          title={isParent ? "Published results" : "My results"}
          subtitle="Results your school has published."
        />
        {!mine || mine.length === 0 ? (
          <EmptyState
            title="No published results yet"
            hint={
              isParent
                ? "Results appear here once the school publishes them for your children."
                : "Results appear here once your teachers publish them."
            }
          />
        ) : (
          <Table
            head={[
              ...(showWho ? ["Student"] : []),
              "Session",
              "Term",
              "Subject",
              "CA",
              "Exam",
              "Total",
              "%",
              "Grade",
            ]}
          >
            {mine.map((r) => {
              const subject = r.subjects as { name: string } | null;
              return (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  {showWho && (
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {childName.get(r.student_id) ?? "—"}
                    </td>
                  )}
                  <td className="px-4 py-3 text-slate-600">{r.academic_year}</td>
                  <td className="px-4 py-3 capitalize text-slate-600">{r.term}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {subject?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.ca_score}</td>
                  <td className="px-4 py-3 text-slate-600">{r.exam_score}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{r.total_score}</td>
                  <td className="px-4 py-3 text-slate-600">{r.percentage}%</td>
                  <td className="px-4 py-3">
                    {r.grade ? <Chip tone="brand">{r.grade}</Chip> : <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </>
    );
  }

  // ------------------------------------------------------------------ staff
  const [{ data: classes }, { data: subjects }] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name, academic_year")
      .order("academic_year", { ascending: false })
      .order("name"),
    supabase.from("subjects").select("id, name").order("name"),
  ]);

  const year = sp.year?.trim() || currentAcademicYear();
  // Narrowed rather than cast, so a bogus ?term= in the URL falls back safely
  // instead of reaching the query.
  const termValues = TERMS.map((t) => t.value);
  const term = termValues.includes(sp.term as (typeof termValues)[number])
    ? (sp.term as (typeof termValues)[number])
    : "first";
  const classId = sp.class || "";
  const subjectId = sp.subject || "";
  const ready = Boolean(classId && subjectId);

  let rows: {
    studentId: string;
    name: string;
    admissionNumber: string;
    ca: number | null;
    exam: number | null;
  }[] = [];
  let caMax = 40;
  let examMax = 60;
  let anyPublished = false;
  let hasExisting = false;

  if (ready) {
    const [{ data: students }, { data: existing }] = await Promise.all([
      supabase
        .from("students")
        .select("id, surname, first_name, other_names, admission_number")
        .eq("class_id", classId)
        .eq("status", "active")
        .order("surname"),
      supabase
        .from("results")
        .select("student_id, ca_score, exam_score, ca_max, exam_max, published")
        .eq("class_id", classId)
        .eq("subject_id", subjectId)
        .eq("academic_year", year)
        .eq("term", term),
    ]);

    const byStudent = new Map((existing ?? []).map((r) => [r.student_id, r]));
    hasExisting = (existing ?? []).length > 0;
    anyPublished = (existing ?? []).some((r) => r.published);
    if (existing && existing.length > 0) {
      caMax = Number(existing[0].ca_max);
      examMax = Number(existing[0].exam_max);
    }

    rows = (students ?? []).map((s) => {
      const r = byStudent.get(s.id);
      return {
        studentId: s.id,
        name: [s.surname, s.first_name, s.other_names].filter(Boolean).join(" "),
        admissionNumber: s.admission_number,
        ca: r ? Number(r.ca_score) : null,
        exam: r ? Number(r.exam_score) : null,
      };
    });
  }

  const noSetup = !classes?.length || !subjects?.length;

  return (
    <>
      <PageHeader
        title="Results"
        subtitle="Record continuous assessment and exam marks, then publish them."
      />

      {noSetup ? (
        <EmptyState
          title="Set up classes and subjects first"
          hint="You need at least one class and one subject before recording results."
        />
      ) : (
        <>
          <Card className="mb-6">
            <form method="get" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-600">Class</span>
                <select name="class" defaultValue={classId} className={inputClass}>
                  <option value="">Select…</option>
                  {classes!.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.academic_year})
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-600">Subject</span>
                <select name="subject" defaultValue={subjectId} className={inputClass}>
                  <option value="">Select…</option>
                  {subjects!.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
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
                Load
              </button>
            </form>
          </Card>

          {!ready ? (
            <EmptyState
              title="Choose a class and subject"
              hint="Pick from the filters above to start entering marks."
            />
          ) : rows.length === 0 ? (
            <EmptyState
              title="No active students in this class"
              hint="Enrol students and assign them to this class first."
            />
          ) : (
            <>
              {hasExisting && (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {anyPublished ? "Published to students" : "Draft — not visible to students"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {anyPublished
                        ? "Students in this class can see these marks."
                        : "Publish when you're ready for students to see these marks."}
                    </p>
                  </div>
                  <form action={setPublished}>
                    <input type="hidden" name="class_id" value={classId} />
                    <input type="hidden" name="subject_id" value={subjectId} />
                    <input type="hidden" name="academic_year" value={year} />
                    <input type="hidden" name="term" value={term} />
                    <input type="hidden" name="published" value={String(!anyPublished)} />
                    <button
                      type="submit"
                      className={`h-10 rounded-lg px-5 text-sm font-semibold transition-colors ${
                        anyPublished
                          ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          : "bg-emerald-600 text-white hover:bg-emerald-700"
                      }`}
                    >
                      {anyPublished ? "Unpublish" : "Publish results"}
                    </button>
                  </form>
                </div>
              )}

              <ResultsGrid
                rows={rows}
                classId={classId}
                subjectId={subjectId}
                academicYear={year}
                term={term}
                caMax={caMax}
                examMax={examMax}
              />
            </>
          )}
        </>
      )}
    </>
  );
}
