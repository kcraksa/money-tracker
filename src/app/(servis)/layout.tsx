import { PullToRefresh } from "@/components/pull-to-refresh";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { RememberModule } from "@/components/remember-module";
import { ServisNav } from "@/components/servis-nav";
import { getCtx } from "@/lib/ctx";

// Bergantung pada sesi & data kendaraan: jangan pernah diprerender.
export const dynamic = "force-dynamic";

export default async function ServisLayout({ children }: { children: React.ReactNode }) {
  const { householdId } = await getCtx();
  return (
    <>
      <main className="mx-auto w-full max-w-md px-4 pb-36 pt-[max(env(safe-area-inset-top),1.25rem)]">
        <PullToRefresh>{children}</PullToRefresh>
      </main>
      <RememberModule module="servis" />
      <ServisNav />
      <RealtimeRefresh householdId={householdId} />
    </>
  );
}
