"use client";

import Link from "next/link";
import { useActionState } from "react";
import { register, type AuthState } from "../actions";
import { Field, SubmitButton, FormError } from "@/components/auth/AuthForm";

const initialState: AuthState = { error: null };

export default function RegisterPage() {
  const [state, formAction] = useActionState(register, initialState);

  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
        Register your school
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        Create your school&apos;s space on KlassHub. Free for 30 days.
      </p>

      <form action={formAction} className="mt-8 space-y-5">
        <FormError message={state.error} />

        <Field
          label="School name"
          name="school_name"
          placeholder="Greenfield Academy"
          autoComplete="organization"
        />
        <Field
          label="Your full name"
          name="full_name"
          placeholder="Adaeze Okafor"
          autoComplete="name"
        />
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
          placeholder="At least 8 characters"
          autoComplete="new-password"
          hint="Use 8 or more characters."
        />

        <SubmitButton>Create school account</SubmitButton>

        <p className="text-center text-xs leading-relaxed text-slate-400">
          You&apos;ll be the administrator for this school. Teachers, students and
          parents are added from your dashboard.
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already registered?{" "}
        <Link href="/login" className="font-semibold text-brand-600 hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
