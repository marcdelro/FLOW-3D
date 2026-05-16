import { AboutSection } from "../landing/AboutSection";
import { FAQ } from "../landing/FAQ";
import { FinalCTA } from "../landing/FinalCTA";
import { Footer } from "../landing/Footer";
import { Glossary } from "../landing/Glossary";
import { Hero } from "../landing/Hero";
import { HowItWorks } from "../landing/HowItWorks";
import { Nav } from "../landing/Nav";

export function Landing() {
  return (
    <div className="min-h-screen w-full bg-[#0b0d12] text-gray-100 overflow-x-hidden">
      <Nav />
      <main>
        <Hero />
        <AboutSection />
        <HowItWorks />
        <Glossary />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}

export default Landing;
