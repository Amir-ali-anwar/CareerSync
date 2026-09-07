import { LandingHeader } from "@/components/landing/landing-header";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how-it-works";
import { CtaSection, Footer } from "@/components/landing/cta-footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <Hero />
      <Features />
      <HowItWorks />
      <CtaSection />
      <Footer />
    </div>
  );
}
