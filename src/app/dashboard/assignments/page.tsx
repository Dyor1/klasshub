import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireViewer, currentAcademicYear } from "@/lib/auth";
import { PageHeader, Card, EmptyState, Table, Chip } from "@/components/ui";
import AssignmentForm from "./AssignmentForm";
import { setAssignmentStatus, deleteAssignment } from "./actions";

export const metadata = { title: "Assignments — KlassHub" };

const statusTone = { draft: "slate", published: "green", closed: "amber" } as const;

function dueLabel(due: string | null) {
  if (!due) return "No deadline";
  const d = new Date(due);
  const overdue = d < new Date();
  return `${overdue ? "Was due" : "Due"} ${d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export default async function AssignmentsPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();

  // RLS: staff see everything; students and parents see only published work
  // for their own class.
  const [{ data: assignments }, { data: classes }, { data: subjects }, { data: subs }] =
    await Promise.all([
      supabase
        .from("assignments")
        .select("id, title, class_id, subject_id, due_at, max_score, status, term, academic_year, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("classes").select("id, name").order("name"),
      supabase.from("subjects").select("id, name").order("name"),
      supabase
        .from("assignment_submissions")
        .select("id, assignment_id, student_id, score, graded_at, is_late, submitted_at"),
    ]);

  const className = new Map((classes ?? []).map((c) => [c.id, c.name]));
  const subjectName = new Map((subjects ?? []).map((s) => [s.id, s.name]));

  /* ------------------------------------------------------- student/parent */
  if (!viewer.isStaff) {
    const mine = new Map((subs ?? []).map((s) => [s.assignment_id, s]));

    return (
      <>
        <PageHeader
          title="Assignments"
          subtitle={viewer.role === "parent" ? "Work set for your children." : "Work set for your class."}
        />

        {!assignments || assignments.length === 0 ? (
          <EmptyState
            title="Nothing set yet"
            hint="Assignments appear here once your teachers publish them."
          />
        ) : (
          <div className="space-y-3">
            {assignments.map((a) => {
              const sub = mine.get(a.id);
              const overdue = a.due_at ? new Date(a.due_at) < new Date() : false;
              return (
                <Card key={a.id}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/dashboard/assignments/${a.id}`}
                        className="text-base font-bold text-brand-900 hover:underline"
                      >
                        {a.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {a.subject_id ? subjectName.get(a.subject_id) ?? "—" : "General"} ·{" "}
                        {a.max_score} marks · {dueLabel(a.due_at)}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {sub?.graded_at ? (
                        <Chip tone="green">
                          Graded {sub.score} / {a.max_score}
                        </Chip>
                      ) : sub ? (
                        <Chip tone={sub.is_late ? "amber" : "brand"}>
                          {sub.is_late ? "Submitted late" : "Submitted"}
                        </Chip>
                      ) : overdue ? (
                        <Chip tone="amber">Overdue</Chip>
                      ) : (
                        <Chip tone="slate">Not submitted</Chip>
                      )}
                      <Link
                        href={`/dashboard/assignments/${a.id}`}
                        className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-hover"
                      >
                        {sub ? "View" : "Open"}
                      </Link>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </>
    );
  }

  /* ------------------------------------------------------------------ staff */
  const countFor = (id: string) => (subs ?? []).filter((s) => s.assignment_id === id);

  return (
    <>
      <PageHeader
        title="Assignments"
        subtitle="Set work, collect submissions and grade them."
        action={
          <AssignmentForm
            classes={classes ?? []}
            subjects={subjects ?? []}
            defaultYear={currentAcademicYear()}
          />
        }
      />

      {!assignments || assignments.length === 0 ? (
        <EmptyState
          title="No assignments yet"
          hint="Set one, then publish it so the class can see it."
        />
      ) : (
        <Table head={["Assignment", "Class", "Due", "Submitted", "Graded", "Status", ""]}>
          {assignments.map((a) => {
            const list = countFor(a.id);
            const graded = list.filter((s) => s.graded_at).length;
            return (
              <tr key={a.id} className="hover:bg-hover">
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/assignments/${a.id}`}
                    className="font-medium text-brand-700 dark:text-brand-300 hover:underline"
                  >
                    {a.title}
                  </Link>
                  <p className="text-xs text-ink-subtle">
                    {a.subject_id ? subjectName.get(a.subject_id) ?? "—" : "General"} ·{" "}
                    {a.max_score} marks
                  </p>
                </td>
                <td className="px-4 py-3 text-ink-muted">{className.get(a.class_id) ?? "—"}</td>
                <td className="px-4 py-3 text-xs text-ink-muted">{dueLabel(a.due_at)}</td>
                <td className="px-4 py-3 text-ink-muted">{list.length}</td>
                <td className="px-4 py-3 text-ink-muted">{graded}</td>
                <td className="px-4 py-3">
                  <Chip tone={statusTone[a.status] ?? "slate"}>{a.status}</Chip>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {a.status === "draft" && (
                      <form action={setAssignmentStatus}>
                        <input type="hidden" name="id" value={a.id} />
                        <input type="hidden" name="status" value="published" />
                        <button
                          type="submit"
                          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/12"
                        >
                          Publish
                        </button>
                      </form>
                    )}
                    {a.status === "published" && (
                      <form action={setAssignmentStatus}>
                        <input type="hidden" name="id" value={a.id} />
                        <input type="hidden" name="status" value="closed" />
                        <button
                          type="submit"
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-hover"
                        >
                          Close
                        </button>
                      </form>
                    )}
                    <form action={deleteAssignment}>
                      <input type="hidden" name="id" value={a.id} />
                      <button
                        type="submit"
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>
      )}
    </>
  );
}
