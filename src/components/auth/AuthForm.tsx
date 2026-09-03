"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

export function Field({
  label,
  name,
  type = "text",
  placeholder,
  autoComplete,
  required = true,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  hint?: string;
}) {
  const [reveal, setReveal] = useState(false);
  const isPassword = type === "password";
  // Typing a password blind on a phone keyboard is how people end up locked
  // out of their own school.
  const inputType = isPassword && reveal ? "text" : type;

  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-ink">{label}</span>
      <div className="relative">
        <input
          name={name}
          type={inputType}
          required={required}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`h-12 w-full rounded-xl border border-line bg-card px-4 text-[15px] text-ink transition-all placeholder:text-ink-subtle focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/12 ${
            isPassword ? "pr-12" : ""
          }`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            aria-label={reveal ? "Hide password" : "Show password"}
            className="absolute right-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-lg text-ink-subtle transition-colors hover:bg-hover hover:text-ink"
          >
            {reveal ? <EyeOff /> : <Eye />}
          </button>
        )}
      </div>
      {hint && <span className="mt-1.5 block text-xs text-ink-subtle">{hint}</span>}
    </label>
  );
}

function Eye() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOff() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.6 6.2A9.9 9.9 0 0112 6c6.4 0 10 7 10 7a17.6 17.6 0 01-3.2 4.1M6.6 6.6A17.6 17.6 0 002 13s3.6 7 10 7a9.8 9.8 0 004.4-1M3 3l18 18" />
    </svg>
  );
}

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient text-[15px] font-semibold text-white shadow-brand transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending && (
        <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
          <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}
      {pending ? "Please wait…" : children}
    </button>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="flex items-start gap-2.5 rounded-xl border border-red-300/60 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300"
    >
      <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5M12 16.5v.01" />
      </svg>
      {message}
    </p>
  );
}
