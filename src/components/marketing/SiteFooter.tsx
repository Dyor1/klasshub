import Link from "next/link";
import Logo from "@/components/Logo";

const columns = [
  {
    heading: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "How it works", href: "#how-it-works" },
      { label: "Pricing", href: "#pricing" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy policy", href: "/privacy" },
      { label: "Terms of service", href: "/terms" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-line bg-card">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Logo showTagline />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-muted">
              School management software for Nigerian schools — results, admissions,
              attendance and parent communication in one portal.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.heading}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
                {col.heading}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-ink-muted transition-colors hover:text-brand-600"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-line-soft pt-7 sm:flex-row">
          <p className="text-xs text-ink-subtle">
            &copy; {new Date().getFullYear()} KlassHub. All rights reserved.
          </p>
          <p className="text-xs text-ink-subtle">Made in Nigeria 🇳🇬</p>
        </div>
      </div>
    </footer>
  );
}
