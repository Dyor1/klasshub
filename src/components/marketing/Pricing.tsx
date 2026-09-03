import Link from "next/link";

/** These figures are live: the biller charges them and the student caps are
 *  enforced by a database trigger. The source of truth is the plan_limits
 *  table — change a price there and this page must be edited to match, or the
 *  two will disagree about what a plan costs. */
const plans = [
  {
    name: "Starter",
    price: "₦35,000",
    cadence: "per term",
    blurb: "For small schools finding their feet.",
    limit: "Up to 150 students",
    features: [
      "Results & report cards",
      "Attendance registers",
      "Parent & student portals",
      "Email support",
    ],
    cta: "Start free trial",
    featured: false,
  },
  {
    name: "Standard",
    price: "₦85,000",
    cadence: "per term",
    blurb: "For established schools running full operations.",
    limit: "Up to 600 students",
    features: [
      "Everything in Starter",
      "Admissions portal",
      "Timetable & class notes",
      "Announcements & events",
      "Priority support",
    ],
    cta: "Start free trial",
    featured: true,
  },
  {
    name: "Group",
    price: "Let's talk",
    cadence: "",
    blurb: "For multi-campus groups and large institutions.",
    limit: "Unlimited students",
    features: [
      "Everything in Standard",
      "Multiple campuses",
      "Custom domain",
      "Data migration help",
      "Dedicated account manager",
    ],
    cta: "Contact sales",
    featured: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-24 border-t border-line-soft bg-hover py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600">
            Pricing
          </span>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Priced per term, not per headache
          </h2>
          <p className="mt-4 text-ink-muted">
            Every plan starts with a free 30-day trial. No card required to begin.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border p-7 ${
                plan.featured
                  ? "border-brand-300 bg-card shadow-brand ring-1 ring-brand-200"
                  : "border-line bg-card shadow-card"
              }`}
            >
              {plan.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-gradient px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                  Most popular
                </span>
              )}

              <h3 className="text-lg font-bold text-ink">{plan.name}</h3>
              <p className="mt-1 text-sm text-ink-muted">{plan.blurb}</p>

              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-ink">{plan.price}</span>
                {plan.cadence && (
                  <span className="text-sm text-ink-muted">{plan.cadence}</span>
                )}
              </div>
              <p className="mt-1 text-xs font-medium text-brand-600">{plan.limit}</p>

              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm text-ink-muted">
                    <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.7-9.7a1 1 0 00-1.4-1.4L9 10.2 7.7 8.9a1 1 0 10-1.4 1.4l2 2a1 1 0 001.4 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.name === "Group" ? "/contact" : "/register"}
                className={`mt-7 rounded-xl px-5 py-3 text-center text-sm font-semibold transition-all ${
                  plan.featured
                    ? "bg-brand-gradient text-white shadow-brand hover:brightness-110"
                    : "border border-line text-ink hover:bg-sunken"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
