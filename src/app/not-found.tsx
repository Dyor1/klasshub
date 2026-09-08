import Link from "next/link";
import { LogoMark } from "@/components/Logo";

export const metadata = { title: "Page not found" };

/** Catches every unmatched URL, including ones under /dashboard, so it has to
 *  stand on its own without the app shell or the marketing header — a signed-in
 *  teacher and a stranger following a stale link both land here. */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-page px-6 text-center">
      <LogoMark className="h-14 w-14" />

      <p className="mt-8 text-sm font-bold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-300">
        404
      </p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
        We cannot find that page
      </h1>
      <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-muted">
        The link may be out of date, or the page may have moved. Nothing has
        happened to your school&apos;s records.
      </p>

      <div className="mt-9 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/dashboard"
          className="inline-flex h-12 items-center justify-center rounded-xl bg-brand-gradient px-7 text-[15px] font-semibold text-white shadow-brand transition-all hover:brightness-110"
        >
          Go to your dashboard
        </Link>
        <Link
          href="/"
          className="inline-flex h-12 items-center justify-center rounded-xl border border-line bg-card px-7 text-[15px] font-semibold text-ink transition-colors hover:bg-hover"
        >
          Back to the homepage
        </Link>
      </div>

      <p className="mt-8 text-sm text-ink-subtle">
        Think this is a mistake?{" "}
        <Link href="/contact" className="font-semibold text-brand-600 hover:underline">
          Tell us
        </Link>
        .
      </p>
    </main>
  );
}
