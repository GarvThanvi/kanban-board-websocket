import { AlignLeft, Ellipsis, Plus } from "lucide-react";
import { ActivityBadge } from "../board/ActivityBadge";
import { Avatar } from "../ui/Avatar";

const COLUMNS = [
  {
    name: "Queued",
    cards: [
      { title: "Instrument deploy events", meta: "PLAT-128", detail: false },
      { title: "Search empty state", meta: "WEB-064", detail: true },
    ],
  },
  {
    name: "Building",
    cards: [
      { title: "Sync presence after reconnect", meta: "LIVE-031", detail: true },
      { title: "Keyboard board navigation", meta: "WEB-072", detail: false },
    ],
  },
  {
    name: "Shipped",
    cards: [
      { title: "Invite flow permissions", meta: "AUTH-019", detail: false },
      { title: "Column reorder persistence", meta: "CORE-087", detail: false },
    ],
  },
];

const collaborators = [
  { name: "Mara Chen", isGuest: false },
  { name: "Ivo Park", isGuest: false },
  { name: "Noah Kim", isGuest: false },
];

export function BoardMockup() {
  return (
    <div className="relative">
      <div className="absolute -inset-5 -z-10 rounded-[28px] border border-white/[0.035]" />
      <div className="overflow-hidden rounded-[14px] border border-border-strong bg-surface shadow-[0_32px_100px_rgba(0,0,0,0.42)]">
        <div className="flex h-[54px] items-center justify-between border-b border-border px-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="hidden gap-1.5 sm:flex" aria-hidden="true">
              <span className="size-2 rounded-full bg-white/15" />
              <span className="size-2 rounded-full bg-white/15" />
              <span className="size-2 rounded-full bg-white/15" />
            </div>
            <span className="truncate text-[13px] font-medium text-text">
              Core platform
            </span>
            <span className="hidden h-4 w-px bg-border sm:block" />
            <span className="hidden font-mono text-[10px] text-text-faint sm:block">
              cycle 08
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 text-[11px] text-text-muted sm:flex">
              <span className="signal-pulse size-1.5 rounded-full bg-signal" />
              Live
            </div>
            <div className="flex -space-x-2">
              {collaborators.map((person) => (
                <Avatar
                  key={person.name}
                  name={person.name}
                  size={25}
                  isGuest={person.isGuest}
                  className="ring-2 ring-surface"
                />
              ))}
              <span className="flex size-[25px] items-center justify-center rounded-full border border-border bg-surface-3 font-mono text-[9px] text-text-muted ring-2 ring-surface">
                +2
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 p-3 sm:gap-3 sm:p-5">
          {COLUMNS.map((column) => (
            <section key={column.name} className="min-w-0">
              <div className="mb-2.5 flex items-center justify-between gap-1 px-1">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={
                      column.name === "Building"
                        ? "size-1.5 shrink-0 rounded-full bg-signal"
                        : "size-1.5 shrink-0 rounded-full bg-text-faint"
                    }
                  />
                  <h2 className="truncate text-[11px] font-medium text-text-muted sm:text-xs">
                    {column.name}
                  </h2>
                  <span className="font-mono text-[9px] text-text-faint">
                    {column.cards.length}
                  </span>
                </div>
                <Ellipsis className="hidden size-3.5 shrink-0 text-text-faint sm:block" />
              </div>

              <div className="flex flex-col gap-2">
                {column.cards.map((card) => {
                  const isLive = card.meta === "LIVE-031";
                  return (
                    <article
                      key={card.meta}
                      className={
                        isLive
                          ? "rounded-[9px] border border-signal/50 bg-surface-2 p-2.5 sm:p-3"
                          : "rounded-[9px] border border-border bg-surface-2 p-2.5 sm:p-3"
                      }
                    >
                      <p className="text-[11px] leading-[1.45] text-text sm:text-[12px]">
                        {card.title}
                      </p>
                      {card.detail && (
                        <AlignLeft className="mt-2 size-3 text-text-faint" />
                      )}
                      <div className="mt-3 flex items-center justify-between gap-1">
                        <span className="font-mono text-[8px] tracking-wide text-text-faint sm:text-[9px]">
                          {card.meta}
                        </span>
                        {isLive && <Avatar name="Mara Chen" size={17} />}
                      </div>
                      {isLive && (
                        <div className="mt-2 border-t border-border pt-2">
                          <ActivityBadge
                            user={{
                              id: "mara-preview",
                              name: "Mara",
                              isGuest: false,
                            }}
                            label="is editing"
                          />
                        </div>
                      )}
                    </article>
                  );
                })}
                {column.name === "Queued" && (
                  <div className="flex items-center gap-1.5 px-1 py-1 text-[10px] text-text-faint sm:text-[11px]">
                    <Plus className="size-3" />
                    Add a card
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>

        <div className="flex items-center gap-2 border-t border-border px-4 py-2.5 sm:px-5">
          <span className="signal-pulse size-1.5 rounded-full bg-signal" />
          <p className="min-w-0 truncate text-[10px] text-text-muted sm:text-[11px]">
            <span className="font-medium text-text">Ivo</span> moved “Instrument deploy events” to Queued
          </p>
          <span className="ml-auto shrink-0 font-mono text-[9px] text-text-faint">
            just now
          </span>
        </div>
      </div>
    </div>
  );
}
