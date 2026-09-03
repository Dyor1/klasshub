import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import { PageHeader, Card, EmptyState, Chip } from "@/components/ui";
import AnnouncementForm from "./AnnouncementForm";
import { deleteAnnouncement } from "./actions";

export const metadata = { title: "Announcements — KlassHub" };

const audienceTone = {
  everyone: "brand",
  students: "green",
  parents: "amber",
  staff: "slate",
} as const;

export default async function AnnouncementsPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();

  // RLS decides what each role sees: staff get everything, students and
  // parents only what is addressed to them and to a class they belong to.
  const [{ data: posts }, { data: classes }, { data: authors }] = await Promise.all([
    supabase
      .from("announcements")
      .select("id, title, body, audience, class_id, created_at, created_by")
      .order("created_at", { ascending: false }),
    supabase.from("classes").select("id, name").order("name"),
    supabase.from("profiles").select("id, full_name"),
  ]);

  const className = new Map((classes ?? []).map((c) => [c.id, c.name]));
  const authorName = new Map((authors ?? []).map((p) => [p.id, p.full_name]));

  return (
    <>
      <PageHeader
        title="Announcements"
        subtitle={
          viewer.isStaff
            ? "Post notices to the whole school or a single class."
            : "Notices from your school."
        }
        action={
          viewer.isStaff ? <AnnouncementForm classes={classes ?? []} /> : undefined
        }
      />

      {!posts || posts.length === 0 ? (
        <EmptyState
          title="No announcements yet"
          hint={
            viewer.isStaff
              ? "Post one and it appears instantly for the audience you choose."
              : "Notices from your school will show up here."
          }
        />
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <Card key={p.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-ink">{p.title}</h2>
                    {viewer.isStaff && (
                      <Chip tone={audienceTone[p.audience] ?? "slate"}>{p.audience}</Chip>
                    )}
                    {p.class_id && (
                      <Chip tone="slate">{className.get(p.class_id) ?? "class"}</Chip>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-muted">
                    {p.body}
                  </p>
                  <p className="mt-3 text-xs text-ink-subtle">
                    {p.created_by ? authorName.get(p.created_by) ?? "Staff" : "Staff"}
                    {" · "}
                    {new Date(p.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>

                {viewer.isStaff && (
                  <form action={deleteAnnouncement}>
                    <input type="hidden" name="id" value={p.id} />
                    <button
                      type="submit"
                      className="shrink-0 inline-flex min-h-11 items-center rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10"
                    >
                      Delete
                    </button>
                  </form>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
