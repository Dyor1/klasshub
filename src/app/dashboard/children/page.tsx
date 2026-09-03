import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireViewer, currentAcademicYear, TERMS } from "@/lib/auth";
import { PageHeader, Card, EmptyState, Avatar, Chip, btnGhost } from "@/components/ui";

export const metadata = { title: "My children — KlassHub" };

export default async function ChildrenPage() {
  await requireViewer();
  const supabase = await createClient();
  const year = currentAcademicYear();

  // RLS returns only the children this parent is linked to.
  const { data: students } = await supabase
    .from("students")
    .select("id, surname, first_name, other_names, admission_number, class_id, status")
    .order("surname");

  const { data: classes } = await supabase.from("classes").select("id, name, section");
  const className = new Map(
    (classes ?? []).map((c) => [c.id, `${c.name}${c.section ? ` ${c.section}` : ""}`])
  );

  const { data: results } = await supabase
    .from("results")
    .select("student_id, term, percentage");

  const summary = new Map<string, { subjects: number; avg: number }>();
  for (const r of results ?? []) {
    const cur = summary.get(r.student_id) ?? { subjects: 0, avg: 0 };
    cur.avg = (cur.avg * cur.subjects + Number(r.percentage ?? 0)) / (cur.subjects + 1);
    cur.subjects += 1;
    summary.set(r.student_id, cur);
  }

  if (!students || students.length === 0) {
    return (
      <>
        <PageHeader title="My children" />
        <EmptyState
          title="No children linked to your account yet"
          hint="Your school administrator needs to link your account to your child's record before anything appears here."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="My children"
        subtitle="Results appear here once the school publishes them."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {students.map((s) => {
          const name = [s.surname, s.first_name, s.other_names].filter(Boolean).join(" ");
          const sum = summary.get(s.id);
          return (
            <Card key={s.id}>
              <div className="flex items-start gap-4">
                <Avatar name={name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-ink">{name}</p>
                  <p className="text-xs text-ink-muted">
                    {s.class_id ? className.get(s.class_id) ?? "—" : "No class"} &middot;{" "}
                    <span className="font-mono">{s.admission_number}</span>
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Chip tone={s.status === "active" ? "green" : "slate"}>{s.status}</Chip>
                    {sum ? (
                      <Chip tone="brand">
                        {sum.subjects} subject{sum.subjects === 1 ? "" : "s"} ·{" "}
                        {Math.round(sum.avg * 10) / 10}% avg
                      </Chip>
                    ) : (
                      <Chip tone="slate">No published results</Chip>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {TERMS.map((t) => (
                      <Link
                        key={t.value}
                        href={`/dashboard/report-cards/${s.id}?year=${encodeURIComponent(year)}&term=${t.value}`}
                        className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-hover"
                      >
                        {t.label.replace(" Term", "")} report
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-6">
        <Link href="/dashboard/results" className={btnGhost}>
          See all published results
        </Link>
      </div>
    </>
  );
}
