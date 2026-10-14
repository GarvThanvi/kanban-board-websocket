import { Link } from "react-router-dom";
import { BrandMark } from "../ui/BrandMark";

export function Footer() {
  return (
    <>
      <section id="start" className="px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto flex max-w-[1360px] flex-col justify-between gap-8 border-b border-border pb-16 md:flex-row md:items-end">
          <div>
            <p className="text-[12px] text-text-faint">Your next cycle starts here</p>
            <h2 className="mt-4 max-w-[14ch] text-3xl font-medium leading-[1.08] tracking-[-0.055em] sm:text-5xl">
              Give the work one place to move.
            </h2>
          </div>
          <Link
            to="/signup"
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-text px-4 text-[13px] font-medium text-bg transition-colors hover:bg-white/90"
          >
            Create your first board
          </Link>
        </div>
      </section>

      <footer className="px-5 pb-8 sm:px-8">
        <div className="mx-auto flex max-w-[1360px] flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-2.5"
            aria-label="Flowline home"
          >
            <BrandMark size={26} />
            <span className="text-[14px] font-semibold tracking-[-0.035em]">flowline</span>
          </Link>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-3 text-[12px] text-text-muted">
            <a href="#features" className="transition-colors hover:text-text">Features</a>
            <a href="#collaboration" className="transition-colors hover:text-text">Collaboration</a>
            <Link to="/signin" className="transition-colors hover:text-text">Sign in</Link>
          </nav>
          <span className="font-mono text-[10px] text-text-faint">© 2026 Flowline</span>
        </div>
      </footer>
    </>
  );
}
