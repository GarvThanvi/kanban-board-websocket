import { CircleAlert, CircleCheck, X } from "lucide-react";
import { useToasts } from "../../stores/toast";

export function Toaster() {
  const { toasts, dismiss } = useToasts();
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-sm shadow-xl text-left"
        >
          {t.kind === "success" ? (
            <CircleCheck className="size-4 shrink-0 text-emerald-400" />
          ) : (
            <CircleAlert className="size-4 shrink-0 text-danger" />
          )}
          <span className="text-text">{t.message}</span>
          <X className="size-3.5 text-text-faint" />
        </button>
      ))}
    </div>
  );
}
