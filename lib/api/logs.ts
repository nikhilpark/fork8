export type DayData = {
  logs: { id: string; mealType: string; loggedAt: string; rawText: string; items: any[] }[];
  totals: { kcal: number; protein: number; carbs: number; fat: number; micros: Record<string, number> };
  streak: number;
  loggedToday: boolean;
};

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Request failed");
  return res.json();
}

export const tz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

const toPayload = (i: any) => {
  const f = i.food;
  return {
    foodId: f?.foodId ?? i.foodId ?? null,
    name: i.name, qty: i.qty, unit: i.unit, grams: i.grams,
    kcal: i.kcal, protein: i.protein, carbs: i.carbs, fat: i.fat,
    micros: i.micros ?? {},
    confidence: i.confidence >= 0.8 ? "high" : i.confidence >= 0.5 ? "medium" : "low",
    estimated: !!i.estimated,
    newFood: f?.isNew
      ? {
          name: f.name, query: i.query, aliases: f.aliases ?? [],
          kcal100: f.kcal100, protein100: f.protein100, carbs100: f.carbs100, fat100: f.fat100,
          fiber100: f.fiber100 ?? 0,
          portions: Object.entries(f.portions ?? {}).map(([unit, grams]) => ({ unit, grams })),
          note: f.note, sources: f.sources ?? [],
        }
      : undefined,
  };
};

export const saveLog = (mealType: string, rawText: string, items: any[]) =>
  fetch("/api/logs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mealType: mealType.toLowerCase(),
      rawText,
      loggedAt: new Date().toISOString(),
      items: items.map(toPayload),
    }),
  }).then((r) => j<{ id: string }>(r));

export const getDay = (date: string) =>
  fetch(`/api/day?date=${date}&tz=${encodeURIComponent(tz())}`).then((r) => j<DayData>(r));

export const deleteItem = (id: string) => fetch(`/api/log-items/${id}`, { method: "DELETE" }).then((r) => j(r));

export const updateItemQty = (id: string, qty: number) =>
  fetch(`/api/log-items/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ qty }),
  }).then((r) => j(r));