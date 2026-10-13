import type { ActionType } from "./types";

const LABELS: Record<ActionType, string> = {
  editing: "is editing",
  moving: "is moving",
  creating: "is adding a card",
  columnEditing: "is renaming",
  columnMoving: "is moving the column",
  columnCreating: "is adding a column",
};

export function activityLabel(type: ActionType): string {
  return LABELS[type];
}
