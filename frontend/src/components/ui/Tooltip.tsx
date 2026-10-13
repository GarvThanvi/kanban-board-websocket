import { cn } from "../../lib/utils";

export function Tooltip({
  label,
  side = "top",
  children,
}: {
  label: string;
  side?: "top" | "bottom";
  children: React.ReactNode;
}) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        className={cn(
          "pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-surface-2 px-2 py-1 text-xs text-text opacity-0 transition-opacity group-hover:opacity-100 z-50",
          side === "bottom" ? "top-full mt-1" : "bottom-full mb-1"
        )}
      >
        {label}
      </span>
    </span>
  );
}
