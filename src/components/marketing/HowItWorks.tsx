const steps = [
  {
    step: "01",
    title: "Register your school",
    body: "Tell us your school name and pick your subdomain. You get your own isolated space — your data never mixes with another school's.",
  },
  {
    step: "02",
    title: "Add classes and staff",
    body: "Create your classes and subjects, then invite teachers by email. Import your student list from a spreadsheet in one go.",
  },
  {
    step: "03",
    title: "Go live with parents",
    body: "Parents and students get their logins, and you start publishing results, attendance and announcements from day one.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-24 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600">
            How it works
          </span>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Live in three steps
          </h2>
        </div>

        <ol className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((item, i) => (
            <li key={item.step} className="relative">
              <div className="h-full rounded-2xl border border-line bg-card p-7 shadow-card">
                <span className="text-brand-gradient text-3xl font-extrabold">{item.step}</span>
                <h3 className="mt-4 text-lg font-bold text-ink">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{item.body}</p>
              </div>
              {i < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute -right-3 top-1/2 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-card text-brand-400 shadow md:flex"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
