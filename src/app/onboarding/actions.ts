"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type OnboardingState = { error?: string };

export async function createHousehold(_: OnboardingState, form: FormData): Promise<OnboardingState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_household", {
    p_name: String(form.get("name") ?? ""),
    p_display_name: String(form.get("display_name") ?? ""),
  });
  if (error) return { error: error.message };
  redirect("/pengaturan?baru=1");
}

export async function joinHousehold(_: OnboardingState, form: FormData): Promise<OnboardingState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("join_household", {
    p_code: String(form.get("code") ?? ""),
    p_display_name: String(form.get("display_name") ?? ""),
  });
  if (error) return { error: error.message };
  redirect("/");
}
