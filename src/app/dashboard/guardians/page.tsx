import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import { PageHeader, Card, EmptyState, Table, Chip, Avatar } from "@/components/ui";
import LinkForm from "./LinkForm";
import { unlinkGuardian } from "./actions";

export const metadata = { title: "Guardians — KlassHub" };

export default async function GuardiansPage() {
  const viewer = await requireViewer();
  // Nav hides this from parents, but the URL is still guessable. RLS would
  // stop any write regardless; this just avoids showing them an admin tool.
  if (!viewer.isStaff) redirect("/dashboard");

  const supabase = await createClient();

  const [{ data: links }, { data: students }, { data: parents }] = await Promise.all([
    supabase
      .from("student_guardians")
      .select("id, relationship, student_id, profile_id, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("students")
      .select("id, surname, first_name, other_names, admission_number")
      .order("surname"),
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "parent")
      .order("full_name"),
  ]);

  const studentLabel = new Map(
    (students ?? []).map((s) => [
      s.id,
      `${[s.surname, s.first_name, s.other_names].filter(Boolean).join(" ")} (${s.admission_number})`,
    ])
  );
  const parentLabel = new Map(
    (parents ?? []).map((p) => [p.id, p.full_name ?? p.email ?? "Unnamed"])
  );

  // Parents invited but not yet linked to any child see nothing in the app.
  const linkedParentIds = new Set((links ?? []).map((l) => l.profile_id));
  const orphanParents = (parents ?? []).filter((p) => !linkedParentIds.has(p.id));

  return (
    <>
      <PageHeader
        title="Guardians"
        subtitle="Link parent accounts to the students they can view."
      />

      {viewer.isStaff && (
        <Card
          title="Link a parent to a student"
          description="A parent sees only the children linked here, and only published results."
          className="mb-6"
        >
          <LinkForm
            students={(students ?? []).map((s) => ({
              id: s.id,
              label: studentLabel.get(s.id) ?? s.admission_number,
            }))}
            parents={(parents ?? []).map((p) => ({
              id: p.id,
              label: parentLabel.get(p.id) ?? "Unnamed",
            }))}
          />
        </Card>
      )}

      {orphanParents.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-500/35 bg-amber-500/12 px-4 py-3">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
            {orphanParents.length} parent account
            {orphanParents.length === 1 ? "" : "s"} not linked to any child
          </p>
          <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-200">
            {orphanParents.map((p) => p.full_name ?? p.email).join(", ")} — they
            will see an empty portal until linked.
          </p>
        </div>
      )}

      {!links || links.length === 0 ? (
        <EmptyState
          title="No guardians linked yet"
          hint="Invite parents from the Team page, then link them to their children here."
        />
      ) : (
        <Table head={["Parent", "Student", "Relationship", ""]}>
          {links.map((l) => (
            <tr key={l.id} className="hover:bg-hover">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar name={parentLabel.get(l.profile_id) ?? "?"} tone="muted" />
                  <span className="font-medium text-ink">
                    {parentLabel.get(l.profile_id) ?? "Unknown"}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-ink">
                {studentLabel.get(l.student_id) ?? "Unknown"}
              </td>
              <td className="px-4 py-3">
                {l.relationship ? (
                  <Chip tone="brand">{l.relationship}</Chip>
                ) : (
                  <span className="text-ink-subtle">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <form action={unlinkGuardian}>
                  <input type="hidden" name="id" value={l.id} />
                  <button
                    type="submit"
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10"
                  >
                    Unlink
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
