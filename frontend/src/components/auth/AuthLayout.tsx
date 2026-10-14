import { Link } from "react-router-dom";
import { BrandMark } from "../ui/BrandMark";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="relative w-full max-w-sm">
        <Link
          to="/"
          className="mb-6 flex items-center justify-center gap-2 text-text"
        >
          <BrandMark size={32} />
          <span className="text-[17px] font-semibold tracking-[-0.04em]">flowline</span>
        </Link>
        <div className="rounded-2xl border border-border bg-surface p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
