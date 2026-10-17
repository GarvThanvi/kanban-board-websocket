import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlignLeft } from "lucide-react";
import { usePresence, activityOf } from "../../stores/presence";
import { ActivityBadge } from "./ActivityBadge";
import { activityLabel } from "../../lib/activity";
import { avatarColor, cn } from "../../lib/utils";
import type { Card } from "../../lib/types";

export function CardView({
  card,
  columnId,
  readOnly,
  onClick,
}: {
  card: Card;
  columnId: string;
  readOnly?: boolean;
  onClick: () => void;
}) {
  const activity = usePresence((s) => s.activity);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: { type: "card", columnId },
    disabled: !!readOnly,
  });

  const editingEntry =
    activityOf(activity, "editing", card.id) ??
    activityOf(activity, "moving", card.id);

  return (
    <div
      ref={setNodeRef}
      data-card-id={card.id}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        boxShadow: editingEntry
          ? `0 0 0 1px ${avatarColor(editingEntry.user.name)}`
          : undefined,
      }}
      className={cn(
        "group relative w-full rounded-[8px] border border-border bg-surface-2 p-3 text-left transition-colors",
        !readOnly && "cursor-grab hover:border-border-strong hover:bg-surface-3",
        readOnly && "cursor-default",
        isDragging && "opacity-40"
      )}
      {...attributes}
      {...listeners}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <p className="text-[13.5px] leading-snug">{card.title}</p>
      {card.description && (
        <AlignLeft className="mt-1.5 size-3.5 text-text-faint" />
      )}
      {editingEntry && (
        <div className="mt-2">
          <ActivityBadge
            user={editingEntry.user}
            label={activityLabel(editingEntry.type)}
          />
        </div>
      )}
    </div>
  );
}
