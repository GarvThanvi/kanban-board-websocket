export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-[9px] border border-border bg-white/[0.035]"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        width={size * 0.62}
        height={size * 0.62}
        viewBox="0 0 20 20"
        fill="none"
      >
        <path
          d="M3 5.5h4.4c2.1 0 2.1 4.5 4.2 4.5H17M3 14.5h2.4c2.1 0 2.1-4.5 4.2-4.5H17"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <circle cx="16.8" cy="5.5" r="1.2" fill="currentColor" />
      </svg>
    </span>
  );
}
