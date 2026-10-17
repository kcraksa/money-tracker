import { getCtx } from "@/lib/ctx";
import { addDays, todayISO } from "@/lib/date";
import { frequentExpenses } from "@/lib/frequent";
import type { Category } from "@/lib/types";
import { CatatForm } from "./catat-form";
import { RecentList } from "./recent-list";

export const metadata = { title: "Catat" };

export default async function CatatPage() {
  const { supabase, members, me } = await getCtx();

  const today = todayISO();
  const [cats, quicks, recent, history] = await Promise.all([
    supabase.from("category").select("id, name, icon, kind, lump_sum, due_day, sort_order")
      .eq("kind", "daily").eq("active", true).order("sort_order"),
    supabase.from("quick_expense").select("id, label, amount, category_id").order("created_at"),
    supabase.from("expense").select("id, amount, spent_on, member_id, category_id, note")
      .order("created_at", { ascending: false }).limit(6),
    // Dasar pills "sering dicatat": pengeluaran 90 hari terakhir milik rumah tangga ini.
    supabase.from("expense").select("category_id, amount, note, spent_on")
      .gte("spent_on", addDays(today, -90)).order("spent_on", { ascending: false }).limit(600),
  ]);

  const categories = (cats.data ?? []) as Category[];
  const catById = new Map(categories.map((c) => [c.id, c]));
  const nameOf = new Map(members.map((m) => [m.id, m.display_name]));

  // Tombol cepat tetap (diatur di Pengaturan) lebih dulu, lalu yang otomatis dari kebiasaan.
  const pinned = (quicks.data ?? [])
    .filter((q) => catById.has(q.category_id))
    .map((q) => ({
      id: `pin:${q.id}`,
      label: q.label as string,
      amount: Number(q.amount),
      categoryId: q.category_id as string,
      icon: catById.get(q.category_id)!.icon,
      note: null as string | null,
      pinned: true,
    }));
  const auto = frequentExpenses((history.data ?? []) as { category_id: string; amount: number; note: string | null; spent_on: string }[], {
    categories: new Set(catById.keys()), limit: 6,
  })
    .filter((f) => !pinned.some((p) => p.categoryId === f.categoryId && p.amount === f.amount))
    .map((f) => ({
      id: `auto:${f.categoryId}:${f.amount}:${f.note ?? ""}`,
      label: f.note ?? catById.get(f.categoryId)!.name,
      amount: f.amount,
      categoryId: f.categoryId,
      icon: catById.get(f.categoryId)!.icon,
      note: f.note,
      pinned: false,
    }));
  const quickList = [...pinned, ...auto];

  // Catatan terakhir bisa berisi kategori tagihan tetap, jadi ambil namanya terpisah.
  const { data: allCats } = await supabase.from("category").select("id, name, icon");
  const anyCat = new Map((allCats ?? []).map((c) => [c.id as string, c]));
  const recentRows = (recent.data ?? []).map((e) => ({
    id: e.id as string,
    amount: Number(e.amount),
    spentOn: e.spent_on as string,
    note: (e.note as string | null) ?? null,
    who: nameOf.get(e.member_id) ?? "?",
    mine: e.member_id === me.id,
    category: (anyCat.get(e.category_id)?.name as string) ?? "?",
    icon: (anyCat.get(e.category_id)?.icon as string) ?? "💸",
  }));

  return (
    <div className="flex flex-col gap-5">
      <CatatForm categories={categories} quicks={quickList} today={today} />
      <RecentList rows={recentRows} today={today} />
    </div>
  );
}
