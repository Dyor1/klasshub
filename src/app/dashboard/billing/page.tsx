import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import { PageHeader, Card, Chip, Table } from "@/components/ui";
import PlanCard from "./PlanCard";

export const metadata = { title: "Billing — KlassHub" };
export const dynamic = "force-dynamic";

const naira = (kobo: number) =>
  `₦${(kobo / 100).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

export default async function BillingPage() {
  const viewer = await requireViewer();
  if (!viewer.isAdmin) redirect("/dashboard");

  const supabase = await createClient();

  const [{ data: billingRows }, { data: plans }, { data: history }] = await Promise.all([
    // One RPC rather than reading schools + counting students here, so the page
    // shows the same numbers the triggers enforce instead of a second copy of
    // the rules that could drift from them.
    supabase.rpc("my_school_billing"),
    supabase.from("plan_limits").select("*").order("sort_order"),
    supabase
      .from("subscription_payments")
      .select("id, plan, amount, status, paid_at, period_end, reference")
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  const billing = Array.isArray(billingRows) ? billingRows[0] : billingRows;
  if (!billing) redirect("/dashboard");

  const students = Number(billing.student_count ?? 0);
  const cap = billing.max_students;
  const usage = cap ? Math.min(100, (students / cap) * 100) : 0;
  const nearCap = cap !== null && students >= cap * 0.9;

  const access = billing.access;
  const endsAt = billing.paid_until ?? billing.trial_ends_at;
  const days = daysUntil(endsAt);

  const banner =
    access === "locked"
      ? {
          tone: "border-red-200 bg-red-50 text-red-900",
          title: "Your subscription has ended",
          body: "Everything is still here and still readable, and you can export or delete it at any time. Recording new work needs an active plan.",
        }
      : access === "grace"
        ? {
            tone: "border-amber-200 bg-amber-50 text-amber-900",
            title: "Your plan has lapsed",
            body: `You can keep working for ${Math.max(0, 7 + (days ?? 0))} more day${
              Math.max(0, 7 + (days ?? 0)) === 1 ? "" : "s"
            }. Renew below to avoid interruption.`,
          }
        : access === "trial" && (days ?? 99) <= 7
          ? {
              tone: "border-amber-200 bg-amber-50 text-amber-900",
              title: `${days} day${days === 1 ? "" : "s"} left on your trial`,
              body: "Choose a plan below to keep recording after it ends. Nothing is deleted either way.",
            }
          : null;

  return (
    <>
      <PageHeader
        title="Billing"
        subtitle="Your KlassHub plan, what it covers, and what you've paid."
      />

      {banner && (
        <div className={`mb-6 rounded-2xl border px-5 py-4 ${banner.tone}`}>
          <p className="text-sm font-bold">{banner.title}</p>
          <p className="mt-1 text-sm leading-relaxed">{banner.body}</p>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card title="Current plan">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-extrabold text-brand-900">{billing.label}</span>
            <Chip
              tone={
                access === "active" ? "green" : access === "trial" ? "brand" : access === "grace" ? "amber" : "red"
              }
            >
              {access}
            </Chip>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {/* Tense matters: in grace the date is already in the past, and
                "Runs until 26 August" reads as though it still does. */}
            {access === "locked"
              ? "Read-only until renewed."
              : endsAt
                ? `${
                    access === "trial"
                      ? "Trial ends"
                      : access === "grace"
                        ? "Ended"
                        : "Runs until"
                  } ${new Date(endsAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}`
                : "No end date on record."}
          </p>
        </Card>

        <Card title="Students">
          <p className="text-2xl font-extrabold text-brand-900">
            {students}
            {cap !== null && (
              <span className="text-base font-semibold text-slate-400"> / {cap}</span>
            )}
          </p>
          {cap !== null ? (
            <>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${nearCap ? "bg-amber-500" : "bg-brand-500"}`}
                  style={{ width: `${usage}%` }}
                />
              </div>
              {nearCap && (
                <p className="mt-2 text-xs font-medium text-amber-700">
                  You are close to your limit. Enrolling past {cap} needs a larger plan.
                </p>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-500">Unlimited on your plan.</p>
          )}
        </Card>
      </div>

      <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
        Plans
      </h2>
      <div className="grid gap-4 lg:grid-cols-3">
        {(plans ?? [])
          .filter((p) => p.plan !== "trial")
          .map((p) => (
            <PlanCard
              key={p.plan}
              plan={p.plan}
              label={p.label}
              price={p.price_kobo === null ? "Let's talk" : `${naira(p.price_kobo)} / term`}
              maxStudents={p.max_students}
              studentCount={students}
              isCurrent={p.plan === billing.plan}
              selfServe={p.self_serve}
            />
          ))}
      </div>

      {(history ?? []).length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
            Payment history
          </h2>
          <Table head={["Plan", "Amount", "Status", "Covers until", "Reference"]}>
            {(history ?? []).map((h) => (
              <tr key={h.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3 font-medium capitalize text-slate-900">{h.plan}</td>
                <td className="px-4 py-3 text-slate-600">
                  ₦{Number(h.amount).toLocaleString("en-NG")}
                </td>
                <td className="px-4 py-3">
                  <Chip
                    tone={
                      h.status === "success" ? "green" : h.status === "failed" ? "red" : "slate"
                    }
                  >
                    {h.status}
                  </Chip>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {h.period_end
                    ? new Date(h.period_end).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </td>
                <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                  {h.reference}
                </td>
              </tr>
            ))}
          </Table>
        </div>
      )}
    </>
  );
}
