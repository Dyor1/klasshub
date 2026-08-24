import AppShell from "@/components/AppShell";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../(auth)/actions";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const viewer = await requireViewer();
  const supabase = await createClient();

  const { data: school } = await supabase
    .from("schools")
    .select("name, plan")
    .single();

  return (
    <AppShell
      schoolName={school?.name ?? "Your school"}
      planLabel={school ? `${school.plan} plan` : "KlassHub"}
      userName={viewer.fullName ?? "Member"}
      userRole={viewer.role}
      isStaff={viewer.isStaff}
      signOutAction={signOut}
    >
      {children}
    </AppShell>
  );
}
