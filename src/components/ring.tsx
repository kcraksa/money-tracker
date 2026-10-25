/** Cincin progres untuk level: persen terisi di sekeliling angka level. */
export function Ring({
  pct, children, size = 84, tone = "white",
}: { pct: number; children: React.ReactNode; size?: number; tone?: "white" | "primary" }) {
  const stroke = size < 72 ? 6 : 7;
  const track = tone === "white" ? "rgb(255 255 255 / 0.22)" : "var(--surface-2)";
  const fill = tone === "white" ? "white" : "var(--primary)";
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, pct));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={fill} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className={`absolute inset-0 flex flex-col items-center justify-center ${tone === "white" ? "text-white" : "text-fg"}`}>{children}</div>
    </div>
  );
}
