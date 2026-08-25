import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import { PageHeader, Card, EmptyState, Table, Chip, Avatar } from "@/components/ui";
import QuestionForm from "./QuestionForm";
import { deleteQuestion, setExamStatus } from "../actions";

export const metadata = { title: "Exam — KlassHub" };

export default async function ExamDetailPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  const viewer = await requireViewer();
  // Candidates never see the authoring screen — this is where the answer key
  // is displayed.
  if (!viewer.isStaff) redirect("/dashboard/cbt");

  const supabase = await createClient();

  const { data: exam } = await supabase
    .from("cbt_exams")
    .select("id, title, class_id, subject_id, duration_minutes, term, academic_year, status, instructions, shuffle_questions")
    .eq("id", examId)
    .maybeSingle();

  if (!exam) notFound();

  const [{ data: questions }, { data: sessions }, { data: classes }, { data: students }] =
    await Promise.all([
      supabase
        .from("cbt_questions")
        .select("id, question_number, question_text, option_a, option_b, option_c, option_d, correct_option, marks")
        .eq("exam_id", examId)
        .order("question_number"),
      supabase
        .from("cbt_sessions")
        .select("id, student_id, status, score, total_marks, percentage, submitted_at")
        .eq("exam_id", examId),
      supabase.from("classes").select("id, name"),
      supabase.from("students").select("id, surname, first_name, admission_number"),
    ]);

  const className = new Map((classes ?? []).map((c) => [c.id, c.name]));
  const studentById = new Map((students ?? []).map((s) => [s.id, s]));
  const totalMarks = (questions ?? []).reduce((sum, q) => sum + Number(q.marks), 0);

  return (
    <>
      <Link href="/dashboard/cbt" className="text-sm text-slate-500 hover:text-brand-600">
        &larr; All tests
      </Link>

      <div className="mt-3">
        <PageHeader
          title={exam.title}
          subtitle={`${className.get(exam.class_id) ?? "—"} · ${exam.duration_minutes} minutes · ${(questions ?? []).length} question${(questions ?? []).length === 1 ? "" : "s"} · ${totalMarks} marks`}
          action={
            <div className="flex items-center gap-2">
              <Chip tone={exam.status === "published" ? "green" : exam.status === "closed" ? "amber" : "slate"}>
                {exam.status}
              </Chip>
              {exam.status !== "published" && (questions ?? []).length > 0 && (
                <form action={setExamStatus}>
                  <input type="hidden" name="id" value={exam.id} />
                  <input type="hidden" name="status" value="published" />
                  <button
                    type="submit"
                    className="rounded-lg bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-brand hover:brightness-110"
                  >
                    Publish
                  </button>
                </form>
              )}
              {exam.status === "published" && (
                <form action={setExamStatus}>
                  <input type="hidden" name="id" value={exam.id} />
                  <input type="hidden" name="status" value="closed" />
                  <button
                    type="submit"
                    className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Close
                  </button>
                </form>
              )}
            </div>
          }
        />
      </div>

      {exam.status === "published" && (
        <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
          This test is live. Editing questions now will change the paper for
          anyone who hasn&apos;t started yet.
        </p>
      )}

      <Card title="Add a question" className="mb-6">
        <QuestionForm examId={exam.id} />
      </Card>

      {(questions ?? []).length === 0 ? (
        <EmptyState
          title="No questions yet"
          hint="Add at least one question before publishing."
        />
      ) : (
        <div className="mb-8 space-y-3">
          {(questions ?? []).map((q) => (
            <Card key={q.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-brand-900">
                    {q.question_number}. {q.question_text}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {(["a", "b", "c", "d"] as const).map((l) => {
                      const val = q[`option_${l}` as const];
                      if (!val) return null;
                      const isCorrect = q.correct_option === l;
                      return (
                        <li
                          key={l}
                          className={`flex items-center gap-2 text-sm ${
                            isCorrect ? "font-semibold text-emerald-700" : "text-slate-600"
                          }`}
                        >
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold uppercase ${
                              isCorrect ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {l}
                          </span>
                          {val}
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-2 text-xs text-slate-400">{q.marks} mark{Number(q.marks) === 1 ? "" : "s"}</p>
                </div>

                <form action={deleteQuestion}>
                  <input type="hidden" name="id" value={q.id} />
                  <input type="hidden" name="exam_id" value={exam.id} />
                  <button
                    type="submit"
                    className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}

      <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
        Results ({(sessions ?? []).filter((s) => s.status !== "in_progress").length} submitted)
      </h2>

      {(sessions ?? []).length === 0 ? (
        <EmptyState title="No attempts yet" hint="Results appear here as candidates submit." />
      ) : (
        <Table head={["Candidate", "Status", "Score", "%", "Submitted"]}>
          {(sessions ?? [])
            .slice()
            .sort((a, b) => Number(b.percentage ?? 0) - Number(a.percentage ?? 0))
            .map((s) => {
              const st = studentById.get(s.student_id);
              const name = st ? `${st.surname} ${st.first_name}` : "Unknown";
              return (
                <tr key={s.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={name} />
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">{name}</p>
                        <p className="font-mono text-xs text-slate-400">
                          {st?.admission_number ?? ""}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Chip
                      tone={
                        s.status === "submitted" ? "green" : s.status === "expired" ? "amber" : "slate"
                      }
                    >
                      {s.status.replace("_", " ")}
                    </Chip>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {s.score != null ? `${s.score} / ${s.total_marks}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {s.percentage != null ? `${s.percentage}%` : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {s.submitted_at
                      ? new Date(s.submitted_at).toLocaleString("en-GB", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </td>
                </tr>
              );
            })}
        </Table>
      )}
    </>
  );
}
