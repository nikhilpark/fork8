import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await getSupabase();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}