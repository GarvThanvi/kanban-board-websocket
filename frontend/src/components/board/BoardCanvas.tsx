import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  closestCorners,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, horizontalListSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { updateBoardColumns } from "../../lib/boardCache";
import {
  animateRects,
  captureRects,
  layoutEqual,
  type RectSnapshot,
} from "../../lib/boardLayoutAnimation";
import { getSocket } from "../../lib/socket";
import { toast } from "../../stores/toast";
import { usePresence } from "../../stores/presence";
import { ColumnView } from "./ColumnView";
import { AddColumnButton } from "./AddColumnButton";
import { ActivityBadge } from "./ActivityBadge";
import { cn } from "../../lib/utils";
import type { Card, ColumnWithCards } from "../../lib/types";

interface BoardCanvasProps {
  boardId: string;
  columns: ColumnWithCards[];
  queryKey: unknown[];
  readOnly: boolean;
  onCardClick: (card: Card) => void;
}

const collisionDetection: CollisionDetection = (args) => {
  const activeType = (args.active.data.current as { type?: string } | undefined)
    ?.type;
  if (activeType === "column") {
    return closestCenter({
      ...args,
      droppableContainers: args.droppableContainers.filter(
        (container) =>
          (container.data.current as { type?: string } | undefined)?.type ===
          "column"
      ),
    });
  }
  return closestCorners(args);
};

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
  const [isPanning, setIsPanning] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const pendingLayoutRef = useRef<{
    target: ColumnWithCards[];
    rects: RectSnapshot;
  } | null>(null);
  const panRef = useRef<{
    pointerId: number;
    startX: number;
    startScrollLeft: number;
  } | null>(null);

  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  // sync external updates (socket echoes / refetches) into local state, unless
  // mid-drag. when the incoming layout differs from the rendered one, capture
  // element positions first so the next commit can FLIP-animate into place
  useLayoutEffect(() => {
    if (draggingRef.current) return;
    const current = columnsRef.current;
    if (layoutEqual(current, propColumns)) {
      if (current !== propColumns) setColumns(propColumns);
      return;
    }
    const root = canvasRef.current;
    if (root) {
      pendingLayoutRef.current = {
        target: propColumns,
        rects: captureRects(root),
      };
    }
    setColumns(propColumns);
  }, [propColumns]);

  // after the sync commit lands, animate changed elements from the
  // captured positions to their final ones
  useLayoutEffect(() => {
    const pending = pendingLayoutRef.current;
    if (!pending || pending.target !== columns) return;
    pendingLayoutRef.current = null;
    const root = canvasRef.current;
    if (root) animateRects(root, pending.rects);
  }, [columns]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  // blank-canvas panning: left-button drags that begin on the scroll
  // container itself (background, padding, gaps) scroll the board
  const onCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    if (e.target !== e.currentTarget) return;
    panRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startScrollLeft: e.currentTarget.scrollLeft,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsPanning(true);
  };

  const onCanvasPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const pan = panRef.current;
    if (!pan || pan.pointerId !== e.pointerId) return;
    e.currentTarget.scrollLeft = pan.startScrollLeft - (e.clientX - pan.startX);
  };

  const endCanvasPan = (e: React.PointerEvent<HTMLDivElement>) => {
    const pan = panRef.current;
    if (!pan || pan.pointerId !== e.pointerId) return;
    panRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setIsPanning(false);
  };

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
    pendingLayoutRef.current = null;
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
      ref={canvasRef}
      onPointerDown={onCanvasPointerDown}
      onPointerMove={onCanvasPointerMove}
      onPointerUp={endCanvasPan}
      onPointerCancel={endCanvasPan}
      className={cn(
        "flex h-[calc(100dvh-3.5rem)] items-start gap-3 overflow-x-auto p-4 cursor-grab sm:gap-4 sm:p-6",
        isPanning && "cursor-grabbing select-none"
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
          collisionDetection={collisionDetection}
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
              <div className="w-[292px] -rotate-1 rounded-[11px] border border-border-strong bg-surface p-3 shadow-2xl opacity-90">
                <p className="text-[13px] font-medium text-text-muted">
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
    <div className="w-[292px] shrink-0 rounded-[11px] border border-dashed border-border bg-surface/50 p-4">
      <ActivityBadge user={entry.user} label="is adding a column…" />
    </div>
  );
}
