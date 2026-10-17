import { getCtx } from "@/lib/ctx";
import { monthLabel, monthStart, todayISO, weekStart } from "@/lib/date";
import { BADGES, QUESTS, levelInfo, questProgress } from "@/lib/gamification";
import { loadQuestContext } from "@/lib/server/xp";
import type { XpEvent } from "@/lib/types";
import { ProgressBar } from "@/components/progress-bar";

export const metadata = { title: "Pencapaian" };

const DILIGENT: XpEvent["kind"][] = ["log", "streak", "bill"];
const FRUGAL: XpEvent["kind"][] = ["saving", "bonus"];

export default async function PencapaianPage() {
  const { supabase, members } = await getCtx();
  const today = todayISO();
  const month = monthStart(today);
  const ws = weekStart(today);
  const monthStartTs = `${month}T00:00:00+07:00`;

  const [xpRes, badgeRes, quest] = await Promise.all([
    supabase.from("xp_event").select("id, member_id, kind, points, ref, note, created_at").order("created_at", { ascending: false }),
    supabase.from("badge").select("code, period, member_id, earned_at"),
    loadQuestContext(supabase, today),
  ]);
  const events = (xpRes.data ?? []) as (XpEvent & { ref: string })[];
  const totalXp = events.reduce((s, e) => s + e.points, 0);
  const lvl = levelInfo(totalXp);
  const doneRefs = new Set(events.map((e) => e.ref));
  const nameOf = new Map(members.map((m) => [m.id, m.display_name]));

  const thisMonth = events.filter((e) => e.created_at >= monthStartTs);
  const score = (memberId: string, kinds: XpEvent["kind"][], list: typeof events) =>
    list.filter((e) => e.member_id === memberId && kinds.includes(e.kind)).reduce((s, e) => s + e.points, 0);
  const board = members.map((m) => ({
    m,
    rajin: score(m.id, DILIGENT, thisMonth),
    hemat: score(m.id, FRUGAL, thisMonth),
  }));
  const maxPts = Math.max(1, ...board.flatMap((b) => [b.rajin, b.hemat]));
  const frugalWinner = [...board].sort((a, b) => b.hemat - a.hemat)[0];
  const diligentWinner = [...board].sort((a, b) => b.rajin - a.rajin)[0];

  const earned = (badgeRes.data ?? []) as { code: string; period: string; member_id: string | null }[];

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold">Pencapaian</h1>

      <section className="card flex flex-col gap-2" aria-label="Level keluarga">
        <div className="flex items-baseline justify-between">
          <div className="text-3xl font-extrabold">Level {lvl.level}</div>
          <div className="text-sm text-muted">{totalXp} XP bersama</div>
        </div>
        <ProgressBar pct={lvl.pct} label="Progres level" />
        <div className="text-xs text-muted">{lvl.span - lvl.into} XP lagi ke level {lvl.level + 1}</div>
      </section>

      <section aria-label="Papan kontribusi">
        <h2 className="mb-1 font-semibold">Kontribusi {monthLabel(month)}</h2>
        <p className="mb-2 text-sm text-muted">
          Dua jalur: <b>rajin mencatat</b> dan <b>hemat</b> (poin hemat bobotnya lebih besar). Saling menyemangati ya 💚
        </p>
        <div className="card flex flex-col gap-4">
          {board.map(({ m, rajin, hemat }) => (
            <div key={m.id} className="flex flex-col gap-2">
              <div className="font-medium">{m.display_name}</div>
              <Bar label="📝 Rajin" value={rajin} max={maxPts} tone="primary" />
              <Bar label="💰 Hemat" value={hemat} max={maxPts} tone="ok" />
            </div>
          ))}
          {board.every((b) => b.rajin + b.hemat === 0) ? (
            <p className="text-sm text-muted">Belum ada poin bulan ini. Catat satu pengeluaran untuk mulai!</p>
          ) : (
            <p className="rounded-lg bg-surface-2 p-3 text-sm">
              {frugalWinner.hemat > 0 && <>💰 <b>{frugalWinner.m.display_name}</b> lagi juara hemat. </>}
              {diligentWinner.rajin > 0 && <>📝 <b>{diligentWinner.m.display_name}</b> paling rajin mencatat. </>}
              Tim yang hebat!
            </p>
          )}
        </div>
      </section>

      <section aria-label="Badge">
        <h2 className="mb-2 font-semibold">Badge</h2>
        <ul className="grid grid-cols-1 gap-2">
          {BADGES.map((b) => {
            const got = earned.filter((e) => e.code === b.code);
            return (
              <li key={b.code} className={`card flex items-center gap-3 ${got.length ? "" : "opacity-60"}`}>
                <span className={`text-3xl ${got.length ? "" : "grayscale"}`} aria-hidden>{b.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{b.title}</div>
                  <div className="text-xs text-muted">{b.desc}</div>
                  {got.length > 0 && (
                    <div className="mt-1 text-xs font-medium text-ok">
                      Diraih {got.length}× · terakhir {got.map((g) => g.period).sort().at(-1)}
                      {got.at(-1)?.member_id ? ` oleh ${nameOf.get(got.at(-1)!.member_id!) ?? ""}` : ""}
                    </div>
                  )}
                </div>
                {!got.length && <span className="text-xs text-muted">Terkunci</span>}
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-label="Quest minggu ini">
        <h2 className="mb-2 font-semibold">Quest minggu ini (+50 XP tiap quest)</h2>
        <ul className="card flex flex-col gap-4">
          {QUESTS.map((q) => {
            const p = questProgress(q.code, quest);
            const done = doneRefs.has(`quest:${ws}:${q.code}`) || p.done >= p.target;
            return (
              <li key={q.code} className="flex flex-col gap-1.5">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{q.icon} {q.title}</span>
                  <span className={`text-sm ${done ? "font-semibold text-ok" : "text-muted"}`}>{done ? "Selesai ✓" : `${p.done}/${p.target}`}</span>
                </div>
                <p className="text-xs text-muted">{q.desc}</p>
                <ProgressBar pct={(p.done / p.target) * 100} tone={done ? "ok" : "primary"} label={q.title} />
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-label="Riwayat XP">
        <h2 className="mb-2 font-semibold">XP terbaru</h2>
        <ul className="card divide-y divide-border p-0">
          {events.slice(0, 8).map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
              <span className="min-w-0 truncate">
                {e.note ?? e.kind}
                <span className="text-muted"> · {e.member_id ? nameOf.get(e.member_id) : "keluarga"}</span>
              </span>
              <span className="shrink-0 font-semibold text-primary">+{e.points}</span>
            </li>
          ))}
          {events.length === 0 && <li className="px-4 py-3 text-muted">Belum ada XP.</li>}
        </ul>
      </section>
    </div>
  );
}

function Bar({ label, value, max, tone }: { label: string; value: number; max: number; tone: "primary" | "ok" }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-xs text-muted">{label}</span>
      <div className="flex-1"><ProgressBar pct={(value / max) * 100} tone={tone} label={label} /></div>
      <span className="w-10 text-right text-sm font-semibold tabular-nums">{value}</span>
    </div>
  );
}
