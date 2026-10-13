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
          "w-full rounded-lg bg-surface-2 border border-border px-3 h-9 text-sm text-text placeholder:text-text-faint outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20",
          className
        )}
        {...rest}
      />
    </div>
  );
}
