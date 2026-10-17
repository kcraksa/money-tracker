import { getCtx } from "@/lib/ctx";
import { todayISO, weekStart } from "@/lib/date";
import { periodLabel, resolvePeriod } from "@/lib/period";
import { loadPeriodContext } from "@/lib/server/period";
import { BADGES, QUESTS, questProgress } from "@/lib/gamification";
import { loadQuestContext } from "@/lib/server/xp";
import type { XpEvent } from "@/lib/types";
import { PencapaianView } from "./pencapaian-view";

export const metadata = { title: "Pencapaian" };

const DILIGENT: XpEvent["kind"][] = ["log", "streak", "bill"];
const FRUGAL: XpEvent["kind"][] = ["saving", "bonus"];

export default async function PencapaianPage() {
  const { supabase, members } = await getCtx();
  const today = todayISO();
  const { starts, period } = await loadPeriodContext(supabase, today);
  const ws = weekStart(today);
  const periodStartTs = `${period.start}T00:00:00+07:00`;

  const [xpRes, badgeRes, quest] = await Promise.all([
    supabase.from("xp_event").select("id, member_id, kind, points, ref, note, created_at").order("created_at", { ascending: false }),
    supabase.from("badge").select("code, period, member_id"),
    loadQuestContext(supabase, today),
  ]);
  const events = (xpRes.data ?? []) as (XpEvent & { ref: string })[];
  const doneRefs = new Set(events.map((e) => e.ref));
  const nameOf = new Map(members.map((m) => [m.id, m.display_name]));

  const thisMonth = events.filter((e) => e.created_at >= periodStartTs);
  const score = (memberId: string, kinds: XpEvent["kind"][]) =>
    thisMonth.filter((e) => e.member_id === memberId && kinds.includes(e.kind)).reduce((s, e) => s + e.points, 0);

  const earned = (badgeRes.data ?? []) as { code: string; period: string; member_id: string | null }[];

  return (
    <PencapaianView
      monthLabel={periodLabel(period)}
      totalXp={events.reduce((s, e) => s + e.points, 0)}
      board={members.map((m) => ({ id: m.id, name: m.display_name, rajin: score(m.id, DILIGENT), hemat: score(m.id, FRUGAL) }))}
      badges={BADGES.map((b) => {
        const got = earned.filter((e) => e.code === b.code).sort((a, c) => a.period.localeCompare(c.period));
        const last = got.at(-1);
        return {
          code: b.code, icon: b.icon, title: b.title, desc: b.desc, times: got.length,
          last: last ? periodLabel(resolvePeriod(starts, last.period)) : null, by: last?.member_id ? (nameOf.get(last.member_id) ?? null) : null,
        };
      })}
      quests={QUESTS.map((q) => {
        const p = questProgress(q.code, quest);
        return {
          code: q.code, title: q.title, desc: q.desc, icon: q.icon, done: p.done, target: p.target,
          complete: doneRefs.has(`quest:${ws}:${q.code}`) || p.done >= p.target,
        };
      })}
      history={events.slice(0, 8).map((e) => ({
        id: e.id, note: e.note ?? e.kind, who: e.member_id ? (nameOf.get(e.member_id) ?? "") : "keluarga", points: e.points,
      }))}
    />
  );
}
