import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { db } from "@/db";
import { logItems, mealLogs } from "@/db/schema";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const [item] = await db.delete(logItems)
      .where(and(eq(logItems.id, id), eq(logItems.userId, user.id)))
      .returning({ logId: logItems.logId });
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // remove the meal log if it has no items left
    const left = await db.select({ id: logItems.id }).from(logItems).where(eq(logItems.logId, item.logId)).limit(1);
    if (!left.length) await db.delete(mealLogs).where(and(eq(mealLogs.id, item.logId), eq(mealLogs.userId, user.id)));
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return NextResponse.json({ error: "Couldn't delete" }, { status: 400 });
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const { qty } = z.object({ qty: z.number().positive() }).parse(await req.json());

    const [item] = await db.select().from(logItems)
      .where(and(eq(logItems.id, id), eq(logItems.userId, user.id)));
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const f = qty / item.qty; // rescale everything proportionally
    const r = (n: number) => Math.round(n * 10) / 10;
    await db.update(logItems).set({
      qty,
      grams: r(item.grams * f),
      kcal: Math.round(item.kcal * f),
      protein: r(item.protein * f),
      carbs: r(item.carbs * f),
      fat: r(item.fat * f),
      micros: Object.fromEntries(Object.entries(item.micros ?? {}).map(([k, v]) => [k, r(Number(v) * f)])),
    }).where(eq(logItems.id, id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return NextResponse.json({ error: "Couldn't update" }, { status: 400 });
  }
}