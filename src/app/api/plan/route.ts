import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [settings, loans, phases, activities, actuals] = await Promise.all([
    supabase.from("settings").select("*").eq("id", "default").single(),
    supabase.from("loans").select("*").order("sort"),
    supabase.from("phases").select("*").order("sort"),
    supabase.from("activities").select("*").order("month_index").order("sort"),
    supabase.from("actuals").select("*").order("month_index"),
  ]);

  const failed = [settings, loans, phases, activities, actuals].find((r) => r.error);
  if (failed?.error) {
    return NextResponse.json({ error: failed.error.message }, { status: 500 });
  }

  return NextResponse.json({
    settings: settings.data,
    loans: loans.data ?? [],
    phases: phases.data ?? [],
    activities: activities.data ?? [],
    actuals: actuals.data ?? [],
  });
}
