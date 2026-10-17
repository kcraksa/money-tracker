import { BottomNav } from "@/components/bottom-nav";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { getCtx } from "@/lib/ctx";

// Semua halaman di sini bergantung pada sesi & data rumah tangga: jangan pernah diprerender.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { householdId } = await getCtx();
  return (
    <>
      <div className="mx-auto w-full max-w-md px-4 pb-32 pt-5">{children}</div>
      <BottomNav />
      <RealtimeRefresh householdId={householdId} />
    </>
  );
}
