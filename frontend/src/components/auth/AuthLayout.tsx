import { Layers } from "lucide-react";
import { Link } from "react-router-dom";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(94,106,210,0.08),transparent_50%)]" />
      <div className="relative w-full max-w-sm">
        <Link
          to="/"
          className="mb-6 flex items-center justify-center gap-2 text-text"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-accent/15">
            <Layers className="size-4 text-accent" />
          </span>
          <span className="text-lg font-semibold tracking-tight">Flowline</span>
        </Link>
        <div className="rounded-2xl border border-border bg-surface p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
