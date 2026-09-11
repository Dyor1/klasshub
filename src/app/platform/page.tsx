import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePlatformOperator } from "@/lib/auth";
import { PageHeader, Card, StatCard, Table, Chip, EmptyState } from "@/components/ui";
import SchoolRow from "./SchoolRow";

export const metadata = { title: "Platform — KlassHub" };

function when(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function daysUntil(iso: string | null) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function Icon({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

export default async function PlatformPage() {
  await requirePlatformOperator();
  const supabase = await createClient();

  const [{ data: schools }, { data: audit }] = await Promise.all([
    supabase.rpc("platform_schools"),
    supabase.rpc("platform_recent_actions", { p_limit: 25 }),
  ]);

  const rows = schools ?? [];
  const totals = {
    schools: rows.length,
    pupils: rows.reduce((n, s) => n + Number(s.students ?? 0), 0),
    paying: rows.filter((s) => s.plan !== "trial").length,
    // The number that actually matters on a Monday morning: who is about to
    // fall off a trial and needs a conversation this week.
    expiringSoon: rows.filter((s) => {
      const d = daysUntil(s.trial_ends_at);
      return s.plan === "trial" && d !== null && d >= 0 && d <= 7;
    }).length,
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <PageHeader
        eyebrow="Platform"
        title="Every school on KlassHub"
        subtitle="Operator view. Counts and billing only — no pupil records, marks or messages."
        action={
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center rounded-2xl border border-line bg-card px-4 text-sm font-semibold text-ink transition-colors hover:bg-hover"
          >
            Back to your school
          </Link>
        }
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Schools"
          value={String(totals.schools)}
          hue="admin"
          icon={<Icon d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />}
        />
        <StatCard
          label="Pupils across all schools"
          value={totals.pupils.toLocaleString()}
          hue="people"
          icon={<Icon d="M17 20v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M10 10a3 3 0 100-6 3 3 0 000 6zM21 20v-2a4 4 0 00-3-3.9" />}
        />
        <StatCard
          label="On a paid plan"
          value={String(totals.paying)}
          hue="money"
          icon={<Icon d="M3 7h18v10H3zM3 11h18M7 15h3" />}
        />
        <StatCard
          label="Trials ending within 7 days"
          value={String(totals.expiringSoon)}
          hue="time"
          icon={<Icon d="M12 8v4l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
          hint={totals.expiringSoon > 0 ? "Worth a call this week" : undefined}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No schools yet"
          hint="Every school that registers appears here."
        />
      ) : (
        <Table
          minWidth={900}
          head={["School", "Plan", "Access", "Pupils", "Staff", "Trial ends", "Paid until", ""]}
        >
          {rows.map((s) => (
            <SchoolRow
              key={s.id}
              school={{
                id: s.id,
                name: s.name,
                slug: s.slug,
                plan: s.plan,
                access: s.access,
                students: Number(s.students ?? 0),
                staff: Number(s.staff ?? 0),
                maxStudents: s.max_students,
                trialEnds: when(s.trial_ends_at),
                trialDaysLeft: daysUntil(s.trial_ends_at),
                paidUntil: when(s.paid_until),
              }}
            />
          ))}
        </Table>
      )}

      <Card
        title="Recent operator actions"
        description="Written by the database when an action runs, not by the app — so nothing an operator does here is unrecorded."
        className="mt-8"
      >
        {!audit || audit.length === 0 ? (
          <p className="text-sm text-ink-muted">Nothing yet.</p>
        ) : (
          <ul className="divide-y divide-line-soft">
            {audit.map((a, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-x-2 py-2.5 text-sm">
                {/* The chip capitalises, but CSS does not treat an underscore
                    as a word break, so the raw enum renders as
                    "Extend_trial". */}
                <Chip tone="slate">{a.action.replace(/_/g, " ")}</Chip>
                <span className="font-medium text-ink">{a.school_name ?? "—"}</span>
                <span className="text-ink-muted">by {a.actor_email ?? "unknown"}</span>
                <span className="ml-auto text-xs text-ink-subtle">
                  {new Date(a.at).toLocaleString("en-GB")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
