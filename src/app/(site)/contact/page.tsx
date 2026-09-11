import Link from "next/link";
import { Fill } from "@/components/legal/prose";
import ContactForm from "./ContactForm";

export const metadata = {
  title: "Contact",
  description:
    "How to reach KlassHub — sales enquiries, support for schools already using it, and data protection requests.",
};

/** The addresses stay alongside the form.
 *
 *  A form is the easier thing to use and the harder thing to trust: nobody can
 *  see whether it worked. Someone reporting a security issue in particular
 *  wants an address they can keep a copy of, so both are offered. */
const channels = [
  {
    heading: "Thinking about KlassHub for your school",
    body: "Questions about features, pricing, moving your records across, or setting up your first term. Happy to walk through it on a call.",
    lines: [
      ["Email", <Fill key="e">sales email</Fill>],
      ["Phone / WhatsApp", <Fill key="p">phone number</Fill>],
    ],
  },
  {
    heading: "Already using KlassHub",
    body: "Something not working, or you need a hand with a term's setup. Tell us your school name and what you were doing when it went wrong.",
    lines: [
      ["Email", <Fill key="e">support email</Fill>],
      ["Hours", <Fill key="h">e.g. Mon–Fri, 8am–5pm WAT</Fill>],
      ["Typical reply", <Fill key="r">decide and commit to something you can keep</Fill>],
    ],
  },
  {
    heading: "Privacy and data requests",
    body: "To see, correct or delete a record. If it concerns a pupil or a guardian, ask the school first — they control that data and can act immediately.",
    lines: [["Email", <Fill key="e">privacy email</Fill>]],
  },
  {
    heading: "Security",
    body: "Found a vulnerability? Report it here rather than publicly. We will not pursue anyone who reports in good faith and gives us reasonable time to fix it.",
    lines: [["Email", <Fill key="e">security email</Fill>]],
  },
];

export default function ContactPage() {
  return (
    <>
      <section className="px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/"
            className="text-sm font-semibold text-ink-muted transition-colors hover:text-ink"
          >
            &larr; Back to site
          </Link>

          <span className="mt-6 block text-xs font-bold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-300">
            Contact
          </span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-5xl">
            Talk to a person
          </h1>
          <p className="mt-5 text-[17px] leading-relaxed text-ink-muted">
            Send us a message and it reaches the right people. If you would
            rather write from your own mail client, the addresses are below.
          </p>

          <div className="mt-10 rounded-2xl border border-line-soft bg-card p-6 kh-clay sm:p-8">
            <ContactForm />
          </div>

          <h2 className="mt-14 text-2xl font-extrabold tracking-tight text-ink">
            Or write to us directly
          </h2>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {channels.map((c) => (
              <div
                key={c.heading}
                className="rounded-2xl border border-line-soft bg-card p-6 kh-clay"
              >
                <h3 className="text-[15px] font-bold text-ink">{c.heading}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{c.body}</p>
                <dl className="mt-4 space-y-2 text-sm">
                  {c.lines.map(([label, value]) => (
                    <div key={String(label)} className="flex flex-wrap gap-x-2">
                      <dt className="font-semibold text-ink">{label}:</dt>
                      <dd className="text-ink-muted">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-line-soft bg-sunken p-6">
            <h3 className="text-[15px] font-bold text-ink">Office</h3>
            <p className="mt-2 text-sm text-ink-muted">
              <Fill>registered address</Fill>
            </p>
            <p className="mt-3 text-sm text-ink-muted">
              Registered as <Fill>company name and RC number</Fill>. More in{" "}
              <Link href="/about" className="font-semibold text-brand-600 hover:underline">
                about
              </Link>
              .
            </p>
          </div>

          <p className="mt-10 text-[15px] text-ink-muted">
            Not a customer yet?{" "}
            <Link
              href="/register"
              className="font-semibold text-brand-600 hover:underline"
            >
              Register your school
            </Link>{" "}
            and try it free for 30 days — no card needed.
          </p>
        </div>
      </section>
    </>
  );
}
