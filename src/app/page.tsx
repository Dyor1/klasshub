import SiteHeader from "@/components/marketing/SiteHeader";
import Hero from "@/components/marketing/Hero";
import Features from "@/components/marketing/Features";
import HowItWorks from "@/components/marketing/HowItWorks";
import Pricing from "@/components/marketing/Pricing";
import Faq from "@/components/marketing/Faq";
import CallToAction from "@/components/marketing/CallToAction";
import SiteFooter from "@/components/marketing/SiteFooter";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <Features />
        <HowItWorks />
        <Pricing />
        <Faq />
        <CallToAction />
      </main>
      <SiteFooter />
    </>
  );
}
