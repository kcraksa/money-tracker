export function ProgressBar({
  pct, tone = "primary", label, size = "md",
}: { pct: number; tone?: "primary" | "ok" | "warn" | "danger"; label?: string; size?: "sm" | "md" }) {
  const color = { primary: "bg-primary", ok: "bg-ok", warn: "bg-warn", danger: "bg-danger" }[tone];
  const v = Math.max(0, Math.min(100, pct));
  return (
    <div
      role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label}
      className={`w-full overflow-hidden rounded-full bg-surface-2 ${size === "sm" ? "h-1.5" : "h-2.5"}`}
    >
      <div className={`h-full rounded-full ${color} transition-[width] duration-500`} style={{ width: `${v}%` }} />
    </div>
  );
}
