import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { db } from "@/db";
import { weightEntries, profiles } from "@/db/schema";

const Body = z.object({
  kg: z.number().min(30).max(300),
  tz: z.string().default("Asia/Hong_Kong"),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { kg, tz } = Body.parse(await req.json());
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());

    await db.transaction(async (tx) => {
      // one entry per day: replace today's if it exists
      await tx.delete(weightEntries).where(and(eq(weightEntries.userId, user.id), eq(weightEntries.date, today)));
      await tx.insert(weightEntries).values({ userId: user.id, date: today, kg });
      const [latest] = await tx.select().from(weightEntries)
        .where(eq(weightEntries.userId, user.id)).orderBy(desc(weightEntries.date)).limit(1);
      if (latest) await tx.update(profiles).set({ weightKg: latest.kg }).where(eq(profiles.id, user.id));
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("weight failed", e);
    return NextResponse.json({ error: "Couldn't save weight" }, { status: 400 });
  }
}