import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import { FILE_BUCKET, formatBytes } from "@/lib/files";
import { PageHeader, Card, EmptyState, Chip, Avatar } from "@/components/ui";
import SubmitForm from "./SubmitForm";
import GradeForm from "./GradeForm";
import { deleteSubmission } from "../actions";

export const metadata = { title: "Assignment — KlassHub" };

export default async function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const { assignmentId } = await params;
  const viewer = await requireViewer();
  const supabase = await createClient();

  const { data: a } = await supabase
    .from("assignments")
    .select("id, title, instructions, class_id, subject_id, due_at, max_score, status, allow_file, allow_text, term, academic_year")
    .eq("id", assignmentId)
    .maybeSingle();

  if (!a) notFound();

  const [{ data: subs }, { data: classes }, { data: subjects }, { data: students }] =
    await Promise.all([
      supabase
        .from("assignment_submissions")
        .select("id, student_id, body, file_path, file_name, file_size, submitted_at, is_late, score, feedback, graded_at")
        .eq("assignment_id", assignmentId)
        .order("submitted_at"),
      supabase.from("classes").select("id, name"),
      supabase.from("subjects").select("id, name"),
      supabase.from("students").select("id, surname, first_name, admission_number, profile_id"),
    ]);

  const className = new Map((classes ?? []).map((c) => [c.id, c.name]));
  const subjectName = new Map((subjects ?? []).map((s) => [s.id, s.name]));
  const studentById = new Map((students ?? []).map((s) => [s.id, s]));

  const overdue = a.due_at ? new Date(a.due_at) < new Date() : false;

  // Private bucket, so links are short-lived signed URLs.
  const paths = (subs ?? []).map((s) => s.file_path).filter(Boolean) as string[];
  const signed = paths.length
    ? (await supabase.storage.from(FILE_BUCKET).createSignedUrls(paths, 60 * 60)).data
    : null;
  // createSignedUrls types path and signedUrl as nullable, so build the map
  // defensively rather than asserting a shape.
  const urlByPath = new Map<string, string>();
  for (const entry of signed ?? []) {
    if (entry.path && entry.signedUrl) urlByPath.set(entry.path, entry.signedUrl);
  }

  const header = (
    <>
      <Link href="/dashboard/assignments" className="text-sm text-ink-muted hover:text-brand-600 dark:text-brand-300">
        &larr; All assignments
      </Link>
      <div className="mt-3">
        <PageHeader
          title={a.title}
          subtitle={`${className.get(a.class_id) ?? "—"} · ${
            a.subject_id ? subjectName.get(a.subject_id) ?? "—" : "General"
          } · ${a.max_score} marks${
            a.due_at
              ? ` · ${overdue ? "was due" : "due"} ${new Date(a.due_at).toLocaleString("en-GB", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}`
              : ""
          }`}
          action={<Chip tone={a.status === "published" ? "green" : a.status === "closed" ? "amber" : "slate"}>{a.status}</Chip>}
        />
      </div>
      {a.instructions && (
        <Card className="mb-6">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
            {a.instructions}
          </p>
        </Card>
      )}
    </>
  );

  /* ------------------------------------------------------- student/parent */
  if (!viewer.isStaff) {
    // RLS already returns only this viewer's (or their child's) submission.
    const mine = (subs ?? [])[0];
    const isStudent = viewer.role === "student";

    return (
      <>
        {header}

        {mine?.graded_at && (
          <Card title="Your grade" className="mb-6">
            <p className="text-3xl font-extrabold text-ink">
              {mine.score} <span className="text-lg text-ink-subtle">/ {a.max_score}</span>
            </p>
            {mine.feedback && (
              <p className="mt-2 rounded-lg border border-line bg-sunken px-3 py-2 text-sm text-ink">
                <span className="font-semibold">Feedback:</span> {mine.feedback}
              </p>
            )}
          </Card>
        )}

        {mine && (
          <Card title="What you submitted" className="mb-6">
            <p className="mb-2 text-xs text-ink-muted">
              {new Date(mine.submitted_at).toLocaleString("en-GB", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
              {mine.is_late && <span className="ml-2 font-semibold text-amber-700 dark:text-amber-300">Late</span>}
            </p>
            {mine.body && (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
                {mine.body}
              </p>
            )}
            {mine.file_path && urlByPath.get(mine.file_path) && (
              <a
                href={urlByPath.get(mine.file_path)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-hover"
              >
                {mine.file_name} {mine.file_size ? `· ${formatBytes(mine.file_size)}` : ""}
              </a>
            )}
          </Card>
        )}

        {isStudent ? (
          mine?.graded_at ? (
            <Card>
              <p className="text-sm text-ink-muted">
                This has been graded, so it can no longer be edited.
              </p>
            </Card>
          ) : a.status === "closed" ? (
            <Card>
              <p className="text-sm text-ink-muted">This assignment is closed.</p>
            </Card>
          ) : (
            <Card title={mine ? "Update your submission" : "Submit your work"}>
              <SubmitForm
                assignmentId={a.id}
                schoolId={viewer.schoolId}
                profileId={viewer.id}
                allowText={a.allow_text}
                allowFile={a.allow_file}
                existingBody={mine?.body ?? null}
                existingFileName={mine?.file_name ?? null}
                overdue={overdue}
              />
            </Card>
          )
        ) : (
          !mine && (
            <EmptyState
              title="Not submitted yet"
              hint="Your child hasn't submitted this assignment."
            />
          )
        )}
      </>
    );
  }

  /* ------------------------------------------------------------------ staff */
  const graded = (subs ?? []).filter((s) => s.graded_at).length;

  return (
    <>
      {header}

      <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-muted">
        Submissions ({subs?.length ?? 0}) · {graded} graded
      </h2>

      {!subs || subs.length === 0 ? (
        <EmptyState
          title="No submissions yet"
          hint={
            a.status === "draft"
              ? "This is still a draft — publish it so the class can see it."
              : "Work will appear here as students submit."
          }
        />
      ) : (
        <div className="space-y-3">
          {subs.map((s) => {
            const st = studentById.get(s.student_id);
            const name = st ? `${st.surname} ${st.first_name}` : "Unknown";
            const url = s.file_path ? urlByPath.get(s.file_path) : null;

            return (
              <Card key={s.id}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={name} />
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{name}</p>
                      <p className="text-xs text-ink-subtle">
                        {st?.admission_number ?? ""} ·{" "}
                        {new Date(s.submitted_at).toLocaleString("en-GB", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.is_late && <Chip tone="amber">late</Chip>}
                    {s.graded_at ? (
                      <Chip tone="green">
                        {s.score} / {a.max_score}
                      </Chip>
                    ) : (
                      <Chip tone="slate">ungraded</Chip>
                    )}
                  </div>
                </div>

                {s.body && (
                  <p className="mb-3 whitespace-pre-wrap rounded-lg bg-sunken px-3.5 py-3 text-sm leading-relaxed text-ink">
                    {s.body}
                  </p>
                )}

                {url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-3 inline-block rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-hover"
                  >
                    {s.file_name} {s.file_size ? `· ${formatBytes(s.file_size)}` : ""}
                  </a>
                )}

                <div className="flex flex-wrap items-start justify-between gap-3 border-t border-line-soft pt-3">
                  <GradeForm
                    submissionId={s.id}
                    assignmentId={a.id}
                    maxScore={Number(a.max_score)}
                    score={s.score != null ? Number(s.score) : null}
                    feedback={s.feedback}
                  />
                  <form action={deleteSubmission}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="path" value={s.file_path ?? ""} />
                    <input type="hidden" name="assignment_id" value={a.id} />
                    <button
                      type="submit"
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
