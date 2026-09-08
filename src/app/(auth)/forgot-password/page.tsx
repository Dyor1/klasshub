"use client";

import Link from "next/link";
import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { requestPasswordReset, type ResetRequestState } from "../actions";
import { Field, SubmitButton, FormError } from "@/components/auth/AuthForm";

const initialState: ResetRequestState = { error: null, sent: false };

function ForgotForm() {
  const [state, formAction] = useActionState(requestPasswordReset, initialState);
  const expired = useSearchParams().get("expired") === "1";

  if (state.sent) {
    return (
      <div className="rounded-xl border border-line bg-card p-5">
        <p className="text-sm font-semibold text-ink">Check your email</p>
        <p className="mt-2 text-sm text-ink-muted">
          If that address belongs to an account, a link to set a new password is
          on its way. It expires in an hour.
        </p>
        <p className="mt-3 text-sm text-ink-subtle">
          Nothing arrived? Look in spam, and check the address you typed — we
          cannot tell you whether an account exists, so this message appears
          either way.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      {expired && (
        <FormError message="That link has expired or has already been used. Request another below." />
      )}
      <FormError message={state.error} />

      <Field
        label="Email address"
        name="email"
        type="email"
        placeholder="you@school.edu.ng"
        autoComplete="email"
      />

      <SubmitButton>Send reset link</SubmitButton>
    </form>
  );
}

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">
        Forgot your password?
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        Enter the email you sign in with and we&apos;ll send you a link to set a
        new one.
      </p>

      <div className="mt-8">
        <Suspense fallback={<div className="h-48" />}>
          <ForgotForm />
        </Suspense>
      </div>

      <p className="mt-6 text-center text-sm text-ink-muted">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-brand-600 hover:underline">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
