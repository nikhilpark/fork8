import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { estimateFood } from "@/lib/parser/estimate";
import { UNITS } from "@/lib/types";

export const maxDuration = 30;

const Body = z.object({
  name: z.string().trim().min(1).max(80),
  qty: z.number().positive().max(1000).default(1),
  unit: z.enum(UNITS).default("piece"),
});

// simple per-user daily cap (in memory: resets on restart; move to Redis later)
const used = new Map<string, { day: string; n: number }>();
function allow(userId: string, limit = 20) {
  const day = new Date().toISOString().slice(0, 10);
  const e = used.get(userId);
  if (!e || e.day !== day) { used.set(userId, { day, n: 1 }); return true; }
  if (e.n >= limit) return false;
  e.n++;
  return true;
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = Body.parse(await req.json());
    if (!allow(user.id))
      return NextResponse.json({ error: "Daily limit for deeper searches reached. Try again tomorrow." }, { status: 429 });
    const food = await estimateFood(body.name, body.qty, body.unit);
    if (!food) return NextResponse.json({ error: "Couldn't find reliable values for that food." }, { status: 404 });
    return NextResponse.json({ food });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("estimate route failed", e);
    return NextResponse.json({ error: "Search failed, try again." }, { status: 400 });
  }
}