import { createClient } from "@/lib/supabase/server";
import { requireViewer, currentAcademicYear } from "@/lib/auth";
import { PageHeader, Card, EmptyState, Table, Chip } from "@/components/ui";
import { FilterBar, SearchField, SelectField, FilterActions, ResultCount } from "@/components/Filters";
import { searchClauses, displayTerm } from "@/lib/search";
import ClassForm from "./ClassForm";
import { deleteClass } from "./actions";

export const metadata = { title: "Classes — KlassHub" };

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; year?: string }>;
}) {
  const sp = await searchParams;
  const term = displayTerm(sp.q);
  const year = sp.year ?? "";
  const isFiltered = Boolean(term || year);

  const viewer = await requireViewer();
  const supabase = await createClient();

  // RLS scopes all three queries to the viewer's school.
  const [{ data: classes }, { data: teachers }, { data: students }, { data: allYears }] =
    await Promise.all([
    (async () => {
      let q = supabase
        .from("classes")
        .select("id, name, grade_level, section, academic_year, capacity, class_teacher_id")
        .order("academic_year", { ascending: false })
        .order("name");
      if (year) q = q.eq("academic_year", year);
      for (const clause of searchClauses(["name", "grade_level", "section"], term)) q = q.or(clause);
      return q;
    })(),
    supabase
      .from("profiles")
      .select("id, full_name")
      .in("role", ["teacher", "admin"])
      .order("full_name"),
    supabase.from("students").select("id, class_id"),
    // Sessions come from their own query, not from the filtered list — reading
    // them off `classes` would mean picking a session removed every other
    // option from the dropdown, leaving no way back.
    supabase
      .from("classes")
      .select("academic_year")
      .order("academic_year", { ascending: false }),
  ]);

  const sessions = [...new Set((allYears ?? []).map((c) => c.academic_year))];

  const teacherById = new Map((teachers ?? []).map((t) => [t.id, t.full_name]));
  const countByClass = new Map<string, number>();
  for (const s of students ?? []) {
    if (s.class_id) countByClass.set(s.class_id, (countByClass.get(s.class_id) ?? 0) + 1);
  }

  return (
    <>
      <PageHeader
        title="Classes"
        subtitle="Every class in your school, grouped by session."
      />

      {viewer.isStaff && (
        <Card
          title="Add a class"
          description="Sessions run September to July, e.g. 2026/2027."
          className="mb-8"
        >
          <ClassForm
            teachers={teachers ?? []}
            defaultYear={currentAcademicYear()}
          />
        </Card>
      )}

      <FilterBar>
        <SearchField defaultValue={term} placeholder="Class, grade or section…" />
        <SelectField
          name="year"
          label="Session"
          defaultValue={year}
          allLabel="All sessions"
          options={sessions.map((y) => ({ value: y, label: y }))}
        />
        <FilterActions clearHref="/dashboard/classes" isFiltered={isFiltered} />
      </FilterBar>

      {classes && classes.length > 0 && (
        <ResultCount shown={classes.length} noun="class" term={term || undefined} />
      )}

      {!classes || classes.length === 0 ? (
        <EmptyState
          title="No classes yet"
          hint={
            viewer.isStaff
              ? "Add your first class above to start enrolling students."
              : "Your administrator hasn't created any classes yet."
          }
        />
      ) : (
        <Table
          head={
            viewer.isStaff
              ? ["Class", "Grade", "Session", "Class teacher", "Students", ""]
              : ["Class", "Grade", "Session", "Class teacher", "Students"]
          }
        >
          {classes.map((c) => {
            const enrolled = countByClass.get(c.id) ?? 0;
            const full = c.capacity != null && enrolled >= c.capacity;
            return (
              <tr key={c.id} className="hover:bg-hover">
                <td className="px-4 py-3 font-medium text-ink">
                  {c.name}
                  {c.section && <span className="text-ink-subtle"> · {c.section}</span>}
                </td>
                <td className="px-4 py-3 text-ink-muted">{c.grade_level}</td>
                <td className="px-4 py-3 text-ink-muted">{c.academic_year}</td>
                <td className="px-4 py-3 text-ink-muted">
                  {c.class_teacher_id
                    ? teacherById.get(c.class_teacher_id) ?? "—"
                    : <span className="text-ink-subtle">Unassigned</span>}
                </td>
                <td className="px-4 py-3">
                  <Chip tone={full ? "amber" : "slate"}>
                    {enrolled}
                    {c.capacity != null ? ` / ${c.capacity}` : ""}
                  </Chip>
                </td>
                {viewer.isStaff && (
                  <td className="px-4 py-3 text-right">
                    <form action={deleteClass}>
                      <input type="hidden" name="id" value={c.id} />
                      <button
                        type="submit"
                        className="inline-flex min-h-11 items-center rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10"
                      >
                        Delete
                      </button>
                    </form>
                  </td>
                )}
              </tr>
            );
          })}
        </Table>
      )}
    </>
  );
}
