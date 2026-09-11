import { LogoMark } from "@/components/Logo";

const SUBJECTS = [
  { name: "Mathematics", ca: 36, exam: 52, grade: "A", pos: "1st" },
  { name: "English Language", ca: 31, exam: 46, grade: "A", pos: "2nd" },
  { name: "Civic Education", ca: 35, exam: 53, grade: "A", pos: "1st" },
  { name: "Basic Science", ca: 25, exam: 38, grade: "B", pos: "2nd" },
];

const CLAIMS = [
  {
    title: "Positions worked out, ties shared",
    body: "Per subject and overall, ranked from the marks. Two pupils on the same average share a place rather than one being arbitrarily put above the other.",
  },
  {
    title: "Your grading scale, not ours",
    body: "A school grading A–F and one grading A1–F9 both come out right, because the letters come from the bands you set in Settings.",
  },
  {
    title: "Attendance counted honestly",
    body: "Days present out of days the school actually opened — not weekdays in the term. A day the school never opened cannot count against a child.",
  },
  {
    title: "Prints as it looks",
    body: "Straight to paper or PDF, with the school's own name on it and room for the head teacher to write.",
  },
];

/** Shows the artefact rather than describing it.
 *
 *  Every school portal's homepage promises "beautiful report cards". Almost
 *  none of them show one, and a head teacher deciding between products is
 *  really asking what the thing their parents will hold looks like. */
export default function ReportCardShowcase() {
  const totalObtained = SUBJECTS.reduce((s, r) => s + r.ca + r.exam, 0);
  const totalPossible = SUBJECTS.length * 100;
  const average = Math.round((totalObtained / totalPossible) * 1000) / 10;

  return (
    <section
      id="report-card"
      // overflow-hidden because the glow behind the card is deliberately
      // larger than the card (-inset-4) and would otherwise push the page
      // 19px wider than the viewport on a phone.
      className="scroll-mt-24 overflow-hidden border-t border-line-soft bg-hover py-24"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-300">
            The thing parents keep
          </span>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            This is what comes out
          </h2>
          <p className="mt-4 text-ink-muted">
            Not a mock-up of one. This is the layout your school prints, built
            from marks a teacher typed once.
          </p>
        </div>

        <div className="mt-14 grid items-start gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          {/* The card */}
          <div className="relative">
            <div
              aria-hidden="true"
              className="absolute -inset-4 -z-10 rounded-[2rem] bg-brand-gradient opacity-[0.07] blur-2xl"
            />
            <article className="relative overflow-hidden rounded-2xl border border-line bg-card p-7 shadow-card sm:p-9">
              {/* Watermark, as on the real card. */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.035]"
              >
                <LogoMark className="h-72 w-72" />
              </div>

              <div className="relative">
                <header className="flex items-start justify-between gap-4 border-b-2 border-brand-900 pb-4 dark:border-brand-300/50">
                  <div className="flex items-center gap-3">
                    <LogoMark className="h-11 w-11" />
                    <div>
                      <h3 className="text-lg font-extrabold leading-tight text-ink">
                        Numamu International Schools
                      </h3>
                      <p className="text-[10px] uppercase tracking-[0.16em] text-ink-subtle">
                        Termly report card
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-ink-muted">
                    <p className="font-semibold text-ink">Third Term</p>
                    <p>2025/2026</p>
                    <p className="mt-1 whitespace-nowrap">20 Apr &ndash; 24 Jul 2026</p>
                  </div>
                </header>

                <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5 border-b border-line py-4 text-sm sm:grid-cols-4">
                  <div className="col-span-2">
                    <dt className="text-[10px] uppercase tracking-wide text-ink-subtle">Student</dt>
                    <dd className="font-bold text-ink">Nwosu Chidi</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wide text-ink-subtle">Class</dt>
                    <dd className="font-semibold text-ink">JSS 1A</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wide text-ink-subtle">Attendance</dt>
                    <dd className="font-semibold text-ink">58 / 60</dd>
                  </div>
                </dl>

                <table className="mt-4 w-full text-sm">
                  <thead>
                    <tr className="border-b border-line-strong text-[10px] uppercase tracking-wide text-ink-muted">
                      <th className="pb-2 text-left font-semibold">Subject</th>
                      <th className="pb-2 text-right font-semibold">CA</th>
                      <th className="pb-2 text-right font-semibold">Exam</th>
                      <th className="pb-2 text-right font-semibold">%</th>
                      <th className="pb-2 text-center font-semibold">Grade</th>
                      <th className="pb-2 text-right font-semibold">Pos.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-soft">
                    {SUBJECTS.map((r) => (
                      <tr key={r.name}>
                        <td className="py-2 font-medium text-ink">{r.name}</td>
                        <td className="py-2 text-right text-ink-muted">{r.ca}</td>
                        <td className="py-2 text-right text-ink-muted">{r.exam}</td>
                        <td className="py-2 text-right text-ink-muted">{r.ca + r.exam}%</td>
                        <td className="py-2 text-center">
                          <span
                            className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                              r.grade === "A"
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                : "bg-sky-500/15 text-sky-700 dark:text-sky-300"
                            }`}
                          >
                            {r.grade}
                          </span>
                        </td>
                        <td className="py-2 text-right text-ink-muted">{r.pos}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="mt-5 grid gap-2.5 sm:grid-cols-4">
                  {[
                    { label: "Subjects", value: String(SUBJECTS.length) },
                    { label: "Obtained", value: `${totalObtained} / ${totalPossible}` },
                    { label: "Average", value: `${average}%` },
                    { label: "Position", value: "1st of 32" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl bg-sunken px-3 py-2.5">
                      <p className="text-[9px] uppercase tracking-wide text-ink-subtle">
                        {s.label}
                      </p>
                      <p className="text-sm font-bold text-ink">{s.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {["Class teacher's remarks", "Head teacher's remarks"].map((l) => (
                    <div key={l}>
                      <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wide text-ink-subtle">
                        {l}
                      </p>
                      <div className="h-12 rounded-lg border border-dashed border-line" />
                    </div>
                  ))}
                </div>

                <p className="mt-6 rounded-xl bg-brand-500/10 px-4 py-2.5 text-center text-sm font-semibold text-ink">
                  Next term begins 14 September 2026
                </p>
              </div>
            </article>
          </div>

          {/* What the card is doing that a spreadsheet is not. */}
          <ul className="space-y-4">
            {CLAIMS.map((c, i) => (
              <li
                key={c.title}
                className="animate-rise rounded-2xl border border-line-soft bg-card p-5 shadow-card"
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <h3 className="text-[15px] font-bold text-ink">{c.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{c.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
