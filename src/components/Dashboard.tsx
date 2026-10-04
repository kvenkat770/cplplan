"use client";

import { useState } from "react";
import { usePlan } from "@/lib/store";
import { currentIndex, monthLabel } from "@/lib/format";
import NowTab from "./NowTab";
import PlanTab from "./PlanTab";
import CashflowTab from "./CashflowTab";
import SimulateTab from "./SimulateTab";

const TABS = [
  { id: "now", label: "Now" },
  { id: "plan", label: "Flight plan" },
  { id: "cash", label: "Cash flow" },
  { id: "sim", label: "Simulate" },
] as const;
type TabId = (typeof TABS)[number]["id"];

function SaveDot({ state }: { state: ReturnType<typeof usePlan>["save"] }) {
  const map = {
    idle: { c: "bg-ink3", t: "Saved to Supabase" },
    saving: { c: "bg-warn", t: "Saving…" },
    saved: { c: "bg-good", t: "Saved" },
    error: { c: "bg-crit", t: "Save failed" },
  } as const;
  const { c, t } = map[state];
  return (
    <span className="text-[11px] text-ink3 flex items-center gap-1.5">
      <i className={`w-1.5 h-1.5 rounded-full ${c}`} />
      {t}
    </span>
  );
}

export default function Dashboard() {
  const api = usePlan();
  const [tab, setTab] = useState<TabId>("now");

  if (api.loading) {
    return (
      <main className="max-w-[1000px] mx-auto px-4 py-16">
        <p className="text-[14px] text-ink2">Loading your plan…</p>
      </main>
    );
  }

  if (api.error && !api.settings) {
    return (
      <main className="max-w-[1000px] mx-auto px-4 py-16 flex flex-col gap-3">
        <h1 className="font-display font-bold text-[20px]">Could not reach the database</h1>
        <p className="text-[14px] text-ink2 max-w-[62ch]">{api.error}</p>
        <p className="text-[13px] text-ink3 max-w-[62ch]">
          Check that <code>.env.local</code> has <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, then restart
          the dev server.
        </p>
        <button type="button" className="btn self-start" onClick={api.reload}>
          Try again
        </button>
      </main>
    );
  }

  if (!api.settings || !api.projection) {
    return (
      <main className="max-w-[1000px] mx-auto px-4 py-16">
        <p className="text-[14px] text-ink2">No settings row found. Seed the database and reload.</p>
      </main>
    );
  }

  const s = api.settings;
  const now = currentIndex(s.start_year, s.start_month, s.horizon_months);

  return (
    <>
      <header
        className="sticky z-30 bg-bg border-b border-line"
        style={{ top: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="max-w-[1000px] mx-auto px-4 pt-2.5">
          <div className="flex items-baseline gap-2.5 flex-wrap">
            <span className="font-display font-bold text-[17px] tracking-tight">Runway to {monthLabel(s.horizon_months - 1, s.start_year, s.start_month, true)}</span>
            <span className="text-[11.5px] text-ink3 uppercase tracking-[0.09em] font-medium">
              {monthLabel(now, s.start_year, s.start_month, true)} · month {now + 1} of {s.horizon_months}
            </span>
            <span className="ml-auto">
              <SaveDot state={api.save} />
            </span>
          </div>
          <div className="flex gap-0.5 mt-2.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Views">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => {
                  setTab(t.id);
                  window.scrollTo(0, 0);
                }}
                className={`font-display font-semibold text-[13.5px] px-[11px] pt-2 pb-[9px] border-b-2 whitespace-nowrap ${
                  tab === t.id ? "text-ink border-signal" : "text-ink3 border-transparent hover:text-ink2"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-[1000px] mx-auto px-4 pt-[18px] pb-14">
        {api.error ? (
          <div className="note mb-4">
            <b>Last write failed.</b> {api.error}
          </div>
        ) : null}
        {tab === "now" ? <NowTab api={api} now={now} /> : null}
        {tab === "plan" ? <PlanTab api={api} now={now} /> : null}
        {tab === "cash" ? <CashflowTab api={api} now={now} /> : null}
        {tab === "sim" ? <SimulateTab api={api} /> : null}
      </main>
    </>
  );
}
