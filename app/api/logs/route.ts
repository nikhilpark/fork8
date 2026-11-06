import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { db } from "@/db";
import { mealLogs, logItems } from "@/db/schema";
import { SaveLogBody } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = SaveLogBody.parse(await req.json());

    const logId = await db.transaction(async (tx) => {
      const [log] = await tx.insert(mealLogs).values({
        userId: user.id,
        mealType: body.mealType,
        rawText: body.rawText,
        loggedAt: body.loggedAt ? new Date(body.loggedAt) : new Date(),
      }).returning({ id: mealLogs.id });

      await tx.insert(logItems).values(
        body.items.map((i) => ({
          logId: log.id,
          userId: user.id,
          foodId: i.foodId,
          name: i.name,
          qty: i.qty,
          unit: i.unit,
          grams: i.grams,
          kcal: i.kcal,
          protein: i.protein,
          carbs: i.carbs,
          fat: i.fat,
          micros: i.micros,
          estimated: i.estimated,
        }))
      );
      return log.id;
    });

    return NextResponse.json({ id: logId }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("save failed", e);
    return NextResponse.json({ error: "Couldn't save" }, { status: 400 });
  }
}