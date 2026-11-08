import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  console.log("Callback called", code);

  if (code) {
    const supabase = await getSupabase();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}/app`);
    }

    console.error("Auth callback error:", error.message);
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}