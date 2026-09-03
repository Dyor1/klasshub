import Link from "next/link";

const highlights = [
  "Free 30-day trial",
  "No card required",
  "Set up in an afternoon",
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Ambient brand glow */}
      <div
        aria-hidden="true"
        className="kh-hero-glow pointer-events-none absolute inset-0 -z-10"
      />

      <div className="mx-auto max-w-7xl px-6 pb-20 pt-16 sm:pb-28 sm:pt-24">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="animate-fade-in-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-500/35 bg-card px-3.5 py-1.5 text-xs font-semibold text-brand-700 dark:text-brand-300 shadow-sm">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-500" />
              </span>
              Built in Nigeria, for Nigerian schools
            </span>

            <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-6xl">
              Run your whole school from{" "}
              <span className="text-brand-gradient">one portal</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-muted">
              Results, report cards, attendance, admissions and fees — in a single
              place your teachers, parents and students can actually use. Register
              your school and be live the same week.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-gradient px-7 py-4 text-sm font-semibold text-white shadow-brand transition-all hover:brightness-110 active:scale-[0.99]"
              >
                Register your school
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center rounded-xl border border-line bg-card px-7 py-4 text-sm font-semibold text-ink transition-colors hover:bg-sunken"
              >
                See how it works
              </a>
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
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

          <HeroPreview />
        </div>
      </div>
    </section>
  );
}

/** Stylised portal preview — a static mock, not a screenshot, so it never goes
 *  stale against the real dashboard. */
function HeroPreview() {
  return (
    <div className="animate-fade-in-up [animation-delay:120ms]">
      <div className="relative rounded-2xl border border-line bg-card p-3 shadow-card">
        <div className="rounded-xl bg-brand-950 p-4">
          <div className="flex items-center gap-1.5 pb-3">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <span className="ml-3 rounded-md bg-white/10 px-2 py-0.5 text-[10px] text-white/60">
              greenfield.klasshub.ng
            </span>
          </div>

          <div className="rounded-lg bg-card p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-ink-subtle">Term overview</p>
                <p className="text-sm font-bold text-ink">Greenfield Academy</p>
              </div>
              <span className="rounded-full bg-emerald-500/12 px-2 py-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                Second Term
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Students", value: "612" },
                { label: "Teachers", value: "38" },
                { label: "Attendance", value: "94%" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-lg bg-sunken p-2.5">
                  <p className="text-base font-bold text-ink">{stat.value}</p>
                  <p className="text-[10px] text-ink-subtle">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 space-y-2">
              {[
                { name: "JSS 1 — Mathematics", pct: 82 },
                { name: "JSS 2 — English", pct: 68 },
                { name: "SSS 1 — Biology", pct: 91 },
              ].map((row) => (
                <div key={row.name}>
                  <div className="mb-1 flex justify-between text-[10px] text-ink-muted">
                    <span>{row.name}</span>
                    <span className="font-semibold text-ink">{row.pct}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-sunken">
                    <div
                      className="h-full rounded-full bg-brand-gradient"
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating stat card */}
      <div className="mx-auto -mt-6 w-fit rounded-xl border border-line bg-card px-4 py-3 shadow-card">
        <p className="text-[10px] text-ink-subtle">Report cards generated</p>
        <p className="text-lg font-extrabold text-ink">
          12,480<span className="ml-1 text-xs font-semibold text-emerald-500">+18%</span>
        </p>
      </div>
    </div>
  );
}
