import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import { PageHeader, Card, EmptyState, Chip, btnGhost } from "@/components/ui";
import Paper from "./Paper";

export const metadata = { title: "Sitting test — KlassHub" };

export default async function SitPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  await requireViewer();
  const supabase = await createClient();

  // RLS limits this to the candidate's own session (or staff reviewing).
  const { data: session } = await supabase
    .from("cbt_sessions")
    .select("id, exam_id, status, expires_at, score, total_marks, percentage, submitted_at")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) notFound();

  const { data: exam } = await supabase
    .from("cbt_exams")
    .select("title, instructions, duration_minutes, reveal_score")
    .eq("id", session.exam_id)
    .maybeSingle();

  /* ------------------------------------------------------------- finished */
  if (session.status !== "in_progress") {
    const reveal = exam?.reveal_score ?? true;
    return (
      <>
        <PageHeader
          title={exam?.title ?? "Test"}
          subtitle={session.status === "expired" ? "Submitted after time expired" : "Submitted"}
        />

        <Card>
          {reveal ? (
            <div className="text-center">
              <p className="text-xs uppercase tracking-wide text-ink-subtle">Your score</p>
              <p className="mt-1 text-4xl font-extrabold text-ink">
                {session.score} <span className="text-2xl text-ink-subtle">/ {session.total_marks}</span>
              </p>
              <p className="mt-1 text-lg font-semibold text-ink-muted">{session.percentage}%</p>
              {session.status === "expired" && (
                <p className="mt-3 inline-block rounded-lg bg-amber-500/12 px-3 py-1.5 text-xs text-amber-800 dark:text-amber-200">
                  Your time ran out — answers saved before the deadline were still marked.
                </p>
              )}
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm font-semibold text-ink">Your answers have been submitted</p>
              <p className="mt-1 text-sm text-ink-muted">
                Your teacher will release the score.
              </p>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link href="/dashboard/cbt" className={btnGhost}>
              Back to tests
            </Link>
          </div>
        </Card>
      </>
    );
  }

  /* -------------------------------------------------------- in progress */
  // Questions come from the RPC, which never selects correct_option.
  const { data: paper } = await supabase.rpc("cbt_paper", { p_session_id: sessionId });

  if (!paper || paper.length === 0) {
    return (
      <>
        <PageHeader title={exam?.title ?? "Test"} />
        <EmptyState
          title="This test has no questions"
          hint="Ask your teacher to add questions before you sit it."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={exam?.title ?? "Test"}
        subtitle={exam?.instructions ?? `${exam?.duration_minutes ?? 0} minutes`}
        action={<Chip tone="amber">In progress</Chip>}
      />

      <Paper
        sessionId={sessionId}
        questions={paper}
        expiresAt={session.expires_at}
      />
    </>
  );
}
