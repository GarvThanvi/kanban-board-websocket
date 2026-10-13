import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Layers } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../stores/auth";
import { useBoardSocket } from "../hooks/useBoardSocket";
import { BoardCanvas } from "../components/board/BoardCanvas";
import { PresenceBar } from "../components/board/PresenceBar";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Spinner } from "../components/ui/Spinner";
import type { BoardDetail } from "../lib/types";

export default function PublicBoardPage() {
  const { token } = useParams<{ token: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ["publicBoard", token],
    queryFn: () => api.getPublicBoard(token!).then((r) => r.board),
    enabled: !!token,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <EmptyState
        icon={<Layers className="size-10" />}
        title="Link unavailable"
        subtitle="This link is invalid, expired, or has been disabled by the board owner."
        action={
          <Link to="/" className="text-[13px] text-accent hover:text-accent-hover">
            Go home
          </Link>
        }
      />
    );
  }

  return <PublicBoardInner boardId={data.id} token={token!} board={data} />;
}

function PublicBoardInner({
  boardId,
  token,
  board,
}: {
  boardId: string;
  token: string;
  board: Omit<BoardDetail, "role" | "publicLink" | "members">;
}) {
  const queryKey = useMemo(() => ["publicBoard", token], [token]);
  useBoardSocket(boardId, token, queryKey);
  const authed = useAuth((s) => s.token);

  return (
    <div className="bg-bg">
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            to="/"
            className="flex items-center gap-2 text-text"
            title="Flowline"
          >
            <span className="flex size-6 items-center justify-center rounded-md bg-accent/15">
              <Layers className="size-3.5 text-accent" />
            </span>
            <span className="text-[15px] font-semibold tracking-tight">
              Flowline
            </span>
          </Link>
          <ChevronLeft className="hidden size-4 text-text-faint sm:block" />
          <h1 className="truncate text-[15px] font-semibold">{board.name}</h1>
          <Badge color="green">Live</Badge>
          <Badge color="muted">Read-only</Badge>
        </div>
        <div className="flex items-center gap-2">
          <PresenceBar />
          {authed && (
            <Link to="/boards">
              <Button size="sm" variant="secondary">
                Open app
              </Button>
            </Link>
          )}
        </div>
      </div>
      <BoardCanvas
        boardId={boardId}
        columns={board.columns}
        queryKey={queryKey}
        readOnly
        onCardClick={() => {}}
      />
    </div>
  );
}
