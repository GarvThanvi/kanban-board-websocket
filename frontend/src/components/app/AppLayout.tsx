import { useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Layers, LayoutGrid, LogOut, Settings } from "lucide-react";
import { useAuth } from "../../stores/auth";
import { api } from "../../lib/api";
import { disconnectSocket } from "../../lib/socket";
import { Avatar } from "../ui/Avatar";
import { cn } from "../../lib/utils";

const NAV_ITEMS = [
  { to: "/boards", label: "Boards", icon: LayoutGrid },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppLayout() {
  const { token, user, setAuth, clearAuth } = useAuth();
  const navigate = useNavigate();

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

  const logout = () => {
    clearAuth();
    disconnectSocket();
    navigate("/");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-surface">
        <div className="flex items-center gap-2 px-4 py-3.5">
          <span className="flex size-6 items-center justify-center rounded-md bg-accent/15">
            <Layers className="size-3.5 text-accent" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">Flowline</span>
        </div>
        <nav className="mt-2 flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "mx-2 flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13.5px] text-text-muted hover:bg-white/5 hover:text-text",
                  isActive && "bg-white/5 text-text"
                )
              }
            >
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto p-2">
          <div className="flex items-center gap-2.5 rounded-md px-2 py-2">
            <Avatar name={user?.name ?? "?"} size={28} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">{user?.name}</p>
              <p className="truncate text-xs text-text-faint">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="rounded-md p-1.5 text-text-muted hover:bg-white/5 hover:text-text"
              title="Log out"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
