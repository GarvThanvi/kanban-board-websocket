import { usePresence } from "../../stores/presence";
import { Avatar } from "../ui/Avatar";
import { Tooltip } from "../ui/Tooltip";

export function PresenceBar() {
  const users = usePresence((s) => s.users);
  if (users.length === 0) return null;

  const shown = users.slice(0, 5);
  const overflow = users.length - shown.length;

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {shown.map((u) => (
          <Tooltip side="bottom" key={u.id} label={u.name}>
            <Avatar name={u.name} size={26} isGuest={u.isGuest} />
          </Tooltip>
        ))}
        {overflow > 0 && (
          <span className="flex size-[26px] items-center justify-center rounded-full border border-border bg-surface-3 text-xs text-text-muted">
            +{overflow}
          </span>
        )}
      </div>
      <span className="hidden text-xs text-text-faint sm:block">
        {users.length} online
      </span>
    </div>
  );
}
