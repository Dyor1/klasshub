import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import ImportWizard from "./ImportWizard";

export const metadata = { title: "Import students — KlassHub" };

export default async function ImportStudentsPage() {
  const viewer = await requireViewer();
  if (!viewer.isStaff) redirect("/dashboard");

  const supabase = await createClient();
  const { data: classes } = await supabase.from("classes").select("name").order("name");

  return (
    <>
      <Link
        href="/dashboard/students"
        className="text-sm text-ink-muted hover:text-brand-600 dark:text-brand-300"
      >
        &larr; Students
      </Link>
      <div className="mt-3">
        <PageHeader
          title="Import students"
          subtitle="Bring a whole roll in from a spreadsheet instead of typing it."
        />
      </div>

      <ImportWizard classNames={(classes ?? []).map((c) => c.name)} />
    </>
  );
}
