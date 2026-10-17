import { Activity, ArrowRight, Check, MoveRight } from "lucide-react";
import { Avatar } from "../ui/Avatar";
import { ActivityBadge } from "../board/ActivityBadge";

export function Highlight() {
  return (
    <section id="collaboration" className="scroll-mt-24 border-y border-border px-5 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto grid max-w-[1360px] items-center gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <div className="max-w-[500px]">
          <div className="mb-5 flex items-center gap-2 text-[12px] text-text-muted">
            <Activity className="size-3.5 text-signal" />
            <span>Shared state, not status reports</span>
          </div>
          <h2 className="text-3xl font-medium leading-[1.08] tracking-[-0.055em] sm:text-[42px]">
            See the handoff while it happens.
          </h2>
          <p className="mt-5 max-w-[47ch] text-[14px] leading-7 text-text-muted">
            Know who's online, who's editing a card, and where a task just moved.
            The board gives everyone the same context without another message to
            write.
          </p>
        </div>

        <div className="relative overflow-hidden rounded-[14px] border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2.5">
              <span className="size-1.5 rounded-full bg-signal" />
              <span className="text-[12px] font-medium">Platform board</span>
                <span className="font-mono text-[10px] text-text-faint">Live</span>
            </div>
            <div className="flex -space-x-2">
              <Avatar name="Mara Chen" size={23} className="ring-2 ring-surface" />
              <Avatar name="Ivo Park" size={23} className="ring-2 ring-surface" />
              <Avatar name="Noah Kim" size={23} className="ring-2 ring-surface" />
            </div>
          </div>

          <div className="grid gap-0 md:grid-cols-[1fr_0.8fr]">
            <div className="p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between text-[11px] text-text-muted">
                <span>Building</span>
                <span className="font-mono text-text-faint">03</span>
              </div>
              <div className="rounded-[9px] border border-signal/45 bg-surface-2 p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[13px] leading-5">Sync presence after reconnect</p>
                  <span className="font-mono text-[9px] text-text-faint">LIVE-031</span>
                </div>
                <div className="mt-3">
                  <ActivityBadge
                    user={{ id: "mara", name: "Mara", isGuest: false }}
                    label="is editing"
                  />
                </div>
              </div>
              <div className="mt-2 rounded-[9px] border border-border bg-surface-2 p-3.5">
                <p className="text-[13px] leading-5">Keyboard board navigation</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-mono text-[9px] text-text-faint">WEB-072</span>
                  <Avatar name="Ivo Park" size={19} />
                </div>
              </div>
            </div>

            <div className="border-t border-border p-4 md:border-l md:border-t-0 sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-[12px] font-medium">Activity</h3>
                <span className="font-mono text-[9px] text-text-faint">Now</span>
              </div>
              <ol className="space-y-4">
                <li className="flex gap-2.5">
                  <Avatar name="Mara Chen" size={21} />
                  <div className="min-w-0">
                    <p className="text-[11px] leading-5 text-text-muted">
                      <span className="font-medium text-text">Mara</span> is editing
                    </p>
                    <p className="truncate text-[11px] text-text-faint">Sync presence after reconnect</p>
                  </div>
                </li>
                <li className="flex gap-2.5">
                  <Avatar name="Ivo Park" size={21} />
                  <div className="min-w-0">
                    <p className="text-[11px] leading-5 text-text-muted">
                      <span className="font-medium text-text">Ivo</span> moved a card
                    </p>
                    <div className="mt-1 flex items-center gap-1.5 font-mono text-[9px] text-text-faint">
                      <span>Queued</span>
                      <MoveRight className="size-3" />
                      <span>Building</span>
                    </div>
                  </div>
                </li>
                <li className="flex gap-2.5">
                  <span className="flex size-[21px] shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 text-text-muted">
                    <Check className="size-3" />
                  </span>
                  <div>
                    <p className="text-[11px] leading-5 text-text-muted">
                      <span className="font-medium text-text">Noah</span> joined the board
                    </p>
                    <p className="text-[11px] text-text-faint">just now</p>
                  </div>
                </li>
              </ol>
              <div className="mt-6 flex items-center gap-2 border-t border-border pt-3 text-[10px] text-text-faint">
                <span className="size-1.5 rounded-full bg-signal" />
                Activity syncs across the board
                <ArrowRight className="ml-auto size-3" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
