"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { saveSchoolLogo, type LogoState } from "./actions";
import { ErrorNote, SuccessNote } from "@/components/ui";

const initial: LogoState = { error: null };

function Save() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="kh-clay-brand kh-clay-press h-11 rounded-2xl bg-brand-gradient px-5 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-60"
    >
      {pending ? "Uploading…" : "Upload logo"}
    </button>
  );
}

export default function LogoForm({ currentUrl }: { currentUrl: string | null }) {
  const [state, formAction] = useActionState(saveSchoolLogo, initial);

  return (
    <div className="space-y-4">
      <ErrorNote message={state.error} />
      {state.ok && (
        <SuccessNote>
          {state.removed ? "Logo removed." : "Logo updated. It appears on report cards straight away."}
        </SuccessNote>
      )}

      {currentUrl && (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-sunken p-4">
          {/* A plain img: the URL is signed and short-lived, so it cannot be
              run through the image optimiser without the optimiser caching a
              link that outlives its own signature. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentUrl}
            alt="Your school logo"
            className="h-16 w-16 rounded-xl bg-card object-contain p-1"
          />
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink">Current logo</p>
            <p className="text-xs text-ink-subtle">Shown on every report card.</p>
          </div>
          <form action={formAction}>
            <input type="hidden" name="remove" value="true" />
            <button
              type="submit"
              className="h-10 rounded-xl border border-line px-4 text-sm font-medium text-red-600 transition-colors hover:bg-red-500/10 dark:text-red-400"
            >
              Remove
            </button>
          </form>
        </div>
      )}

      <form action={formAction} className="space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-muted">
            {currentUrl ? "Replace with" : "Logo image"}
          </span>
          <input
            name="logo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="block w-full text-sm text-ink-muted file:mr-3 file:h-11 file:cursor-pointer file:rounded-xl file:border-0 file:bg-sunken file:px-4 file:text-sm file:font-semibold file:text-ink hover:file:bg-hover"
          />
          <span className="mt-1.5 block text-xs text-ink-subtle">
            A square image works best. JPG, PNG or WebP, under 2 MB. Replacing
            deletes the old file once the new one is safely recorded.
          </span>
        </label>
        <Save />
      </form>
    </div>
  );
}
