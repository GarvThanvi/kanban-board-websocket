import { Link } from "react-router-dom";
import { useAuth } from "../../stores/auth";
import { BrandMark } from "../ui/BrandMark";

const LINKS = [
  { label: "Features", href: "#features" },
  { label: "Collaboration", href: "#collaboration" },
];

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export function LandingNav() {
  const token = useAuth((s) => s.token);

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-border bg-bg/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-[1360px] items-center justify-between px-5 sm:px-8">
        <Link to="/" onClick={scrollToTop} className="flex items-center gap-2.5" aria-label="Flowline home">
          <BrandMark size={29} />
          <span className="text-[15px] font-semibold tracking-[-0.035em]">
            flowline
          </span>
        </Link>
        <nav className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-[13px] text-text-muted transition-colors hover:text-text focus-visible:text-text"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {token ? (
            <Link
              to="/boards"
              className="inline-flex h-9 items-center rounded-md bg-text px-3.5 text-[13px] font-medium text-bg transition-colors hover:bg-white/90"
            >
              Open app
            </Link>
          ) : (
            <>
              <Link
                to="/signin"
                className="hidden text-[13px] text-text-muted transition-colors hover:text-text sm:inline-flex"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="inline-flex h-9 items-center rounded-md bg-text px-3.5 text-[13px] font-medium text-bg transition-colors hover:bg-white/90"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
