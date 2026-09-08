import SiteHeader from "@/components/marketing/SiteHeader";
import SiteFooter from "@/components/marketing/SiteFooter";

export default function LegalLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="bg-page">
      <SiteHeader />
      <main className="pt-16">{children}</main>
      <SiteFooter />
    </div>
  );
}
