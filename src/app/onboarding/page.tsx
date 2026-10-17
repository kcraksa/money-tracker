import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { OnboardingForms } from "./onboarding-forms";

// Bergantung pada sesi pengguna: jangan pernah diprerender.
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  if (!hasSupabaseEnv) redirect("/setup");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Login Google membawa nama lengkap; ambil nama depannya sebagai isian awal.
  const full = String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? "").trim();
  return <OnboardingForms defaultName={full.split(/\s+/)[0] ?? ""} />;
}
