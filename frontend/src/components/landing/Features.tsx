import { Link2, ShieldCheck, Zap } from "lucide-react";

const FEATURES = [
  {
    icon: Zap,
    title: "Real-time by default",
    body: "Every move, edit, and change syncs instantly across every open tab — no refresh, no conflicts.",
  },
  {
    icon: ShieldCheck,
    title: "Roles built in",
    body: "Owners, editors, and viewers. Invite anyone with exactly the access they need.",
  },
  {
    icon: Link2,
    title: "Share with a link",
    body: "Publish a live read-only view of any board. No account required for guests.",
  },
];

export function Features() {
  return (
    <section id="features" className="px-6 py-28">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-3xl font-semibold tracking-tight">
          A new species of board tool.
        </h2>
        <p className="mt-3 max-w-xl text-[15px] text-text-muted">
          Purpose-built for fast-moving teams, with realtime collaboration at
          its core. Flowline sets a new standard for planning and building
          together.
        </p>
        <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-bg p-8">
              <f.icon className="size-5 text-accent" />
              <h3 className="mt-4 text-[15px] font-semibold">{f.title}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-text-muted">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
