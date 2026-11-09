export type Candidate = {
  foodId: string | null;
  isNew?: boolean;
  name: string;
  aliases?: string[];
  note?: string;
  sources?: string[];
  source: string;
  verified: boolean;
  kcal100: number; protein100: number; carbs100: number; fat100: number; fiber100: number;
  micros: Record<string, number>;
  portions: Record<string, number>;
  score?: number;
};

const r1 = (n: number) => Math.round(n * 10) / 10;
const DEFAULT_PIECE_G = 50;

export const sameFood = (a: Candidate, b: Candidate) =>
  a.foodId ? a.foodId === b.foodId : !!a.isNew && !!b.isNew;

export function gramsFor(portions: Record<string, number>, qty: number, unit: string) {
  if (unit === "g" || unit === "ml") return { grams: qty, known: true };
  const per = portions[unit];
  if (per) return { grams: qty * per, known: true };
  return { grams: qty * (Object.values(portions)[0] ?? DEFAULT_PIECE_G), known: false };
}

export function scaleNutrition(f: Candidate, grams: number) {
  const k = grams / 100;
  const micros = Object.fromEntries(
    Object.entries(f.micros ?? {}).map(([key, v]) => [key, r1(Number(v) * k)]),
  ) as Record<string, number>;
  micros.fiber_g = r1((f.fiber100 ?? 0) * k);
  return {
    grams: r1(grams),
    kcal: Math.round(f.kcal100 * k),
    protein: r1(f.protein100 * k),
    carbs: r1(f.carbs100 * k),
    fat: r1(f.fat100 * k),
    micros,
  };
}

// grams-preserving unit switch (e.g. 2 pieces -> 80 g)
export function convertQty(grams: number, portions: Record<string, number>, unit: string) {
  if (unit === "g" || unit === "ml") return Math.max(1, Math.round(grams));
  const per = portions[unit];
  if (!per || grams <= 0) return 1;
  return Math.max(0.5, Math.round((grams / per) * 2) / 2);
}

// recompute an item for a (possibly new) food, quantity or unit
export function applyCandidate(
  prev: { qty: number; unit: string; grams: number },
  cand: Candidate,
  want: { qty?: number; unit?: string } = {},
) {
  let qty = want.qty ?? prev.qty;
  let unit = want.unit ?? prev.unit;
  if (unit !== "g" && unit !== "ml" && !cand.portions[unit]) {
    const u0 = Object.keys(cand.portions)[0];
    if (u0) {
      if (prev.grams > 0 && want.qty === undefined)
        qty = Math.max(0.5, Math.round((prev.grams / cand.portions[u0]) * 2) / 2);
      unit = u0;
    } else {
      unit = "g";
      qty = prev.grams > 0 ? Math.round(prev.grams) : 100;
    }
  }
  const { grams } = gramsFor(cand.portions, qty, unit);
  return { qty, unit, ...scaleNutrition(cand, grams) };
}

// for items with no food attached (e.g. repeated from a chip): scale proportionally
export function scaleItem(
  it: { qty: number; grams: number; kcal: number; protein: number; carbs: number; fat: number; micros?: Record<string, number> },
  qty: number,
) {
  const f = it.qty > 0 ? qty / it.qty : 1;
  return {
    qty,
    grams: r1(it.grams * f),
    kcal: Math.round(it.kcal * f),
    protein: r1(it.protein * f),
    carbs: r1(it.carbs * f),
    fat: r1(it.fat * f),
    micros: Object.fromEntries(Object.entries(it.micros ?? {}).map(([k, v]) => [k, r1(Number(v) * f)])),
  };
}