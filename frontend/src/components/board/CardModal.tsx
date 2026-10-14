import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { api } from "../../lib/api";
import { updateBoardColumns } from "../../lib/boardCache";
import { getSocket } from "../../lib/socket";
import { toast } from "../../stores/toast";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import type { Card } from "../../lib/types";

export function CardModal({
  boardId,
  card,
  readOnly,
  onClose,
}: {
  boardId: string;
  card: Card | null;
  readOnly: boolean;
  onClose: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const queryClient = useQueryClient();
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!card) return null;

  const emitEditing = () => {
    if (readOnly) return;
    // cancel a pending stop from focus moving between fields
    if (stopTimer.current) {
      clearTimeout(stopTimer.current);
      stopTimer.current = null;
    }
    getSocket().emit("card:editing", { boardId, cardId: card.id });
  };
  const stopEditing = () => {
    if (readOnly) return;
    if (stopTimer.current) clearTimeout(stopTimer.current);
    stopTimer.current = setTimeout(() => {
      getSocket().emit("action:stop", { boardId });
      stopTimer.current = null;
    }, 150);
  };

  const saveTitle = async () => {
    const title = card.title;
    const el = document.getElementById("card-title-input") as HTMLInputElement | null;
    const newTitle = el?.value.trim() ?? title;
    if (!newTitle || newTitle === title) return;
    try {
      const res = await api.updateCard(boardId, card.id, { title: newTitle });
      updateBoardColumns(queryClient, ["board", boardId], (cols) =>
        cols.map((c) => ({
          ...c,
          cards: c.cards.map((k) => (k.id === card.id ? res.updatedCard : k)),
        }))
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save title");
    }
  };

  const saveDescription = async () => {
    const el = document.getElementById(
      "card-description-input"
    ) as HTMLTextAreaElement | null;
    const newDescription = el?.value ?? "";
    if (newDescription === (card.description ?? "")) return;
    try {
      const res = await api.updateCard(boardId, card.id, {
        description: newDescription,
      });
      updateBoardColumns(queryClient, ["board", boardId], (cols) =>
        cols.map((c) => ({
          ...c,
          cards: c.cards.map((k) => (k.id === card.id ? res.updatedCard : k)),
        }))
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save description");
    }
  };

  const deleteCard = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    try {
      await api.deleteCard(boardId, card.id);
      updateBoardColumns(queryClient, ["board", boardId], (cols) =>
        cols.map((c) => ({
          ...c,
          cards: c.cards.filter((k) => k.id !== card.id),
        }))
      );
      toast.success("Card deleted");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete card");
    }
  };

  const handleClose = () => {
    stopEditing();
    onClose();
  };

  return (
    <Modal open onClose={handleClose} title="Card">
      <div
        onFocus={emitEditing}
        onBlur={stopEditing}
        className="flex flex-col gap-4"
      >
        <input
          id="card-title-input"
          key={`title-${card.id}`}
          defaultValue={card.title}
          disabled={readOnly}
          onBlur={saveTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          className="w-full rounded-lg bg-transparent px-1 py-1 text-lg font-semibold outline-none border border-transparent focus:bg-surface-2 focus:border-border disabled:opacity-70"
        />
        <textarea
          id="card-description-input"
          key={`desc-${card.id}`}
          defaultValue={card.description ?? ""}
          disabled={readOnly}
          onBlur={saveDescription}
          rows={4}
          placeholder={readOnly ? "No description" : "Add a description…"}
          className="w-full resize-none rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none placeholder:text-text-faint focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-white/10 disabled:opacity-70"
        />
        {!readOnly && (
          <div className="flex justify-end">
            <Button variant="danger" size="sm" onClick={deleteCard}>
              <Trash2 className="size-3.5" />
              {confirmDelete ? "Click again to confirm" : "Delete card"}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
