import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import TrustedBy from "@/components/TrustedBy";
import PremiumFeatures from "@/components/PremiumFeatures";
import HowItWorks from "@/components/HowItWorks";
import Testimonials from "@/components/Testimonials";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";

export default function LandingPage() {
  return (
    <>
      <Header />
      <HeroSection />
      <TrustedBy />
      <PremiumFeatures />
      <HowItWorks />
      <Testimonials />
      <CTA />
      <Footer />
    </>
  );
}
