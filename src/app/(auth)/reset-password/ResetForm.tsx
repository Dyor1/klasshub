"use client";

import { useActionState } from "react";
import { updatePassword, type AuthState } from "../actions";
import { Field, SubmitButton, FormError } from "@/components/auth/AuthForm";

const initialState: AuthState = { error: null };

export default function ResetForm() {
  const [state, formAction] = useActionState(updatePassword, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <FormError message={state.error} />

      <Field
        label="New password"
        name="password"
        type="password"
        placeholder="••••••••"
        autoComplete="new-password"
        hint="At least 8 characters."
      />
      <Field
        label="Confirm new password"
        name="confirm"
        type="password"
        placeholder="••••••••"
        autoComplete="new-password"
      />

      <SubmitButton>Set new password</SubmitButton>
    </form>
  );
}
