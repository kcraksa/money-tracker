/** Tanda merek: koin "Rp" dalam kotak bergradasi. */
export function Logo({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Catatan Kita">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#14b8a6" />
          <stop offset="1" stopColor="#134e4a" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill="url(#lg)" />
      <circle cx="32" cy="32" r="19" fill="#fbbf24" />
      <circle cx="32" cy="32" r="15.5" fill="none" stroke="#b45309" strokeWidth="1.5" opacity="0.6" />
      <text x="32" y="37.5" textAnchor="middle" fontSize="15" fontWeight="800" fill="#78350f" fontFamily="system-ui, sans-serif">Rp</text>
    </svg>
  );
}
