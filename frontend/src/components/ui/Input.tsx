import { cn } from "../../lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className, id, ...rest }: InputProps) {
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
      <input
        id={id}
        className={cn(
          "h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm text-text placeholder:text-text-faint outline-none transition-colors focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-white/10",
          className
        )}
        {...rest}
      />
    </div>
  );
}
