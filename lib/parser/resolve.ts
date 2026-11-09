import { searchCandidates } from "./candidates";
import { gramsFor, scaleNutrition } from "@/lib/nutrition";
import type { LLMParse } from "@/lib/types";

type Item = LLMParse["items"][number];
const AUTO_PICK = 0.5; // below this we only show "did you mean" suggestions

export async function resolveItem(item: Item, userId: string) {
  const candidates = await searchCandidates(item.food_name, userId, 6);
  const best = candidates[0];
  const base = { query: item.food_name, qty: item.qty, unit: item.unit, candidates };

  if (!best || best.score < AUTO_PICK) {
    return {
      ...base, name: item.food_name, foodId: null, grams: 0, kcal: 0, protein: 0, carbs: 0, fat: 0,
      micros: {} as Record<string, number>, confidence: "low" as const, estimated: true,
    };
  }
  const { grams, known } = gramsFor(best.portions, item.qty, item.unit);
  return {
    ...base, name: best.name, foodId: best.foodId, ...scaleNutrition(best, grams),
    confidence: !known ? ("low" as const) : best.score >= 0.99 ? ("high" as const) : ("medium" as const),
    estimated: best.source === "ai",
  };
}