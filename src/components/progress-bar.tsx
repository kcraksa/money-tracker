export function ProgressBar({
  pct, tone = "primary", label,
}: { pct: number; tone?: "primary" | "ok" | "warn" | "danger"; label?: string }) {
  const color = { primary: "bg-primary", ok: "bg-ok", warn: "bg-warn", danger: "bg-danger" }[tone];
  const v = Math.max(0, Math.min(100, pct));
  return (
    <div
      role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label}
      className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2"
    >
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${v}%` }} />
    </div>
  );
}
