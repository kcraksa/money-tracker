import Link from "next/link";
import { getCtx } from "@/lib/ctx";
import { addMonths, monthLabel, monthStart, todayISO } from "@/lib/date";
import { qty, rupiah } from "@/lib/format";
import { evaluate, lineTotal } from "@/lib/shopping";
import type { ListItem } from "@/lib/types";

export const metadata = { title: "Evaluasi belanja" };

export default async function EvaluasiPage({ searchParams }: { searchParams: Promise<{ bulan?: string }> }) {
  const sp = await searchParams;
  const { supabase, members } = await getCtx();
  const current = monthStart(todayISO());
  const month = sp.bulan && /^\d{4}-\d{2}-01$/.test(sp.bulan) ? sp.bulan : current;
  const nameOf = new Map(members.map((m) => [m.id, m.display_name]));

  const { data: list } = await supabase
    .from("shopping_list").select("id, status, completed_by, completed_at").eq("month", month).maybeSingle();

  const nav = (
    <nav className="flex items-center justify-between" aria-label="Pilih bulan">
      <Link href={`/evaluasi?bulan=${addMonths(month, -1)}`} className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2" aria-label="Bulan sebelumnya">←</Link>
      <h1 className="text-lg font-bold">Evaluasi {monthLabel(month)}</h1>
      {month < current
        ? <Link href={`/evaluasi?bulan=${addMonths(month, 1)}`} className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2" aria-label="Bulan berikutnya">→</Link>
        : <span className="h-11 w-11" />}
    </nav>
  );

  if (!list) {
    return (
      <div className="flex flex-col gap-4">
        {nav}
        <div className="card py-8 text-center text-muted">
          Belum ada checklist belanja bulan ini.
          <div className="mt-3"><Link href="/checklist" className="btn-primary">Ke checklist</Link></div>
        </div>
      </div>
    );
  }

  const [{ data }, xp] = await Promise.all([
    supabase.from("shopping_list_item").select("*").eq("list_id", list.id).order("created_at"),
    supabase.from("xp_event").select("kind, points").in("ref", [`saving:${list.id}`, `bonus:${list.id}`]),
  ]);
  const items = ((data ?? []) as ListItem[]).map((r) => ({
    ...r,
    qty_recommended: Number(r.qty_recommended), qty_bought: Number(r.qty_bought),
    unit_price_est: Number(r.unit_price_est), unit_price_actual: Number(r.unit_price_actual),
  }));
  const ev = evaluate(items);
  const planned = items.filter((i) => !i.is_extra);
  const open = list.status === "open";
  const xpGained = (xp.data ?? []).reduce((s, r) => s + Number(r.points), 0);

  return (
    <div className="flex flex-col gap-4">
      {nav}

      {open && (
        <div role="status" className="rounded-xl bg-warn-bg p-3 text-sm text-warn">
          Belanja belum diselesaikan, ini baru gambaran sementara.{" "}
          <Link href="/checklist" className="font-semibold underline">Lanjut belanja</Link>
        </div>
      )}

      <section className="card text-center" aria-label="Ringkasan">
        <div className="text-sm text-muted">Uang yang dihemat</div>
        <div className="text-4xl font-extrabold text-ok">{rupiah(ev.saving)}</div>
        {!open && (
          <div className="mt-1 text-sm text-muted">
            oleh {nameOf.get(list.completed_by ?? "") ?? "keluarga"}
            {xpGained > 0 && <> · <b className="text-primary">+{xpGained} XP</b></>}
          </div>
        )}
        {ev.withinRecommendation && <div className="mt-2 inline-block rounded-full bg-ok-bg px-3 py-1 text-sm font-semibold text-ok">🛒 Belanja sesuai rekomendasi</div>}
      </section>

      <section className="card grid grid-cols-3 gap-2 text-center" aria-label="Perbandingan total">
        <Stat label="Rekomendasi" value={rupiah(ev.estimateTotal)} />
        <Stat label="Dibeli" value={rupiah(ev.recommendedActual)} />
        <Stat label="Di luar daftar" value={rupiah(ev.extrasTotal)} tone={ev.extrasTotal > 0 ? "warn" : undefined} />
      </section>

      <section aria-label="Rekomendasi vs dibeli">
        <h2 className="mb-2 font-semibold">Rekomendasi vs dibeli</h2>
        <ul className="card divide-y divide-border p-0">
          {planned.map((i) => {
            const skipped = !i.checked;
            const diff = lineTotal(i.qty_recommended, i.unit_price_est) - lineTotal(i.qty_bought, i.unit_price_actual);
            return (
              <li key={i.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{i.name}</div>
                  <div className="text-xs text-muted">
                    rekomendasi {qty(i.qty_recommended)} · {skipped ? "belum dibeli" : `dibeli ${qty(i.qty_bought)} ${i.unit} @ ${rupiah(i.unit_price_actual)}`}
                  </div>
                </div>
                {!skipped && (
                  <span className={`shrink-0 text-sm font-semibold tabular-nums ${diff >= 0 ? "text-ok" : "text-danger"}`}>
                    {diff >= 0 ? "hemat " : "lebih "}{rupiah(Math.abs(diff))}
                  </span>
                )}
              </li>
            );
          })}
          {planned.length === 0 && <li className="px-4 py-3 text-muted">Tidak ada barang yang direkomendasikan.</li>}
        </ul>
      </section>

      {ev.extras.length > 0 && (
        <section aria-label="Di luar daftar">
          <h2 className="mb-2 font-semibold">Barang di luar daftar</h2>
          <ul className="card divide-y divide-border p-0">
            {ev.extras.map((i) => (
              <li key={i.id} className="flex justify-between px-4 py-3">
                <span>{i.name} <span className="text-xs text-muted">{qty(i.qty_bought)} {i.unit}</span></span>
                <span className="tabular-nums">{rupiah(lineTotal(i.qty_bought, i.unit_price_actual))}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!open && ev.notBought.length > 0 && (
        <p className="rounded-xl bg-surface-2 p-3 text-sm text-muted">
          {ev.notBought.length} barang belum terbeli sesuai rekomendasi, jadi tidak dihitung sebagai hemat dan tidak dapat bonus.
        </p>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warn" }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className={`text-sm font-bold tabular-nums ${tone === "warn" ? "text-warn" : ""}`}>{value}</div>
    </div>
  );
}
