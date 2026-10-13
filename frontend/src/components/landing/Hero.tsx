import { Link } from "react-router-dom";
import { BoardMockup } from "./BoardMockup";

export function Hero() {
  return (
    <section className="px-6 pb-24 pt-40 text-center">
      <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-[13px] text-text-muted">
        <span className="font-medium text-text">New</span>
        Realtime collaboration
      </span>
      <h1 className="mx-auto mt-6 max-w-3xl text-5xl font-semibold tracking-tight md:text-6xl">
        Plan and build, together in real time
      </h1>
      <p className="mx-auto mt-5 max-w-xl text-lg text-text-muted">
        Flowline is a realtime kanban for teams — drag cards, share boards, and
        see every change as it happens.
      </p>
      <div className="mt-8 flex items-center justify-center gap-3">
        <Link
          to="/signup"
          className="inline-flex h-9 items-center rounded-full bg-text px-4 text-sm font-medium text-bg"
        >
          Get started
        </Link>
        <Link
          to="/signin"
          className="inline-flex h-9 items-center rounded-full border border-border bg-surface-2 px-4 text-sm font-medium text-text"
        >
          Log in
        </Link>
      </div>
      <div className="mx-auto mt-20 max-w-4xl">
        <BoardMockup />
      </div>
    </section>
  );
}
