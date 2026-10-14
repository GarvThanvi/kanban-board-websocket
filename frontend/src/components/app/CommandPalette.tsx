import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowRight, LayoutGrid, Plus, Search, Settings } from "lucide-react";
import { api } from "../../lib/api";
import { Modal } from "../ui/Modal";
import { Avatar } from "../ui/Avatar";
import { EmptyState } from "../ui/EmptyState";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onCreateBoard: () => void;
}

export function CommandPalette({ open, onClose, onCreateBoard }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const boardsQuery = useQuery({
    queryKey: ["boards"],
    queryFn: api.listBoards,
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const close = () => {
    setQuery("");
    setActiveIndex(0);
    onClose();
  };

  const items = useMemo(() => {
    const commandItems = [
      {
        id: "boards",
        label: "All boards",
        detail: "Open workspace",
        icon: LayoutGrid,
        run: () => navigate("/boards"),
      },
      {
        id: "settings",
        label: "Settings",
        detail: "Profile and password",
        icon: Settings,
        run: () => navigate("/settings"),
      },
      {
        id: "create-board",
        label: "Create a board",
        detail: "Start a new workspace",
        icon: Plus,
        run: onCreateBoard,
      },
    ];
    const boardItems = [
      ...(boardsQuery.data?.boards ?? []).map((board) => ({
        id: board.id,
        label: board.name,
        detail: "Your board",
        run: () => navigate(`/boards/${board.id}`),
      })),
      ...(boardsQuery.data?.shared ?? []).map((board) => ({
        id: board.id,
        label: board.name,
        detail: `Shared by ${board.owner.name}`,
        run: () => navigate(`/boards/${board.id}`),
      })),
    ].map((board) => ({ ...board, icon: LayoutGrid }));

    return [...commandItems, ...boardItems].filter((item) =>
      `${item.label} ${item.detail}`.toLowerCase().includes(query.trim().toLowerCase())
    );
  }, [boardsQuery.data, navigate, onCreateBoard, query]);

  const runItem = (index: number) => {
    const item = items[index];
    if (!item) return;
    close();
    item.run();
  };

  return (
    <Modal open={open} onClose={close} title="Jump to">
      <div className="-mt-1">
        <label className="flex h-11 items-center gap-2.5 border-b border-border px-1">
          <Search className="size-4 shrink-0 text-text-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((index) => Math.min(index + 1, items.length - 1));
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((index) => Math.max(index - 1, 0));
              }
              if (event.key === "Enter") {
                event.preventDefault();
                runItem(activeIndex);
              }
            }}
            placeholder="Search boards and actions…"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-text-faint"
          />
          <kbd className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-text-faint">
            ESC
          </kbd>
        </label>

        <div className="max-h-[min(55vh,420px)] overflow-y-auto py-2" role="listbox" aria-label="Commands">
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => runItem(index)}
              className={`flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors ${index === activeIndex ? "bg-white/[0.07] text-text" : "text-text-muted hover:bg-white/[0.04] hover:text-text"}`}
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-surface-2">
                <item.icon className="size-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">{item.label}</span>
                <span className="block truncate text-[11px] text-text-faint">{item.detail}</span>
              </span>
              {item.detail.startsWith("Shared by") && (
                <Avatar name={item.detail.slice("Shared by ".length)} size={20} />
              )}
              {index === activeIndex && <ArrowRight className="size-3.5 text-text-faint" />}
            </button>
          ))}
          {items.length === 0 && (
            <EmptyState
              icon={<Search className="size-5" />}
              title="No matching boards or actions"
              subtitle="Try a different search."
            />
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3 text-[10px] text-text-faint">
          <span>Navigate Flowline</span>
          <span className="font-mono">↑ ↓ select · ↵ open</span>
        </div>
      </div>
    </Modal>
  );
}
