export function EmptyState({
  icon, title, children,
}: { icon: React.ReactNode; title: string; children?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft text-primary">{icon}</div>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </div>
  );
}
