import { NextResponse } from "next/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { db } from "@/db";
import { mealLogs, logItems } from "@/db/schema";

const Query = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tz: z.string().default("Asia/Hong_Kong"),
});

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const url = new URL(req.url);
    const { date, tz } = Query.parse({
      date: url.searchParams.get("date"),
      tz: url.searchParams.get("tz") ?? undefined,
    });

    const logs = await db.select().from(mealLogs).where(and(
      eq(mealLogs.userId, user.id),
      sql`(${mealLogs.loggedAt} at time zone ${tz})::date = ${date}::date`
    )).orderBy(mealLogs.loggedAt);

    const items = logs.length
      ? await db.select().from(logItems).where(and(
          eq(logItems.userId, user.id),
          inArray(logItems.logId, logs.map((l) => l.id))
        ))
      : [];

    const totals = { kcal: 0, protein: 0, carbs: 0, fat: 0, micros: {} as Record<string, number> };
    for (const i of items) {
      totals.kcal += i.kcal; totals.protein += i.protein;
      totals.carbs += i.carbs; totals.fat += i.fat;
      for (const [k, v] of Object.entries(i.micros ?? {}))
        totals.micros[k] = (totals.micros[k] ?? 0) + Number(v);
    }
    const r = (n: number) => Math.round(n * 10) / 10;
    totals.kcal = Math.round(totals.kcal);
    totals.protein = r(totals.protein); totals.carbs = r(totals.carbs); totals.fat = r(totals.fat);
    for (const k in totals.micros) totals.micros[k] = r(totals.micros[k]);

    return NextResponse.json({
      logs: logs.map((l) => ({ ...l, items: items.filter((i) => i.logId === l.id) })),
      totals,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("day failed", e);
    return NextResponse.json({ error: "Couldn't load day" }, { status: 400 });
  }
}