import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireViewer, currentAcademicYear } from "@/lib/auth";
import { FilterBar, SearchField, SelectField, FilterActions, ResultCount } from "@/components/Filters";
import { searchClauses, displayTerm } from "@/lib/search";
import { FILE_BUCKET, formatBytes } from "@/lib/files";
import { PageHeader, Card, EmptyState, Chip } from "@/components/ui";
import LessonForm from "./LessonForm";
import { reviewLessonNote, deleteLessonNote } from "./actions";

export const metadata = { title: "Lesson notes — KlassHub" };

const statusTone = {
  draft: "slate",
  submitted: "amber",
  approved: "green",
  rejected: "amber",
} as const;

export default async function LessonNotesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; subject?: string; term?: string; status?: string }>;
}) {
  const TERMS_V = ["first", "second", "third"] as const;
  const STATUSES = ["draft", "submitted", "approved", "rejected"] as const;
  const sp = await searchParams;
  const term = displayTerm(sp.q);
  const subjectFilter = sp.subject ?? "";
  const termFilter = TERMS_V.find((t) => t === sp.term);
  const status = STATUSES.find((s) => s === sp.status);
  const isFiltered = Boolean(term || subjectFilter || termFilter || status);

  const viewer = await requireViewer();
  // Students and parents have no business here; RLS returns nothing for them
  // anyway, but an empty page would just be confusing.
  if (!viewer.isStaff) redirect("/dashboard");

  const supabase = await createClient();

  // RLS: a teacher sees only their own notes, an admin sees the whole school.
  const [{ data: notes }, { data: classes }, { data: subjects }, { data: staff }] =
    await Promise.all([
      (async () => {
        let q = supabase
          .from("lesson_notes")
          .select(
            "id, topic, description, week_number, term, academic_year, status, admin_feedback, teacher_id, class_id, subject_id, file_path, file_name, file_size, created_at, reviewed_at"
          )
          .order("created_at", { ascending: false });
        // A teacher already only sees their own notes — RLS decides that, not
        // this. These only narrow it further.
        if (subjectFilter) q = q.eq("subject_id", subjectFilter);
        if (termFilter) q = q.eq("term", termFilter);
        if (status) q = q.eq("status", status);
        for (const clause of searchClauses(["topic", "description"], term)) q = q.or(clause);
        return q;
      })(),
      supabase.from("classes").select("id, name").order("name"),
      supabase.from("subjects").select("id, name").order("name"),
      supabase.from("profiles").select("id, full_name"),
    ]);

  const className = new Map((classes ?? []).map((c) => [c.id, c.name]));
  const subjectName = new Map((subjects ?? []).map((s) => [s.id, s.name]));
  const staffName = new Map((staff ?? []).map((p) => [p.id, p.full_name]));

  const paths = (notes ?? []).map((n) => n.file_path).filter(Boolean) as string[];
  const signed = paths.length
    ? (await supabase.storage.from(FILE_BUCKET).createSignedUrls(paths, 60 * 60)).data
    : null;
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  const awaiting = (notes ?? []).filter((n) => n.status === "submitted").length;

  return (
    <>
      <PageHeader
        title="Lesson notes"
        subtitle={
          viewer.isAdmin
            ? "Plans submitted by your teachers for review."
            : "Your lesson plans and their review status."
        }
        action={
          <LessonForm
            schoolId={viewer.schoolId}
            classes={classes ?? []}
            subjects={subjects ?? []}
            defaultYear={currentAcademicYear()}
          />
        }
      />

      {viewer.isAdmin && awaiting > 0 && (
        <p className="mb-6 rounded-lg border border-amber-500/35 bg-amber-500/12 px-3.5 py-2.5 text-sm text-amber-800 dark:text-amber-200">
          {awaiting} note{awaiting === 1 ? "" : "s"} awaiting your review.
        </p>
      )}

      <FilterBar>
        <SearchField defaultValue={term} placeholder="Topic or description…" />
        <SelectField
          name="subject"
          label="Subject"
          defaultValue={subjectFilter}
          allLabel="All subjects"
          options={(subjects ?? []).map((s) => ({ value: s.id, label: s.name }))}
        />
        <SelectField
          name="term"
          label="Term"
          defaultValue={termFilter ?? ""}
          allLabel="Any term"
          options={[
            { value: "first", label: "First term" },
            { value: "second", label: "Second term" },
            { value: "third", label: "Third term" },
          ]}
        />
        <SelectField
          name="status"
          label="Status"
          defaultValue={status ?? ""}
          allLabel="Any status"
          options={[
            { value: "draft", label: "Draft" },
            { value: "submitted", label: "Submitted" },
            { value: "approved", label: "Approved" },
            { value: "rejected", label: "Needs work" },
          ]}
        />
        <FilterActions clearHref="/dashboard/lesson-notes" isFiltered={isFiltered} />
      </FilterBar>

      {notes && notes.length > 0 && (
        <ResultCount shown={notes.length} noun="lesson note" term={term || undefined} />
      )}

      {!notes || notes.length === 0 ? (
        <EmptyState
          title="No lesson notes yet"
          hint={
            viewer.isAdmin
              ? "Notes submitted by teachers will appear here for review."
              : "Submit your first lesson plan for review."
          }
        />
      ) : (
        <div className="space-y-3">
          {notes.map((n) => {
            const url = n.file_path ? urlByPath.get(n.file_path) : null;
            return (
              <Card key={n.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold text-ink">{n.topic}</h2>
                      <Chip tone={statusTone[n.status] ?? "slate"}>{n.status}</Chip>
                      {n.week_number && <Chip tone="slate">Week {n.week_number}</Chip>}
                    </div>

                    <p className="text-xs text-ink-muted">
                      {viewer.isAdmin && (
                        <>
                          {staffName.get(n.teacher_id) ?? "Teacher"}
                          {" · "}
                        </>
                      )}
                      {n.class_id ? className.get(n.class_id) ?? "—" : "No class"}
                      {" · "}
                      {n.subject_id ? subjectName.get(n.subject_id) ?? "—" : "No subject"}
                      {" · "}
                      <span className="capitalize">{n.term}</span> term {n.academic_year}
                    </p>

                    {n.description && (
                      <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                        {n.description}
                      </p>
                    )}

                    {n.admin_feedback && (
                      <p className="mt-3 rounded-lg border border-line bg-sunken px-3 py-2 text-sm text-ink">
                        <span className="font-semibold">Reviewer:</span> {n.admin_feedback}
                      </p>
                    )}

                    {n.file_name && (
                      <p className="mt-2 text-xs text-ink-subtle">
                        {n.file_name}
                        {n.file_size ? ` · ${formatBytes(n.file_size)}` : ""}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {url && (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-hover"
                      >
                        Open plan
                      </a>
                    )}

                    {viewer.isAdmin ? (
                      <form action={reviewLessonNote} className="flex flex-col items-end gap-2">
                        <input type="hidden" name="id" value={n.id} />
                        <input
                          name="admin_feedback"
                          defaultValue={n.admin_feedback ?? ""}
                          placeholder="Feedback (optional)"
                          className="h-9 w-52 rounded-lg border border-line px-3 text-xs focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
                        />
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            name="status"
                            value="approved"
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                          >
                            Approve
                          </button>
                          <button
                            type="submit"
                            name="status"
                            value="rejected"
                            className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-hover"
                          >
                            Send back
                          </button>
                        </div>
                      </form>
                    ) : (
                      <form action={deleteLessonNote}>
                        <input type="hidden" name="id" value={n.id} />
                        <input type="hidden" name="path" value={n.file_path ?? ""} />
                        <button
                          type="submit"
                          className="inline-flex min-h-11 items-center rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10"
                        >
                          Delete
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
