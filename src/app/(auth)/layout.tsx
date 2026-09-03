import Link from "next/link";
import Logo from "@/components/Logo";
import AuthShowcase from "@/components/auth/AuthShowcase";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-screen bg-page lg:grid-cols-[1fr_1.05fr]">
      {/* Form side */}
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex w-fit" aria-label="KlassHub home">
            <Logo />
          </Link>
          <Link
            href="/"
            className="text-[13px] font-semibold text-ink-muted transition-colors hover:text-ink"
          >
            ← Back to site
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[26rem]">{children}</div>
        </div>

        {/* On a phone the showcase is hidden entirely, so the page would end on
            a bare form. This keeps one line of reassurance in its place. */}
        <p className="text-center text-xs text-ink-subtle lg:text-left">
          Built for Nigerian schools · 30-day free trial · No card required
        </p>
      </div>

      {/* Showcase side. Hidden below lg — a carousel on a phone is a thing to
          scroll past on the way to the form. */}
      <div className="relative hidden lg:block">
        <AuthShowcase />
      </div>
    </div>
  );
}
