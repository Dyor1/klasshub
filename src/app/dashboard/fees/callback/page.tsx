import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import { PageHeader, Card, btnPrimary, btnGhost } from "@/components/ui";

export const metadata = { title: "Payment — KlassHub" };

// Paystack sends the payer back here after checkout. Nothing in this URL is
// evidence of anything: a curious student can visit it having paid nothing, and
// Paystack appends the same reference whether the card was charged or declined.
// So this page reports what the *ledger* says, and the ledger is only written by
// the signed webhook.
export const dynamic = "force-dynamic";

const naira = (n: number | string) =>
  `₦${Number(n).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;

export default async function PaymentCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string; trxref?: string }>;
}) {
  await requireViewer();
  const sp = await searchParams;
  // Paystack sends both; they carry the same value.
  const reference = sp.reference || sp.trxref || "";

  const supabase = await createClient();

  // RLS on payment_attempts means a reference belonging to someone else simply
  // returns nothing, so a guessed reference reveals no one else's payment.
  const { data: attempt } = reference
    ? await supabase
        .from("payment_attempts")
        .select("status, amount, paid_at, invoice_id")
        .eq("reference", reference)
        .maybeSingle()
    : { data: null };

  const settled = attempt?.status === "success";
  const failed = attempt?.status === "failed" || attempt?.status === "abandoned";
  // A reference we hold no attempt for is not "checking" — there is nothing
  // pending to check. Saying so avoids a heading that contradicts its own body.
  const unknown = Boolean(reference) && !attempt;

  return (
    <>
      <PageHeader
        title={
          settled
            ? "Payment received"
            : failed
              ? "Payment not completed"
              : unknown
                ? "We can't find that payment"
                : "Checking your payment"
        }
        subtitle={
          settled
            ? "Your school's records have been updated."
            : failed
              ? "Nothing was charged to your account."
              : unknown
                ? "No payment on this account matches that reference."
                : "This usually takes a few seconds."
        }
      />

      <Card>
        {!reference ? (
          <p className="text-sm text-slate-600">
            No payment reference was supplied. If you were paying a bill, open it
            again from the Fees page.
          </p>
        ) : !attempt ? (
          <p className="text-sm text-slate-600">
            We have no record of that reference. If money left your account,
            contact the school with the reference{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
              {reference}
            </code>{" "}
            and they can look it up.
          </p>
        ) : settled ? (
          <>
            <p className="text-2xl font-extrabold text-emerald-700">
              {naira(attempt.amount)}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Received{" "}
              {attempt.paid_at
                ? new Date(attempt.paid_at).toLocaleString("en-GB", {
                    day: "numeric",
                    month: "long",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "just now"}
              . Your receipt is on the Fees page.
            </p>
          </>
        ) : failed ? (
          <p className="text-sm text-slate-600">
            The payment did not go through, so the bill is still outstanding. You
            can try again from the Fees page.
          </p>
        ) : (
          <>
            <p className="text-sm text-slate-600">
              We are waiting for confirmation from Paystack. This page does not
              take their word for it — your bill updates only once the payment is
              confirmed directly to us, which is normally within a few seconds.
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Reference{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5">{reference}</code>
            </p>
          </>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/dashboard/fees" className={btnPrimary}>
            Back to fees
          </Link>
          {!settled && attempt && !failed && (
            <Link href={`/dashboard/fees/callback?reference=${reference}`} className={btnGhost}>
              Check again
            </Link>
          )}
        </div>
      </Card>
    </>
  );
}
