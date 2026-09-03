import { createClient } from "@/lib/supabase/server";
import { requireViewer, currentAcademicYear } from "@/lib/auth";
import { PageHeader, Card, EmptyState, Chip, inputClass, btnGhost } from "@/components/ui";
import SlotForm from "./SlotForm";
import { deleteSlot } from "./actions";

export const metadata = { title: "Timetable — KlassHub" };

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

export default async function TimetablePage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string; year?: string }>;
}) {
  const sp = await searchParams;
  const viewer = await requireViewer();
  const supabase = await createClient();

  const year = sp.year?.trim() || currentAcademicYear();

  const [{ data: classes }, { data: subjects }, { data: teachers }, { data: myStudents }] =
    await Promise.all([
      supabase
        .from("classes")
        .select("id, name, academic_year")
        .order("academic_year", { ascending: false })
        .order("name"),
      supabase.from("subjects").select("id, name").order("name"),
      supabase
        .from("profiles")
        .select("id, full_name")
        .in("role", ["teacher", "admin"])
        .order("full_name"),
      supabase.from("students").select("class_id"),
    ]);

  // A student or parent defaults to the class their child sits in, so the page
  // is useful without them having to pick anything.
  const defaultClass =
    sp.class ||
    (!viewer.isStaff ? (myStudents ?? []).find((s) => s.class_id)?.class_id ?? "" : "");

  const classId = defaultClass;

  const { data: slots } = classId
    ? await supabase
        .from("timetable")
        .select("id, day_of_week, start_time, end_time, room, period_label, subject_id, teacher_id")
        .eq("class_id", classId)
        .eq("academic_year", year)
        .order("start_time")
    : { data: null };

  const subjectName = new Map((subjects ?? []).map((s) => [s.id, s.name]));
  const teacherName = new Map((teachers ?? []).map((t) => [t.id, t.full_name]));
  const selectedClass = (classes ?? []).find((c) => c.id === classId);

  const byDay = new Map<string, NonNullable<typeof slots>>();
  for (const s of slots ?? []) {
    const list = byDay.get(s.day_of_week) ?? [];
    list.push(s);
    byDay.set(s.day_of_week, list);
  }
  const activeDays = DAYS.filter((d) => (byDay.get(d) ?? []).length > 0);

  return (
    <>
      <PageHeader
        title="Timetable"
        subtitle={
          viewer.isStaff
            ? "Weekly periods per class."
            : "Your weekly periods."
        }
        action={
          viewer.isStaff && classId ? (
            <SlotForm
              classId={classId}
              academicYear={year}
              subjects={subjects ?? []}
              teachers={teachers ?? []}
            />
          ) : undefined
        }
      />

      {!classes || classes.length === 0 ? (
        <EmptyState title="No classes yet" hint="Create a class before building a timetable." />
      ) : (
        <>
          {viewer.isStaff && (
            <Card className="mb-6">
              <form method="get" className="grid gap-4 sm:grid-cols-3 sm:items-end">
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
                  <span className="mb-1.5 block text-xs font-medium text-ink-muted">Session</span>
                  <input name="year" defaultValue={year} className={inputClass} />
                </label>
                <button type="submit" className={btnGhost}>
                  Load
                </button>
              </form>
            </Card>
          )}

          {!classId ? (
            <EmptyState
              title={viewer.isStaff ? "Choose a class" : "No class assigned yet"}
              hint={
                viewer.isStaff
                  ? "Pick a class above to view or build its timetable."
                  : "Ask your school administrator to assign a class."
              }
            />
          ) : activeDays.length === 0 ? (
            <EmptyState
              title={`No periods for ${selectedClass?.name ?? "this class"}`}
              hint={
                viewer.isStaff
                  ? "Add periods with the button above."
                  : "Your school hasn't published this timetable yet."
              }
            />
          ) : (
            <div className="space-y-5">
              {activeDays.map((day) => (
                <section key={day}>
                  <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-muted">
                    {day}
                  </h2>
                  <div className="overflow-hidden rounded-xl border border-line bg-card">
                    <ul className="divide-y divide-line-soft">
                      {(byDay.get(day) ?? []).map((s) => (
                        <li
                          key={s.id}
                          className="flex flex-wrap items-center gap-3 px-4 py-3"
                        >
                          <span className="w-28 shrink-0 font-mono text-xs text-ink-muted">
                            {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                          </span>
                          <span className="min-w-0 flex-1 font-medium text-ink">
                            {s.subject_id
                              ? subjectName.get(s.subject_id) ?? "—"
                              : s.period_label || "Free period"}
                          </span>
                          {s.teacher_id && (
                            <Chip tone="slate">{teacherName.get(s.teacher_id) ?? "Staff"}</Chip>
                          )}
                          {s.room && <Chip tone="brand">{s.room}</Chip>}
                          {viewer.isStaff && (
                            <form action={deleteSlot}>
                              <input type="hidden" name="id" value={s.id} />
                              <button
                                type="submit"
                                className="rounded-lg px-2.5 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10"
                              >
                                Remove
                              </button>
                            </form>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
