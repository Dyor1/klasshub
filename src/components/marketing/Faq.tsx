const faqs = [
  {
    q: "Is our school's data kept separate from other schools?",
    a: "Yes. Every school gets its own isolated tenant. Records are scoped to your school at the database level, so no other school on KlassHub can read or write your data.",
  },
  {
    q: "Do we need to be online all the time?",
    a: "KlassHub runs in the browser, so you need a connection to enter and view data. Report cards, once generated, can be printed or saved as PDF and used offline.",
  },
  {
    q: "Can we move our existing student records in?",
    a: "Yes. You can import students, classes and subjects from a spreadsheet. On the Group plan we handle the migration for you.",
  },
  {
    q: "What happens after the free trial?",
    a: "Nothing is deleted. Your account moves to read-only until you pick a plan, so you never lose a term's work by missing a deadline.",
  },
  {
    q: "Can parents use it on a small phone?",
    a: "Yes. The parent and student portals are built mobile-first and work on low-end Android devices and slow connections.",
  },
  {
    q: "Do you charge per parent or per teacher?",
    a: "No. Plans are priced on student numbers only. Add as many teachers, parents and admin staff as you need.",
  },
];

export default function Faq() {
  return (
    <section id="faq" className="scroll-mt-24 border-t border-line-soft py-24">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-300">
            FAQ
          </span>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Questions schools ask us
          </h2>
        </div>

        <div className="mt-12 space-y-3">
          {faqs.map((item, i) => (
            <details
              key={item.q}
              style={{ animationDelay: `${i * 60}ms` }}
              className="animate-rise group rounded-2xl border border-line bg-card px-5 kh-clay transition-colors open:border-brand-500/30 hover:border-brand-500/25"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left">
                <span className="text-[15px] font-semibold text-ink">{item.q}</span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sunken text-ink-muted transition-all duration-300 group-open:rotate-45 group-open:bg-brand-500 group-open:text-white">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                  </svg>
                </span>
              </summary>
              <p className="-mt-1 pb-5 pr-12 text-sm leading-relaxed text-ink-muted">
                {item.a}
              </p>
            </details>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-ink-muted">
          Something we have not covered?{" "}
          <a href="/contact" className="font-semibold text-brand-600 hover:underline dark:text-brand-300">
            Ask us directly
          </a>
          .
        </p>
      </div>
    </section>
  );
}
