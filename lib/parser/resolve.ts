import { sql, eq } from "drizzle-orm";
import { db } from "@/db";
import { foods, portionUnits } from "@/db/schema";
import type { LLMParse } from "@/lib/types";

type Item = LLMParse["items"][number];

const GENERIC_GRAMS: Record<string, number> = { g: 1, ml: 1 }; // fallback unit sizes
const DEFAULT_PIECE_G = 50;

async function findFood(name: string) {
  const q = name.toLowerCase().trim();
  const rows: any = await db.execute(sql`select * from search_food(${q})`);
  const best = (rows.rows ?? rows)[0];
  if (!best) return null;
  const [food] = await db.select().from(foods).where(eq(foods.id, best.food_id));
  const score = Number(best.score);
  return { food, confidence: score >= 0.99 ? "high" : score >= 0.5 ? "medium" : "low" } as const;
}

async function toGrams(foodId: string, qty: number, unit: string): Promise<{ grams: number; known: boolean }> {
  if (GENERIC_GRAMS[unit]) return { grams: qty * GENERIC_GRAMS[unit], known: true };
  const units = await db.select().from(portionUnits).where(eq(portionUnits.foodId, foodId));
  const match = units.find((u) => u.unit === unit);
  if (match) return { grams: qty * match.grams, known: true };
  // unit not defined for this food: fall back, mark as guess
  const fallback = units[0]?.grams ?? DEFAULT_PIECE_G;
  return { grams: qty * fallback, known: false };
}

export async function resolveItem(item: Item) {
  const hit = await findFood(item.food_name);
  if (!hit) {
    // Not in DB: return a flagged zero-nutrition placeholder (LLM estimate comes later)
    return {
      name: item.food_name, foodId: null, qty: item.qty, unit: item.unit,
      grams: 0, kcal: 0, protein: 0, carbs: 0, fat: 0, micros: {},
      confidence: "low" as const, estimated: true,
    };
  }
  const { food, confidence } = hit;
  const { grams, known } = await toGrams(food.id, item.qty, item.unit);
  const f = grams / 100;
  const r = (n: number) => Math.round(n * 10) / 10;
  const micros = Object.fromEntries(
    Object.entries(food.micros ?? {}).map(([k, v]) => [k, r(Number(v) * f)])
  );
  return {
    name: food.name, foodId: food.id, qty: item.qty, unit: item.unit,
    grams: r(grams),
    kcal: Math.round(food.kcal100 * f),
    protein: r(food.protein100 * f),
    carbs: r(food.carbs100 * f),
    fat: r(food.fat100 * f),
    micros,
    confidence: known ? confidence : "low" as const,
    estimated: false,
  };
}