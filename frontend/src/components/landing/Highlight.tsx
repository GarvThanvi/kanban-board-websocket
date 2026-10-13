import { Avatar } from "../ui/Avatar";

export function Highlight() {
  return (
    <section className="px-6 py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">
            Presence you can feel.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-text-muted">
            See who's online, who's editing which card, and who's dragging what
            — as it happens. Ephemeral indicators keep fast teams out of each
            other's way.
          </p>
          <p className="mt-4 text-[13px] text-accent">
            Learn more <span aria-hidden>→</span>
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5 shadow-2xl">
          <div className="flex -space-x-2">
            <Avatar name="Karri" size={26} />
            <Avatar name="Jori Lin" size={26} />
            <Avatar name="Sana" size={26} />
          </div>
          <div className="relative mt-4 rounded-lg border border-accent/60 bg-surface-2 p-3">
            <p className="text-[13px] text-text">Rework onboarding flow</p>
            <p className="mt-2 text-xs italic text-text-faint">
              Karri is editing…
            </p>
            <div className="absolute -right-1.5 -top-1.5">
              <Avatar name="Karri" size={20} />
            </div>
          </div>
          <div className="mt-2 rounded-lg border border-border bg-surface-2 p-3">
            <p className="text-[13px] text-text">Fix drag ghost flicker</p>
            <p className="mt-2 text-xs italic text-text-faint">
              Jori Lin is moving this card…
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
