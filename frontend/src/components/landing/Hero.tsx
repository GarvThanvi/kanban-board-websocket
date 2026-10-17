import { Link } from "react-router-dom";
import { BoardMockup } from "./BoardMockup";

export function Hero() {
  return (
    <section id="product" className="overflow-hidden px-5 pb-12 pt-24 sm:px-8 sm:pb-16 sm:pt-28">
      <div className="mx-auto max-w-[1360px]">
        <div className="max-w-[850px]">
          <div className="landing-arrive landing-arrive-1 mb-7 inline-flex items-center gap-2.5 text-[12px] font-medium text-text-muted">
            <span className="signal-pulse size-2 rounded-full bg-signal" />
            Three teammates are moving work right now
          </div>
          <h1 className="landing-arrive landing-arrive-2 max-w-[18ch] text-[clamp(3.25rem,7.2vw,6.25rem)] font-medium leading-[0.99] tracking-[-0.075em]">
            Keep the work moving.
            <span className="mt-1 block">Keep your team in sync.</span>
          </h1>
          <p className="landing-arrive landing-arrive-3 mt-7 max-w-[48ch] text-[16px] leading-7 text-text-muted sm:text-[17px]">
            A kanban board that updates the moment work changes. Know what is
            moving, who is on it, and what needs you next.
          </p>
          <div className="landing-arrive landing-arrive-4 mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/signup"
              className="inline-flex h-10 items-center rounded-md bg-text px-4 text-[13px] font-medium text-bg transition-colors hover:bg-white/90"
            >
              Start a board
            </Link>
            <a
              href="#collaboration"
              className="inline-flex h-10 items-center rounded-md px-3 text-[13px] font-medium text-text-muted transition-colors hover:bg-white/[0.04] hover:text-text"
            >
              See how teams stay in sync
            </a>
          </div>
          <p className="landing-arrive landing-arrive-4 mt-5 text-[11px] text-text-faint">For software teams</p>
        </div>
        <div className="landing-arrive landing-arrive-5 mt-14 sm:mt-16">
          <BoardMockup />
        </div>
      </div>
    </section>
  );
}
