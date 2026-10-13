import { Link } from "react-router-dom";
import { Layers } from "lucide-react";
import { useAuth } from "../../stores/auth";

const LINKS = [
  { label: "Product", href: "#" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#" },
];

export function LandingNav() {
  const token = useAuth((s) => s.token);

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-border bg-bg/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-accent/15">
            <Layers className="size-3.5 text-accent" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">
            Flowline
          </span>
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-sm text-text-muted transition-colors hover:text-text"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {token ? (
            <Link
              to="/boards"
              className="rounded-full bg-text px-4 text-sm font-medium text-bg inline-flex h-9 items-center"
            >
              Open app
            </Link>
          ) : (
            <>
              <Link
                to="/signin"
                className="text-sm text-text-muted transition-colors hover:text-text"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="inline-flex h-9 items-center rounded-full bg-text px-4 text-sm font-medium text-bg"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
