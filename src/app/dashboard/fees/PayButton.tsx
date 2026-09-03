"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { startPayment, type PayState } from "./pay-actions";

const initial: PayState = { error: null };

function Button({ amount }: { amount: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-9 whitespace-nowrap rounded-lg bg-emerald-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
    >
      {pending ? "Opening…" : `Pay ${amount}`}
    </button>
  );
}

export default function PayButton({
  invoiceId,
  amount,
}: {
  invoiceId: string;
  amount: string;
}) {
  const [state, formAction] = useActionState(startPayment, initial);

  return (
    <form action={formAction}>
      <input type="hidden" name="invoice_id" value={invoiceId} />
      <Button amount={amount} />
      {state.error && (
        <p role="alert" className="mt-1 max-w-[14rem] text-xs text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
    </form>
  );
}
