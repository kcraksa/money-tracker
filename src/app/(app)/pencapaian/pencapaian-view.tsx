import { Check, Crown, KeyIcon, Lock, PiggyBank, NotebookPen, Sparkles } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { ProgressBar } from "@/components/progress-bar";
import { Ring } from "@/components/ring";
import { levelInfo } from "@/lib/gamification";

export type PencapaianProps = {
  monthLabel: string;
  totalXp: number;
  board: { id: string; name: string; rajin: number; hemat: number }[];
  badges: { code: string; icon: string; title: string; desc: string; times: number; last: string | null; by: string | null }[];
  quests: { code: string; title: string; desc: string; icon: string; done: number; target: number; complete: boolean }[];
  history: { id: string; note: string; who: string; points: number }[];
};

export function PencapaianView(p: PencapaianProps) {
  const lvl = levelInfo(p.totalXp);
  const maxPts = Math.max(1, ...p.board.flatMap((b) => [b.rajin, b.hemat]));
  const frugal = [...p.board].sort((a, b) => b.hemat - a.hemat)[0];
  const diligent = [...p.board].sort((a, b) => b.rajin - a.rajin)[0];
  const empty = p.board.every((b) => b.rajin + b.hemat === 0);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Prestasi" subtitle="Poin, lencana, dan siapa paling rajin & hemat" />

      <section
        aria-label="Level keluarga"
        className="relative flex items-center gap-4 overflow-hidden rounded-3xl bg-gradient-to-br from-hero-from to-hero-to p-5 text-white shadow-float"
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" aria-hidden />
        <Ring pct={lvl.pct} size={88}>
          <span className="text-xs font-semibold uppercase tracking-wider opacity-90">Level</span>
          <span className="text-3xl font-extrabold leading-none">{lvl.level}</span>
        </Ring>
        <div className="relative">
          <div className="text-2xl font-bold tracking-tight">{p.totalXp.toLocaleString("id-ID")} poin</div>
          <div className="text-sm opacity-90">dikumpulkan bersama · {lvl.span - lvl.into} poin lagi ke level {lvl.level + 1}</div>
        </div>
      </section>

      <section aria-labelledby="kontribusi-h">
        <h2 id="kontribusi-h" className="section-title">Poin {p.monthLabel}</h2>
        <div className="card flex flex-col gap-5">
          {p.board.map((b) => (
            <div key={b.id} className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-sm font-bold uppercase text-primary" aria-hidden>
                  {b.name.slice(0, 1)}
                </span>
                <span className="font-semibold">{b.name}</span>
              </div>
              <Bar icon={<NotebookPen className="h-3.5 w-3.5" aria-hidden />} label="Rajin" value={b.rajin} max={maxPts} tone="primary" who={b.name} />
              <Bar icon={<PiggyBank className="h-3.5 w-3.5" aria-hidden />} label="Hemat" value={b.hemat} max={maxPts} tone="ok" who={b.name} />
            </div>
          ))}
          <p className="rounded-xl bg-surface-2 p-3 text-sm text-muted">
            {empty ? (
              "Belum ada poin bulan ini. Catat satu pengeluaran untuk mulai!"
            ) : (
              <>
                {frugal.hemat > 0 && <><Crown className="mr-1 inline h-4 w-4 text-accent" aria-hidden /><b className="text-fg">{frugal.name}</b> lagi juara hemat. </>}
                {diligent.rajin > 0 && <><b className="text-fg">{diligent.name}</b> paling rajin mencatat. </>}
                Tim yang hebat!
              </>
            )}
          </p>
          <p className="-mt-2 text-sm text-muted">Rajin = poin dari mencatat. Hemat = poin dari belanja lebih murah dari perkiraan; nilainya lebih besar.</p>
        </div>
      </section>

      <section aria-labelledby="lencana-h">
        <h2 id="lencana-h" className="section-title">Lencana</h2>
        <ul className="flex flex-col gap-2.5">
          {p.badges.map((b) => {
            const got = b.times > 0;
            return (
              <li key={b.code} className={`card flex items-center gap-3.5 p-3.5 ${got ? "" : "bg-surface-2/60"}`}>
                <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
                  got ? "bg-gradient-to-br from-hero-from to-hero-to text-white shadow-card" : "bg-surface-2 text-muted"
                }`}>
                  {got ? <KeyIcon name={b.icon} className="h-7 w-7" /> : <Lock className="h-6 w-6" aria-hidden />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className={`font-semibold ${got ? "" : "text-muted"}`}>{b.title}</div>
                  <div className="text-sm text-muted">{b.desc}</div>
                  {!got && <div className="sr-only">Belum diraih</div>}
                  {got && (
                    <div className="mt-1.5 text-xs font-semibold text-ok">
                      Diraih {b.times}× · terakhir {b.last}{b.by ? ` oleh ${b.by}` : ""}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="tantangan-h">
        <h2 id="tantangan-h" className="section-title">
          <span>Tantangan minggu ini</span>
          <span className="pill bg-accent-soft text-warn"><Sparkles className="h-3.5 w-3.5" aria-hidden /> +50 poin</span>
        </h2>
        <ul className="card divide-y divide-border p-0">
          {p.quests.map((q) => (
            <li key={q.code} className="flex items-center gap-3 px-4 py-3.5">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${q.complete ? "bg-ok-bg text-ok" : "bg-primary-soft text-primary"}`}>
                {q.complete ? <Check className="h-5 w-5" aria-hidden /> : <KeyIcon name={q.icon} className="h-5 w-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-semibold">{q.title}</span>
                  <span className={`shrink-0 text-xs font-semibold tabular-nums ${q.complete ? "text-ok" : "text-muted"}`}>
                    {q.complete ? "Selesai" : `${q.done} dari ${q.target}`}
                  </span>
                </div>
                <p className="text-sm text-muted">{q.desc}</p>
                <div className="mt-2"><ProgressBar size="sm" pct={(q.done / q.target) * 100} tone={q.complete ? "ok" : "primary"} label={q.title} /></div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="riwayat-poin-h">
        <h2 id="riwayat-poin-h" className="section-title">Poin terbaru</h2>
        <ul className="card divide-y divide-border p-0">
          {p.history.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="min-w-0 truncate">
                <span className="font-medium">{e.note}</span>
                <span className="text-muted"> · {e.who}</span>
              </span>
              <span className="pill shrink-0 bg-primary-soft text-primary">+{e.points} poin</span>
            </li>
          ))}
          {p.history.length === 0 && <li className="px-4 py-3 text-sm text-muted">Belum ada poin. Catat pengeluaran untuk mulai mengumpulkan.</li>}
        </ul>
      </section>
    </div>
  );
}

function Bar({
  icon, label, value, max, tone, who,
}: { icon: React.ReactNode; label: string; value: number; max: number; tone: "primary" | "ok"; who: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex w-16 shrink-0 items-center gap-1.5 text-sm text-muted">{icon}{label}</span>
      <div className="flex-1"><ProgressBar pct={(value / max) * 100} tone={tone} label={`Poin ${label.toLowerCase()} ${who}`} size="sm" /></div>
      <span className="w-9 text-right text-sm font-bold tabular-nums">{value}</span>
    </div>
  );
}
