"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { inviteBulk, type BulkInviteState } from "./actions";
import { ErrorNote, inputClass } from "@/components/ui";

const initial: BulkInviteState = { error: null };

function Send() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-11 rounded-2xl bg-brand-gradient px-5 text-sm font-semibold text-white kh-clay-brand kh-clay-press transition-all hover:brightness-110 disabled:opacity-60"
    >
      {pending ? "Inviting…" : "Send invitations"}
    </button>
  );
}

/** Copies every link at once. The links are shown exactly once — they are
 *  derived from tokens that were never stored — so losing this response means
 *  revoking and re-inviting. */
function CopyAll({ invited }: { invited: { email: string; url: string }[] }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        const text = invited.map((i) => `${i.email}\t${i.url}`).join("\n");
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
        }
      }}
      className="h-9 rounded-lg border border-line bg-card px-3 text-xs font-semibold text-ink-muted transition-colors hover:bg-hover hover:text-ink"
    >
      {copied ? "Copied" : "Copy all links"}
    </button>
  );
}

export default function BulkInviteForm() {
  const [state, formAction] = useActionState(inviteBulk, initial);

  const invited = state.invited ?? [];
  const skipped = state.skipped ?? [];

  return (
    <form action={formAction} className="space-y-4">
      <ErrorNote message={state.error} />

      {state.invited && (
        <div className="space-y-3">
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-ink">
            <p className="font-semibold">
              {invited.length === 0
                ? "No new invitations to send."
                : `Invited ${invited.length} ${invited.length === 1 ? "person" : "people"}.`}
            </p>
            {invited.length > 0 && (
              <p className="mt-1 text-ink-muted">
                {state.mailQueued === invited.length
                  ? "Each invitation email is queued."
                  : `${state.mailQueued ?? 0} of ${invited.length} emails queued — copy the links below for the rest.`}{" "}
                Links are shown once and cannot be recovered afterwards.
              </p>
            )}
          </div>

          {invited.length > 0 && (
            <div className="rounded-xl border border-line-soft bg-sunken p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
                  One-time links
                </p>
                <CopyAll invited={invited} />
              </div>
              <ul className="space-y-1.5">
                {invited.map((i) => (
                  <li key={i.email} className="break-all text-xs">
                    <span className="font-semibold text-ink">{i.email}</span>{" "}
                    <span className="font-mono text-ink-muted">{i.url}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {skipped.length > 0 && (
            <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-ink">
              <p className="font-semibold">Skipped {skipped.length}:</p>
              <ul className="mt-1 space-y-0.5 text-ink-muted">
                {skipped.map((s) => (
                  <li key={s.email}>
                    <span className="font-medium text-ink">{s.email}</span> — {s.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold text-ink">
            Email addresses
          </span>
          <textarea
            name="emails"
            rows={6}
            required
            placeholder={"ada@school.edu.ng\nchinedu@school.edu.ng, fatima@school.edu.ng"}
            className="w-full rounded-2xl border border-line bg-card shadow-[var(--clay-press-top)]  px-4 py-3 font-mono text-sm leading-relaxed text-ink transition-all placeholder:text-ink-subtle focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/12"
          />
          <span className="mt-1.5 block text-xs text-ink-subtle">
            Commas, semicolons, spaces or new lines all work, so a list copied
            out of a mail client pastes straight in. People already on the team
            or already invited are skipped and named back to you.
          </span>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold text-ink">
            Role for everyone here
          </span>
          <select name="role" defaultValue="teacher" className={inputClass}>
            <option value="teacher">Teacher</option>
            <option value="admin">Administrator</option>
            <option value="student">Student</option>
            <option value="parent">Parent</option>
          </select>
          <span className="mt-1.5 block text-xs text-ink-subtle">
            One role per batch. Invite a different group separately.
          </span>
        </label>
      </div>

      <Send />
    </form>
  );
}
