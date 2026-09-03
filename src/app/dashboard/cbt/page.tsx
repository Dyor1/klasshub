import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireViewer, currentAcademicYear } from "@/lib/auth";
import { PageHeader, Card, EmptyState, Table, Chip, ErrorNote } from "@/components/ui";
import ExamForm from "./ExamForm";
import { startExam, setExamStatus, deleteExam } from "./actions";

export const metadata = { title: "CBT — KlassHub" };

const statusTone = { draft: "slate", published: "green", closed: "amber" } as const;

export default async function CbtPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const viewer = await requireViewer();
  const supabase = await createClient();

  // RLS: staff see every exam; a candidate sees only published exams set for
  // their class.
  const [{ data: exams }, { data: classes }, { data: subjects }, { data: sessions }] =
    await Promise.all([
      supabase
        .from("cbt_exams")
        .select("id, title, class_id, subject_id, duration_minutes, term, academic_year, status, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("classes").select("id, name").order("name"),
      supabase.from("subjects").select("id, name").order("name"),
      supabase
        .from("cbt_sessions")
        .select("id, exam_id, student_id, status, score, total_marks, percentage, submitted_at"),
    ]);

  const className = new Map((classes ?? []).map((c) => [c.id, c.name]));
  const subjectName = new Map((subjects ?? []).map((s) => [s.id, s.name]));

  // Question counts, so staff can see which exams are still empty.
  const { data: qCounts } = viewer.isStaff
    ? await supabase.from("cbt_questions").select("exam_id")
    : { data: null };
  const questionsPerExam = new Map<string, number>();
  for (const q of qCounts ?? []) {
    questionsPerExam.set(q.exam_id, (questionsPerExam.get(q.exam_id) ?? 0) + 1);
  }

  const myAttempt = new Map((sessions ?? []).map((s) => [s.exam_id, s]));

  /* ------------------------------------------------------- candidate view */
  if (!viewer.isStaff) {
    return (
      <>
        <PageHeader title="Tests" subtitle="Computer-based tests set for your class." />
        {sp.error && (
          <div className="mb-4">
            <ErrorNote message={sp.error} />
          </div>
        )}

        {!exams || exams.length === 0 ? (
          <EmptyState
            title="No tests available"
            hint="When your teachers publish a test for your class, it appears here."
          />
        ) : (
          <div className="space-y-3">
            {exams.map((e) => {
              const attempt = myAttempt.get(e.id);
              const done = attempt && attempt.status !== "in_progress";
              return (
                <Card key={e.id}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base font-bold text-ink">{e.title}</h2>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {e.subject_id ? subjectName.get(e.subject_id) ?? "—" : "General"} ·{" "}
                        {e.duration_minutes} minutes · <span className="capitalize">{e.term}</span>{" "}
                        term {e.academic_year}
                      </p>
                      {done && (
                        <p className="mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                          Submitted — {attempt!.score} / {attempt!.total_marks} (
                          {attempt!.percentage}%)
                        </p>
                      )}
                    </div>

                    <div className="shrink-0">
                      {done ? (
                        <Chip tone="green">Completed</Chip>
                      ) : (
                        <form action={startExam}>
                          <input type="hidden" name="exam_id" value={e.id} />
                          <button
                            type="submit"
                            className="rounded-lg bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-brand transition-all hover:brightness-110"
                          >
                            {attempt ? "Resume" : "Start test"}
                          </button>
                        </form>
                      )}
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

  /* ------------------------------------------------------------ staff view */
  return (
    <>
      <PageHeader
        title="Computer-based tests"
        subtitle="Set multiple-choice tests, publish them to a class, and see results as they come in."
        action={
          <ExamForm
            classes={classes ?? []}
            subjects={subjects ?? []}
            defaultYear={currentAcademicYear()}
          />
        }
      />

      {!exams || exams.length === 0 ? (
        <EmptyState
          title="No tests yet"
          hint="Create a test, add questions, then publish it to a class."
        />
      ) : (
        <Table head={["Test", "Class", "Questions", "Duration", "Attempts", "Status", ""]}>
          {exams.map((e) => {
            const qn = questionsPerExam.get(e.id) ?? 0;
            const attempts = (sessions ?? []).filter((s) => s.exam_id === e.id);
            const submitted = attempts.filter((a) => a.status !== "in_progress").length;
            return (
              <tr key={e.id} className="hover:bg-hover">
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/cbt/${e.id}`}
                    className="font-medium text-brand-700 dark:text-brand-300 hover:underline"
                  >
                    {e.title}
                  </Link>
                  <p className="text-xs text-ink-subtle">
                    {e.subject_id ? subjectName.get(e.subject_id) ?? "—" : "General"} ·{" "}
                    <span className="capitalize">{e.term}</span> term
                  </p>
                </td>
                <td className="px-4 py-3 text-ink-muted">
                  {className.get(e.class_id) ?? "—"}
                </td>
                <td className="px-4 py-3">
                  {qn === 0 ? (
                    <Chip tone="amber">none yet</Chip>
                  ) : (
                    <span className="text-ink-muted">{qn}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-ink-muted">{e.duration_minutes}m</td>
                <td className="px-4 py-3 text-ink-muted">
                  {submitted} / {attempts.length || 0}
                </td>
                <td className="px-4 py-3">
                  <Chip tone={statusTone[e.status] ?? "slate"}>{e.status}</Chip>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {e.status !== "published" && qn > 0 && (
                      <form action={setExamStatus}>
                        <input type="hidden" name="id" value={e.id} />
                        <input type="hidden" name="status" value="published" />
                        <button
                          type="submit"
                          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/12"
                        >
                          Publish
                        </button>
                      </form>
                    )}
                    {e.status === "published" && (
                      <form action={setExamStatus}>
                        <input type="hidden" name="id" value={e.id} />
                        <input type="hidden" name="status" value="closed" />
                        <button
                          type="submit"
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-hover"
                        >
                          Close
                        </button>
                      </form>
                    )}
                    <form action={deleteExam}>
                      <input type="hidden" name="id" value={e.id} />
                      <button
                        type="submit"
                        className="inline-flex min-h-11 items-center rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10"
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
