import { create } from "zustand";
import type { ActionType, PresenceUser } from "../lib/types";

const MAX_ENTRIES = 30;

export interface RecentActivity {
  id: string;
  boardId: string;
  user: PresenceUser;
  type: ActionType;
  targetId: string;
  occurredAt: number;
}

interface ActivityLogState {
  entries: RecentActivity[];
  append: (
    boardId: string,
    user: PresenceUser,
    type: ActionType,
    targetId: string
  ) => void;
  clear: (boardId: string) => void;
}

let seq = 0;

// In-memory only: live actions by other collaborators on a board, newest
// first. Cleared when the board session is left. Entries record that an
// action was observed starting, not that it completed.
export const useActivityLog = create<ActivityLogState>((set) => ({
  entries: [],
  append: (boardId, user, type, targetId) =>
    set((s) => {
      const latest = s.entries[0];
      const now = Date.now();
      // coalesce a repeated live action into its previous entry so bursts
      // (re-focus, re-open) don't flood the list
      if (
        latest &&
        latest.boardId === boardId &&
        latest.user.id === user.id &&
        latest.type === type &&
        now - latest.occurredAt < 30_000
      ) {
        const bumped: RecentActivity = { ...latest, occurredAt: now };
        return { entries: [bumped, ...s.entries.slice(1)] };
      }
      const entry: RecentActivity = {
        id: `${now}-${seq++}`,
        boardId,
        user,
        type,
        targetId,
        occurredAt: now,
      };
      return { entries: [entry, ...s.entries].slice(0, MAX_ENTRIES) };
    }),
  clear: (boardId) =>
    set((s) => ({ entries: s.entries.filter((e) => e.boardId !== boardId) })),
}));
