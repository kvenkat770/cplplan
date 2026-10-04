"use client";

import { useState } from "react";
import type { PlanApi } from "@/lib/store";
import { inr, lakh, monthLabel } from "@/lib/format";
import { BarChart, NumberField } from "./ui";

export default function CashflowTab({ api, now }: { api: PlanApi; now: number }) {
  const s = api.settings!;
  const p = api.projection!;
  const [mode, setMode] = useState<"plan" | "actuals">("plan");
  const [month, setMonth] = useState(now);

  const z = (v: number) => (v > 0.5 ? inr(v) : <span className="text-ink3">—</span>);
  const row = p.rows[Math.max(0, Math.min(p.rows.length - 1, month))];

  const actualFor = (mi: number, loanId: string) => api.actuals.find((a) => a.month_index === mi && a.loan_id === loanId)?.amount ?? null;

  return (
    <div className="flex flex-col gap-[18px]">
      <div>
        <h2 className="font-display font-bold text-[20px]">Month by month on {inr(s.salary)}</h2>
        <p className="text-[14px] text-ink2 max-w-[62ch]">
          Every rupee placed across {s.horizon_months} months. <b>Extra</b> is what you pay on top of the scheduled EMIs, including any purchase
          fund while it builds. Swipe the table sideways.
        </p>
        <div className="flex gap-2 mt-3">
          <button type="button" className={`btn ${mode === "plan" ? "btn-primary" : ""}`} onClick={() => setMode("plan")}>
            Plan
          </button>
          <button type="button" className={`btn ${mode === "actuals" ? "btn-primary" : ""}`} onClick={() => setMode("actuals")}>
            Log what you actually paid
          </button>
        </div>
      </div>

      {mode === "plan" ? (
        <>
          <div className="overflow-x-auto border border-line rounded-[10px] bg-surface shadow-[var(--shadow)]">
            <table className="w-full text-[12.5px] border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="sticky left-0 z-[3] bg-surface2 text-left font-display text-[10px] uppercase tracking-[0.07em] text-ink3 px-2.5 py-[7px] border-b border-lineStrong border-r border-line whitespace-nowrap">
                    Month
                  </th>
                  {api.loans.map((l) => (
                    <th
                      key={l.id}
                      className="bg-surface2 text-right font-display text-[10px] uppercase tracking-[0.07em] text-ink3 px-2.5 py-[7px] border-b border-lineStrong whitespace-nowrap"
                    >
                      {l.name.split(" ")[0]}
                    </th>
                  ))}
                  {["Chit+Exp", "Free", "Extra", "Where it goes", "Liquid", "CPL fund", "Debt left"].map((h) => (
                    <th
                      key={h}
                      className={`bg-surface2 font-display text-[10px] uppercase tracking-[0.07em] text-ink3 px-2.5 py-[7px] border-b border-lineStrong whitespace-nowrap ${
                        h === "Where it goes" ? "text-left" : "text-right"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {p.rows.map((r) => {
                  const evt = r.events.length > 0;
                  const cellBg = evt ? "bg-signalSoft" : r.i % 2 ? "bg-surface2" : "bg-surface";
                  return (
                    <tr key={r.i}>
                      <td
                        className={`sticky left-0 z-[1] num font-medium text-left px-2.5 py-[7px] border-b border-line border-r whitespace-nowrap ${cellBg} ${
                          evt ? "text-signal font-semibold" : ""
                        }`}
                      >
                        {monthLabel(r.i, s.start_year, s.start_month, true)}
                      </td>
                      {api.loans.map((l) => (
                        <td key={l.id} className={`num text-right px-2.5 py-[7px] border-b border-line whitespace-nowrap ${cellBg}`}>
                          {z(r.paid[l.id] ?? 0)}
                        </td>
                      ))}
                      <td className={`num text-right px-2.5 py-[7px] border-b border-line whitespace-nowrap ${cellBg}`}>{inr(r.chit + s.expenses)}</td>
                      <td className={`num text-right px-2.5 py-[7px] border-b border-line whitespace-nowrap font-semibold ${cellBg}`}>{inr(r.free)}</td>
                      <td className={`num text-right px-2.5 py-[7px] border-b border-line whitespace-nowrap ${cellBg}`}>
                        {z(r.extraTotal + r.toFund)}
                      </td>
                      <td className={`text-left px-2.5 py-[7px] border-b border-line whitespace-nowrap text-ink2 ${cellBg}`}>
                        {r.events.length ? r.events.join(" · ") : r.target || "—"}
                      </td>
                      <td className={`num text-right px-2.5 py-[7px] border-b border-line whitespace-nowrap ${cellBg}`}>{z(r.cash)}</td>
                      <td className={`num text-right px-2.5 py-[7px] border-b border-line whitespace-nowrap ${cellBg}`}>{z(r.cpl)}</td>
                      <td className={`num text-right px-2.5 py-[7px] border-b border-line whitespace-nowrap ${cellBg}`}>{lakh(r.totalDebt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="card p-[14px]">
            <div className="eyebrow">Free cash each month</div>
            <p className="text-[14px] text-ink2 max-w-[62ch] mt-1">
              Dips when a new EMI starts, steps up every time a loan closes. Pink bars are months something happens.
            </p>
            <div className="mt-2.5">
              <BarChart
                values={p.rows.map((r) => r.free)}
                highlight={p.rows.map((r) => r.events.length > 0)}
                labels={(i) => monthLabel(i, s.start_year, s.start_month)}
                fmt={lakh}
                ariaLabel={`Free cash per month, from ${inr(p.rows[0].free)} to ${inr(p.rows[p.rows.length - 1].free)}`}
              />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="card p-[14px] flex flex-col gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <button type="button" className="btn" onClick={() => setMonth((m) => Math.max(0, m - 1))} aria-label="Previous month">
                ←
              </button>
              <span className="font-display font-bold text-[17px]">{monthLabel(row.i, s.start_year, s.start_month, true)}</span>
              <button
                type="button"
                className="btn"
                onClick={() => setMonth((m) => Math.min(p.rows.length - 1, m + 1))}
                aria-label="Next month"
              >
                →
              </button>
              <span className="text-[12px] text-ink3 ml-auto">
                Month {row.i} of {p.rows.length - 1}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {api.loans.map((l) => {
                const planned = (row.paid[l.id] ?? 0) + (row.extra[l.id] ?? 0);
                const actual = actualFor(row.i, l.id);
                const drift = actual == null ? null : actual - planned;
                return (
                  <div key={l.id} className="border border-line rounded-[10px] p-3 bg-surface2">
                    <div className="flex items-baseline justify-between gap-2 mb-2">
                      <span className="font-semibold text-[13.5px]">{l.name}</span>
                      <span className="num text-[12px] text-ink3">plan {inr(planned)}</span>
                    </div>
                    <NumberField
                      label="What you actually paid"
                      value={actual}
                      nullable
                      step={500}
                      onCommit={(v) => api.setActual(row.i, l.id, v ?? 0)}
                    />
                    {drift != null && Math.abs(drift) > 0.5 ? (
                      <p className={`text-[11.5px] mt-1.5 ${drift >= 0 ? "text-good" : "text-crit"}`}>
                        {drift >= 0 ? "Ahead by " : "Behind by "}
                        {inr(Math.abs(drift))}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="note">
            <b>What actuals do and do not do.</b> They are recorded against the month and loan so you can see drift between the plan and real
            life, but the projection still runs off the loan balances. When you have drifted, update the loan balance on the{" "}
            <b>Now</b> tab — that is what re-forecasts everything.
          </div>
        </>
      )}
    </div>
  );
}
