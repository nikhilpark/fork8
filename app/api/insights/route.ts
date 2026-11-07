import { NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { db } from "@/db";
import { goals, profiles, weightEntries } from "@/db/schema";
import { buildInsights, dateStr } from "@/lib/insights";

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const Query = z.object({
  range: z.coerce.number().refine((n) => [7, 30, 90].includes(n)).optional(),
  from: z.string().regex(ISO).optional(),
  to: z.string().regex(ISO).optional(),
  tz: z.string().default("Asia/Hong_Kong"),
});

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const sp = new URL(req.url).searchParams;
    const q = Query.parse({
      range: sp.get("range") ?? undefined,
      from: sp.get("from") ?? undefined,
      to: sp.get("to") ?? undefined,
      tz: sp.get("tz") ?? undefined,
    });
    const { tz } = q;

    const today = dateStr(0, tz);
    let from: string, to: string;
    if (q.from && q.to) {
      from = q.from; to = q.to;
      if (from > to || to > today || from < dateStr(364, tz)) {
        return NextResponse.json({ error: "Pick a range within the last year" }, { status: 400 });
      }
    } else {
      to = today;
      from = dateStr((q.range ?? 7) - 1, tz);
    }

    const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.id));
    const [goal] = await db.select().from(goals).where(eq(goals.userId, user.id)).orderBy(desc(goals.startedAt)).limit(1);
    if (!profile || !goal) return NextResponse.json({ error: "Finish onboarding first" }, { status: 400 });

    const dayQ: any = await db.execute(sql`
      select to_char((ml.logged_at at time zone ${tz})::date, 'YYYY-MM-DD') as day,
             sum(li.kcal)::float8 as kcal, sum(li.protein)::float8 as protein,
             sum(li.carbs)::float8 as carbs, sum(li.fat)::float8 as fat
      from meal_logs ml join log_items li on li.log_id = ml.id
      where ml.user_id = ${user.id}
        and (ml.logged_at at time zone ${tz})::date >= (now() at time zone ${tz})::date - 364
      group by 1`);

    const microQ: any = await db.execute(sql`
      select to_char((ml.logged_at at time zone ${tz})::date, 'YYYY-MM-DD') as day,
             e.key as key, sum(e.value::float8) as total
      from meal_logs ml
      join log_items li on li.log_id = ml.id,
      jsonb_each_text(li.micros) as e
      where ml.user_id = ${user.id}
        and (ml.logged_at at time zone ${tz})::date >= (now() at time zone ${tz})::date - 364
      group by 1, 2`);

    const weights = await db.select().from(weightEntries)
      .where(eq(weightEntries.userId, user.id)).orderBy(desc(weightEntries.date)).limit(365);

    const num = (v: any) => Number(v) || 0;
    const out = buildInsights({
      tz, from, to, sex: (profile.sex as any) ?? "male",
      dayRows: (dayQ.rows ?? dayQ).map((r: any) => ({ day: r.day, kcal: num(r.kcal), protein: num(r.protein), carbs: num(r.carbs), fat: num(r.fat) })),
      microRows: (microQ.rows ?? microQ).map((r: any) => ({ day: r.day, key: r.key, total: num(r.total) })),
      weights: weights.map((w) => ({ date: String(w.date), kg: w.kg })),
      targets: goal, goalType: goal.type, goalRate: goal.rateKgPerWeek ?? 0.5,
    });
    return NextResponse.json(out);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("insights failed", e);
    return NextResponse.json({ error: "Couldn't load insights" }, { status: 400 });
  }
}