import { createClient } from "@/lib/supabase/server";
import { requireViewer, currentAcademicYear } from "@/lib/auth";
import { FILE_BUCKET, formatBytes } from "@/lib/files";
import { PageHeader, Card, EmptyState, Chip } from "@/components/ui";
import NoteForm from "./NoteForm";
import { deleteClassNote } from "./actions";

export const metadata = { title: "Class notes — KlassHub" };

export default async function ClassNotesPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();

  // RLS limits this to the viewer's school, and for students/parents to the
  // classes they actually belong to.
  const [{ data: notes }, { data: classes }, { data: subjects }] = await Promise.all([
    supabase
      .from("class_notes")
      .select("id, title, description, class_id, subject_id, file_path, file_name, file_size, term, academic_year, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("classes")
      .select("id, name, academic_year")
      .order("academic_year", { ascending: false })
      .order("name"),
    supabase.from("subjects").select("id, name").order("name"),
  ]);

  const className = new Map((classes ?? []).map((c) => [c.id, c.name]));
  const subjectName = new Map((subjects ?? []).map((s) => [s.id, s.name]));

  // The bucket is private, so links are short-lived signed URLs rather than
  // public paths.
  const paths = (notes ?? []).map((n) => n.file_path);
  const signed = paths.length
    ? (await supabase.storage.from(FILE_BUCKET).createSignedUrls(paths, 60 * 60)).data
    : null;
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  return (
    <>
      <PageHeader
        title="Class notes"
        subtitle={
          viewer.isStaff
            ? "Materials shared with a class."
            : "Materials your teachers have shared."
        }
        action={
          viewer.isStaff ? (
            <NoteForm
              schoolId={viewer.schoolId}
              classes={classes ?? []}
              subjects={subjects ?? []}
              defaultYear={currentAcademicYear()}
            />
          ) : undefined
        }
      />

      {!notes || notes.length === 0 ? (
        <EmptyState
          title="No notes yet"
          hint={
            viewer.isStaff
              ? "Upload a file and the class will see it immediately."
              : "When your teachers share materials, they'll appear here."
          }
        />
      ) : (
        <div className="space-y-3">
          {notes.map((n) => {
            const url = urlByPath.get(n.file_path);
            return (
              <Card key={n.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold text-brand-900">{n.title}</h2>
                      {n.class_id && <Chip tone="brand">{className.get(n.class_id) ?? "class"}</Chip>}
                      {n.subject_id && <Chip tone="slate">{subjectName.get(n.subject_id) ?? ""}</Chip>}
                      {n.term && <Chip tone="slate">{n.term} term</Chip>}
                    </div>

                    {n.description && (
                      <p className="text-sm leading-relaxed text-slate-600">{n.description}</p>
                    )}

                    <p className="mt-2 text-xs text-slate-400">
                      {n.file_name}
                      {n.file_size ? ` · ${formatBytes(n.file_size)}` : ""} ·{" "}
                      {new Date(n.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        Download
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">Link unavailable</span>
                    )}

                    {viewer.isStaff && (
                      <form action={deleteClassNote}>
                        <input type="hidden" name="id" value={n.id} />
                        <input type="hidden" name="path" value={n.file_path} />
                        <button
                          type="submit"
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
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
