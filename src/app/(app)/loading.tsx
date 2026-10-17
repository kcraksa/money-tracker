// Kerangka sementara saat data halaman dimuat (terasa lebih cepat daripada layar kosong).
export default function Loading() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Memuat">
      <div className="skeleton h-9 w-2/3" />
      <div className="skeleton h-40 rounded-3xl" />
      <div className="skeleton h-24" />
      <div className="skeleton h-24" />
      <div className="skeleton h-24" />
    </div>
  );
}
