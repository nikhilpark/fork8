import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { db } from "@/db";
import { profiles, goals, weightEntries } from "@/db/schema";
import { OnboardingBody } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const b = OnboardingBody.parse(await req.json());
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: b.timezone }).format(new Date()); // YYYY-MM-DD

    await db.transaction(async (tx) => {
  await tx.insert(profiles).values({
  id: user.id, name: b.name, heightCm: b.heightCm, weightKg: b.weightKg, age: b.age, sex: b.sex,
  activityLevel: b.activityLevel, dietType: b.dietType, timezone: b.timezone,
}).onConflictDoUpdate({
  target: profiles.id,
  set: {
    name: b.name, heightCm: b.heightCm, weightKg: b.weightKg, age: b.age, sex: b.sex,
    activityLevel: b.activityLevel, dietType: b.dietType, timezone: b.timezone,
  },
});

      // new row each time, so goal history is kept
      await tx.insert(goals).values({
        userId: user.id, type: b.goalType, rateKgPerWeek: b.rateKgPerWeek,
        kcal: b.kcal, proteinG: b.proteinG, carbsG: b.carbsG, fatG: b.fatG,
      });

      await tx.insert(weightEntries).values({ userId: user.id, date: today, kg: b.weightKg });
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("onboarding failed", e);
    return NextResponse.json({ error: "Couldn't save your details" }, { status: 400 });
  }
}