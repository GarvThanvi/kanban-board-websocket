import { useEffect, useState } from "react";
import { Activity, X } from "lucide-react";
import { Button } from "../ui/Button";
import { Avatar } from "../ui/Avatar";
import { activityLabel } from "../../lib/activity";
import { avatarColor } from "../../lib/utils";
import { useActivityLog } from "../../stores/activityLog";

function timeAgo(ts: number): string {
  const elapsed = Math.floor((Date.now() - ts) / 1000);
  if (elapsed < 10) return "just now";
  if (elapsed < 60) return `${elapsed}s ago`;
  const minutes = Math.floor(elapsed / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function ActivityFeed() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <Activity className="size-3.5" />
        <span className="hidden sm:inline">Activity</span>
      </Button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className="scrim-fade-in absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="drawer-slide-in absolute right-0 top-0 flex h-dvh w-[340px] max-w-[88vw] flex-col border-l border-border bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <h2 className="text-[15px] font-semibold tracking-[-0.02em]">
                Recent activity
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-text-muted transition-colors hover:bg-white/5 hover:text-text"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <ActivityList />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

function ActivityList() {
  const entries = useActivityLog((s) => s.entries);
  // keep relative timestamps fresh while the panel is open
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  if (entries.length === 0) {
    return (
      <p className="text-[13px] text-text-muted">
        No activity yet. Live actions from collaborators on this board will
        appear here.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {entries.map((entry) => {
        const color = avatarColor(entry.user.name);
        return (
          <li
            key={entry.id}
            className="flex items-center gap-2.5 rounded-lg border border-border bg-surface-2 px-3 py-2"
          >
            <Avatar name={entry.user.name} size={22} isGuest={entry.user.isGuest} />
            <p className="min-w-0 flex-1 truncate text-[13px] text-text-muted">
              <span className="font-medium" style={{ color }}>
                {entry.user.name}
              </span>{" "}
              {activityLabel(entry.type)}
            </p>
            <span className="shrink-0 text-[11px] text-text-faint">
              {timeAgo(entry.occurredAt)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
