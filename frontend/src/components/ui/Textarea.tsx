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
          "min-h-24 h-auto w-full resize-none rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text placeholder:text-text-faint outline-none transition-colors focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-white/10",
          className
        )}
        {...rest}
      />
    </div>
  );
}
