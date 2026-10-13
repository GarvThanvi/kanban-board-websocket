import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSocket } from "../lib/socket";
import { updateBoardColumns } from "../lib/boardCache";
import { usePresence } from "../stores/presence";
import { toast } from "../stores/toast";
import type {
  ActionType,
  Board,
  Card,
  Column,
  ColumnWithCards,
  PresenceUser,
} from "../lib/types";

interface MovedPayload {
  oldColumn: { columnId: string; cards: Card[] };
  newColumn: { columnId: string; cards: Card[] };
}

export function useBoardSocket(
  boardId: string,
  publicToken: string | undefined,
  queryKey: unknown[]
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSocket();
    socket.emit("board:join", { boardId, publicToken });

    const updateColumns = (fn: (cols: ColumnWithCards[]) => ColumnWithCards[]) =>
      updateBoardColumns(queryClient, queryKey, fn);

    socket.on("presence:update", (p: { count: number; users: PresenceUser[] }) =>
      usePresence.getState().setPresence(p.users)
    );

    socket.on("card:created", (card: Card) =>
      updateColumns((cols) =>
        cols.map((c) =>
          c.id === card.columnId && !c.cards.some((k) => k.id === card.id)
            ? { ...c, cards: [...c.cards, card] }
            : c
        )
      )
    );

    socket.on("card:updated", (card: Card) =>
      updateColumns((cols) =>
        cols.map((c) => ({
          ...c,
          cards: c.cards.map((k) => (k.id === card.id ? card : k)),
        }))
      )
    );

    socket.on("card:moved", (p: MovedPayload) =>
      updateColumns((cols) =>
        cols.map((c) =>
          c.id === p.oldColumn.columnId
            ? { ...c, cards: p.oldColumn.cards }
            : c.id === p.newColumn.columnId
              ? { ...c, cards: p.newColumn.cards }
              : c
        )
      )
    );

    socket.on("card:deleted", (p: { cardId: string }) =>
      updateColumns((cols) =>
        cols.map((c) => ({
          ...c,
          cards: c.cards.filter((k) => k.id !== p.cardId),
        }))
      )
    );

    socket.on("column:created", (p: { newColumn: Column }) =>
      updateColumns((cols) =>
        cols.some((c) => c.id === p.newColumn.id)
          ? cols
          : [...cols, { ...p.newColumn, cards: [] }]
      )
    );

    socket.on("column:updated", (p: { updatedColumn: Column }) =>
      updateColumns((cols) =>
        cols.map((c) =>
          c.id === p.updatedColumn.id
            ? { ...c, name: p.updatedColumn.name }
            : c
        )
      )
    );

    socket.on("column:moved", (p: { updatedColumns: Column[] }) =>
      updateColumns((cols) => {
        const pos = new Map(p.updatedColumns.map((c) => [c.id, c.position]));
        return [...cols].sort(
          (a, b) => (pos.get(a.id) ?? a.position) - (pos.get(b.id) ?? b.position)
        );
      })
    );

    socket.on("column:deleted", (p: { columnIdDeleted: string }) =>
      updateColumns((cols) => cols.filter((c) => c.id !== p.columnIdDeleted))
    );

    socket.on("board:updated", (p: { updatedBoard: Board }) =>
      queryClient.setQueryData<any>(queryKey, (old: any) =>
        old
          ? {
              ...old,
              name: p.updatedBoard.name,
              description: p.updatedBoard.description,
            }
          : old
      )
    );

    socket.on("member:added", () => queryClient.invalidateQueries({ queryKey }));
    socket.on("member:updated", () =>
      queryClient.invalidateQueries({ queryKey })
    );
    socket.on("member:removed", () =>
      queryClient.invalidateQueries({ queryKey })
    );

    const gone = (msg: string) => {
      toast.error(msg);
      usePresence.getState().reset();
      window.location.href = publicToken ? "/" : "/boards";
    };
    socket.on("board:deleted", () => gone("This board was deleted"));
    socket.on("board:kicked", () => gone("You were removed from this board"));
    socket.on("board:revoked", () =>
      gone("Public access to this board was revoked")
    );
    socket.on(
      "board:error",
      (p: { message?: string }) => p.message && toast.error(p.message)
    );

    const types: ActionType[] = [
      "editing",
      "creating",
      "moving",
      "columnCreating",
      "columnEditing",
      "columnMoving",
    ];
    for (const t of types) {
      socket.on(
        `user:${t}`,
        (p: { user: PresenceUser; targetId: string }) =>
          usePresence.getState().setActivity(p.targetId, p.user, t)
      );
      socket.on(
        `user:${t}:stop`,
        (p: { user: PresenceUser; targetId: string }) =>
          usePresence.getState().clearActivity(p.targetId, t)
      );
    }

    return () => {
      socket.emit("board:leave", { boardId });
      socket.off();
      usePresence.getState().reset();
    };
  }, [boardId, publicToken, queryClient, queryKey]);
}
