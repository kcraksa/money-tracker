import { BottomNav } from "@/components/bottom-nav";
import { PullToRefresh } from "@/components/pull-to-refresh";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { RememberModule } from "@/components/remember-module";
import { getCtx } from "@/lib/ctx";
import { readSimpleMode } from "@/lib/server/simple-mode";

// Semua halaman di sini bergantung pada sesi & data rumah tangga: jangan pernah diprerender.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [{ householdId }, simple] = await Promise.all([getCtx(), readSimpleMode()]);
  return (
    <>
      <main className="mx-auto w-full max-w-md px-4 pb-36 pt-[max(env(safe-area-inset-top),1.25rem)]">
        <PullToRefresh>{children}</PullToRefresh>
      </main>
      <RememberModule module="keuangan" />
      <BottomNav hide={simple ? ["/pencapaian"] : []} />
      <RealtimeRefresh householdId={householdId} />
    </>
  );
}
