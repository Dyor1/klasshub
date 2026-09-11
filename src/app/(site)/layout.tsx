import SiteHeader from "@/components/marketing/SiteHeader";
import SiteFooter from "@/components/marketing/SiteFooter";

export default function LegalLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="bg-page">
      <a href="#main" className="kh-skip">Skip to content</a>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="pt-16">{children}</main>
      <SiteFooter />
    </div>
  );
}
