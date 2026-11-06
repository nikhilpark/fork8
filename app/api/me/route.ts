import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/supabase/server";
import { db } from "@/db";
import { profiles, goals } from "@/db/schema";

export async function GET() {
  try {
    const user = await requireUser();
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.id));
    const [goal] = await db.select().from(goals)
      .where(eq(goals.userId, user.id)).orderBy(desc(goals.startedAt)).limit(1);
    return NextResponse.json({ email: user.email, profile: profile ?? null, goal: goal ?? null });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return NextResponse.json({ error: "Couldn't load profile" }, { status: 400 });
  }
}