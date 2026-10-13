import { LandingNav } from "../components/landing/LandingNav";
import { Hero } from "../components/landing/Hero";
import { Features } from "../components/landing/Features";
import { Highlight } from "../components/landing/Highlight";
import { Footer } from "../components/landing/Footer";

export default function LandingPage() {
  return (
    <div className="bg-bg">
      <LandingNav />
      <Hero />
      <Features />
      <Highlight />
      <Footer />
    </div>
  );
}
