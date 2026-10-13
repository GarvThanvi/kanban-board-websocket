import { AlignLeft } from "lucide-react";
import { Avatar } from "../ui/Avatar";

const COLUMNS = [
  {
    name: "Design",
    cards: [
      { title: "New landing hero", desc: true },
      { title: "Brand palette v2", desc: false },
    ],
  },
  {
    name: "In progress",
    cards: [
      { title: "Realtime presence bar", desc: false },
      { title: "Drag & drop polish", desc: true },
    ],
  },
  {
    name: "Done",
    cards: [
      { title: "Board sharing links", desc: false },
      { title: "Email invitations", desc: false },
    ],
  },
];

const PEOPLE = ["Karri", "Jori Lin", "Anonymous Panda"];

export function BoardMockup() {
  return (
    <div className="relative">
      <div className="absolute -inset-8 -z-10 bg-accent/10 blur-3xl" />
      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-2xl text-left">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <span className="size-2.5 rounded-full bg-white/10" />
              <span className="size-2.5 rounded-full bg-white/10" />
              <span className="size-2.5 rounded-full bg-white/10" />
            </div>
            <span className="text-[13px] font-medium text-text-muted">
              Sprint 24
            </span>
          </div>
          <div className="flex -space-x-2">
            {PEOPLE.map((p, i) => (
              <Avatar key={i} name={p} size={22} isGuest={p.startsWith("Anon")} />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 p-4">
          {COLUMNS.map((col) => (
            <div key={col.name}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-faint">
                {col.name}
              </p>
              <div className="flex flex-col gap-2">
                {col.cards.map((card, i) => (
                  <div
                    key={i}
                    className={
                      col.name === "In progress" && i === 0
                        ? "relative rounded-lg border border-accent/60 bg-surface-2 p-3"
                        : "rounded-lg border border-border bg-surface-2 p-3"
                    }
                  >
                    <p className="text-[13px] leading-snug text-text">
                      {card.title}
                    </p>
                    {card.desc && (
                      <AlignLeft className="mt-1.5 size-3.5 text-text-faint" />
                    )}
                    {col.name === "In progress" && i === 0 && (
                      <div className="mt-2 flex justify-end">
                        <Avatar name="Karri" size={18} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
