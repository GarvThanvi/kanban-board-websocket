import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { updateBoardColumns } from "../../lib/boardCache";
import { getSocket } from "../../lib/socket";
import { toast } from "../../stores/toast";
import { usePresence, activityOf } from "../../stores/presence";
import { CardView } from "./CardView";
import { AddCardComposer } from "./AddCardComposer";
import { ActivityBadge } from "./ActivityBadge";
import { activityLabel } from "../../lib/activity";
import { Button } from "../ui/Button";
import { Dropdown, DropdownItem } from "../ui/Dropdown";
import { Modal } from "../ui/Modal";
import { avatarColor, cn } from "../../lib/utils";
import type { Card, ColumnWithCards } from "../../lib/types";

interface ColumnViewProps {
  boardId: string;
  column: ColumnWithCards;
  queryKey?: unknown[];
  readOnly?: boolean;
onCardClick: (card: Card) => void;
}

export function ColumnView({
  boardId,
  column,
  queryKey,
  readOnly = false,
onCardClick,
}: ColumnViewProps) {
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(column.name);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const queryClient = useQueryClient();
  const activity = usePresence((s) => s.activity);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: { type: "column" },
    disabled: readOnly,
  });

  const { setNodeRef: setBodyRef } = useDroppable({
    id: `${column.id}-body`,
    data: { type: "column-body", columnId: column.id },
  });

  const editingEntry =
    activityOf(activity, "columnEditing", column.id) ??
    activityOf(activity, "columnMoving", column.id);

  const creatingEntry = activityOf(activity, "creating", column.id);

  const commitRename = async () => {
    setRenaming(false);
    getSocket().emit("action:stop", { boardId });
    const name = renameValue.trim();
    if (!name || name === column.name) return;
    try {
      const res = await api.renameColumn(boardId, column.id, { name });
      if (queryKey) {
        updateBoardColumns(queryClient, queryKey, (cols) =>
          cols.map((c) =>
            c.id === column.id ? { ...c, name: res.updatedColumn.name } : c
          )
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to rename column");
    }
  };

  const deleteColumn = async () => {
    setDeleteOpen(false);
    try {
      await api.deleteColumn(boardId, column.id);
      if (queryKey) {
        updateBoardColumns(queryClient, queryKey, (cols) =>
          cols.filter((c) => c.id !== column.id)
        );
      }
      toast.success("Column deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete column");
    }
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={{
          transform: CSS.Translate.toString(transform),
          transition,
          boxShadow: editingEntry
            ? `0 0 0 1px ${avatarColor(editingEntry.user.name)}`
            : undefined,
        }}
        className={cn(
          "flex w-[292px] shrink-0 max-h-full flex-col rounded-[11px] border border-border bg-surface",
          isDragging && "opacity-40"
        )}
      >
        <div
          className="flex cursor-grab items-center justify-between px-3.5 pb-2.5 pt-3.5"
          {...attributes}
          {...listeners}
          onDoubleClick={() => {
            if (!readOnly) {
              setRenameValue(column.name);
              setRenaming(true);
            }
          }}
        >
          {renaming ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setRenaming(false);
              }}
              onFocus={() =>
                getSocket().emit("column:editing", { boardId, columnId: column.id })
              }
              className="h-8 w-full rounded-md border border-border bg-surface-2 px-2 text-[13px] font-medium outline-none focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-white/10"
            />
          ) : (
            <p className="text-[13px] font-medium text-text-muted">
              {column.name}
            </p>
          )}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-text-faint">{column.cards.length.toString().padStart(2, "0")}</span>
            {!readOnly && (
              <Dropdown
                align="right"
                trigger={
                  <button aria-label={`Options for ${column.name}`} className="rounded-md p-1 text-text-faint transition-colors hover:bg-white/5 hover:text-text">
                    <MoreHorizontal className="size-4" />
                  </button>
                }
              >
                <DropdownItem
                  onClick={() => {
                    setRenameValue(column.name);
                    setRenaming(true);
                  }}
                >
                  <Pencil className="size-3.5" />
                  Rename
                </DropdownItem>
                <DropdownItem danger onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="size-3.5" />
                  Delete column
                </DropdownItem>
              </Dropdown>
            )}
          </div>
        </div>

        <div
          ref={setBodyRef}
          className="flex min-h-1 flex-1 flex-col gap-2 overflow-y-auto px-2.5 pb-1"
        >
          {editingEntry && (
            <ActivityBadge
              user={editingEntry.user}
              label={activityLabel(editingEntry.type)}
            />
          )}
          <SortableContext
            items={column.cards.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            {column.cards.map((card) => (
              <CardView
                key={card.id}
                card={card}
                columnId={column.id}
                readOnly={readOnly}
                onClick={() => onCardClick(card)}
              />
            ))}
          </SortableContext>
        </div>

        {creatingEntry && (
          <div className="px-2.5 pb-1">
            <ActivityBadge user={creatingEntry.user} label="is adding a card…" />
          </div>
        )}

        {!readOnly && (
          <AddCardComposer
            boardId={boardId}
            columnId={column.id}
            queryKey={queryKey}
          />
        )}
        {readOnly && column.cards.length === 0 && (
          <p className="px-3 pb-3 text-xs text-text-faint">No cards</p>
        )}
      </div>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete column?">
        <p className="text-sm text-text-muted">
          This will delete{" "}
          <span className="font-medium text-text">{column.name}</span> and all{" "}
          {column.cards.length} of its cards. This cannot be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={deleteColumn}>
            Delete
          </Button>
        </div>
      </Modal>
    </>
  );
}
