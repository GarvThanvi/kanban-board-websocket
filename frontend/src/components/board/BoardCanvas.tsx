import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, horizontalListSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { updateBoardColumns } from "../../lib/boardCache";
import { getSocket } from "../../lib/socket";
import { toast } from "../../stores/toast";
import { usePresence } from "../../stores/presence";
import { ColumnView } from "./ColumnView";
import { AddColumnButton } from "./AddColumnButton";
import { cn } from "../../lib/utils";
import type { Card, ColumnWithCards } from "../../lib/types";

interface BoardCanvasProps {
  boardId: string;
  columns: ColumnWithCards[];
  queryKey: unknown[];
  readOnly: boolean;
  onCardClick: (card: Card) => void;
}

export function BoardCanvas({
  boardId,
  columns: propColumns,
  queryKey,
  readOnly,
  onCardClick,
}: BoardCanvasProps) {
  const [columns, setColumns] = useState<ColumnWithCards[]>(propColumns);
  const columnsRef = useRef(columns);
  const draggingRef = useRef(false);
  // pre-drag truth, used to roll back a rejected move and to compute the
  // resulting arrangement without relying on the (mutable) drag-over preview
  const snapshotRef = useRef<ColumnWithCards[]>(propColumns);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [activeColumn, setActiveColumn] = useState<ColumnWithCards | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  // sync external updates (socket echoes / refetches) into local state, unless mid-drag
  useEffect(() => {
    if (!draggingRef.current) setColumns(propColumns);
  }, [propColumns]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const restore = (state: ColumnWithCards[]) => {
    setColumns(state);
    updateBoardColumns(queryClient, queryKey, () => state);
  };

  // roll back to the pre-drag snapshot, then resync from the server
  const revert = () => {
    restore(snapshotRef.current);
    queryClient.invalidateQueries({ queryKey });
  };

  const applyMoveToCache = (
    oldCol: { columnId: string; cards: Card[] },
    newCol: { columnId: string; cards: Card[] }
  ) => {
    updateBoardColumns(queryClient, queryKey, (cols) =>
      cols.map((c) =>
        c.id === oldCol.columnId
          ? { ...c, cards: oldCol.cards }
          : c.id === newCol.columnId
            ? { ...c, cards: newCol.cards }
            : c
      )
    );
  };

  const onDragStart = (e: DragStartEvent) => {
    draggingRef.current = true;
    snapshotRef.current = columnsRef.current;
    const type = (e.active.data.current as { type?: string } | undefined)?.type;
    if (type === "card") {
      const found = columnsRef.current
        .flatMap((c) => c.cards)
        .find((c) => c.id === e.active.id);
      if (found) {
        setActiveCard(found);
        getSocket().emit("card:moving", { boardId, cardId: found.id });
      }
    } else if (type === "column") {
      const col = columnsRef.current.find((c) => c.id === e.active.id);
      if (col) {
        setActiveColumn(col);
        getSocket().emit("column:moving", { boardId, columnId: col.id });
      }
    }
  };

  // drag-over only moves a card between columns for visual feedback;
  // ordering within a column is handled on drop
  const onDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;
    const activeType = (active.data.current as { type?: string })?.type;
    if (activeType !== "card") return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const overType = (over.data.current as { type?: string } | undefined)?.type;
    const current = columnsRef.current;

    const fromColumnId = current.find((c) =>
      c.cards.some((k) => k.id === activeId)
    )?.id;
    if (!fromColumnId) return;

    let targetColumnId: string | null = null;
    let targetIndex: number | null = null;

    if (overType === "card") {
      const target = current.find((c) => c.cards.some((k) => k.id === overId));
      if (target) {
        targetColumnId = target.id;
        targetIndex = target.cards.findIndex((k) => k.id === overId);
      }
    } else if (overType === "column-body") {
      targetColumnId = (over.data.current as { columnId: string }).columnId;
      const target = current.find((c) => c.id === targetColumnId);
      targetIndex = target ? target.cards.length : null;
    }

    if (!targetColumnId || targetIndex === null) return;
    if (fromColumnId === targetColumnId) return;

    setColumns((cols) => {
      const next = cols.map((c) => ({ ...c, cards: [...c.cards] }));
      const from = next.find((c) => c.id === fromColumnId);
      const to = next.find((c) => c.id === targetColumnId);
      if (!from || !to) return cols;
      const idx = from.cards.findIndex((k) => k.id === activeId);
      if (idx === -1) return cols;
      const [moved] = from.cards.splice(idx, 1);
      if (!moved) return cols;
      to.cards.splice(Math.min(targetIndex, to.cards.length), 0, {
        ...moved,
        columnId: to.id,
      });
      return next;
    });
  };

  const onDragEnd = (e: DragEndEvent) => {
    draggingRef.current = false;
    getSocket().emit("action:stop", { boardId });
    const { active, over } = e;
    setActiveCard(null);
    setActiveColumn(null);
    if (!over) {
      revert();
      return;
    }

    const activeType = (active.data.current as { type?: string })?.type;
    const activeId = String(active.id);

    if (activeType === "column") {
      const current = columnsRef.current;
      const oldIndex = current.findIndex((c) => c.id === active.id);
      const newIndex = current.findIndex((c) => c.id === over.id);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
      const next = arrayMove(current, oldIndex, newIndex).map((c, i) => ({
        ...c,
        position: i + 1,
      }));
      setColumns(next);
      api
        .repositionColumns(
          boardId,
          next.map((c) => ({ columnId: c.id, position: c.position }))
        )
        .then((res) => {
          const pos = new Map(res.data.map((c) => [c.id, c.position]));
          updateBoardColumns(queryClient, queryKey, (cols) =>
            [...cols].sort(
              (a, b) => (pos.get(a.id) ?? a.position) - (pos.get(b.id) ?? b.position)
            )
          );
        })
        .catch(() => {
          toast.error("Failed to move column");
          revert();
        });
      return;
    }

    if (activeType === "card") {
      const current = columnsRef.current;
      const snap = snapshotRef.current;
      // where the card appears locally right now (drag-over may have relocated it)
      const localSource = current.find((c) =>
        c.cards.some((k) => k.id === activeId)
      );
      // where the server still has it: its drag-start column
      const oldColumnId = snap.find((c) =>
        c.cards.some((k) => k.id === activeId)
      )?.id;
      if (!localSource || !oldColumnId) {
        revert();
        return;
      }

      const overId = String(over.id);
      const overType = (over.data.current as { type?: string } | undefined)?.type;
      const targetColumnId =
        overType === "card"
          ? current.find((c) => c.cards.some((k) => k.id === overId))?.id
          : overType === "column-body"
            ? (over.data.current as { columnId: string }).columnId
            : overType === "column"
              ? String(over.id)
              : undefined;
      const targetCol = targetColumnId
        ? current.find((c) => c.id === targetColumnId)
        : undefined;
      if (!targetCol) {
        revert();
        return;
      }

      let next: ColumnWithCards[];
      if (oldColumnId === targetCol.id) {
        // same column — reorder within it
        const oldIndex = targetCol.cards.findIndex((k) => k.id === activeId);
        const newIndex =
          overType === "card"
            ? targetCol.cards.findIndex((k) => k.id === overId)
            : targetCol.cards.length - 1;
        if (oldIndex === -1) {
          revert();
          return;
        }
        if (newIndex === -1 || newIndex === oldIndex) {
          // dropped in place — clear any drag-over preview, persist nothing
          setColumns(snap);
          return;
        }
        next = current.map((c) =>
          c.id === targetCol.id
            ? { ...c, cards: arrayMove(c.cards, oldIndex, newIndex) }
            : c
        );
      } else {
        // crossing columns — drag-over usually already relocated the card
        const srcCard = localSource.cards.find((k) => k.id === activeId)!;
        next = current.map((c) => {
          if (c.id === oldColumnId)
            return { ...c, cards: c.cards.filter((k) => k.id !== activeId) };
          if (c.id === targetCol.id && !c.cards.some((k) => k.id === activeId))
            return {
              ...c,
              cards: [...c.cards, { ...srcCard, columnId: targetCol.id }],
            };
          return c;
        });
      }

      const finalDest = next.find((c) => c.id === targetCol.id)!;
      if (!finalDest.cards.some((k) => k.id === activeId)) {
        revert();
        return;
      }

      setColumns(next);
      api
        .moveCard(boardId, activeId, {
          newColumnId: targetCol.id,
          oldColumnId,
          cards: finalDest.cards.map((c, i) => ({
            cardId: c.id,
            position: i + 1,
          })),
        })
        .then((res) => {
          if (res.oldColumn && res.newColumn) {
            applyMoveToCache(res.oldColumn, res.newColumn);
          }
        })
        .catch(() => {
          toast.error("Failed to move card");
          revert();
        });
    }
  };

  const onDragCancel = () => {
    draggingRef.current = false;
    getSocket().emit("action:stop", { boardId });
    setActiveCard(null);
    setActiveColumn(null);
    revert();
  };

  return (
    <div
      className={cn(
        "flex h-[calc(100vh-3.5rem)] items-start gap-4 overflow-x-auto p-6"
      )}
    >
      {readOnly ? (
        <SortableContext items={columns.map((c) => c.id)}>
          <ColumnsLayout
            boardId={boardId}
            columns={columns}
            readOnly
            onCardClick={onCardClick}
          />
        </SortableContext>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onDragCancel={onDragCancel}
        >
          <SortableContext
            items={columns.map((c) => c.id)}
            strategy={horizontalListSortingStrategy}
          >
            <ColumnsLayout
              boardId={boardId}
              columns={columns}
              queryKey={queryKey}
              onCardClick={onCardClick}
            />
          </SortableContext>
          <AddColumnButton boardId={boardId} queryKey={queryKey} />
          <DragOverlay>
            {activeCard && (
              <div className="w-64 rotate-2 rounded-lg border border-border-strong bg-surface-3 p-3 shadow-2xl opacity-90">
                <p className="text-[13.5px] leading-snug">{activeCard.title}</p>
              </div>
            )}
            {activeColumn && (
              <div className="w-72 -rotate-1 rounded-xl border border-border-strong bg-surface p-3 shadow-2xl opacity-90">
                <p className="text-[13px] font-semibold uppercase tracking-wide text-text-muted">
                  {activeColumn.name}
                </p>
                <p className="mt-2 text-xs text-text-faint">
                  {activeColumn.cards.length} cards
                </p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}
      <PresenceGuestColumnPlaceholder boardId={boardId} />
    </div>
  );
}

function ColumnsLayout({
  boardId,
  columns,
  queryKey,
  readOnly,
  onCardClick,
}: {
  boardId: string;
  columns: ColumnWithCards[];
  queryKey?: unknown[];
  readOnly?: boolean;
  onCardClick: (card: Card) => void;
}) {
  return (
    <>
      {columns.map((col) => (
        <ColumnView
          key={col.id}
          boardId={boardId}
          column={col}
          queryKey={queryKey}
          readOnly={!!readOnly}
          onCardClick={onCardClick}
        />
      ))}
    </>
  );
}

function PresenceGuestColumnPlaceholder({ boardId }: { boardId: string }) {
  const activity = usePresence((s) => s.activity);
  const entry = activity[`columnCreating:${boardId}`];
  if (!entry) return null;
  return (
    <div className="w-72 shrink-0 rounded-xl border border-dashed border-border bg-surface/50 p-4">
      <p className="text-[13px] italic text-text-faint">
        {entry.user.name} is adding a column…
      </p>
    </div>
  );
}
