import { create } from "zustand";
import type { ActionType, PresenceUser } from "../lib/types";

interface PresenceState {
  users: PresenceUser[];
  activity: Record<string, { user: PresenceUser; type: ActionType }>;
  setPresence: (users: PresenceUser[]) => void;
  setActivity: (targetId: string, user: PresenceUser, type: ActionType) => void;
  clearActivity: (targetId: string, type: ActionType) => void;
  reset: () => void;
}

export const usePresence = create<PresenceState>((set) => ({
  users: [],
  activity: {},
  setPresence: (users) => set({ users }),
  setActivity: (targetId, user, type) =>
    set((s) => ({
      activity: { ...s.activity, [`${type}:${targetId}`]: { user, type } },
    })),
  clearActivity: (targetId, type) =>
    set((s) => {
      const next = { ...s.activity };
      delete next[`${type}:${targetId}`];
      return { activity: next };
    }),
  reset: () => set({ users: [], activity: {} }),
}));

export function activityOf(
  activity: Record<string, { user: PresenceUser; type: ActionType }>,
  type: ActionType,
  targetId: string
) {
  return activity[`${type}:${targetId}`];
}
