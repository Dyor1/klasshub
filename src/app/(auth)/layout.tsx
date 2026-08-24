import Link from "next/link";
import Logo from "@/components/Logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Form side */}
      <div className="flex flex-col px-6 py-10 sm:px-12">
        <Link href="/" className="inline-flex w-fit" aria-label="KlassHub home">
          <Logo />
        </Link>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>

      {/* Brand side */}
      <div className="relative hidden overflow-hidden bg-brand-950 lg:block">
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(38rem 22rem at 25% 15%, rgba(79,70,229,0.55) 0%, transparent 65%), radial-gradient(32rem 20rem at 80% 85%, rgba(168,85,247,0.45) 0%, transparent 65%)",
          }}
        />
        <div className="relative flex h-full flex-col justify-center px-14">
          <blockquote className="max-w-md">
            <p className="text-2xl font-semibold leading-snug text-white">
              &ldquo;Everything the school runs on — results, attendance,
              admissions — finally lives in one place.&rdquo;
            </p>
            <footer className="mt-6 text-sm text-white/60">
              Built for schools that are tired of spreadsheets
            </footer>
          </blockquote>

          <dl className="mt-14 grid grid-cols-3 gap-6 border-t border-white/10 pt-8">
            {[
              ["30 days", "Free trial"],
              ["1 portal", "For every role"],
              ["Your data", "Fully isolated"],
            ].map(([value, label]) => (
              <div key={label}>
                <dt className="text-lg font-bold text-white">{value}</dt>
                <dd className="mt-0.5 text-xs text-white/50">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
