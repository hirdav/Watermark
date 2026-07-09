import { Hero } from "./_sections/Hero";
import { HowItWorks } from "./_sections/HowItWorks";
import { UseCases } from "./_sections/UseCases";
import { Features } from "./_sections/Features";
import { Testimonials } from "./_sections/Testimonials";
import { FAQ } from "./_sections/FAQ";
import { FinalCTA } from "./_sections/FinalCTA";

export default function Home() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <UseCases />
      <Features />
      <Testimonials />
      <FAQ />
      <FinalCTA />
    </>
  );
}
