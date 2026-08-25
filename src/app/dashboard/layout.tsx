import AppShell from "@/components/AppShell";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../(auth)/actions";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const viewer = await requireViewer();
  const supabase = await createClient();

  const [{ data: school }, { count: unread }] = await Promise.all([
    supabase.from("schools").select("name, plan").single(),
    // RLS scopes this to the caller's own inbox.
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .is("read_at", null),
  ]);

  return (
    <AppShell
      schoolName={school?.name ?? "Your school"}
      planLabel={school ? `${school.plan} plan` : "KlassHub"}
      userName={viewer.fullName ?? "Member"}
      userRole={viewer.role}
      isStaff={viewer.isStaff}
      unreadCount={unread ?? 0}
      signOutAction={signOut}
    >
      {children}
    </AppShell>
  );
}
