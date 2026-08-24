import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import { PageHeader, Card, StatCard, EmptyState, Chip, btnPrimary } from "@/components/ui";
import {
  IconSchool,
  IconUsers,
  IconBook,
  IconChart,
  IconCheck,
} from "@/components/icons";

export const metadata = { title: "Overview — KlassHub" };

export default async function DashboardPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();

  const [school, classes, students, subjects, results] = await Promise.all([
    supabase.from("schools").select("name, slug, plan, trial_ends_at").single(),
    supabase.from("classes").select("id", { count: "exact", head: true }),
    supabase.from("students").select("id", { count: "exact", head: true }),
    supabase.from("subjects").select("id", { count: "exact", head: true }),
    supabase.from("results").select("id", { count: "exact", head: true }),
  ]);

  const s = school.data;
  const daysLeft = s
    ? Math.max(
        0,
        Math.ceil(
          (new Date(s.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
      )
    : 0;

  const steps = [
    { done: (classes.count ?? 0) > 0, label: "Create your classes", href: "/dashboard/classes" },
    { done: (subjects.count ?? 0) > 0, label: "Add your subjects", href: "/dashboard/subjects" },
    { done: (students.count ?? 0) > 0, label: "Enrol your students", href: "/dashboard/students" },
    { done: (results.count ?? 0) > 0, label: "Record your first results", href: "/dashboard/results" },
  ];
  const completed = steps.filter((x) => x.done).length;
  const setupDone = completed === steps.length;

  if (!viewer.isStaff) {
    return (
      <>
        <PageHeader
          title={`Welcome, ${viewer.fullName ?? "there"}`}
          subtitle={s?.name}
        />
        <EmptyState
          title="Your results appear here once published"
          hint="When your teachers publish marks for a term, you'll find them under Results."
          action={
            <Link href="/dashboard/results" className={btnPrimary}>
              View my results
            </Link>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={s?.name ?? "Your school"}
        subtitle={
          s && (
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-mono text-xs text-slate-400">
                {s.slug}.klasshub.ng
              </span>
              <Chip tone="brand">{s.plan}</Chip>
              {s.plan === "trial" && (
                <Chip tone={daysLeft <= 7 ? "amber" : "slate"}>
                  {daysLeft} days left
                </Chip>
              )}
            </span>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Classes"
          value={classes.count ?? 0}
          href="/dashboard/classes"
          tone="brand"
          icon={<IconSchool />}
        />
        <StatCard
          label="Students"
          value={students.count ?? 0}
          href="/dashboard/students"
          tone="blue"
          icon={<IconUsers />}
        />
        <StatCard
          label="Subjects"
          value={subjects.count ?? 0}
          href="/dashboard/subjects"
          tone="green"
          icon={<IconBook />}
        />
        <StatCard
          label="Results recorded"
          value={results.count ?? 0}
          href="/dashboard/results"
          tone="amber"
          icon={<IconChart />}
        />
      </div>

      {!setupDone && (
        <Card
          title="Finish setting up"
          description={`${completed} of ${steps.length} done`}
          className="mt-8"
        >
          <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-brand-gradient transition-all duration-500"
              style={{ width: `${(completed / steps.length) * 100}%` }}
            />
          </div>
          <ol className="space-y-1">
            {steps.map((step) => (
              <li key={step.label}>
                <Link
                  href={step.href}
                  className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-slate-50"
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      step.done
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-slate-100 text-slate-300"
                    }`}
                  >
                    <IconCheck className="h-3.5 w-3.5" />
                  </span>
                  <span
                    className={`text-sm ${
                      step.done
                        ? "text-slate-400 line-through"
                        : "font-medium text-slate-800"
                    }`}
                  >
                    {step.label}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </>
  );
}
