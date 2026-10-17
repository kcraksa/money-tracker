import Link from "next/link";

export type SegItem<T extends string> = { key: T; label: React.ReactNode; href?: string };

/** Segmented control: penanda putih bergeser mulus ke pilihan aktif. */
export function Segmented<T extends string>({
  items, value, onSelect, label, size = "md",
}: {
  items: SegItem<T>[];
  value: T;
  onSelect?: (key: T) => void;
  label: string;
  size?: "sm" | "md";
}) {
  const idx = Math.max(0, items.findIndex((i) => i.key === value));
  const pad = size === "sm" ? "py-1.5 text-xs" : "py-2.5 text-sm";
  return (
    <div
      role={items[0]?.href ? "tablist" : "group"} aria-label={label}
      className="relative grid rounded-2xl bg-surface-2 p-1"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      <span
        className="seg-thumb" aria-hidden
        style={{ width: `calc((100% - 0.5rem) / ${items.length})`, transform: `translateX(${idx * 100}%)` }}
      />
      {items.map((it) => {
        const on = it.key === value;
        const cls = `relative z-10 flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors duration-200 ${pad} ${
          on ? "text-fg" : "text-muted"
        }`;
        return it.href ? (
          <Link key={it.key} href={it.href} role="tab" aria-selected={on} className={cls} onClick={() => onSelect?.(it.key)}>
            {it.label}
          </Link>
        ) : (
          <button key={it.key} type="button" aria-pressed={on} className={cls} onClick={() => onSelect?.(it.key)}>
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
