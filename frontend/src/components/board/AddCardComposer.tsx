import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { api } from "../../lib/api";
import { updateBoardColumns } from "../../lib/boardCache";
import { getSocket } from "../../lib/socket";
import { toast } from "../../stores/toast";
import { Button } from "../ui/Button";

export function AddCardComposer({
  boardId,
  columnId,
  queryKey,
}: {
  boardId: string;
  columnId: string;
  queryKey?: unknown[];
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const expand = () => {
    setOpen(true);
    getSocket().emit("card:creating", { boardId, columnId });
  };

  const collapse = () => {
    setOpen(false);
    setTitle("");
    getSocket().emit("action:stop", { boardId });
  };

  const submit = async () => {
    const t = title.trim();
    if (!t) return;
    setLoading(true);
    try {
      const res = await api.createCard(boardId, columnId, { title: t });
      if (queryKey) {
        updateBoardColumns(queryClient, queryKey, (cols) =>
          cols.map((c) =>
            c.id === columnId && !c.cards.some((k) => k.id === res.newCard.id)
              ? { ...c, cards: [...c.cards, res.newCard] }
              : c
          )
        );
      }
      setTitle("");
      collapse();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create card");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={expand}
        className="flex w-full items-center gap-1.5 px-3.5 pb-3 pt-2 text-left text-[13px] text-text-muted hover:text-text"
      >
        <Plus className="size-3.5" />
        Add a card
      </button>
    );
  }

  return (
    <div className="px-2.5 pb-2.5 pt-1">
      <textarea
        autoFocus
        rows={2}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
          if (e.key === "Escape") collapse();
        }}
        placeholder="Card title…"
        className="w-full resize-none rounded-lg border border-border bg-surface-2 p-2.5 text-[13px] outline-none placeholder:text-text-faint focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-white/10"
      />
      <div className="mt-1.5 flex items-center gap-1">
        <Button size="sm" loading={loading} onClick={submit}>
          Add card
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
