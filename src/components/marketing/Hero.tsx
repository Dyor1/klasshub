import Link from "next/link";
import { LogoMark } from "@/components/Logo";

const highlights = [
  "Free 30-day trial",
  "No card required",
  "Set up in an afternoon",
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Three layers of atmosphere: a drifting colour wash, a faint grid, and
          the original static glow underneath for browsers that skip the rest. */}
      <div aria-hidden="true" className="kh-aurora pointer-events-none absolute inset-0 -z-10" />
      <div aria-hidden="true" className="kh-grid pointer-events-none absolute inset-0 -z-10 hidden opacity-40 sm:block" />
      <div aria-hidden="true" className="kh-hero-glow pointer-events-none absolute inset-0 -z-20" />

      <div className="mx-auto max-w-7xl px-6 pb-20 pt-16 sm:pb-28 sm:pt-24">
        <div className="grid items-center gap-14 lg:grid-cols-[1.02fr_0.98fr]">
          <div>
            <span className="animate-rise inline-flex items-center gap-2 rounded-full border border-brand-500/35 bg-card/80 px-3.5 py-1.5 text-xs font-semibold text-brand-700 shadow-sm backdrop-blur dark:text-brand-300">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-500" />
              </span>
              Built in Nigeria, for Nigerian schools
            </span>

            <h1 className="animate-rise mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight text-ink [animation-delay:60ms] sm:text-5xl lg:text-[3.9rem]">
              Enter the marks once.
              <br />
              <span className="text-brand-gradient">Everything else follows.</span>
            </h1>

            <p className="animate-rise mt-6 max-w-xl text-lg leading-relaxed text-ink-muted [animation-delay:120ms]">
              Totals, grades, class positions and print-ready report cards —
              computed from the scores your teachers already type. Attendance,
              fees, timetables and parent logins come with it.
            </p>

            <div className="animate-rise mt-9 flex flex-col gap-3 [animation-delay:180ms] sm:flex-row">
              <Link
                href="/register"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-brand-gradient px-7 py-4 text-sm font-semibold text-white shadow-brand transition-all hover:brightness-110 hover:shadow-lg active:scale-[0.99]"
              >
                Register your school
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <a
                href="#report-card"
                className="inline-flex items-center justify-center rounded-xl border border-line bg-card/80 px-7 py-4 text-sm font-semibold text-ink backdrop-blur transition-colors hover:bg-sunken"
              >
                See a report card
              </a>
            </div>

            <ul className="animate-rise mt-8 flex flex-wrap gap-x-6 gap-y-2 [animation-delay:240ms]">
              {highlights.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-ink-muted">
                  <svg viewBox="0 0 20 20" className="h-4 w-4 text-brand-500" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.7-9.7a1 1 0 00-1.4-1.4L9 10.2 7.7 8.9a1 1 0 10-1.4 1.4l2 2a1 1 0 001.4 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <HeroComposition />
        </div>
      </div>
    </section>
  );
}

const MARKS = [
  { name: "Adeyemi T.", ca: 34, exam: 51, grade: "A", tone: "emerald" },
  { name: "Bello A.", ca: 28, exam: 42, grade: "A", tone: "emerald" },
  { name: "Chukwu N.", ca: 22, exam: 33, grade: "C", tone: "amber" },
];

const CARD_ROWS = [
  { subject: "Mathematics", pct: 88, grade: "A" },
  { subject: "English Language", pct: 77, grade: "A" },
  { subject: "Basic Science", pct: 63, grade: "B" },
];

/** The hero visual: marks going in on the left, the report card they produce
 *  on the right.
 *
 *  Deliberately a built mock rather than a screenshot. A screenshot of the real
 *  dashboard goes stale the first time the UI changes, and nobody notices until
 *  a prospect spots that the product does not look like its own homepage. This
 *  also lets the composition say the one thing a screenshot cannot: that the
 *  grade on the right came from the number on the left. */
function HeroComposition() {
  return (
    <div className="relative pb-12 pt-12">
      {/* Mark entry — behind and to the left. */}
      <div className="animate-rise animate-float-slow absolute -left-12 top-20 hidden w-48 rotate-[-4deg] rounded-2xl border border-line-soft bg-card p-3.5 shadow-card [animation-delay:300ms] xl:block">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-subtle">
          Results entry · JSS 1A
        </p>
        <div className="space-y-1.5">
          {MARKS.map((m, i) => (
            <div key={m.name} className="flex items-center gap-2 text-[11px]">
              <span className="flex-1 truncate text-ink-muted">{m.name}</span>
              <span className="rounded bg-sunken px-1.5 py-0.5 font-mono text-ink">{m.ca}</span>
              <span
                className="animate-tally rounded bg-sunken px-1.5 py-0.5 font-mono text-ink"
                style={{ animationDelay: `${i * 0.45}s` }}
              >
                {m.exam}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-2 text-[11px]">
            <span className="flex-1 truncate text-ink-subtle">Danjuma K.</span>
            <span className="rounded bg-sunken px-1.5 py-0.5 font-mono text-ink">31</span>
            <span className="rounded border border-brand-500 bg-card px-1.5 py-0.5 font-mono text-ink">
              4<span className="animate-caret ml-px inline-block w-px bg-ink align-middle">&nbsp;</span>
            </span>
          </div>
        </div>
      </div>

      {/* The report card — the thing a parent actually holds. */}
      <div className="animate-rise relative z-10 ml-auto w-full max-w-[24rem] rotate-[1.5deg] rounded-2xl border border-line bg-card p-5 shadow-card [animation-delay:200ms] lg:max-w-[26rem]">
        <div className="flex items-start justify-between gap-3 border-b-2 border-brand-900/80 pb-3 dark:border-brand-300/40">
          <div className="flex items-center gap-2">
            <LogoMark className="h-8 w-8" />
            <div>
              <p className="text-[13px] font-extrabold leading-tight text-ink">
                Numamu International
              </p>
              <p className="text-[9px] uppercase tracking-[0.14em] text-ink-subtle">
                Termly report card
              </p>
            </div>
          </div>
          <div className="text-right text-[9px] text-ink-muted">
            <p className="font-semibold text-ink">Third Term</p>
            <p>2025/2026</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 border-b border-line py-3">
          <div className="col-span-2">
            <p className="text-[9px] uppercase tracking-wide text-ink-subtle">Student</p>
            <p className="text-[13px] font-bold text-ink">Danjuma Kemi</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wide text-ink-subtle">Position</p>
            <p className="text-[13px] font-bold text-ink">2nd of 32</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wide text-ink-subtle">Attendance</p>
            <p className="text-[13px] font-bold text-ink">96%</p>
          </div>
        </div>

        <div className="mt-3 space-y-2.5">
          {CARD_ROWS.map((r, i) => (
            <div key={r.subject}>
              <div className="mb-1 flex items-center justify-between text-[10px]">
                <span className="text-ink-muted">{r.subject}</span>
                <span className="flex items-center gap-1.5">
                  <span className="font-semibold text-ink">{r.pct}%</span>
                  <span
                    className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold ${
                      r.grade === "A"
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "bg-sky-500/15 text-sky-700 dark:text-sky-300"
                    }`}
                  >
                    {r.grade}
                  </span>
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-sunken">
                <div
                  className="animate-fill h-full origin-left rounded-full bg-brand-gradient"
                  style={{ width: `${r.pct}%`, animationDelay: `${400 + i * 140}ms` }}
                />
              </div>
            </div>
          ))}
        </div>

        <p className="mt-4 rounded-lg bg-brand-500/10 px-3 py-2 text-center text-[10px] font-semibold text-ink">
          Next term begins 14 September 2026
        </p>
      </div>

      {/* Two claims about the software, not invented usage numbers. */}
      <div className="animate-rise animate-float absolute bottom-0 left-0 hidden rounded-xl border border-line bg-card px-3.5 py-2.5 shadow-card [animation-delay:420ms] sm:block">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-ink">
          <span className="grid h-4 w-4 place-items-center rounded-full bg-emerald-500/15 text-[9px] text-emerald-600 dark:text-emerald-400">
            ✓
          </span>
          Grades from your own scale
        </p>
      </div>
      <div className="animate-rise animate-float absolute right-2 top-0 hidden rounded-xl border border-line bg-card px-3.5 py-2.5 shadow-card [animation-delay:520ms] sm:block">
        <p className="text-[11px] font-semibold text-ink">Positions ranked for you</p>
      </div>
    </div>
  );
}
