export type Sex = "male" | "female" | "other";
export type Activity = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type GoalType = "lose" | "maintain" | "gain";

const FACTORS: Record<Activity, number> = {
  sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
};

export function computeTargets(p: {
  heightCm: number; weightKg: number; age: number; sex: Sex;
  activity: Activity; goal: GoalType; rateKgPerWeek: number;
}) {
  // Mifflin-St Jeor
  const s = p.sex === "male" ? 5 : p.sex === "female" ? -161 : -78;
  const bmr = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + s;
  const tdee = bmr * FACTORS[p.activity];

  // ~7700 kcal per kg of body weight
  const dir = p.goal === "lose" ? -1 : p.goal === "gain" ? 1 : 0;
  const delta = (dir * p.rateKgPerWeek * 7700) / 7;

  const floor = p.sex === "male" ? 1500 : 1200; // never suggest below this
  const kcal = Math.round(Math.max(floor, tdee + delta));

  const proteinG = Math.round(1.8 * p.weightKg);
  const fatG = Math.round((kcal * 0.25) / 9);
  const carbsG = Math.max(0, Math.round((kcal - proteinG * 4 - fatG * 9) / 4));

  return { bmr: Math.round(bmr), tdee: Math.round(tdee), kcal, proteinG, carbsG, fatG };
}