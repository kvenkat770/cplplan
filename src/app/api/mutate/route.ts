import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

/** Only these tables and columns can be touched, whatever the request says. */
const ALLOWED: Record<string, string[]> = {
  settings: [
    "salary", "expenses", "chit_amount", "chit_end_month", "savings_start",
    "start_year", "start_month", "horizon_months", "liquid_floor", "emergency_target",
    "sale_month", "sale_net", "home_prepay_cap", "cpl_budget", "pilot_loan_rate", "pilot_loan_tenure",
  ],
  loans: [
    "name", "lender", "balance", "rate", "emi", "sort",
    "refi_month", "refi_rate", "refi_emi",
    "starts_month", "purchase_price", "down_payment", "tenure_months",
    "prepay_rank", "prepay_blocked_until_sale", "sale_rank", "foreclose_month",
  ],
  phases: ["label", "title", "from_month", "to_month", "sort"],
  activities: ["month_index", "title", "detail", "is_milestone", "done", "sort"],
  actuals: ["month_index", "loan_id", "amount", "note"],
};

function clean(table: string, data: unknown): Record<string, unknown> {
  const allow = ALLOWED[table];
  const out: Record<string, unknown> = {};
  if (!allow || typeof data !== "object" || data === null) return out;
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    if (allow.includes(k)) out[k] = v;
  }
  return out;
}

export async function POST(req: Request) {
  let body: { table?: string; op?: string; id?: string; data?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed request" }, { status: 400 });
  }

  const { table, op, id } = body;
  if (!table || !(table in ALLOWED)) {
    return NextResponse.json({ error: "Unknown table" }, { status: 400 });
  }

  const patch = clean(table, body.data);

  if (op === "update") {
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    if (!Object.keys(patch).length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    const { error } = await supabase.from(table).update(patch).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (op === "insert") {
    const { data, error } = await supabase.from(table).insert(patch).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, row: data });
  }

  if (op === "delete") {
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (op === "upsert") {
    const onConflict = table === "actuals" ? "month_index,loan_id" : undefined;
    const { error } = await supabase.from(table).upsert(patch, onConflict ? { onConflict } : undefined);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown operation" }, { status: 400 });
}
