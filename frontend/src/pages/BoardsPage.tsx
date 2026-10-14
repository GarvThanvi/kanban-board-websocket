import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, LayoutGrid, Plus } from "lucide-react";
import { api } from "../lib/api";
import { formatDate } from "../lib/utils";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { CreateBoardModal } from "../components/app/CreateBoardModal";
import { InvitationsInbox } from "../components/app/InvitationsInbox";

function BoardCard({
  to,
  title,
  description,
  meta,
  role,
}: {
  to: string;
  title: string;
  description?: string | null;
  meta: string;
  role?: string;
}) {
  return (
    <Link
      to={to}
      className="group flex min-h-[76px] items-center gap-3 border-b border-border px-2 py-3.5 transition-colors hover:bg-white/[0.025] sm:gap-4 sm:px-3"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface-2 text-text-muted transition-colors group-hover:border-border-strong group-hover:text-text">
        <LayoutGrid className="size-4" strokeWidth={1.6} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[13px] font-medium text-text">{title}</span>
          {role && <Badge color="muted">{role}</Badge>}
        </span>
        {description && (
          <span className="mt-1 block truncate text-[12px] text-text-faint">
            {description}
          </span>
        )}
      </span>
      <span className="hidden shrink-0 font-mono text-[10px] text-text-faint sm:block">
        {meta}
      </span>
      <ArrowUpRight className="size-3.5 shrink-0 text-text-faint opacity-0 transition-opacity group-hover:opacity-100" />
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
    <div className="mx-auto max-w-[1100px] px-5 py-8 sm:px-8 sm:py-10">
      <div className="mb-9 flex items-end justify-between gap-4">
        <div>
          <p className="text-[12px] text-text-faint">Workspace</p>
          <h1 className="mt-2 text-[25px] font-medium tracking-[-0.05em]">Boards</h1>
          <p className="mt-1.5 text-[13px] text-text-muted">Pick up where the team left off.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          <span className="hidden sm:inline">New board</span>
          <span className="sm:hidden">New</span>
        </Button>
      </div>

      <InvitationsInbox />

      {isLoading ? (
        <div className="divide-y divide-border border-y border-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[76px] animate-pulse bg-surface/50"
            />
          ))}
        </div>
      ) : empty ? (
        <EmptyState
          icon={<LayoutGrid className="size-10" />}
          title="No boards yet"
          subtitle="Create your first board to get started."
          action={<Button onClick={() => setCreateOpen(true)}><Plus className="size-4" />New board</Button>}
        />
      ) : (
        <>
          {boards.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[13px] font-medium">Owned by you</h2>
                <span className="font-mono text-[10px] text-text-faint">{boards.length.toString().padStart(2, "0")}</span>
              </div>
              <div className="border-t border-border">
                {boards.map((b) => (
                  <BoardCard
                    key={b.id}
                    to={`/boards/${b.id}`}
                    title={b.name}
                    description={b.description}
                    meta={`Updated ${formatDate(b.updatedAt)}`}
                  />
                ))}
              </div>
            </section>
          )}
          {shared.length > 0 && (
            <section className="mt-12">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[13px] font-medium">Shared with you</h2>
                <span className="font-mono text-[10px] text-text-faint">{shared.length.toString().padStart(2, "0")}</span>
              </div>
              <div className="border-t border-border">
                {shared.map((b) => (
                  <BoardCard
                    key={b.id}
                    to={`/boards/${b.id}`}
                    title={b.name}
                    description={b.description}
                    meta={`From ${b.owner.name}`}
                    role={b.role}
                  />
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
