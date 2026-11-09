import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { searchCandidates } from "@/lib/parser/candidates";

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const q = new URL(req.url).searchParams.get("q") ?? "";
    if (q.trim().length < 2 || q.length > 60) return NextResponse.json({ foods: [] });
    return NextResponse.json({ foods: await searchCandidates(q, user.id, 8) });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("food search failed", e);
    return NextResponse.json({ error: "Search failed" }, { status: 400 });
  }
}