"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { login, type AuthState } from "../actions";
import { Field, SubmitButton, FormError } from "@/components/auth/AuthForm";

const initialState: AuthState = { error: null };

function LoginForm() {
  const [state, formAction] = useActionState(login, initialState);
  const next = useSearchParams().get("next") ?? "/dashboard";

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      <FormError message={state.error} />

      <Field
        label="Email address"
        name="email"
        type="email"
        placeholder="you@school.edu.ng"
        autoComplete="email"
      />
      <Field
        label="Password"
        name="password"
        type="password"
        placeholder="••••••••"
        autoComplete="current-password"
      />

      <SubmitButton>Sign in</SubmitButton>
    </form>
  );
}

export default function LoginPage() {
  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
        Welcome back
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        Sign in to your school&apos;s portal.
      </p>

      <div className="mt-8">
        <Suspense fallback={<div className="h-64" />}>
          <LoginForm />
        </Suspense>
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">
        New here?{" "}
        <Link href="/register" className="font-semibold text-brand-600 hover:underline">
          Register your school
        </Link>
      </p>
    </>
  );
}
