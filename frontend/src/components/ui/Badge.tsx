import { cn } from "../../lib/utils";

const COLORS = {
  muted: "bg-white/5 text-text-muted",
  yellow: "bg-amber-500/15 text-amber-400",
  signal: "bg-signal/12 text-signal",
} as const;

export function Badge({
  children,
  color = "muted",
  className,
}: {
  children: React.ReactNode;
  color?: keyof typeof COLORS;
  className?: string;
}) {
  const label = typeof children === "string" ? children.toLowerCase() : children;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium capitalize",
        COLORS[color],
        className
      )}
    >
      {label}
    </span>
  );
}
