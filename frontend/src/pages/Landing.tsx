import { AboutSection } from "../landing/AboutSection";
import { FAQ } from "../landing/FAQ";
import { FinalCTA } from "../landing/FinalCTA";
import { Footer } from "../landing/Footer";
import { Hero } from "../landing/Hero";
import { HowItWorks } from "../landing/HowItWorks";
import { Nav } from "../landing/Nav";
import { SocialProof } from "../landing/SocialProof";

export function Landing() {
  return (
    <div className="min-h-screen w-full bg-[#0b0d12] text-gray-100 overflow-x-hidden">
      <Nav />
      <main>
        <Hero />
        <SocialProof />
        <AboutSection />
        <HowItWorks />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}

export default Landing;
