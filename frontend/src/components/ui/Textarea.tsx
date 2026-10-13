import { cn } from "../../lib/utils";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function Textarea({ label, className, id, ...rest }: TextareaProps) {
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={id}
          className="mb-1.5 block text-[13px] font-medium text-text-muted"
        >
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={cn(
          "w-full rounded-lg bg-surface-2 border border-border px-3 py-2 min-h-20 text-sm text-text placeholder:text-text-faint outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20 h-auto resize-none",
          className
        )}
        {...rest}
      />
    </div>
  );
}
