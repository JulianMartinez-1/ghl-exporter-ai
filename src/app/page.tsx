import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { Stats } from "@/components/landing/stats";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Features } from "@/components/landing/features";
import { VideoDemo } from "@/components/landing/video-demo";
import { Testimonials } from "@/components/landing/testimonials";
import { CtaSection } from "@/components/landing/cta-section";
import { Footer } from "@/components/landing/footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0d14]">
      <Navbar />
      <Hero />
      <Stats />
      <HowItWorks />
      <Features />
      <VideoDemo />
      <Testimonials />
      <CtaSection />
      <Footer />
    </div>
  );
}
