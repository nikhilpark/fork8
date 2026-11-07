const tz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export async function getInsights(p: { range?: 7 | 30 | 90; from?: string; to?: string }) {
  const q = new URLSearchParams({ tz: tz() });
  if (p.from && p.to) { q.set("from", p.from); q.set("to", p.to); }
  else q.set("range", String(p.range ?? 7));
  const res = await fetch(`/api/insights?${q}`);
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Couldn't load insights");
  return res.json();
}

export async function logWeight(kg: number) {
  const res = await fetch("/api/weight", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kg, tz: tz() }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Couldn't save weight");
}