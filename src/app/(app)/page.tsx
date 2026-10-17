import Link from "next/link";
import { getCtx } from "@/lib/ctx";
import { addDays, dayOfMonth, daysInMonth, monthLabel, monthStart, todayISO, weekStart } from "@/lib/date";
import { forecast } from "@/lib/forecast";
import { rupiah } from "@/lib/format";
import { QUESTS, computeStreak, levelInfo, questProgress } from "@/lib/gamification";
import { loadQuestContext } from "@/lib/server/xp";
import type { Category } from "@/lib/types";
import { ProgressBar } from "@/components/progress-bar";
import { ThemeToggle } from "@/components/theme-toggle";
import { BillRow } from "./bill-row";

export const metadata = { title: "Beranda" };

const TONE = { ok: "ok", warn: "warn", over: "danger", nobudget: "primary" } as const;

export default async function BerandaPage() {
  const { supabase, me } = await getCtx();
  const today = todayISO();
  const month = monthStart(today);

  const [cats, budgets, monthExp, bills, xp, days, quest] = await Promise.all([
    supabase.from("category").select("id, name, icon, kind, lump_sum, due_day, sort_order").order("sort_order"),
    supabase.from("budget").select("category_id, amount"),
    supabase.from("expense").select("category_id, amount").gte("spent_on", month).lte("spent_on", today),
    supabase.from("bill_payment").select("category_id, paid_on, on_time").eq("month", month),
    supabase.from("xp_event").select("points, ref"),
    supabase.from("expense").select("spent_on").gte("spent_on", addDays(today, -120)),
    loadQuestContext(supabase, today),
  ]);

  const categories = (cats.data ?? []) as Category[];
  const budgetOf = new Map((budgets.data ?? []).map((b) => [b.category_id as string, Number(b.amount)]));
  const spentOf = new Map<string, number>();
  for (const e of monthExp.data ?? []) {
    spentOf.set(e.category_id, (spentOf.get(e.category_id) ?? 0) + Number(e.amount));
  }
  const paidOf = new Map((bills.data ?? []).map((b) => [b.category_id as string, b]));

  const totalXp = (xp.data ?? []).reduce((s, r) => s + Number(r.points), 0);
  const lvl = levelInfo(totalXp);
  const dates = (days.data ?? []).map((d) => d.spent_on as string);
  const streak = computeStreak(dates, today);
  const loggedToday = dates.includes(today);

  const daily = categories.filter((c) => c.kind === "daily");
  const fixed = categories.filter((c) => c.kind === "fixed");
  const rows = daily.map((c) => ({
    c,
    f: forecast({ spent: spentOf.get(c.id) ?? 0, budget: budgetOf.get(c.id) ?? 0, today, lumpSum: c.lump_sum }),
  }));
  const alerts = rows.filter((r) => r.f.status === "warn" || r.f.status === "over");
  const noBudgets = rows.every((r) => r.f.budget === 0);

  const ws = weekStart(today);
  const doneRefs = new Set((xp.data ?? []).map((r) => r.ref as string));

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">{monthLabel(month)} · hari ke-{dayOfMonth(today)}/{daysInMonth(today)}</p>
          <h1 className="text-xl font-bold">Halo, {me.display_name} 👋</h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/pengaturan" aria-label="Pengaturan" className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-lg">⚙️</Link>
        </div>
      </header>

      <section className="card flex flex-col gap-3" aria-label="Level keluarga">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted">Level keluarga</div>
            <div className="text-3xl font-extrabold">Lv {lvl.level}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">🔥 {streak}</div>
            <div className="text-xs text-muted">hari berturut-turut</div>
          </div>
        </div>
        <ProgressBar pct={lvl.pct} label="Progres level" />
        <div className="flex justify-between text-xs text-muted">
          <span>{lvl.into} / {lvl.span} XP ke level berikutnya</span>
          <span>{totalXp} XP</span>
        </div>
        {!loggedToday && (
          <Link href="/catat" className="btn-primary">
            {streak > 0 ? `Catat hari ini, jaga streak ${streak} hari 🔥` : "Catat pengeluaran pertama hari ini"}
          </Link>
        )}
      </section>

      {alerts.length > 0 && (
        <section aria-label="Peringatan" className="flex flex-col gap-2">
          {alerts.map(({ c, f }) => (
            <div
              key={c.id} role="alert"
              className={`rounded-xl p-3 text-sm ${f.status === "over" ? "bg-danger-bg text-danger" : "bg-warn-bg text-warn"}`}
            >
              {f.status === "over"
                ? <><b>{c.icon} {c.name}</b> sudah melewati budget {rupiah(f.spent - f.budget)}.</>
                : <><b>{c.icon} {c.name}</b>: proyeksi akhir bulan {rupiah(f.projected)}, budget {rupiah(f.budget)}.</>}
            </div>
          ))}
        </section>
      )}

      <section aria-label="Sisa budget">
        <h2 className="mb-2 font-semibold">Sisa budget bulan ini</h2>
        {noBudgets && (
          <Link href="/pengaturan" className="card mb-2 block text-sm text-muted underline">
            Budget belum diisi. Atur dulu supaya sisa dan forecast muncul →
          </Link>
        )}
        <ul className="card flex flex-col gap-4">
          {rows.map(({ c, f }) => (
            <li key={c.id} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium">{c.icon} {c.name}</span>
                <span className={`text-sm tabular-nums ${f.status === "over" ? "font-semibold text-danger" : "text-muted"}`}>
                  {f.status === "nobudget"
                    ? `${rupiah(f.spent)} terpakai`
                    : f.remaining >= 0 ? `sisa ${rupiah(f.remaining)}` : `lebih ${rupiah(-f.remaining)}`}
                </span>
              </div>
              <ProgressBar
                label={`Pemakaian ${c.name}`}
                pct={f.budget > 0 ? (f.spent / f.budget) * 100 : 0}
                tone={TONE[f.status]}
              />
              {f.budget > 0 && (
                <div className="flex justify-between text-xs text-muted">
                  <span>{rupiah(f.spent)} / {rupiah(f.budget)}</span>
                  {!c.lump_sum && f.spent > 0 && <span>proyeksi {rupiah(f.projected)}</span>}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      {fixed.length > 0 && (
        <section aria-label="Tagihan tetap">
          <h2 className="mb-2 font-semibold">Tagihan tetap</h2>
          <ul className="card divide-y divide-border p-0">
            {fixed.map((c) => {
              const paid = paidOf.get(c.id);
              return (
                <BillRow
                  key={c.id} categoryId={c.id} name={c.name} icon={c.icon}
                  amount={budgetOf.get(c.id) ?? 0} dueDay={c.due_day}
                  paid={paid ? { onTime: Boolean(paid.on_time), paidOn: paid.paid_on as string } : null}
                />
              );
            })}
          </ul>
        </section>
      )}

      <section aria-label="Quest minggu ini">
        <h2 className="mb-2 font-semibold">Quest minggu ini</h2>
        <ul className="card flex flex-col gap-4">
          {QUESTS.map((q) => {
            const p = questProgress(q.code, quest);
            const done = doneRefs.has(`quest:${ws}:${q.code}`) || p.done >= p.target;
            return (
              <li key={q.code} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{q.icon} {q.title}</span>
                  <span className={`text-sm ${done ? "font-semibold text-ok" : "text-muted"}`}>
                    {done ? "Selesai ✓" : `${p.done}/${p.target}`}
                  </span>
                </div>
                <ProgressBar pct={(p.done / p.target) * 100} tone={done ? "ok" : "primary"} label={q.title} />
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
