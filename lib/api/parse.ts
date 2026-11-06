import type { Draft } from "@/lib/types";

const CONF = { high: 0.9, medium: 0.6, low: 0.35 } as const;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export async function parseMealText(text: string) {
  const res = await fetch("/api/parse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Couldn't parse that, try rephrasing");
  }
  const d: Draft = await res.json();
  return {
    mealType: cap(d.mealType),
    items: d.items.map((i) => ({ ...i, confidence: CONF[i.confidence] })),
  };
}