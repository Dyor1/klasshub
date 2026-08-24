"use client";

import { useActionState } from "react";
import { Field, SubmitButton, FormError } from "@/components/auth/AuthForm";
import { acceptInvite, type AcceptState } from "./actions";

const initialState: AcceptState = { error: null };

export default function AcceptForm({
  token,
  invitedEmail,
}: {
  token: string;
  invitedEmail: string;
}) {
  const [state, formAction] = useActionState(acceptInvite, initialState);

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <input type="hidden" name="token" value={token} />
      <FormError message={state.error} />

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-slate-700">
          Email address
        </span>
        <input
          name="email"
          type="email"
          required
          readOnly
          defaultValue={invitedEmail}
          className="h-11 w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-600"
        />
        <span className="mt-1 block text-xs text-slate-400">
          This invitation is tied to this address.
        </span>
      </label>

      <Field
        label="Your full name"
        name="full_name"
        placeholder="Chidi Nwosu"
        autoComplete="name"
      />
      <Field
        label="Choose a password"
        name="password"
        type="password"
        placeholder="At least 8 characters"
        autoComplete="new-password"
      />

      <SubmitButton>Join school</SubmitButton>
    </form>
  );
}
