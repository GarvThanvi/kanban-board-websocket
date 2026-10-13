import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlignLeft } from "lucide-react";
import { usePresence, activityOf } from "../../stores/presence";
import { Avatar } from "../ui/Avatar";
import { Tooltip } from "../ui/Tooltip";
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
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        boxShadow: editingEntry
          ? `0 0 0 1px ${avatarColor(editingEntry.user.name)}`
          : undefined,
      }}
      className={cn(
        "group relative rounded-lg border border-border bg-surface-2 p-3 transition-colors",
        !readOnly && "cursor-grab hover:border-border-strong",
        readOnly && "cursor-default",
        isDragging && "opacity-40"
      )}
      {...attributes}
      {...listeners}
      onClick={onClick}
    >
      <p className="text-[13.5px] leading-snug">{card.title}</p>
      {card.description && (
        <AlignLeft className="mt-1.5 size-3.5 text-text-faint" />
      )}
      {editingEntry && (
        <div className="absolute -right-1.5 -top-1.5">
          <Tooltip side="bottom" label={`${editingEntry.user.name} is here`}>
            <Avatar name={editingEntry.user.name} size={18} />
          </Tooltip>
        </div>
      )}
    </div>
  );
}
