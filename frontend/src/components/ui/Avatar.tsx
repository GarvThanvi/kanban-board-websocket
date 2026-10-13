import { Ghost } from "lucide-react";
import { avatarColor, cn, initials } from "../../lib/utils";

export function Avatar({
  name,
  size = 28,
  isGuest,
  className,
}: {
  name: string;
  size?: number;
  isGuest?: boolean;
  className?: string;
}) {
  const color = avatarColor(name);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full select-none",
        isGuest && "border border-dashed border-border text-text-faint",
        className
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: isGuest ? "transparent" : `${color}33`,
        boxShadow: isGuest ? undefined : `inset 0 0 0 1px ${color}`,
        fontSize: Math.max(10, size * 0.38),
      }}
      title={name}
    >
      {isGuest ? (
        <Ghost style={{ width: size * 0.55, height: size * 0.55 }} />
      ) : (
        initials(name)
      )}
    </span>
  );
}
