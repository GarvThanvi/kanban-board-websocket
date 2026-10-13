import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { api } from "../../lib/api";
import { updateBoardColumns } from "../../lib/boardCache";
import { getSocket } from "../../lib/socket";
import { toast } from "../../stores/toast";
import { Button } from "../ui/Button";
import type { ColumnWithCards } from "../../lib/types";

export function AddColumnButton({
  boardId,
  queryKey,
}: {
  boardId: string;
  queryKey: unknown[];
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const expand = () => {
    setOpen(true);
    getSocket().emit("column:creating", { boardId });
  };

  const collapse = () => {
    setOpen(false);
    setName("");
    getSocket().emit("action:stop", { boardId });
  };

  const submit = async () => {
    const n = name.trim();
    if (!n) return;
    setLoading(true);
    try {
      const res = await api.createColumn(boardId, { name: n });
      const newColumn: ColumnWithCards = { ...res.data.newColumn, cards: [] };
      updateBoardColumns(queryClient, queryKey, (cols) =>
        cols.some((c) => c.id === newColumn.id) ? cols : [...cols, newColumn]
      );
      collapse();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create column");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={expand}
        className="flex h-10 w-72 shrink-0 items-center gap-1.5 rounded-xl border border-dashed border-border px-4 text-left text-[13px] text-text-muted hover:border-border-strong hover:text-text"
      >
        <Plus className="size-3.5" />
        Add column
      </button>
    );
  }

  return (
    <div className="w-72 shrink-0 rounded-xl border border-border bg-surface p-3">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") collapse();
        }}
        placeholder="Column name…"
        className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-[13px] outline-none placeholder:text-text-faint focus:border-accent/60"
      />
      <div className="mt-2 flex items-center gap-1">
        <Button size="sm" loading={loading} onClick={submit}>
          Add column
        </Button>
        <button
          onClick={collapse}
          className="rounded-md p-1.5 text-text-faint hover:bg-white/5 hover:text-text"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
