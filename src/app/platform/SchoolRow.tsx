"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { extendTrial, setPlan, type PlatformState } from "./actions";
import { Chip, inputClass } from "@/components/ui";

const initial: PlatformState = { error: null };

export type PlatformSchool = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  access: string;
  students: number;
  staff: number;
  maxStudents: number | null;
  trialEnds: string;
  trialDaysLeft: number | null;
  paidUntil: string;
};

const accessTone = {
  trial: "brand",
  active: "green",
  grace: "amber",
  locked: "red",
} as const;

function Busy({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-9 rounded-xl border border-line bg-card px-3 text-xs font-semibold text-ink transition-colors hover:bg-hover disabled:opacity-60"
    >
      {pending ? "Working…" : label}
    </button>
  );
}

export default function SchoolRow({ school }: { school: PlatformSchool }) {
  const [open, setOpen] = useState(false);
  const [trialState, trialAction] = useActionState(extendTrial, initial);
  const [planState, planAction] = useActionState(setPlan, initial);

  const state = trialState.error || trialState.ok ? trialState : planState;

  // Over its cap already. Shown rather than hidden: it is the one number that
  // explains why a school is complaining that it cannot enrol anyone.
  const overCap =
    school.maxStudents !== null && school.students > school.maxStudents;

  return (
    <>
      <tr className="hover:bg-hover">
        <td className="px-4 py-3">
          <p className="font-medium text-ink">{school.name}</p>
          <p className="font-mono text-[11px] text-ink-subtle">{school.slug}</p>
        </td>
        <td className="px-4 py-3">
          <Chip tone="brand">{school.plan}</Chip>
        </td>
        <td className="px-4 py-3">
          <Chip tone={accessTone[school.access as keyof typeof accessTone] ?? "slate"}>
            {school.access}
          </Chip>
        </td>
        <td className="px-4 py-3">
          <span className={overCap ? "font-semibold text-red-600 dark:text-red-400" : "text-ink"}>
            {school.students}
          </span>
          {school.maxStudents !== null && (
            <span className="text-ink-subtle"> / {school.maxStudents}</span>
          )}
        </td>
        <td className="px-4 py-3 text-ink-muted">{school.staff}</td>
        <td className="px-4 py-3 text-ink-muted">
          {school.trialEnds}
          {school.trialDaysLeft !== null &&
            school.plan === "trial" &&
            school.trialDaysLeft >= 0 &&
            school.trialDaysLeft <= 7 && (
              <span className="ml-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                {school.trialDaysLeft}d
              </span>
            )}
        </td>
        <td className="px-4 py-3 text-ink-muted">{school.paidUntil}</td>
        <td className="px-4 py-3 text-right">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="h-9 rounded-xl px-3 text-xs font-semibold text-brand-600 transition-colors hover:bg-brand-500/10 dark:text-brand-300"
          >
            {open ? "Close" : "Manage"}
          </button>
        </td>
      </tr>

      {open && (
        <tr>
          <td colSpan={8} className="bg-sunken px-4 py-4">
            {state.error && (
              <p
                role="alert"
                className="mb-3 rounded-xl border border-red-300/60 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-700 dark:text-red-300"
              >
                {state.error}
              </p>
            )}
            {state.ok && (
              <p
                role="status"
                className="mb-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2.5 text-sm text-ink"
              >
                {state.ok}
              </p>
            )}

            <div className="flex flex-wrap items-end gap-6">
              <form action={trialAction} className="flex items-end gap-2">
                <input type="hidden" name="school_id" value={school.id} />
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
                    Extend trial by
                  </span>
                  <input
                    name="days"
                    type="number"
                    min={1}
                    max={180}
                    defaultValue={14}
                    className={`${inputClass} h-9 w-24`}
                  />
                </label>
                <Busy label="Extend" />
              </form>

              <form action={planAction} className="flex items-end gap-2">
                <input type="hidden" name="school_id" value={school.id} />
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
                    Move to plan
                  </span>
                  <select
                    name="plan"
                    defaultValue={school.plan}
                    className={`${inputClass} h-9 w-36`}
                  >
                    <option value="trial">Trial</option>
                    <option value="starter">Starter</option>
                    <option value="standard">Standard</option>
                    <option value="group">Group</option>
                  </select>
                </label>
                <Busy label="Change plan" />
              </form>
            </div>

            <p className="mt-4 text-xs text-ink-subtle">
              Both actions are recorded against your account. Pupil records,
              marks and messages are not reachable from here — by design, not by
              omission.
            </p>
          </td>
        </tr>
      )}
    </>
  );
}
