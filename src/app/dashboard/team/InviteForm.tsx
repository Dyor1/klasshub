"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { inviteMember, type InviteState } from "./actions";

const initialState: InviteState = { error: null };

const roles = [
  { value: "teacher", label: "Teacher", hint: "Can record results and attendance" },
  { value: "admin", label: "Administrator", hint: "Full access, can invite others" },
  { value: "student", label: "Student", hint: "Sees only their own published results" },
  { value: "parent", label: "Parent", hint: "Sees their children's records" },
];

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-11 shrink-0 rounded-lg bg-brand-gradient px-5 text-sm font-semibold text-white shadow-brand transition-all hover:brightness-110 disabled:opacity-60"
    >
      {pending ? "Creating…" : "Create invite"}
    </button>
  );
}

export default function InviteForm() {
  const [state, formAction] = useActionState(inviteMember, initialState);
  const [copied, setCopied] = useState(false);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
      <h2 className="text-sm font-bold text-brand-900">Invite someone</h2>
      <p className="mt-0.5 text-xs text-slate-500">
        They&apos;ll join your school with the role you choose here.
      </p>

      <form action={formAction} className="mt-4 space-y-3">
        {state.error && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
          >
            {state.error}
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            name="email"
            type="email"
            required
            placeholder="teacher@yourschool.edu.ng"
            className="h-11 flex-1 rounded-lg border border-slate-200 px-3.5 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
          />
          <select
            name="role"
            defaultValue="teacher"
            className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
          >
            {roles.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <Submit />
        </div>
      </form>

      {state.inviteUrl && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-900">
            Invite created for {state.email}
          </p>
          <p className="mt-1 text-xs text-emerald-700">
            Copy this link and send it to them — it is shown once and expires in
            7 days.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              readOnly
              value={state.inviteUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="h-10 flex-1 rounded-md border border-emerald-300 bg-white px-3 font-mono text-xs text-slate-700"
            />
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(state.inviteUrl!);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="h-10 shrink-0 rounded-md bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
