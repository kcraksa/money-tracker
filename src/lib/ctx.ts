import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import type { Member } from "@/lib/types";

/** Konteks request: klien Supabase, akun yang login, dan anggota rumah tangganya. */
export const getCtx = cache(async () => {
  if (!hasSupabaseEnv) redirect("/setup");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: members } = await supabase
    .from("member")
    .select("id, user_id, display_name, household_id")
    .order("created_at");
  const all = (members ?? []) as Member[];
  const me = all.find((m) => m.user_id === user.id);
  if (!me) redirect("/onboarding");

  return { supabase, user, me, members: all, householdId: me.household_id };
});
