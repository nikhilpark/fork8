export type DayData = {
  logs: { id: string; mealType: string; loggedAt: string; rawText: string; items: any[] }[];
  totals: { kcal: number; protein: number; carbs: number; fat: number; micros: Record<string, number> };
};

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Request failed");
  return res.json();
}

export const tz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export const saveLog = (mealType: string, rawText: string, items: any[]) =>
  fetch("/api/logs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mealType: mealType.toLowerCase(),
      rawText,
      loggedAt: new Date().toISOString(),
      items: items.map((i) => ({
        ...i,
        // UI uses 0-1 numeric confidence, API wants the label
        confidence: i.confidence >= 0.8 ? "high" : i.confidence >= 0.5 ? "medium" : "low",
        micros: i.micros ?? {},
        foodId: i.foodId ?? null,
        estimated: !!i.estimated,
      })),
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