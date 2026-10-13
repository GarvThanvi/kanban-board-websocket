import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { api } from "../lib/api";
import { useBoardSocket } from "../hooks/useBoardSocket";
import { BoardCanvas } from "../components/board/BoardCanvas";
import { CardModal } from "../components/board/CardModal";
import { PresenceBar } from "../components/board/PresenceBar";
import { ShareModal } from "../components/board/ShareModal";
import { BoardMenu } from "../components/board/BoardMenu";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Spinner } from "../components/ui/Spinner";
import type { Card } from "../lib/types";

export default function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const queryKey = useMemo(() => ["board", boardId], [boardId]);
  const { data: board, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => api.getBoard(boardId!),
    enabled: !!boardId,
  });
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  useBoardSocket(boardId!, undefined, queryKey);

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-0px)] items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }
  if (error || !board) {
    return (
      <EmptyState
        icon={<ChevronLeft className="size-10" />}
        title="Board not found"
        subtitle="This board doesn't exist or you don't have access to it."
        action={
          <Link to="/boards" className="text-[13px] text-accent hover:text-accent-hover">
            Back to boards
          </Link>
        }
      />
    );
  }

  const isOwner = board.role === "OWNER";
  const readOnly = board.role === "VIEWER";

  return (
    <>
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            to="/boards"
            className="rounded-md p-1.5 text-text-muted hover:bg-white/5 hover:text-text"
            title="Back to boards"
          >
            <ChevronLeft className="size-4" />
          </Link>
          <h1 className="truncate text-[15px] font-semibold">{board.name}</h1>
          <Badge color={isOwner ? "yellow" : "accent"}>{board.role}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <PresenceBar />
          {isOwner && (
            <Button size="sm" variant="secondary" onClick={() => setShareOpen(true)}>
              Share
            </Button>
          )}
          {isOwner && <BoardMenu board={board} />}
        </div>
      </div>

      <BoardCanvas
        boardId={boardId!}
        columns={board.columns}
        queryKey={queryKey}
        readOnly={readOnly}
        onCardClick={setActiveCard}
      />

      <CardModal
        boardId={boardId!}
        card={activeCard}
        readOnly={readOnly}
        onClose={() => setActiveCard(null)}
      />

      {isOwner && (
        <ShareModal board={board} open={shareOpen} onClose={() => setShareOpen(false)} />
      )}
    </>
  );
}
