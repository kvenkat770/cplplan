"use client";

import { useState } from "react";
import type { PlanApi } from "@/lib/store";
import { inr, lakh, monthLabel } from "@/lib/format";
import { BarChart, Chevron, NumberField, Pill, Sheet } from "./ui";

export default function MonthsTab({ api, now }: { api: PlanApi; now: number }) {
  const s = api.settings!;
  const p = api.projection!;
  const [open, setOpen] = useState<number | null>(now);
  const [logging, setLogging] = useState<number | null>(null);

  const actualFor = (mi: number, loanId: string) =>
    api.actuals.find((a) => a.month_index === mi && a.loan_id === loanId)?.amount ?? null;

  const logRow = logging == null ? null : p.rows[logging];

  return (
    <div className="flex flex-col gap-7">
      <section>
        <h1 className="font-display text-[20px] font-bold">Months</h1>
        <p className="text-[13px] text-ink2 mt-1">
          Every rupee of {inr(s.salary)} placed, across {s.horizon_months} months. Tap a month to open it.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="sect">Free cash each month</h2>
        <BarChart
          values={p.rows.map((r) => r.free)}
          highlight={p.rows.map((r) => r.events.length > 0)}
          labels={(i) => monthLabel(i, s.start_year, s.start_month)}
          fmt={lakh}
          ariaLabel={`Free cash per month, from ${inr(p.rows[0].free)} to ${inr(p.rows[p.rows.length - 1].free)}`}
        />
      </section>

      <section className="flex flex-col gap-2.5">
        <h2 className="sect">Month by month</h2>
        <div className="group">
          {p.rows.map((r) => {
            const isOpen = open === r.i;
            const isNow = r.i === now;
            return (
              <div key={r.i}>
                <button type="button" className="row" onClick={() => setOpen(isOpen ? null : r.i)} aria-expanded={isOpen}>
                  <span className="num text-[12px] text-ink3 w-[58px] shrink-0 uppercase tracking-wider">
                    {monthLabel(r.i, s.start_year, s.start_month)}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13.5px] truncate">
                      {r.events.length ? <span className="text-signal font-medium">{r.events.join(" · ")}</span> : r.target || "—"}
                    </span>
                    <span className="num block text-[11px] text-ink3 mt-0.5">{lakh(r.totalDebt)} left</span>
                  </span>
                  {isNow ? <Pill tone="mute">now</Pill> : null}
                  <span className="num text-[13.5px] font-medium">{inr(r.free)}</span>
                  <Chevron open={isOpen} />
                </button>

                {isOpen ? (
                  <div className="px-[15px] pb-4 pt-1 bg-surface2">
                    <dl className="grid grid-cols-2 gap-x-5 gap-y-2 text-[12.5px]">
                      {api.loans.map((l) =>
                        (r.paid[l.id] ?? 0) > 0.5 || (r.extra[l.id] ?? 0) > 0.5 ? (
                          <div key={l.id} className="flex justify-between gap-2 border-b border-line pb-1.5">
                            <dt className="text-ink2 truncate">{l.name.split(" ")[0]}</dt>
                            <dd className="num shrink-0">
                              {inr(r.paid[l.id] ?? 0)}
                              {(r.extra[l.id] ?? 0) > 0.5 ? <span className="text-signal"> +{inr(r.extra[l.id])}</span> : null}
                            </dd>
                          </div>
                        ) : null
                      )}
                      <div className="flex justify-between gap-2 border-b border-line pb-1.5">
                        <dt className="text-ink2">Chit + living</dt>
                        <dd className="num">{inr(r.chit + s.expenses)}</dd>
                      </div>
                      {r.toFund > 0.5 ? (
                        <div className="flex justify-between gap-2 border-b border-line pb-1.5">
                          <dt className="text-ink2">Purchase fund</dt>
                          <dd className="num">{inr(r.toFund)}</dd>
                        </div>
                      ) : null}
                      <div className="flex justify-between gap-2 border-b border-line pb-1.5">
                        <dt className="text-ink2">Liquid</dt>
                        <dd className="num">{inr(r.cash)}</dd>
                      </div>
                      <div className="flex justify-between gap-2 border-b border-line pb-1.5">
                        <dt className="text-ink2">CPL fund</dt>
                        <dd className="num">{inr(r.cpl)}</dd>
                      </div>
                    </dl>
                    <button type="button" className="btn btn-quiet mt-3.5 !text-[12px] !py-1.5" onClick={() => setLogging(r.i)}>
                      Log what you actually paid
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      {logRow ? (
        <Sheet
          title={`Actuals · ${monthLabel(logRow.i, s.start_year, s.start_month, true)}`}
          subtitle="What really left your account this month"
          onClose={() => setLogging(null)}
        >
          {api.loans.map((l) => {
            const planned = (logRow.paid[l.id] ?? 0) + (logRow.extra[l.id] ?? 0);
            const actual = actualFor(logRow.i, l.id);
            const drift = actual == null ? null : actual - planned;
            return (
              <div key={l.id}>
                <NumberField
                  label={l.name}
                  value={actual}
                  nullable
                  step={500}
                  hint={`Plan says ${inr(planned)}`}
                  onCommit={(v) => api.setActual(logRow.i, l.id, v ?? 0)}
                />
                {drift != null && Math.abs(drift) > 0.5 ? (
                  <p className={`text-[11.5px] mt-1 ${drift >= 0 ? "text-good" : "text-crit"}`}>
                    {drift >= 0 ? "Ahead by " : "Behind by "}
                    {inr(Math.abs(drift))}
                  </p>
                ) : null}
              </div>
            );
          })}
          <p className="note">
            Actuals record drift — they do not change the forecast. When you have genuinely drifted, update the loan balance on
            the <b>Overview</b> tab; that is what re-forecasts everything.
          </p>
        </Sheet>
      ) : null}
    </div>
  );
}
