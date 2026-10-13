import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { LayoutGrid, Plus } from "lucide-react";
import { api } from "../lib/api";
import { formatDate } from "../lib/utils";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { CreateBoardModal } from "../components/app/CreateBoardModal";
import { InvitationsInbox } from "../components/app/InvitationsInbox";

function BoardCard({
  to,
  children,
}: {
  to: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="block rounded-xl border border-border bg-surface p-5 transition-colors hover:border-border-strong hover:bg-surface-2"
    >
      {children}
    </Link>
  );
}

export default function BoardsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["boards"],
    queryFn: () => api.listBoards(),
  });

  const boards = data?.boards ?? [];
  const shared = data?.shared ?? [];
  const empty = !isLoading && boards.length === 0 && shared.length === 0;

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Boards</h1>
        <Button variant="secondary" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          New board
        </Button>
      </div>

      <InvitationsInbox />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl border border-border bg-surface"
            />
          ))}
        </div>
      ) : empty ? (
        <EmptyState
          icon={<LayoutGrid className="size-10" />}
          title="No boards yet"
          subtitle="Create your first board to get started."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              New board
            </Button>
          }
        />
      ) : (
        <>
          {boards.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-medium text-text-muted">
                Your boards
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {boards.map((b) => (
                  <BoardCard key={b.id} to={`/boards/${b.id}`}>
                    <p className="font-medium">{b.name}</p>
                    <p className="mt-1 line-clamp-2 min-h-9 text-[13px] text-text-muted">
                      {b.description}
                    </p>
                    <p className="mt-3 text-xs text-text-faint">
                      {formatDate(b.createdAt)}
                    </p>
                  </BoardCard>
                ))}
              </div>
            </section>
          )}
          {shared.length > 0 && (
            <section className="mt-10">
              <h2 className="mb-3 text-sm font-medium text-text-muted">
                Shared with you
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {shared.map((b) => (
                  <BoardCard key={b.id} to={`/boards/${b.id}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{b.name}</p>
                      <Badge color="accent">{b.role}</Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 min-h-9 text-[13px] text-text-muted">
                      {b.description}
                    </p>
                    <p className="mt-3 text-xs text-text-faint">
                      Shared by {b.owner.name}
                    </p>
                  </BoardCard>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <CreateBoardModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
