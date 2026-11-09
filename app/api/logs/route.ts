import { NextResponse } from "next/server";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { requireUser } from "@/lib/supabase/server";
import { db } from "@/db";
import { mealLogs, logItems, foods, foodAliases, portionUnits } from "@/db/schema";
import { SaveLogBody, type NewFood } from "@/lib/types";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function createAiFood(tx: Tx, userId: string, nf: NewFood) {
  const [food] = await tx.insert(foods).values({
    name: nf.name, source: "ai", verified: false, ownerId: userId,
    sourceId: [nf.note, ...nf.sources].filter(Boolean).join(" | ").slice(0, 300) || null,
    kcal100: nf.kcal100, protein100: nf.protein100, carbs100: nf.carbs100, fat100: nf.fat100,
    fiber100: nf.fiber100, micros: {},
  }).returning({ id: foods.id });

  const names = [...new Set([nf.name, nf.query ?? "", ...nf.aliases]
    .map((s) => s.toLowerCase().trim()).filter((s) => s.length >= 2))];
  if (names.length) {
    const taken = await tx.select({ alias: foodAliases.alias }).from(foodAliases)
      .innerJoin(foods, eq(foods.id, foodAliases.foodId))
      .where(and(inArray(foodAliases.alias, names), or(isNull(foods.ownerId), eq(foods.ownerId, userId))));
    const takenSet = new Set(taken.map((t) => t.alias));
    const fresh = names.filter((n) => !takenSet.has(n));
    if (fresh.length) await tx.insert(foodAliases).values(fresh.map((alias) => ({ foodId: food.id, alias })));
  }
  if (nf.portions.length)
    await tx.insert(portionUnits).values(nf.portions.map((p) => ({ foodId: food.id, unit: p.unit, grams: p.grams })));
  return food.id;
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = SaveLogBody.parse(await req.json());

    const logId = await db.transaction(async (tx) => {
      const [log] = await tx.insert(mealLogs).values({
        userId: user.id, mealType: body.mealType, rawText: body.rawText,
        loggedAt: body.loggedAt ? new Date(body.loggedAt) : new Date(),
      }).returning({ id: mealLogs.id });

      const rows = [];
      for (const i of body.items) {
        const foodId = i.newFood ? await createAiFood(tx, user.id, i.newFood) : i.foodId;
        rows.push({
          logId: log.id, userId: user.id, foodId, name: i.name, qty: i.qty, unit: i.unit,
          grams: i.grams, kcal: i.kcal, protein: i.protein, carbs: i.carbs, fat: i.fat,
          micros: i.micros, estimated: i.estimated,
        });
      }
      await tx.insert(logItems).values(rows);
      return log.id;
    });

    return NextResponse.json({ id: logId }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("save failed", e);
    return NextResponse.json({ error: "Couldn't save" }, { status: 400 });
  }
}