"use client";

import { useState } from "react";
import { usePlan } from "@/lib/store";
import { currentIndex, monthLabel } from "@/lib/format";
import OverviewTab from "./OverviewTab";
import PlanTab from "./PlanTab";
import MonthsTab from "./MonthsTab";
import ModelTab from "./ModelTab";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "plan", label: "Plan" },
  { id: "months", label: "Months" },
  { id: "model", label: "Model" },
] as const;
type TabId = (typeof TABS)[number]["id"];

function SaveState({ state }: { state: ReturnType<typeof usePlan>["save"] }) {
  if (state === "idle") return null;
  const map = {
    saving: { c: "text-ink3", t: "Saving" },
    saved: { c: "text-good", t: "Saved" },
    error: { c: "text-crit", t: "Save failed" },
  } as const;
  const { c, t } = map[state];
  return <span className={`text-[11px] ${c}`}>{t}</span>;
}

export default function Dashboard() {
  const api = usePlan();
  const [tab, setTab] = useState<TabId>("overview");

  if (api.loading) {
    return (
      <main className="max-w-[760px] mx-auto px-5 py-20">
        <p className="text-[14px] text-ink3">Loading…</p>
      </main>
    );
  }

  if (!api.settings || !api.projection) {
    return (
      <main className="max-w-[760px] mx-auto px-5 py-20 flex flex-col gap-4 items-start">
        <h1 className="font-display text-[19px] font-bold">Could not load the plan</h1>
        <p className="text-[13.5px] text-ink2">{api.error ?? "No settings row found. Seed the database and reload."}</p>
        <button type="button" className="btn" onClick={api.reload}>
          Try again
        </button>
      </main>
    );
  }

  const s = api.settings;
  const now = currentIndex(s.start_year, s.start_month, s.horizon_months);

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky z-30 bg-bg/90 backdrop-blur border-b border-line" style={{ top: "env(safe-area-inset-top, 0px)" }}>
        <div className="max-w-[760px] mx-auto px-5 h-[52px] flex items-center gap-3">
          <span className="font-display font-bold text-[15px] tracking-tight">Runway</span>
          <span className="num text-[11px] text-ink3 uppercase tracking-wider">
            {monthLabel(now, s.start_year, s.start_month, true)} · {now + 1}/{s.horizon_months}
          </span>
          <span className="ml-auto flex items-center gap-3">
            <SaveState state={api.save} />
            <button type="button" className="text-[11.5px] text-ink3 hover:text-ink" onClick={api.signOut}>
              Sign out
            </button>
          </span>
        </div>

        {/* desktop tabs */}
        <nav className="hidden sm:block max-w-[760px] mx-auto px-5" role="tablist" aria-label="Views">
          <div className="flex gap-1 -mb-px">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`font-display font-semibold text-[13px] px-3 pb-2.5 pt-1 border-b-2 ${
                  tab === t.id ? "text-ink border-signal" : "text-ink3 border-transparent hover:text-ink2"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <main className="flex-1 max-w-[760px] w-full mx-auto px-5 pt-6 pb-28 sm:pb-16">
        {api.error ? <div className="note note-warn mb-5"><b>Last save failed.</b> {api.error}</div> : null}
        {tab === "overview" ? <OverviewTab api={api} now={now} /> : null}
        {tab === "plan" ? <PlanTab api={api} now={now} /> : null}
        {tab === "months" ? <MonthsTab api={api} now={now} /> : null}
        {tab === "model" ? <ModelTab api={api} /> : null}
      </main>

      {/* mobile bottom bar */}
      <nav
        className="sm:hidden fixed left-0 right-0 bottom-0 z-40 bg-bg/95 backdrop-blur border-t border-line"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        role="tablist"
        aria-label="Views"
      >
        <div className="flex">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => {
                setTab(t.id);
                window.scrollTo(0, 0);
              }}
              className={`flex-1 py-3 text-[12px] font-semibold font-display relative ${tab === t.id ? "text-signal" : "text-ink3"}`}
            >
              {t.label}
              {tab === t.id ? <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-signal rounded-full" /> : null}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
