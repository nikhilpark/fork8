import type { Candidate } from "@/lib/nutrition";

export async function searchFoods(q: string): Promise<Candidate[]> {
  const res = await fetch(`/api/foods/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error("Search failed");
  return (await res.json()).foods;
}

export async function estimateFood(name: string, qty: number, unit: string): Promise<Candidate> {
  const res = await fetch("/api/foods/estimate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, qty, unit }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? "Search failed");
  return body.food;
}