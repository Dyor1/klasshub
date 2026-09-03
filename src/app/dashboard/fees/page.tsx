import { createClient } from "@/lib/supabase/server";
import { requireViewer, currentAcademicYear, TERMS } from "@/lib/auth";
import {
  PageHeader,
  Card,
  StatCard,
  EmptyState,
  Table,
  Chip,
  Avatar,
  inputClass,
  btnGhost,
} from "@/components/ui";
import { IconWallet, IconCheckCircle, IconChart, IconUsers } from "@/components/icons";
import { FeeItemForm, RaiseInvoicesForm, PaymentForm } from "./FeeForms";
import PayButton from "./PayButton";
import { deleteFeeItem } from "./actions";

export const metadata = { title: "Fees — KlassHub" };

const naira = (n: number | string) =>
  `₦${Number(n).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;

const statusTone = {
  paid: "green",
  part: "amber",
  unpaid: "slate",
  waived: "brand",
} as const;

export default async function FeesPage({
  searchParams,
}: {
  searchParams: Promise<{ term?: string; year?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const viewer = await requireViewer();
  const supabase = await createClient();

  const year = sp.year?.trim() || currentAcademicYear();
  const termValues = TERMS.map((t) => t.value);
  const term = termValues.includes(sp.term as (typeof termValues)[number])
    ? (sp.term as (typeof termValues)[number])
    : "first";

  // --------------------------------------------------- student / parent view
  // RLS returns only their own or their children's invoices.
  if (!viewer.isStaff) {
    const [{ data: bills }, { data: kids }, { data: payments }] = await Promise.all([
      supabase
        .from("invoice_balances")
        .select("id, student_id, term, academic_year, total_amount, discount, amount_paid, balance, payment_status")
        .order("academic_year", { ascending: false }),
      supabase.from("students").select("id, surname, first_name"),
      supabase
        .from("payments")
        .select("id, student_id, amount, method, receipt_no, paid_at")
        .order("paid_at", { ascending: false }),
    ]);

    const name = new Map((kids ?? []).map((s) => [s.id, `${s.surname} ${s.first_name}`]));
    const owed = (bills ?? []).reduce((sum, b) => sum + Number(b.balance), 0);
    const showWho = (kids?.length ?? 0) > 1;

    return (
      <>
        <PageHeader
          title="Fees"
          subtitle={viewer.role === "parent" ? "What your children owe." : "Your fee account."}
        />

        {(bills ?? []).length === 0 ? (
          <EmptyState
            title="No bills yet"
            hint="Invoices appear here once the school raises them for the term."
          />
        ) : (
          <>
            <div className="mb-6 grid gap-4 sm:grid-cols-3">
              <StatCard
                label="Outstanding"
                value={naira(owed)}
                hue={owed > 0 ? "money" : "time"}
                icon={<IconWallet />}
              />
              <StatCard
                label="Paid"
                value={naira((bills ?? []).reduce((s, b) => s + Number(b.amount_paid), 0))}
                hue="time"
                icon={<IconCheckCircle />}
              />
              <StatCard label="Invoices" value={(bills ?? []).length} hue="people" icon={<IconChart />} />
            </div>

            <Card title="Bills" className="mb-6">
              <Table
                head={[
                  ...(showWho ? ["Student"] : []),
                  "Term",
                  "Billed",
                  "Paid",
                  "Balance",
                  "Status",
                  "",
                ]}
              >
                {(bills ?? []).map((b) => (
                  <tr key={b.id} className="hover:bg-hover">
                    {showWho && (
                      <td className="px-4 py-3 font-medium text-ink">
                        {name.get(b.student_id ?? "") ?? "—"}
                      </td>
                    )}
                    <td className="px-4 py-3 capitalize text-ink-muted">
                      {b.term} · {b.academic_year}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {naira(Number(b.total_amount) - Number(b.discount))}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{naira(b.amount_paid ?? 0)}</td>
                    <td className="px-4 py-3 font-semibold text-ink">
                      {naira(b.balance ?? 0)}
                    </td>
                    <td className="px-4 py-3">
                      <Chip tone={statusTone[b.payment_status as keyof typeof statusTone] ?? "slate"}>
                        {b.payment_status}
                      </Chip>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {b.id && Number(b.balance ?? 0) > 0 && (
                        <PayButton
                          invoiceId={b.id}
                          amount={naira(Number(b.balance ?? 0))}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </Table>
            </Card>

            {(payments ?? []).length > 0 && (
              <Card title="Payment history">
                <Table head={["Receipt", "Date", "Method", "Amount"]}>
                  {(payments ?? []).map((p) => (
                    <tr key={p.id} className="hover:bg-hover">
                      <td className="px-4 py-3 font-mono text-xs text-ink-muted">{p.receipt_no}</td>
                      <td className="px-4 py-3 text-ink-muted">
                        {new Date(p.paid_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 capitalize text-ink-muted">{p.method}</td>
                      <td className="px-4 py-3 font-semibold text-ink">{naira(p.amount)}</td>
                    </tr>
                  ))}
                </Table>
              </Card>
            )}
          </>
        )}
      </>
    );
  }

  // ------------------------------------------------------------- staff view
  const [{ data: classes }, { data: feeItems }, { data: bills }, { data: students }] =
    await Promise.all([
      supabase.from("classes").select("id, name, academic_year").order("name"),
      supabase
        .from("fee_items")
        .select("id, name, amount, class_id, is_optional, sort_order")
        .eq("term", term)
        .eq("academic_year", year)
        .order("sort_order"),
      supabase
        .from("invoice_balances")
        .select("id, student_id, class_id, total_amount, discount, amount_paid, balance, payment_status")
        .eq("term", term)
        .eq("academic_year", year),
      supabase.from("students").select("id, surname, first_name, admission_number, class_id"),
    ]);

  const studentById = new Map((students ?? []).map((s) => [s.id, s]));
  const className = new Map((classes ?? []).map((c) => [c.id, c.name]));

  const filtered = sp.status
    ? (bills ?? []).filter((b) => b.payment_status === sp.status)
    : bills ?? [];

  const billedTotal = (bills ?? []).reduce(
    (s, b) => s + (Number(b.total_amount) - Number(b.discount)),
    0
  );
  const collected = (bills ?? []).reduce((s, b) => s + Number(b.amount_paid), 0);
  const outstanding = (bills ?? []).reduce((s, b) => s + Number(b.balance), 0);
  const rate = billedTotal > 0 ? Math.round((collected / billedTotal) * 100) : 0;

  return (
    <>
      <PageHeader
        title="Fees"
        subtitle="Set the fee structure, raise invoices and track who owes what."
      />

      <Card className="mb-6">
        <form method="get" className="grid gap-4 sm:grid-cols-3 sm:items-end">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-muted">Term</span>
            <select name="term" defaultValue={term} className={inputClass}>
              {TERMS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-muted">Session</span>
            <input name="year" defaultValue={year} className={inputClass} />
          </label>
          <button type="submit" className={btnGhost}>
            Load term
          </button>
        </form>
      </Card>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Billed" value={naira(billedTotal)} hue="people" icon={<IconWallet />} />
        <StatCard label="Collected" value={naira(collected)} hue="time" icon={<IconCheckCircle />} />
        <StatCard label="Outstanding" value={naira(outstanding)} hue="money" icon={<IconUsers />} />
        <StatCard label="Collection rate" value={`${rate}%`} hue="learning" icon={<IconChart />} />
      </div>

      {viewer.isAdmin && (
        <>
          <Card
            title={`Fee structure — ${TERMS.find((t) => t.value === term)?.label}, ${year}`}
            description="What each class is charged. Editing this never changes invoices already raised."
            className="mb-6"
          >
            {(feeItems ?? []).length > 0 && (
              <div className="mb-5 overflow-hidden rounded-xl border border-line">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-line-soft">
                    {(feeItems ?? []).map((f) => (
                      <tr key={f.id}>
                        <td className="px-4 py-2.5 font-medium text-ink">{f.name}</td>
                        <td className="px-4 py-2.5 text-ink-muted">
                          {f.class_id ? className.get(f.class_id) ?? "—" : "All classes"}
                        </td>
                        <td className="px-4 py-2.5">
                          {f.is_optional && <Chip tone="slate">optional</Chip>}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-ink">
                          {naira(f.amount)}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <form action={deleteFeeItem}>
                            <input type="hidden" name="id" value={f.id} />
                            <button
                              type="submit"
                              className="rounded-lg px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10"
                            >
                              Remove
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <FeeItemForm classes={classes ?? []} term={term} academicYear={year} />
          </Card>

          <Card title="Raise invoices" className="mb-6">
            {(feeItems ?? []).length === 0 ? (
              <p className="text-sm text-ink-muted">
                Add at least one fee item above before raising invoices.
              </p>
            ) : (
              <RaiseInvoicesForm classes={classes ?? []} term={term} academicYear={year} />
            )}
          </Card>
        </>
      )}

      {(bills ?? []).length === 0 ? (
        <EmptyState
          title="No invoices for this term"
          hint={
            viewer.isAdmin
              ? "Set the fee structure, then raise invoices for each class."
              : "An administrator hasn't raised invoices for this term yet."
          }
        />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            {[
              { key: "", label: `All (${(bills ?? []).length})` },
              { key: "unpaid", label: "Unpaid" },
              { key: "part", label: "Part paid" },
              { key: "paid", label: "Paid" },
            ].map((f) => (
              <a
                key={f.key}
                href={`/dashboard/fees?term=${term}&year=${encodeURIComponent(year)}${f.key ? `&status=${f.key}` : ""}`}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  (sp.status ?? "") === f.key
                    ? "bg-brand-500/10 text-brand-700 dark:text-brand-300"
                    : "text-ink-muted hover:bg-hover"
                }`}
              >
                {f.label}
              </a>
            ))}
          </div>

          <Table head={["Student", "Class", "Billed", "Paid", "Balance", "Status", ""]}>
            {filtered.map((b) => {
              const s = studentById.get(b.student_id ?? "");
              const name = s ? `${s.surname} ${s.first_name}` : "Unknown";
              const netBilled = Number(b.total_amount) - Number(b.discount);
              return (
                <tr key={b.id} className="hover:bg-hover">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={name} />
                      <div className="min-w-0">
                        <p className="font-medium text-ink">{name}</p>
                        <p className="font-mono text-xs text-ink-subtle">
                          {s?.admission_number ?? ""}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {b.class_id ? className.get(b.class_id) ?? "—" : "—"}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{naira(netBilled)}</td>
                  <td className="px-4 py-3 text-ink-muted">{naira(b.amount_paid ?? 0)}</td>
                  <td className="px-4 py-3 font-semibold text-ink">
                    {naira(b.balance ?? 0)}
                  </td>
                  <td className="px-4 py-3">
                    <Chip tone={statusTone[b.payment_status as keyof typeof statusTone] ?? "slate"}>
                      {b.payment_status}
                    </Chip>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {viewer.isAdmin && b.id && Number(b.balance) > 0 && (
                      <PaymentForm
                        invoiceId={b.id}
                        studentName={name}
                        balance={Number(b.balance)}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </Table>
        </>
      )}
    </>
  );
}
