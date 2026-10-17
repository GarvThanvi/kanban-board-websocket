import { Avatar } from "../ui/Avatar";
import { avatarColor, cn } from "../../lib/utils";
import type { PresenceUser } from "../../lib/types";

export function ActivityBadge({
  user,
  label,
  className,
}: {
  user: PresenceUser;
  label: string;
  className?: string;
}) {
  const color = avatarColor(user.name);
  return (
    <span
      className={cn(
        "inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full border px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap",
        className
      )}
      style={{
        borderColor: `${color}66`,
        backgroundColor: `${color}1f`,
        color,
      }}
    >
      <Avatar name={user.name} size={14} isGuest={user.isGuest} className="shrink-0" />
      <span className="min-w-0 truncate text-text-muted">
        <span style={{ color }}>{user.name}</span> {label}
      </span>
    </span>
  );
}
