import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import { PageHeader, Card, EmptyState, Chip } from "@/components/ui";
import { FilterBar, SearchField, SelectField, FilterActions, ResultCount } from "@/components/Filters";
import { orIlike, displayTerm } from "@/lib/search";
import AnnouncementForm from "./AnnouncementForm";
import { deleteAnnouncement } from "./actions";

export const metadata = { title: "Announcements — KlassHub" };

const audienceTone = {
  everyone: "brand",
  students: "green",
  parents: "amber",
  staff: "slate",
} as const;

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; audience?: string; class?: string }>;
}) {
  const AUDIENCES = ["everyone", "students", "parents", "staff"] as const;
  const sp = await searchParams;
  const term = displayTerm(sp.q);
  const audience = AUDIENCES.find((a) => a === sp.audience);
  const classFilter = sp.class ?? "";
  const isFiltered = Boolean(term || audience || classFilter);

  const viewer = await requireViewer();
  const supabase = await createClient();

  // RLS decides what each role sees: staff get everything, students and
  // parents only what is addressed to them and to a class they belong to.
  const [{ data: posts }, { data: classes }, { data: authors }] = await Promise.all([
    (async () => {
      let q = supabase
        .from("announcements")
        .select("id, title, body, audience, class_id, created_at, created_by")
        .order("created_at", { ascending: false });
      // Narrowing only. RLS already decides which notices this role may see at
      // all, so a filter can never reveal one addressed elsewhere.
      if (audience) q = q.eq("audience", audience);
      if (classFilter) q = q.eq("class_id", classFilter);
      const search = orIlike(["title", "body"], term);
      if (search) q = q.or(search);
      return q;
    })(),
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

      <FilterBar>
        <SearchField defaultValue={term} placeholder="Title or wording…" />
        <SelectField
          name="audience"
          label="Audience"
          defaultValue={audience ?? ""}
          allLabel="Everyone's notices"
          options={[
            { value: "everyone", label: "Whole school" },
            { value: "students", label: "Students" },
            { value: "parents", label: "Parents" },
            { value: "staff", label: "Staff" },
          ]}
        />
        {viewer.isStaff && (classes ?? []).length > 0 && (
          <SelectField
            name="class"
            label="Class"
            defaultValue={classFilter}
            allLabel="Any class"
            options={(classes ?? []).map((c) => ({ value: c.id, label: c.name }))}
          />
        )}
        <FilterActions clearHref="/dashboard/announcements" isFiltered={isFiltered} />
      </FilterBar>

      {posts && posts.length > 0 && (
        <ResultCount shown={posts.length} noun="announcement" term={term || undefined} />
      )}

      {!posts || posts.length === 0 ? (
        <EmptyState
          title={isFiltered ? "Nothing matches those filters" : "No announcements yet"}
          hint={
            isFiltered
              ? "Try a different search, or clear the filters."
              : viewer.isStaff
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
