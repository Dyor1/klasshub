import Link from "next/link";

export default function CallToAction() {
  return (
    <section className="px-6 pb-24">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-brand-950 px-8 py-16 text-center sm:px-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(40rem 20rem at 20% 0%, rgba(79,70,229,0.55) 0%, transparent 65%), radial-gradient(34rem 18rem at 85% 100%, rgba(168,85,247,0.45) 0%, transparent 65%)",
          }}
        />
        <div className="relative">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Ready to get your school online?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-white/70">
            Register today and run your next term on KlassHub. Free for 30 days,
            and we&apos;ll help you get your first class set up.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="rounded-xl bg-white px-7 py-4 text-sm font-semibold text-brand-700 transition-all hover:bg-brand-50"
            >
              Register your school
            </Link>
            <Link
              href="/contact"
              className="rounded-xl border border-white/25 px-7 py-4 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Book a walkthrough
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
