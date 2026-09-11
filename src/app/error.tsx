"use client";

import Link from "next/link";
import { useEffect } from "react";
import { LogoMark } from "@/components/Logo";

/** Shown when a page throws. Without this the fallback is Next's unstyled
 *  default, which next to the rest of the site reads as "the whole thing is
 *  broken" rather than "this page is".
 *
 *  The reassurance is the important part. A teacher who has just spent twenty
 *  minutes entering marks needs to know whether they lost them — and they have
 *  not, because a render error happens after the save, never during it. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Goes to the platform log, where it is attached to the request. The
    // digest is what makes a user's report findable in it.
    console.error("Unhandled page error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-page px-6 text-center">
      <LogoMark className="h-14 w-14" />

      <h1 className="mt-8 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
        Something went wrong
      </h1>
      <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-muted">
        This page failed to load. Anything you had already saved is safe — this
        happens while drawing the page, after your work is stored.
      </p>

      <div className="mt-9 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={reset}
          className="inline-flex h-12 items-center justify-center rounded-2xl bg-brand-gradient px-7 text-[15px] font-semibold text-white kh-clay-brand kh-clay-press transition-all hover:brightness-110"
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="inline-flex h-12 items-center justify-center rounded-xl border border-line bg-card px-7 text-[15px] font-semibold text-ink transition-colors hover:bg-hover"
        >
          Back to your dashboard
        </Link>
      </div>

      {error.digest && (
        <p className="mt-8 text-sm text-ink-subtle">
          If you report this, quote{" "}
          <code className="rounded bg-sunken px-1.5 py-0.5 font-mono text-[13px] text-ink-muted">
            {error.digest}
          </code>
        </p>
      )}
    </main>
  );
}
