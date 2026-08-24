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
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60rem 32rem at 12% -10%, #e0e7ff 0%, transparent 60%), radial-gradient(48rem 28rem at 92% 0%, #f3e8ff 0%, transparent 62%)",
        }}
      />

      <div className="mx-auto max-w-7xl px-6 pb-20 pt-16 sm:pb-28 sm:pt-24">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="animate-fade-in-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-brand-700 shadow-sm">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-500" />
              </span>
              Built in Nigeria, for Nigerian schools
            </span>

            <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-brand-900 sm:text-5xl lg:text-6xl">
              Run your whole school from{" "}
              <span className="text-brand-gradient">one portal</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
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
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-7 py-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                See how it works
              </a>
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
              {highlights.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-slate-500">
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
      <div className="relative rounded-2xl border border-slate-200 bg-white p-3 shadow-card">
        <div className="rounded-xl bg-brand-950 p-4">
          <div className="flex items-center gap-1.5 pb-3">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <span className="ml-3 rounded-md bg-white/10 px-2 py-0.5 text-[10px] text-white/60">
              greenfield.klasshub.ng
            </span>
          </div>

          <div className="rounded-lg bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-400">Term overview</p>
                <p className="text-sm font-bold text-brand-900">Greenfield Academy</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-600">
                Second Term
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Students", value: "612" },
                { label: "Teachers", value: "38" },
                { label: "Attendance", value: "94%" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-lg bg-slate-50 p-2.5">
                  <p className="text-base font-bold text-brand-900">{stat.value}</p>
                  <p className="text-[10px] text-slate-400">{stat.label}</p>
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
                  <div className="mb-1 flex justify-between text-[10px] text-slate-500">
                    <span>{row.name}</span>
                    <span className="font-semibold text-slate-700">{row.pct}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
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
      <div className="mx-auto -mt-6 w-fit rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-card">
        <p className="text-[10px] text-slate-400">Report cards generated</p>
        <p className="text-lg font-extrabold text-brand-900">
          12,480<span className="ml-1 text-xs font-semibold text-emerald-500">+18%</span>
        </p>
      </div>
    </div>
  );
}
