/**
 * Kolom isian dengan label yang selalu terlihat (bukan hanya placeholder yang hilang saat mengetik).
 * Label membungkus kontrolnya, jadi nama aksesibel otomatis diambil dari teks label.
 */
export function Field({
  label, optional, className = "", children,
}: { label: string; optional?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <label className={`flex min-w-0 flex-col ${className}`}>
      <span className="label">
        {label}
        {optional && <span className="font-normal text-muted"> (boleh kosong)</span>}
      </span>
      {children}
    </label>
  );
}
