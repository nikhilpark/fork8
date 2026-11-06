import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { parseWithLLM } from "@/lib/parser/llm";
import { resolveItem } from "@/lib/parser/resolve";
import { inferMealType } from "@/lib/parser/mealType";

const Body = z.object({
  text: z.string().min(1).max(500),
  timezone: z.string().default("Asia/Hong_Kong"),
});

export async function POST(req: Request) {
  try {
    await requireUser();
    const { text, timezone } = Body.parse(await req.json());
    const parsed = await parseWithLLM(text);
    const items = await Promise.all(parsed.items.map(resolveItem));
    const mealType = inferMealType(parsed.meal_type, new Date(), timezone);
    return NextResponse.json({ mealType, items });
  } catch (e) {
    if (e instanceof Response) return e; // 401 from requireUser
    console.error("parse failed", e);
    return NextResponse.json({ error: "Couldn't parse that, try rephrasing" }, { status: 422 });
  }
}