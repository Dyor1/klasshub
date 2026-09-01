import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireViewer, currentAcademicYear } from "@/lib/auth";
import { PageHeader, Card, StatCard, EmptyState, Chip, btnPrimary, btnGhost } from "@/components/ui";
import {
  IconSchool,
  IconUsers,
  IconBook,
  IconChart,
  IconCheck,
  IconCheckCircle,
  IconWallet,
  IconMegaphone,
  IconCalendar,
  IconClipboard,
  IconUserPlus,
  IconTrend,
} from "@/components/icons";

export const metadata = { title: "Overview — KlassHub" };

const naira = (n: number) =>
  `₦${Math.round(n).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const year = currentAcademicYear();

  const [
    school,
    classes,
    students,
    subjects,
    results,
    attendance,
    fees,
    announcements,
    events,
  ] = await Promise.all([
    supabase.from("schools").select("name, slug, plan, trial_ends_at, paid_until").single(),
    supabase.from("classes").select("id", { count: "exact", head: true }),
    supabase.from("students").select("id", { count: "exact", head: true }),
    supabase.from("subjects").select("id", { count: "exact", head: true }),
    supabase.from("results").select("id", { count: "exact", head: true }),
    // Enough recent days to say something honest about attendance without
    // pulling a term's worth of rows onto a landing page.
    supabase
      .from("attendance_daily")
      .select("date, marked, present, late")
      .order("date", { ascending: false })
      .limit(10),
    supabase.from("fee_summary").select("billed, collected, outstanding").eq("academic_year", year),
    supabase
      .from("announcements")
      .select("id, title, created_at")
      .order("created_at", { ascending: false })
      .limit(4),
    supabase
      .from("events")
      .select("id, title, event_date")
      .gte("event_date", new Date().toISOString().slice(0, 10))
      .order("event_date")
      .limit(4),
  ]);

  const s = school.data;
  const daysLeft = s
    ? Math.max(0, Math.ceil((new Date(s.trial_ends_at).getTime() - Date.now()) / 86_400_000))
    : 0;

  const steps = [
    { done: (classes.count ?? 0) > 0, label: "Create your classes", href: "/dashboard/classes" },
    { done: (subjects.count ?? 0) > 0, label: "Add your subjects", href: "/dashboard/subjects" },
    { done: (students.count ?? 0) > 0, label: "Enrol your students", href: "/dashboard/students" },
    { done: (results.count ?? 0) > 0, label: "Record your first results", href: "/dashboard/results" },
  ];
  const completed = steps.filter((x) => x.done).length;
  const setupDone = completed === steps.length;

  /* -------------------------------------------------------- student / parent */
  if (!viewer.isStaff) {
    return (
      <>
        <PageHeader
          eyebrow={greeting()}
          title={viewer.fullName ?? "Welcome"}
          subtitle={s?.name}
        />
        <EmptyState
          hue="learning"
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

  /* ------------------------------------------------------------------ staff */
  const att = (attendance.data ?? []).reduce(
    (acc, d) => ({
      marked: acc.marked + Number(d.marked ?? 0),
      here: acc.here + Number(d.present ?? 0) + Number(d.late ?? 0),
    }),
    { marked: 0, here: 0 }
  );
  const attRate = att.marked > 0 ? (att.here / att.marked) * 100 : null;

  // Explicit accumulator: the zeroed seed is assignable to the (nullable) row
  // type, so without this TS infers the row shape as the accumulator.
  const feeTotals = (fees.data ?? []).reduce<{
    billed: number;
    collected: number;
    outstanding: number;
  }>(
    (acc, f) => ({
      billed: acc.billed + Number(f.billed ?? 0),
      collected: acc.collected + Number(f.collected ?? 0),
      outstanding: acc.outstanding + Number(f.outstanding ?? 0),
    }),
    { billed: 0, collected: 0, outstanding: 0 }
  );
  const collectionRate =
    feeTotals.billed > 0 ? (feeTotals.collected / feeTotals.billed) * 100 : null;

  // The things a head teacher actually opens this portal to do. Kept short —
  // a wall of twelve shortcuts is another kind of nothing.
  const actions = [
    { href: "/dashboard/attendance", label: "Mark a register", icon: <IconCheckCircle />, hue: "time" as const },
    { href: "/dashboard/results", label: "Record results", icon: <IconChart />, hue: "learning" as const },
    { href: "/dashboard/students/import", label: "Import students", icon: <IconUserPlus />, hue: "people" as const },
    { href: "/dashboard/announcements", label: "Post a notice", icon: <IconMegaphone />, hue: "comms" as const },
    { href: "/dashboard/fees", label: "Record a payment", icon: <IconWallet />, hue: "money" as const },
    { href: "/dashboard/assignments", label: "Set homework", icon: <IconClipboard />, hue: "learning" as const },
  ];

  return (
    <>
      <PageHeader
        eyebrow={greeting()}
        title={s?.name ?? "Your school"}
        subtitle={
          s && (
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-mono text-xs text-ink-subtle">{s.slug}.klasshub.ng</span>
              <Chip tone="brand">{s.plan}</Chip>
              {s.plan === "trial" && (
                <Chip tone={daysLeft <= 7 ? "amber" : "slate"}>{daysLeft} days left</Chip>
              )}
            </span>
          )
        }
        action={
          <Link href="/dashboard/analytics" className={btnGhost}>
            <IconTrend className="mr-2 h-4 w-4" />
            Analytics
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Students"
          value={students.count ?? 0}
          href="/dashboard/students"
          hue="people"
          icon={<IconUsers />}
        />
        <StatCard
          label="Attendance"
          value={attRate == null ? "—" : `${attRate.toFixed(0)}%`}
          hint={att.marked > 0 ? `last ${attendance.data?.length ?? 0} days marked` : "nothing marked yet"}
          href="/dashboard/attendance"
          hue="time"
          icon={<IconCheckCircle />}
        />
        <StatCard
          label="Fees collected"
          value={collectionRate == null ? "—" : `${collectionRate.toFixed(0)}%`}
          hint={feeTotals.billed > 0 ? `${naira(feeTotals.outstanding)} still owed` : "no invoices yet"}
          href="/dashboard/fees"
          hue="money"
          icon={<IconWallet />}
        />
        <StatCard
          label="Results recorded"
          value={results.count ?? 0}
          hint={`${classes.count ?? 0} classes · ${subjects.count ?? 0} subjects`}
          href="/dashboard/results"
          hue="learning"
          icon={<IconChart />}
        />
      </div>

      {!setupDone && (
        <Card
          hue="people"
          title="Finish setting up"
          description={`${completed} of ${steps.length} done`}
          className="mt-6"
        >
          <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-sunken">
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
                  className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-hover"
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      step.done
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-sunken text-ink-subtle"
                    }`}
                  >
                    <IconCheck className="h-3.5 w-3.5" />
                  </span>
                  <span
                    className={`text-sm ${
                      step.done ? "text-ink-subtle line-through" : "font-medium text-ink"
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

      {/* The page used to end here for a set-up school: four numbers and
          241px of nothing. Everything below is what an admin actually opens
          the portal to do. */}
      <h2 className="mb-3 mt-8 text-[11px] font-bold uppercase tracking-[0.13em] text-ink-subtle">
        Quick actions
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            data-hue={a.hue}
            className="flex items-center gap-3.5 rounded-2xl border border-line-soft bg-card p-4 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-line hover:shadow-card-hover"
          >
            <span className="kh-tint flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
              <span className="h-5 w-5">{a.icon}</span>
            </span>
            <span className="text-sm font-semibold text-ink">{a.label}</span>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <Card
          hue="comms"
          title="Latest announcements"
          action={
            <Link
              href="/dashboard/announcements"
              className="text-[13px] font-semibold text-brand-600 hover:underline dark:text-brand-300"
            >
              All
            </Link>
          }
        >
          {(announcements.data ?? []).length === 0 ? (
            <p className="py-4 text-sm text-ink-subtle">Nothing posted yet.</p>
          ) : (
            <ul className="divide-y divide-line-soft">
              {(announcements.data ?? []).map((a) => (
                <li key={a.id} className="flex items-baseline justify-between gap-3 py-2.5">
                  <span className="min-w-0 truncate text-sm text-ink">{a.title}</span>
                  <span className="shrink-0 text-xs text-ink-subtle">
                    {new Date(a.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          hue="time"
          title="Coming up"
          action={
            <Link
              href="/dashboard/events"
              className="text-[13px] font-semibold text-brand-600 hover:underline dark:text-brand-300"
            >
              All
            </Link>
          }
        >
          {(events.data ?? []).length === 0 ? (
            <p className="py-4 text-sm text-ink-subtle">Nothing scheduled.</p>
          ) : (
            <ul className="divide-y divide-line-soft">
              {(events.data ?? []).map((e) => (
                <li key={e.id} className="flex items-baseline justify-between gap-3 py-2.5">
                  <span className="min-w-0 truncate text-sm text-ink">{e.title}</span>
                  <span className="shrink-0 text-xs text-ink-subtle">
                    {new Date(e.event_date).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
