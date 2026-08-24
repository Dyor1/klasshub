import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import { PageHeader, Card, Chip, Avatar, roleChip } from "@/components/ui";
import InviteForm from "./InviteForm";
import { revokeInvitation } from "./actions";

export const metadata = { title: "Team — KlassHub" };

export default async function TeamPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();

  // RLS scopes both queries to the caller's school. Non-admins get zero
  // invitations back, so the section simply doesn't render for them.
  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, role, created_at")
      .order("created_at", { ascending: true }),
    supabase
      .from("invitations")
      .select("id, email, role, expires_at")
      .is("accepted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <>
      <PageHeader title="Team" subtitle="Everyone with access to your school." />

      {viewer.isAdmin ? (
        <div className="mb-8">
          <InviteForm />
        </div>
      ) : (
        <p className="mb-8 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
          Only administrators can invite people.
        </p>
      )}

      {viewer.isAdmin && invites && invites.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Pending invitations
          </h2>
          <ul className="mt-3 space-y-2">
            {invites.map((inv) => {
              const expired = new Date(inv.expires_at) <= new Date();
              return (
                <li
                  key={inv.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {inv.email}
                    </p>
                    <p className="text-xs text-slate-500">
                      {expired ? (
                        <span className="text-red-600">Expired</span>
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
                      roleChip[inv.role] ?? "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {inv.role}
                  </span>
                  <form action={revokeInvitation}>
                    <input type="hidden" name="id" value={inv.id} />
                    <button
                      type="submit"
                      className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
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

      <Card title={`Members (${members?.length ?? 0})`}>
        <ul className="divide-y divide-slate-100">
          {members?.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-4 py-3 first:pt-0">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={m.full_name ?? m.email ?? "?"} tone="slate" />
                <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">
                  {m.full_name ?? "—"}
                  {m.id === viewer.id && (
                    <span className="ml-2 text-xs font-normal text-slate-400">you</span>
                  )}
                </p>
                <p className="truncate text-xs text-slate-500">{m.email}</p>
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
