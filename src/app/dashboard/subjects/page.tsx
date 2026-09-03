import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import { PageHeader, Card, EmptyState, Table } from "@/components/ui";
import SubjectForm from "./SubjectForm";
import { deleteSubject } from "./actions";

export const metadata = { title: "Subjects — KlassHub" };

export default async function SubjectsPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name, code")
    .order("name");

  const { data: results } = await supabase.from("results").select("subject_id");
  const usage = new Map<string, number>();
  for (const r of results ?? []) {
    usage.set(r.subject_id, (usage.get(r.subject_id) ?? 0) + 1);
  }

  return (
    <>
      <PageHeader
        title="Subjects"
        subtitle="Subjects available for result entry across your school."
      />

      {viewer.isStaff && (
        <Card title="Add a subject" className="mb-8">
          <SubjectForm />
        </Card>
      )}

      {!subjects || subjects.length === 0 ? (
        <EmptyState
          title="No subjects yet"
          hint={
            viewer.isStaff
              ? "Add subjects before recording any results."
              : "Your administrator hasn't added subjects yet."
          }
        />
      ) : (
        <Table head={viewer.isStaff ? ["Subject", "Code", "Results recorded", ""] : ["Subject", "Code", "Results recorded"]}>
          {subjects.map((s) => (
            <tr key={s.id} className="hover:bg-hover">
              <td className="px-4 py-3 font-medium text-ink">{s.name}</td>
              <td className="px-4 py-3 text-ink-muted">
                {s.code ?? <span className="text-ink-subtle">—</span>}
              </td>
              <td className="px-4 py-3 text-ink-muted">{usage.get(s.id) ?? 0}</td>
              {viewer.isStaff && (
                <td className="px-4 py-3 text-right">
                  <form action={deleteSubject}>
                    <input type="hidden" name="id" value={s.id} />
                    <button
                      type="submit"
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10"
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
