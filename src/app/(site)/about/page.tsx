import Link from "next/link";
import { Fill } from "@/components/legal/prose";

export const metadata = {
  title: "About",
  description:
    "Why KlassHub exists, who it is for, and the principles it is built on — school data stays the school's, and a lapsed subscription never locks a register away.",
};

const principles = [
  {
    title: "Your records stay yours",
    body: "Everything a school enters belongs to that school. We do not sell it, share it for advertising, or train anything on it. You can export or delete it whenever you like.",
  },
  {
    title: "A lapsed subscription is not a locked door",
    body: "If a term goes unpaid the account stops accepting new entries — but every pupil record, report card and invoice stays readable, exportable and deletable. Holding a school's register hostage over an invoice is the thing this kind of software is worst at.",
  },
  {
    title: "One school cannot see another",
    body: "Separation between schools is enforced by the database itself, not by application code that a bug could route around. It holds even for our own backend jobs.",
  },
  {
    title: "Children see less, not more",
    body: "A pupil sees only their own record and only marks the school has published. A parent sees only the children linked to them. An administrator can confirm a message was delivered without being able to read it.",
  },
  {
    title: "Nothing follows you around",
    body: "No advertising cookies, no analytics trackers, no third-party scripts. The only cookie KlassHub sets is the one keeping you signed in — which is why you have never seen a cookie banner here.",
  },
  {
    title: "Card details never reach us",
    body: "Fee and subscription payments go straight to Paystack. No card number touches KlassHub, so none can leak from it.",
  },
];

export default function AboutPage() {
  return (
    <>
      {/* Intro */}
      <section className="px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/"
            className="text-sm font-semibold text-ink-muted transition-colors hover:text-ink"
          >
            &larr; Back to site
          </Link>

          <span className="mt-6 block text-xs font-bold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-300">
            About us
          </span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-5xl">
            School software that behaves itself
          </h1>

          <div className="mt-8 space-y-5 text-[17px] leading-relaxed text-ink-muted">
            <p>
              Most Nigerian schools run on paper and spreadsheets, and the ones
              that have tried software have usually been burned by it — a system
              that locked them out when a renewal lapsed, or that made getting
              their own results back out harder than typing them in again.
            </p>
            <p>
              KlassHub is built for those schools. Registers, marks, report
              cards, fees, timetables and parent communication in one portal,
              with the boring parts — totals, positions, grades, invoices —
              worked out for you.
            </p>
            <p>
              <Fill>
                Add your own founding story here: when you started, why, and
                what you were doing before. This is the paragraph a head teacher
                reads to decide whether you are a real company. Do not leave it
                to us to invent.
              </Fill>
            </p>
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="border-t border-line-soft bg-hover py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
              What we commit to
            </h2>
            <p className="mt-4 text-ink-muted">
              These are not aspirations. Each one is how the software already
              works, and the{" "}
              <Link href="/terms" className="font-semibold text-brand-600 hover:underline">
                terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="font-semibold text-brand-600 hover:underline">
                privacy policy
              </Link>{" "}
              put them in writing.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {principles.map((p) => (
              <div
                key={p.title}
                className="rounded-2xl border border-line-soft bg-card p-6 kh-clay"
              >
                <h3 className="text-[15px] font-bold text-ink">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Where it runs */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-extrabold tracking-tight text-ink">
            Where your data lives
          </h2>
          <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-ink-muted">
            <p>
              KlassHub runs on Supabase and Vercel, both in Ireland — the
              database in <code className="rounded bg-sunken px-1.5 py-0.5 text-[13px]">eu-west-1</code>{" "}
              and the application beside it in{" "}
              <code className="rounded bg-sunken px-1.5 py-0.5 text-[13px]">dub1</code>. Email
              goes out through Brevo, SMS through Termii, and payments through
              Paystack.
            </p>
            <p>
              We say so plainly because it matters: your pupils&apos; data
              leaves Nigeria, and any school asking the right questions will
              want to know that before signing up. The{" "}
              <Link href="/privacy" className="font-semibold text-brand-600 hover:underline">
                privacy policy
              </Link>{" "}
              covers what that means.
            </p>
          </div>

          <div className="mt-10 rounded-2xl border border-line-soft bg-card p-6">
            <h3 className="text-[15px] font-bold text-ink">Company details</h3>
            <dl className="mt-4 space-y-3 text-[15px]">
              {[
                ["Registered name", <Fill key="n">registered company name and RC number</Fill>],
                ["Registered office", <Fill key="a">registered address</Fill>],
                ["Founded", <Fill key="f">year</Fill>],
              ].map(([label, value]) => (
                <div key={String(label)} className="sm:flex sm:gap-4">
                  <dt className="w-40 shrink-0 font-semibold text-ink">{label}</dt>
                  <dd className="text-ink-muted">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <p className="mt-10 text-[15px] text-ink-muted">
            Questions we have not answered?{" "}
            <Link href="/contact" className="font-semibold text-brand-600 hover:underline">
              Get in touch
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  );
}
