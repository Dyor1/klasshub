import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireViewer, currentAcademicYear, TERMS } from "@/lib/auth";
import {
  PageHeader,
  Card,
  EmptyState,
  Table,
  Chip,
  Avatar,
  inputClass,
  btnGhost,
} from "@/components/ui";

export const metadata = { title: "Report cards — KlassHub" };

export default async function ReportCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string; term?: string; year?: string }>;
}) {
  const sp = await searchParams;
  const viewer = await requireViewer();
  const supabase = await createClient();

  const year = sp.year?.trim() || currentAcademicYear();
  const termValues = TERMS.map((t) => t.value);
  const term = termValues.includes(sp.term as (typeof termValues)[number])
    ? (sp.term as (typeof termValues)[number])
    : "first";

  // Students and parents get a card per accessible student. RLS already limits
  // this to "yourself" or "your linked children" — a parent may have several,
  // so this must not assume a single row.
  if (!viewer.isStaff) {
    const { data: mine } = await supabase
      .from("students")
      .select("id, surname, first_name, other_names, admission_number, class_id")
      .order("surname");

    const isParent = viewer.role === "parent";

    return (
      <>
        <PageHeader
          title={isParent ? "Report cards" : "My report card"}
          subtitle="Published results, per term."
        />
        {!mine || mine.length === 0 ? (
          <EmptyState
            title={isParent ? "No children linked yet" : "No student record linked"}
            hint="Ask your school administrator to link your account."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {mine.map((s) => {
              const name = [s.surname, s.first_name, s.other_names]
                .filter(Boolean)
                .join(" ");
              return (
                <Card key={s.id}>
                  <div className="flex items-center gap-3">
                    <Avatar name={name} />
                    <div className="min-w-0">
                      <p className="truncate font-bold text-ink">{name}</p>
                      <p className="font-mono text-xs text-ink-muted">
                        {s.admission_number}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {TERMS.map((t) => (
                      <Link
                        key={t.value}
                        href={`/dashboard/report-cards/${s.id}?year=${encodeURIComponent(year)}&term=${t.value}`}
                        className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-hover"
                      >
                        {t.label.replace(" Term", "")}
                      </Link>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </>
    );
  }

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, academic_year")
    .order("academic_year", { ascending: false })
    .order("name");

  const classId = sp.class || "";

  const { data: students } = classId
    ? await supabase
        .from("students")
        .select("id, surname, first_name, other_names, admission_number")
        .eq("class_id", classId)
        .eq("status", "active")
        .order("surname")
    : { data: null };

  // How many subjects each student already has marks for this term.
  const { data: counts } = classId
    ? await supabase
        .from("results")
        .select("student_id, published")
        .eq("class_id", classId)
        .eq("academic_year", year)
        .eq("term", term)
    : { data: null };

  const recorded = new Map<string, { total: number; published: number }>();
  for (const r of counts ?? []) {
    const cur = recorded.get(r.student_id) ?? { total: 0, published: 0 };
    cur.total += 1;
    if (r.published) cur.published += 1;
    recorded.set(r.student_id, cur);
  }

  return (
    <>
      <PageHeader
        title="Report cards"
        subtitle="Generate a termly report card for any student."
      />

      {!classes || classes.length === 0 ? (
        <EmptyState
          title="No classes yet"
          hint="Create a class and record some results first."
        />
      ) : (
        <>
          <Card className="mb-6">
            <form method="get" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-ink-muted">Class</span>
                <select name="class" defaultValue={classId} className={inputClass}>
                  <option value="">Select…</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.academic_year})
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-ink-muted">Term</span>
                <select name="term" defaultValue={term} className={inputClass}>
                  {TERMS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-ink-muted">Session</span>
                <input name="year" defaultValue={year} className={inputClass} />
              </label>
              <button type="submit" className={btnGhost}>
                Load class
              </button>
            </form>
          </Card>

          {!classId ? (
            <EmptyState title="Choose a class" hint="Pick a class above to list its students." />
          ) : !students || students.length === 0 ? (
            <EmptyState
              title="No active students in this class"
              hint="Enrol students into this class first."
            />
          ) : (
            <Table head={["Student", "Admission no.", "Subjects recorded", "Status", ""]}>
              {students.map((s) => {
                const name = [s.surname, s.first_name, s.other_names].filter(Boolean).join(" ");
                const rec = recorded.get(s.id);
                return (
                  <tr key={s.id} className="hover:bg-hover">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={name} />
                        <span className="font-medium text-ink">{name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                      {s.admission_number}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{rec?.total ?? 0}</td>
                    <td className="px-4 py-3">
                      {!rec ? (
                        <Chip tone="slate">No marks</Chip>
                      ) : rec.published === rec.total ? (
                        <Chip tone="green">Published</Chip>
                      ) : (
                        <Chip tone="amber">Draft</Chip>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/report-cards/${s.id}?year=${encodeURIComponent(year)}&term=${term}`}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-brand-700 dark:text-brand-300 hover:bg-brand-500/10"
                      >
                        View card
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </Table>
          )}
        </>
      )}
    </>
  );
}
