import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSupabase } from "@/lib/supabase/server";
import PlateApp from "@/components/plate-app"; // keep your existing import path and name

export const metadata: Metadata = { robots: { index: false } };

export default async function AppPage() {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <PlateApp />;
}