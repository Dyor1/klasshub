import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import { PageHeader, Card, Chip, Avatar, roleChip } from "@/components/ui";
import { FilterBar, SearchField, SelectField, FilterActions } from "@/components/Filters";
import { searchClauses, displayTerm } from "@/lib/search";
import InviteForm from "./InviteForm";
import BulkInviteForm from "./BulkInviteForm";
import { revokeInvitation } from "./actions";

export const metadata = { title: "Team — KlassHub" };

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string }>;
}) {
  const ROLES = ["admin", "teacher", "student", "parent"] as const;
  const sp = await searchParams;
  const term = displayTerm(sp.q);
  const role = ROLES.find((r) => r === sp.role);
  const isFiltered = Boolean(term || role);

  const viewer = await requireViewer();
  const supabase = await createClient();

  // RLS scopes both queries to the caller's school. Non-admins get zero
  // invitations back, so the section simply doesn't render for them.
  const [{ data: members }, { data: invites }] = await Promise.all([
    (async () => {
      let q = supabase
        .from("profiles")
        .select("id, full_name, email, role, created_at")
        .order("created_at", { ascending: true });
      if (role) q = q.eq("role", role);
      for (const clause of searchClauses(["full_name", "email"], term)) q = q.or(clause);
      return q;
    })(),
    supabase
      .from("invitations")
      .select("id, email, role, expires_at")
      .is("accepted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <>
      <PageHeader title="Team" subtitle="Everyone with access to your school." />

      <FilterBar>
        <SearchField defaultValue={term} placeholder="Name or email…" />
        <SelectField
          name="role"
          label="Role"
          defaultValue={role ?? ""}
          allLabel="All roles"
          options={[
            { value: "admin", label: "Administrators" },
            { value: "teacher", label: "Teachers" },
            { value: "student", label: "Students" },
            { value: "parent", label: "Parents" },
          ]}
        />
        <FilterActions clearHref="/dashboard/team" isFiltered={isFiltered} />
      </FilterBar>

      {viewer.isAdmin ? (
        <div className="mb-8 space-y-6">
          <InviteForm />
          <Card
            title="Invite several people"
            description="Onboarding a school means inviting the whole staff room. One address at a time is where an admin gives up and starts sharing a login."
          >
            <BulkInviteForm />
          </Card>
        </div>
      ) : (
        <p className="mb-8 rounded-lg border border-line bg-card px-4 py-3 text-sm text-ink-muted">
          Only administrators can invite people.
        </p>
      )}

      {viewer.isAdmin && invites && invites.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
            Pending invitations
          </h2>
          <ul className="mt-3 space-y-2">
            {invites.map((inv) => {
              const expired = new Date(inv.expires_at) <= new Date();
              return (
                <li
                  key={inv.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-line bg-card px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {inv.email}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {expired ? (
                        <span className="text-red-600 dark:text-red-400">Expired</span>
                      ) : (
                        <>
                          Expires{" "}
                          {new Date(inv.expires_at).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                          })}
                        </>
                      )}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${
                      roleChip[inv.role] ?? "bg-sunken text-ink"
                    }`}
                  >
                    {inv.role}
                  </span>
                  <form action={revokeInvitation}>
                    <input type="hidden" name="id" value={inv.id} />
                    <button
                      type="submit"
                      className="shrink-0 inline-flex min-h-11 items-center rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10"
                    >
                      Revoke
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <Card
        title={`Members (${members?.length ?? 0})`}
        description={isFiltered ? "Filtered — clear the filters above to see everyone." : undefined}
      >
        <ul className="divide-y divide-line-soft">
          {members?.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-4 py-3 first:pt-0">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={m.full_name ?? m.email ?? "?"} tone="muted" />
                <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">
                  {m.full_name ?? "—"}
                  {m.id === viewer.id && (
                    <span className="ml-2 text-xs font-normal text-ink-subtle">you</span>
                  )}
                </p>
                <p className="truncate text-xs text-ink-muted">{m.email}</p>
                </div>
              </div>
              <Chip>{m.role}</Chip>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
