import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import { PageHeader, Card, EmptyState, Table, Chip, inputClass, btnGhost } from "@/components/ui";
import Register from "./Register";

export const metadata = { title: "Attendance — KlassHub" };

const statusTone = {
  present: "green",
  absent: "amber",
  late: "amber",
  excused: "slate",
} as const;

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string; date?: string }>;
}) {
  const sp = await searchParams;
  const viewer = await requireViewer();
  const supabase = await createClient();

  const today = new Date().toISOString().slice(0, 10);
  const date = sp.date?.trim() || today;

  // ------------------------------------------------------ student / parent
  // RLS returns only their own or their children's records.
  if (!viewer.isStaff) {
    const [{ data: records }, { data: kids }] = await Promise.all([
      supabase
        .from("attendance")
        .select("id, student_id, date, status, remarks")
        .order("date", { ascending: false })
        .limit(60),
      supabase.from("students").select("id, surname, first_name"),
    ]);

    const name = new Map((kids ?? []).map((s) => [s.id, `${s.surname} ${s.first_name}`]));
    const showWho = (kids?.length ?? 0) > 1;

    const summary = { present: 0, absent: 0, late: 0, excused: 0 } as Record<string, number>;
    for (const r of records ?? []) summary[r.status] = (summary[r.status] ?? 0) + 1;
    const total = (records ?? []).length;
    const rate = total ? Math.round(((summary.present + summary.late) / total) * 100) : null;

    return (
      <>
        <PageHeader
          title="Attendance"
          subtitle={viewer.role === "parent" ? "Your children's attendance." : "Your attendance record."}
        />

        {total === 0 ? (
          <EmptyState
            title="No attendance recorded yet"
            hint="Once your school starts marking registers, records appear here."
          />
        ) : (
          <>
            <div className="mb-6 grid gap-4 sm:grid-cols-4">
              {[
                { label: "Attendance rate", value: rate === null ? "—" : `${rate}%` },
                { label: "Present", value: summary.present ?? 0 },
                { label: "Absent", value: summary.absent ?? 0 },
                { label: "Late", value: summary.late ?? 0 },
              ].map((s) => (
                <Card key={s.label}>
                  <p className="text-2xl font-extrabold text-ink">{s.value}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">{s.label}</p>
                </Card>
              ))}
            </div>

            <Table head={[...(showWho ? ["Student"] : []), "Date", "Status", "Remarks"]}>
              {(records ?? []).map((r) => (
                <tr key={r.id} className="hover:bg-hover">
                  {showWho && (
                    <td className="px-4 py-3 font-medium text-ink">
                      {name.get(r.student_id) ?? "—"}
                    </td>
                  )}
                  <td className="px-4 py-3 text-ink-muted">
                    {new Date(r.date + "T00:00:00").toLocaleDateString("en-GB", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <Chip tone={statusTone[r.status] ?? "slate"}>{r.status}</Chip>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {r.remarks ?? <span className="text-ink-subtle">—</span>}
                  </td>
                </tr>
              ))}
            </Table>
          </>
        )}
      </>
    );
  }

  // ------------------------------------------------------------------ staff
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, academic_year")
    .order("academic_year", { ascending: false })
    .order("name");

  const classId = sp.class || "";

  const [{ data: students }, { data: existing }] = classId
    ? await Promise.all([
        supabase
          .from("students")
          .select("id, surname, first_name, other_names, admission_number")
          .eq("class_id", classId)
          .eq("status", "active")
          .order("surname"),
        supabase
          .from("attendance")
          .select("student_id, status")
          .eq("class_id", classId)
          .eq("date", date),
      ])
    : [{ data: null }, { data: null }];

  const existingByStudent = new Map((existing ?? []).map((a) => [a.student_id, a.status]));

  const rows = (students ?? []).map((s) => ({
    studentId: s.id,
    name: [s.surname, s.first_name, s.other_names].filter(Boolean).join(" "),
    admissionNumber: s.admission_number,
    status: existingByStudent.get(s.id) ?? "present",
  }));

  return (
    <>
      <PageHeader
        title="Attendance"
        subtitle="Mark a class register for a given day."
      />

      {!classes || classes.length === 0 ? (
        <EmptyState
          title="No classes yet"
          hint="Create a class and enrol students before taking a register."
        />
      ) : (
        <>
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
                <span className="mb-1.5 block text-xs font-medium text-ink-muted">Date</span>
                <input name="date" type="date" max={today} defaultValue={date} className={inputClass} />
              </label>
              <button type="submit" className={btnGhost}>
                Load register
              </button>
            </form>
          </Card>

          {!classId ? (
            <EmptyState title="Choose a class" hint="Pick a class and date to take the register." />
          ) : rows.length === 0 ? (
            <EmptyState
              title="No active students in this class"
              hint="Enrol students into this class first."
            />
          ) : (
            <>
              {existingByStudent.size > 0 && (
                <p className="mb-4 rounded-lg border border-line bg-card px-3.5 py-2.5 text-sm text-ink-muted">
                  A register already exists for this date — saving will update it.
                </p>
              )}
              <Register rows={rows} classId={classId} date={date} />
            </>
          )}
        </>
      )}
    </>
  );
}
