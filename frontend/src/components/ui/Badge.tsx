import { cn } from "../../lib/utils";

const COLORS = {
  accent: "bg-accent/15 text-accent",
  muted: "bg-white/5 text-text-muted",
  green: "bg-emerald-500/15 text-emerald-400",
  yellow: "bg-amber-500/15 text-amber-400",
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
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium capitalize",
        COLORS[color],
        className
      )}
    >
      {children}
    </span>
  );
}
