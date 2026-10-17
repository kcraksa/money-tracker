import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { OnboardingForms } from "./onboarding-forms";

// Bergantung pada sesi pengguna: jangan pernah diprerender.
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  if (!hasSupabaseEnv) redirect("/setup");
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/login");

  // Login Google membawa nama lengkap; ambil nama depannya sebagai isian awal.
  const meta = (claims.user_metadata ?? {}) as { full_name?: string; name?: string };
  const full = String(meta.full_name ?? meta.name ?? "").trim();
  return <OnboardingForms defaultName={full.split(/\s+/)[0] ?? ""} />;
}
