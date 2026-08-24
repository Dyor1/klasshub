import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import { PageHeader, Card, EmptyState, Table, Chip, Avatar } from "@/components/ui";
import StudentForm from "./StudentForm";
import { deleteStudent } from "./actions";

export const metadata = { title: "Students — KlassHub" };

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string }>;
}) {
  const { class: classFilter } = await searchParams;
  const viewer = await requireViewer();
  const supabase = await createClient();

  const [{ data: classes }, studentsRes] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name, academic_year")
      .order("academic_year", { ascending: false })
      .order("name"),
    (async () => {
      let q = supabase
        .from("students")
        .select("id, admission_number, surname, first_name, other_names, gender, status, class_id")
        .order("surname");
      if (classFilter) q = q.eq("class_id", classFilter);
      return q;
    })(),
  ]);

  const students = studentsRes.data;
  const classById = new Map((classes ?? []).map((c) => [c.id, c.name]));

  return (
    <>
      <PageHeader
        title="Students"
        subtitle={
          viewer.isStaff
            ? "Everyone enrolled at your school."
            : "Your student record."
        }
        action={viewer.isStaff ? <StudentForm classes={classes ?? []} /> : undefined}
      />

      {viewer.isStaff && classes && classes.length > 0 && (
        <Card className="mb-6">
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/students"
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                !classFilter
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              All classes
            </Link>
            {classes.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/students?class=${c.id}`}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  classFilter === c.id
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {c.name}
              </Link>
            ))}
          </div>
        </Card>
      )}

      {!students || students.length === 0 ? (
        <EmptyState
          title="No students found"
          hint={
            viewer.isStaff
              ? classFilter
                ? "No students are assigned to this class yet."
                : "Enrol your first student to get started."
              : "Your record hasn't been linked yet — ask your school administrator."
          }
        />
      ) : (
        <Table
          head={
            viewer.isStaff
              ? ["Admission no.", "Name", "Class", "Gender", "Status", ""]
              : ["Admission no.", "Name", "Class", "Gender", "Status"]
          }
        >
          {students.map((s) => (
            <tr key={s.id} className="hover:bg-slate-50/60">
              <td className="px-4 py-3 font-mono text-xs text-slate-600">
                {s.admission_number}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar name={`${s.surname} ${s.first_name}`} />
                  <span className="font-medium text-slate-900">
                    {[s.surname, s.first_name, s.other_names].filter(Boolean).join(" ")}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-slate-600">
                {s.class_id
                  ? classById.get(s.class_id) ?? "—"
                  : <span className="text-slate-400">Unassigned</span>}
              </td>
              <td className="px-4 py-3 capitalize text-slate-600">
                {s.gender ?? <span className="text-slate-400">—</span>}
              </td>
              <td className="px-4 py-3">
                <Chip tone={s.status === "active" ? "green" : "slate"}>{s.status}</Chip>
              </td>
              {viewer.isStaff && (
                <td className="px-4 py-3 text-right">
                  <form action={deleteStudent}>
                    <input type="hidden" name="id" value={s.id} />
                    <button
                      type="submit"
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </form>
                </td>
              )}
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
