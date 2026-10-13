import { Link } from "react-router-dom";
import { Layers } from "lucide-react";

const COLUMNS: { heading: string; links: string[] }[] = [
  { heading: "Product", links: ["Boards", "Realtime", "Sharing", "Roles"] },
  { heading: "Company", links: ["About", "Blog", "Careers", "Contact"] },
  { heading: "Resources", links: ["Docs", "Guides", "Changelog", "Status"] },
  { heading: "Legal", links: ["Privacy", "Terms", "Security"] },
];

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="px-6 py-28 text-center">
        <h2 className="text-4xl font-semibold tracking-tight">
          Built for the future.
          <br />
          Available today.
        </h2>
        <Link
          to="/signup"
          className="mt-8 inline-flex h-9 items-center rounded-full bg-text px-4 text-sm font-medium text-bg"
        >
          Get started
        </Link>
      </div>
      <div className="mx-auto max-w-6xl px-6 pb-12">
        <div className="grid grid-cols-2 gap-8 border-t border-border pt-12 md:grid-cols-5">
          <div>
            <Link to="/" className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-md bg-accent/15">
                <Layers className="size-3.5 text-accent" />
              </span>
              <span className="text-[15px] font-semibold tracking-tight">
                Flowline
              </span>
            </Link>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <p className="mb-3 text-[13px] font-medium text-text">
                {col.heading}
              </p>
              <ul className="flex flex-col gap-2">
                {col.links.map((l) => (
                  <li key={l}>
                    <a
                      href="#"
                      className="text-[13px] text-text-muted transition-colors hover:text-text"
                    >
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex items-center justify-between border-t border-border pt-6 text-[13px] text-text-faint">
          <span>© 2026 Flowline</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-text">
              Privacy
            </a>
            <a href="#" className="hover:text-text">
              Terms
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
