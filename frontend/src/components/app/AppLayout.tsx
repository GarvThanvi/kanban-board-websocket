import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutGrid, LogOut, Search, Settings } from "lucide-react";
import { useAuth } from "../../stores/auth";
import { api } from "../../lib/api";
import { disconnectSocket } from "../../lib/socket";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { cn } from "../../lib/utils";
import { BrandMark } from "../ui/BrandMark";
import { CommandPalette } from "./CommandPalette";
import { CreateBoardModal } from "./CreateBoardModal";

const NAV_ITEMS = [
  { to: "/boards", label: "Boards", icon: LayoutGrid },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppLayout() {
  const { token, user, setAuth, clearAuth } = useAuth();
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [createBoardOpen, setCreateBoardOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const modifierKey =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)
      ? "⌘"
      : "Ctrl";

  useEffect(() => {
    if (token && !user) {
      api
        .me()
        .then((res) => setAuth(token, res.data))
        .catch(() => {
          clearAuth();
          navigate("/signin");
        });
    }
  }, [token, user, setAuth, clearAuth, navigate]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const logout = () => {
    clearAuth();
    disconnectSocket();
    navigate("/");
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-bg">
      <aside className="flex w-[58px] shrink-0 flex-col border-r border-border bg-surface md:w-[224px]">
        <div className="flex h-[58px] items-center justify-center border-b border-border px-3 md:justify-start md:px-4">
          <BrandMark size={29} />
          <span className="ml-2.5 hidden text-[14px] font-semibold tracking-[-0.035em] md:inline">
            flowline
          </span>
        </div>
        <nav className="mt-3 flex flex-col gap-1 px-1.5 md:px-2">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex h-9 items-center justify-center gap-2.5 rounded-md px-2 text-[13px] transition-colors md:justify-start md:px-2.5",
                  isActive
                    ? "bg-white/[0.065] text-text"
                    : "text-text-muted hover:bg-white/[0.04] hover:text-text"
                )
              }
              title={item.label}
              aria-label={item.label}
            >
              <item.icon className="size-[16px] shrink-0" strokeWidth={1.7} />
              <span className="hidden md:inline">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="mt-3 px-1.5 md:px-2">
          <button
            onClick={() => setPaletteOpen(true)}
            className="flex h-9 w-full items-center justify-center gap-2.5 rounded-md px-2 text-text-muted transition-colors hover:bg-white/[0.04] hover:text-text md:justify-start md:px-2.5"
            title={`Search boards and actions (${modifierKey}+K)`}
            aria-label="Search boards and actions"
          >
            <Search className="size-[16px] shrink-0" strokeWidth={1.7} />
            <span className="hidden flex-1 text-left text-[13px] md:inline">Jump to</span>
            <kbd className="hidden rounded border border-border px-1.5 font-mono text-[9px] text-text-faint lg:inline-flex">
              {modifierKey} K
            </kbd>
          </button>
        </div>
        <div className="mt-auto border-t border-border p-2">
          <div className="flex flex-col items-center justify-center gap-1 rounded-md py-1 md:flex-row md:gap-2.5 md:justify-start md:px-1.5 md:py-1.5">
            <Avatar name={user?.name ?? "?"} size={27} />
            <div className="hidden min-w-0 flex-1 md:block">
              <p className="truncate text-[12px] font-medium">{user?.name}</p>
              <p className="truncate text-[10px] text-text-faint">{user?.email}</p>
            </div>
            <button
              onClick={() => setLogoutOpen(true)}
              className="inline-flex rounded-md p-1.5 text-text-muted transition-colors hover:bg-white/[0.05] hover:text-text"
              title="Log out"
              aria-label="Log out"
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onCreateBoard={() => setCreateBoardOpen(true)}
      />
      <CreateBoardModal
        open={createBoardOpen}
        onClose={() => setCreateBoardOpen(false)}
      />
      <Modal
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        title="Log out?"
      >
        <p className="text-sm text-text-muted">
          You'll be signed out of your account on this device.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setLogoutOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              setLogoutOpen(false);
              logout();
            }}
          >
            Log out
          </Button>
        </div>
      </Modal>
    </div>
  );
}
