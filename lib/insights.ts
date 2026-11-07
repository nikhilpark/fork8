type Sex = "male" | "female" | "other";
type DayRow = { day: string; kcal: number; protein: number; carbs: number; fat: number };
type MicroRow = { day: string; key: string; total: number };
type Weight = { date: string; kg: number };
type Targets = { kcal: number; proteinG: number; carbsG: number; fatG: number };

// Approximate adult daily needs (ICMR-NIN 2020 style). Verify against the source before relying on them.
const RDA = (sex: Sex): Record<string, { label: string; rda: number; tip: string }> => ({
  iron_mg: { label: "Iron", rda: sex === "female" ? 29 : 19, tip: "Add rajma, chana, spinach or jaggery" },
  calcium_mg: { label: "Calcium", rda: 1000, tip: "Add curd, milk or paneer" },
  vitamin_b12_mcg: { label: "Vitamin B12", rda: 2.2, tip: "Eggs, curd, milk or fish help most" },
  vitamin_d_mcg: { label: "Vitamin D", rda: 15, tip: "Eggs, fish, and 15 min of midday sun" },
  potassium_mg: { label: "Potassium", rda: 3500, tip: "Bananas, potatoes, dal and curd" },
  magnesium_mg: { label: "Magnesium", rda: sex === "female" ? 370 : 440, tip: "Nuts, oats, dal and seeds" },
  zinc_mg: { label: "Zinc", rda: sex === "female" ? 13.2 : 17, tip: "Nuts, dal, eggs and seeds" },
});

const r1 = (n: number) => Math.round(n * 10) / 10;
export const dateStr = (offset: number, tz: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date(Date.now() - offset * 864e5));

export function buildInsights(a: {
  tz: string; from: string; to: string; sex: Sex;
  dayRows: DayRow[]; microRows: MicroRow[]; weights: Weight[];
  targets: Targets; goalType: string; goalRate: number;
}) {
  const { tz, targets } = a;
  const byDay = new Map(a.dayRows.map((d) => [d.day, d] as const));
  const all = Array.from({ length: 365 }, (_, i) => dateStr(364 - i, tz)).map((date) => {
    const d = byDay.get(date);
    return {
      date,
      kcal: Math.round(d?.kcal ?? 0), protein: r1(d?.protein ?? 0),
      carbs: r1(d?.carbs ?? 0), fat: r1(d?.fat ?? 0), logged: !!d && d.kcal > 0,
    };
  });

  // streak: consecutive logged days ending today (or yesterday if today is still empty)
  let streak = 0;
  let i = all.length - 1;
  if (!all[i].logged) i--;
  while (i >= 0 && all[i].logged) { streak++; i--; }

  // the selected window
  const days = all.filter((d) => d.date >= a.from && d.date <= a.to);
  const logged = days.filter((d) => d.logged);
  const n = logged.length || 1;
  const sum = (k: "kcal" | "protein" | "carbs" | "fat") => logged.reduce((s, d) => s + d[k], 0);
  const avg = { kcal: Math.round(sum("kcal") / n), protein: r1(sum("protein") / n), carbs: r1(sum("carbs") / n), fat: r1(sum("fat") / n) };

  // micro gaps: average per logged day vs RDA, lowest first (needs 3+ logged days)
  const loggedDates = new Set(logged.map((d) => d.date));
  const totals: Record<string, number> = {};
  for (const m of a.microRows) if (loggedDates.has(m.day)) totals[m.key] = (totals[m.key] ?? 0) + m.total;
  const rda = RDA(a.sex);
  const microGaps = logged.length >= 3
    ? Object.entries(rda)
        .map(([key, v]) => ({ key, label: v.label, tip: v.tip, pct: Math.round(((totals[key] ?? 0) / logged.length / v.rda) * 100) }))
        .filter((m) => m.pct < 80)
        .sort((x, y) => x.pct - y.pct)
        .slice(0, 3)
    : [];

  // weight: one point per date, all history (the client picks the window)
  const byDate = new Map(a.weights.map((w) => [w.date, w] as const));
  const asc = [...byDate.values()].sort((x, y) => x.date.localeCompare(y.date));
  const points = asc.map((w) => ({ date: w.date, kg: w.kg }));

  // recent pace: least-squares slope over the last 21 days
  const cutoff = dateStr(21, tz);
  const recent = asc.filter((w) => w.date >= cutoff);
  let weeklyChangeKg: number | null = null;
  if (recent.length >= 3) {
    const t0 = Date.parse(recent[0].date);
    const xs = recent.map((w) => (Date.parse(w.date) - t0) / 864e5);
    const ys = recent.map((w) => w.kg);
    if (xs[xs.length - 1] >= 7) {
      const mx = xs.reduce((s, v) => s + v, 0) / xs.length;
      const my = ys.reduce((s, v) => s + v, 0) / ys.length;
      const num = xs.reduce((s, x, k) => s + (x - mx) * (ys[k] - my), 0);
      const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0) || 1;
      weeklyChangeKg = Math.round((num / den) * 7 * 100) / 100;
    }
  }

  let targetCheck: string | null = null;
  if (weeklyChangeKg == null) {
    targetCheck = "Log your weight a few times a week for 1-2 weeks to see your pace.";
  } else {
    const ch = weeklyChangeKg;
    const want = a.goalType === "lose" ? -a.goalRate : a.goalType === "gain" ? a.goalRate : 0;
    const dir = ch < 0 ? "dropping" : "gaining";
    const base = `Your weight is ${Math.abs(ch) < 0.05 ? "steady" : `${dir} ${Math.abs(ch).toFixed(1)} kg/week`}`;
    const diff = ch - want;
    targetCheck = Math.abs(diff) <= 0.15 ? `${base}, right on track.`
      : (a.goalType === "lose" && diff > 0) || (a.goalType === "gain" && diff < 0) ? `${base}, slower than your ${a.goalRate} kg/week goal.`
      : a.goalType === "maintain" ? `${base}, away from your maintenance goal.`
      : `${base}, faster than your ${a.goalRate} kg/week goal.`;
  }

  // rule-based coach notes
  const notes: string[] = [];
  if (logged.length) {
    const shortP = logged.filter((d) => d.protein < targets.proteinG * 0.9).length;
    notes.push(shortP === 0
      ? `You hit your protein target on all ${logged.length} logged days.`
      : `Protein fell short on ${shortP} of ${logged.length} logged days. Curd, paneer, eggs or a whey scoop would close the gap.`);
    const over = logged.filter((d) => d.kcal > targets.kcal * 1.1).length;
    if (over > 0) notes.push(`You went more than 10% over your calorie target on ${over} of ${logged.length} logged days.`);
    else notes.push(`Your average of ${avg.kcal} kcal/day is ${avg.kcal > targets.kcal ? "just over" : "within"} your ${targets.kcal} kcal target.`);
    if (logged.length < days.length * 0.6) notes.push(`You logged ${logged.length} of ${days.length} days in this period. More complete logs make these numbers more accurate.`);
  }

  return {
    from: a.from, to: a.to,
    targets: { kcal: targets.kcal, protein: targets.proteinG, carbs: targets.carbsG, fat: targets.fatG },
    days, loggedDays: logged.length, avg, streak, microGaps,
    weight: { points, weeklyChangeKg, latest: asc.length ? asc[asc.length - 1].kg : null },
    targetCheck, notes: notes.slice(0, 3),
  };
}