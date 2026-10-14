import { ArrowLeftRight, Link2, ShieldCheck } from "lucide-react";

const FEATURES = [
  {
    icon: ArrowLeftRight,
    title: "Changes travel with the work",
    body: "Move a card once. Everyone sees the same board, in the same order, without refreshing.",
  },
  {
    icon: ShieldCheck,
    title: "The right people, right there",
    body: "Invite teammates as editors or viewers, then see who's in the board with you.",
  },
  {
    icon: Link2,
    title: "Share a live read-only view",
    body: "Send a public link to stakeholders. They see the latest board without needing an account.",
  },
];

export function Features() {
  return (
    <section id="features" className="scroll-mt-24 px-5 pb-24 pt-16 sm:px-8 sm:pb-32 sm:pt-20">
      <div className="mx-auto max-w-[1360px]">
        <div className="grid gap-5 border-b border-border pb-9 md:grid-cols-[0.7fr_1.3fr] md:items-end">
          <h2 className="max-w-[12ch] text-3xl font-medium leading-tight tracking-[-0.055em] sm:text-4xl">
            Work moves. Your board keeps up.
          </h2>
          <p className="max-w-[55ch] text-[14px] leading-6 text-text-muted md:justify-self-end">
            Flowline keeps the team oriented while the work changes: cards move,
            collaborators appear, and the latest state is always the one in view.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3">
          {FEATURES.map((f, index) => (
            <div
              key={f.title}
              className={`border-b border-border py-7 last:border-b-0 md:border-b-0 md:py-8 ${index === 0 ? "md:pr-8" : "md:border-l md:border-border md:pl-8"}`}
            >
              <f.icon className="size-[18px] text-text-muted" strokeWidth={1.7} />
              <h3 className="mt-5 text-[15px] font-medium tracking-[-0.02em]">{f.title}</h3>
              <p className="mt-2 max-w-[34ch] text-[13px] leading-[1.65] text-text-muted">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
