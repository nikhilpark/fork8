import { sql, inArray } from "drizzle-orm";
import { db } from "@/db";
import { foods, portionUnits } from "@/db/schema";
import type { Candidate } from "@/lib/nutrition";

export async function searchCandidates(q: string, userId: string, n = 6) {
  const term = q.toLowerCase().trim();
  if (term.length < 2) return [] as (Candidate & { score: number })[];

  const res: any = await db.execute(
    sql`select food_id, score from search_foods(${term}::text, ${n}::int, ${userId}::uuid)`,
  );
  const hits: { food_id: string; score: number }[] = res.rows ?? res;
  if (!hits.length) return [];

  const ids = hits.map((h) => h.food_id);
  const [fs, ps] = await Promise.all([
    db.select().from(foods).where(inArray(foods.id, ids)),
    db.select().from(portionUnits).where(inArray(portionUnits.foodId, ids)),
  ]);

  return hits.flatMap((h) => {
    const f = fs.find((x) => x.id === h.food_id);
    if (!f) return [];
    const portions: Record<string, number> = {};
    for (const p of ps) if (p.foodId === f.id) portions[p.unit] = p.grams;
    return [{
      foodId: f.id, name: f.name, source: f.source, verified: !!f.verified,
      kcal100: f.kcal100, protein100: f.protein100, carbs100: f.carbs100, fat100: f.fat100,
      fiber100: f.fiber100 ?? 0, micros: (f.micros ?? {}) as Record<string, number>,
      portions, score: Number(h.score),
    }];
  });
}