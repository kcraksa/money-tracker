import { getCtx } from "@/lib/ctx";
import { todayISO } from "@/lib/date";
import type { Category } from "@/lib/types";
import { CatatForm } from "./catat-form";
import { RecentList } from "./recent-list";

export const metadata = { title: "Catat" };

export default async function CatatPage() {
  const { supabase, members, me } = await getCtx();

  const [cats, quicks, recent] = await Promise.all([
    supabase.from("category").select("id, name, icon, kind, lump_sum, due_day, sort_order")
      .eq("kind", "daily").order("sort_order"),
    supabase.from("quick_expense").select("id, label, amount, category_id").order("created_at"),
    supabase.from("expense").select("id, amount, spent_on, member_id, category_id, note")
      .order("created_at", { ascending: false }).limit(6),
  ]);

  const categories = (cats.data ?? []) as Category[];
  const catById = new Map(categories.map((c) => [c.id, c]));
  const nameOf = new Map(members.map((m) => [m.id, m.display_name]));

  const quickList = (quicks.data ?? [])
    .filter((q) => catById.has(q.category_id))
    .map((q) => ({
      id: q.id as string,
      label: q.label as string,
      amount: Number(q.amount),
      categoryId: q.category_id as string,
      icon: catById.get(q.category_id)!.icon,
    }));

  // Catatan terakhir bisa berisi kategori tagihan tetap, jadi ambil namanya terpisah.
  const { data: allCats } = await supabase.from("category").select("id, name, icon");
  const anyCat = new Map((allCats ?? []).map((c) => [c.id as string, c]));
  const recentRows = (recent.data ?? []).map((e) => ({
    id: e.id as string,
    amount: Number(e.amount),
    spentOn: e.spent_on as string,
    who: nameOf.get(e.member_id) ?? "?",
    mine: e.member_id === me.id,
    category: (anyCat.get(e.category_id)?.name as string) ?? "?",
    icon: (anyCat.get(e.category_id)?.icon as string) ?? "💸",
  }));

  return (
    <div className="flex flex-col gap-5">
      <CatatForm categories={categories} quicks={quickList} today={todayISO()} />
      <RecentList rows={recentRows} today={todayISO()} />
    </div>
  );
}
