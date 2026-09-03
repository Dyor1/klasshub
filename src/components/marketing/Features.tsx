const features = [
  {
    title: "Results & report cards",
    body: "Enter scores once. KlassHub computes totals, positions and grades, then produces print-ready report cards for the whole class.",
    icon: (
      <path d="M9 3h6a2 2 0 012 2v14l-5-3-5 3V5a2 2 0 012-2z" />
    ),
  },
  {
    title: "Admissions",
    body: "Publish an application form on your site. Applications land in your dashboard where you can review, track status and print the full form.",
    icon: <path d="M12 5v14M5 12h14" />,
  },
  {
    title: "Attendance",
    body: "Daily registers teachers can mark in seconds, with termly summaries parents can see from their own login.",
    icon: <path d="M9 11l3 3 6-6M4 5h16v14H4z" />,
  },
  {
    title: "Timetable & classes",
    body: "Build class timetables once and share them with teachers, students and parents automatically.",
    icon: <path d="M4 5h16v16H4zM4 10h16M9 3v4M15 3v4" />,
  },
  {
    title: "Parent & student portals",
    body: "Every parent and student gets their own login to see results, attendance, announcements and transport — no more calls to the office.",
    icon: <path d="M17 20v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M10 10a3 3 0 100-6 3 3 0 000 6zM21 20v-2a4 4 0 00-3-3.9" />,
  },
  {
    title: "Announcements & events",
    body: "Push notices to the right audience — a single class, all parents, or the whole school — and keep an events calendar everyone shares.",
    icon: <path d="M3 11l18-6v14L3 13v-2zM7 13v5a2 2 0 004 0v-4" />,
  },
];

export default function Features() {
  return (
    <section id="features" className="scroll-mt-24 border-t border-line-soft bg-hover py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-300">
            Everything in one place
          </span>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            The admin work, handled
          </h2>
          <p className="mt-4 text-ink-muted">
            KlassHub replaces the spreadsheets, WhatsApp groups and paper registers
            that most schools are still stitching together.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl border border-line bg-card p-6 shadow-card transition-all hover:-translate-y-0.5 hover:border-brand-500/35"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-300 transition-colors group-hover:bg-brand-gradient group-hover:text-white">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {feature.icon}
                </svg>
              </div>
              <h3 className="mt-5 text-base font-bold text-ink">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{feature.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
