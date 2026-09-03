"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { subscribe, type SubscribeState } from "./actions";

const initial: SubscribeState = { error: null };

function Pay({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-5 w-full rounded-xl bg-brand-gradient px-5 py-3 text-sm font-semibold text-white shadow-brand transition-all hover:brightness-110 disabled:opacity-60"
    >
      {pending ? "Opening…" : label}
    </button>
  );
}

export default function PlanCard({
  plan,
  label,
  price,
  maxStudents,
  studentCount,
  isCurrent,
  selfServe,
}: {
  plan: string;
  label: string;
  price: string;
  maxStudents: number | null;
  studentCount: number;
  isCurrent: boolean;
  selfServe: boolean;
}) {
  const [state, formAction] = useActionState(subscribe, initial);

  // A plan you have already outgrown cannot be bought: the student-limit
  // trigger would reject the next enrolment anyway, so offering it would sell
  // someone a downgrade that immediately blocks their work.
  const tooSmall = maxStudents !== null && studentCount > maxStudents;

  return (
    <div
      className={`flex flex-col rounded-2xl border p-6 ${
        isCurrent
          ? "border-brand-300 bg-brand-500/8 ring-1 ring-brand-500/30"
          : "border-line bg-card shadow-card"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-base font-bold text-brand-900">{label}</h3>
        {isCurrent && (
          <span className="rounded-full bg-brand-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
            Current
          </span>
        )}
      </div>

      <p className="mt-3 text-2xl font-extrabold text-brand-900">{price}</p>
      <p className="mt-1 text-xs text-ink-muted">
        {maxStudents === null ? "Unlimited students" : `Up to ${maxStudents} students`}
      </p>

      <div className="flex-1" />

      {!selfServe ? (
        <p className="mt-5 rounded-lg border border-line bg-sunken px-3 py-2.5 text-center text-xs text-ink-muted">
          Arranged with our team
        </p>
      ) : tooSmall ? (
        <p className="mt-5 rounded-lg border border-amber-500/35 bg-amber-500/12 px-3 py-2.5 text-center text-xs text-amber-800 dark:text-amber-200">
          You have {studentCount} students — too many for this plan
        </p>
      ) : (
        <form action={formAction}>
          <input type="hidden" name="plan" value={plan} />
          <Pay label={isCurrent ? "Renew for a term" : `Switch to ${label}`} />
          {state.error && (
            <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">
              {state.error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
