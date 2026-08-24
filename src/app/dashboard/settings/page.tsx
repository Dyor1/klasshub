import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import { PageHeader, Card } from "@/components/ui";
import GradingScaleForm from "./GradingScaleForm";

export const metadata = { title: "Settings — KlassHub" };

export default async function SettingsPage() {
  const viewer = await requireViewer();
  if (!viewer.isAdmin) redirect("/dashboard");

  const supabase = await createClient();
  const { data: bands } = await supabase
    .from("grade_bands")
    .select("grade, min_score, max_score, remark")
    .order("sort_order");

  const { count: resultCount } = await supabase
    .from("results")
    .select("id", { count: "exact", head: true });

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="School-wide configuration."
      />

      <Card
        title="Grading scale"
        description="Bands must cover 0–100 with no gaps or overlaps, or some results would end up with no grade."
      >
        {resultCount ? (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
            Changing the scale re-grades all {resultCount} existing result
            {resultCount === 1 ? "" : "s"} immediately — report cards already
            issued will show the new letters.
          </p>
        ) : null}

        <GradingScaleForm bands={bands ?? []} />
      </Card>
    </>
  );
}
