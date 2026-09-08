"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { sendContactMessage, type ContactState } from "./actions";

const initial: ContactState = { error: null, sent: false };

const TOPICS = [
  { value: "sales", label: "Interested in KlassHub for my school" },
  { value: "support", label: "I already use KlassHub and need help" },
  { value: "privacy", label: "Privacy or data request" },
  { value: "security", label: "Reporting a security issue" },
  { value: "other", label: "Something else" },
];

const field =
  "h-12 w-full rounded-xl border border-line bg-card px-4 text-[15px] text-ink transition-all placeholder:text-ink-subtle focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/12";

function Send() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-12 items-center justify-center rounded-xl bg-brand-gradient px-7 text-[15px] font-semibold text-white shadow-brand transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Sending…" : "Send message"}
    </button>
  );
}

export default function ContactForm() {
  const [state, formAction] = useActionState(sendContactMessage, initial);

  if (state.sent) {
    return (
      <div
        role="status"
        className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6"
      >
        <p className="text-[15px] font-bold text-ink">Message received</p>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          It is saved and on its way to us. We reply to most messages within a
          working day — if yours is urgent and you have not heard back, the
          addresses below reach the same people.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <p
          role="alert"
          className="rounded-xl border border-red-300/60 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300"
        >
          {state.error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold text-ink">
            Your name
          </span>
          <input name="name" required minLength={2} maxLength={100} className={field} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold text-ink">
            Email address
          </span>
          <input
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            placeholder="you@school.edu.ng"
            className={field}
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-[13px] font-semibold text-ink">
          What is this about?
        </span>
        <select name="topic" required defaultValue="sales" className={field}>
          {TOPICS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[13px] font-semibold text-ink">
          Message
        </span>
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={5000}
          rows={6}
          placeholder="Your school's name helps us answer faster."
          className="w-full rounded-xl border border-line bg-card px-4 py-3 text-[15px] leading-relaxed text-ink transition-all placeholder:text-ink-subtle focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/12"
        />
      </label>

      {/* Honeypot. Hidden from people and from screen readers, so anyone who
          fills it is a bot. Not `display:none` — some bots skip those. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label>
          Leave this blank
          <input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-4 pt-1">
        <Send />
        <p className="text-xs text-ink-subtle">
          We use what you send only to reply to you.
        </p>
      </div>
    </form>
  );
}
