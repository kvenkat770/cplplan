"use client";

import { useState } from "react";
import type { PlanApi } from "@/lib/store";
import type { Loan } from "@/lib/types";
import { inr, lakh, monthLabel, pct } from "@/lib/format";
import { Chevron, Figure, Fold, LineChart, NumberField, Pill, Sheet, Spark, TextField, Tone } from "./ui";

function rateTone(r: number): Tone {
  return r >= 0.125 ? "crit" : r >= 0.095 ? "warn" : "good";
}

const RULES = [
  ["Every closed EMI becomes prepayment, not lifestyle.", "Creates the cash-flow snowball."],
  ["No equity exposure for the Thar DP or the CPL fund.", "Both goals are time-bound; protect the capital."],
  ["The ₹30K chit is a fixed obligation through Oct 2028.", "Prevents accidental overspending."],
  ["Type rating is a later decision, after a credible airline pathway.", "Avoids paying for an expensive qualification too early."],
  ["The plan must work with pilot income of ₹0 for 12 months.", "Protects against training and employment delays."],
  ["75% home-loan paydown is optional; resilience is the goal.", "Avoids swapping one large liability for another."],
];

function LoanSheet({ loan, api, onClose }: { loan: Loan; api: PlanApi; onClose: () => void }) {
  const s = api.settings!;
  const set = (patch: Partial<Loan>) => api.updateLoan(loan.id, patch);
  const ml = (i: number | null) => (i == null ? "—" : monthLabel(i, s.start_year, s.start_month, true));

  return (
    <Sheet
      title={loan.name}
      subtitle={`${pct(loan.rate)} · ${inr(loan.emi)} a month`}
      onClose={onClose}
      footer={
        <button
          type="button"
          className="btn btn-danger w-full justify-center"
          onClick={() => {
            if (confirm(`Delete "${loan.name}"? Any actuals logged against it go too.`)) {
              api.deleteLoan(loan.id);
              onClose();
            }
          }}
        >
          Delete this loan
        </button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Name" value={loan.name} onCommit={(v) => set({ name: v })} />
        <TextField label="Note" value={loan.lender} onCommit={(v) => set({ lender: v })} />
        <NumberField label="Balance" value={loan.balance} step={1000} hint={lakh(loan.balance)} onCommit={(v) => set({ balance: v ?? 0 })} />
        <NumberField label="Rate" value={loan.rate} step={0.0005} hint={`${pct(loan.rate)} — enter 0.1634 for 16.34%`} onCommit={(v) => set({ rate: v ?? 0 })} />
        <NumberField label="EMI" value={loan.emi} step={100} hint={inr(loan.emi)} onCommit={(v) => set({ emi: v ?? 0 })} />
        <NumberField label="Prepay rank" value={loan.prepay_rank} nullable hint="Lowest is attacked first. Blank = never." onCommit={(v) => set({ prepay_rank: v })} />
      </div>

      <Fold title="Balance transfer" hint={loan.refi_month == null ? "Not planned" : `${ml(loan.refi_month)} → ${inr(loan.refi_emi ?? 0)}`}>
        <div className="grid gap-3 sm:grid-cols-3">
          <NumberField label="In month" value={loan.refi_month} nullable hint={ml(loan.refi_month)} onCommit={(v) => set({ refi_month: v })} />
          <NumberField label="New rate" value={loan.refi_rate} nullable step={0.0005} hint={loan.refi_rate ? pct(loan.refi_rate) : "—"} onCommit={(v) => set({ refi_rate: v })} />
          <NumberField label="New EMI" value={loan.refi_emi} nullable step={250} hint={loan.refi_emi ? inr(loan.refi_emi) : "—"} onCommit={(v) => set({ refi_emi: v })} />
        </div>
      </Fold>

      <Fold title="Closing it" hint={`${loan.foreclose_month == null ? "No forced closure" : `Foreclose ${ml(loan.foreclose_month)}`} · ${loan.sale_rank == null ? "not in the sale waterfall" : `sale rank ${loan.sale_rank}`}`}>
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField label="Foreclose in month" value={loan.foreclose_month} nullable hint={ml(loan.foreclose_month)} onCommit={(v) => set({ foreclose_month: v })} />
          <NumberField label="Sale waterfall rank" value={loan.sale_rank} nullable hint="Order the sale proceeds clear debts" onCommit={(v) => set({ sale_rank: v })} />
        </div>
        <label className="flex items-start gap-2.5 text-[13px] mt-3">
          <input type="checkbox" className="tick" checked={loan.prepay_blocked_until_sale} onChange={(e) => set({ prepay_blocked_until_sale: e.target.checked })} />
          <span>
            Hands off until the property sells
            <span className="block text-[11.5px] text-ink3">Secured debt waits while the expensive unsecured debt dies first.</span>
          </span>
        </label>
      </Fold>

      {loan.starts_month != null ? (
        <Fold title="Purchase" hint={`${ml(loan.starts_month)} · ${lakh(loan.down_payment ?? 0)} down`} defaultOpen>
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField label="Bought in month" value={loan.starts_month} nullable hint={ml(loan.starts_month)} onCommit={(v) => set({ starts_month: v })} />
            <NumberField label="On-road price" value={loan.purchase_price} nullable step={10000} hint={lakh(loan.purchase_price ?? 0)} onCommit={(v) => set({ purchase_price: v })} />
            <NumberField label="Down payment" value={loan.down_payment} nullable step={10000} hint={lakh(loan.down_payment ?? 0)} onCommit={(v) => set({ down_payment: v })} />
            <NumberField label="Tenure, months" value={loan.tenure_months} nullable onCommit={(v) => set({ tenure_months: v })} />
          </div>
        </Fold>
      ) : null}
    </Sheet>
  );
}

export default function OverviewTab({ api, now }: { api: PlanApi; now: number }) {
  const s = api.settings!;
  const p = api.projection!;
  const row = p.rows[now];
  const H = p.rows.length;
  const [editing, setEditing] = useState<Loan | null>(null);

  const closedMonths = Object.values(p.closed);
  const lastClear = closedMonths.length ? Math.max(...closedMonths) : null;
  const end = p.rows[H - 1];

  const at = (i: number) => p.rows[Math.max(0, Math.min(H - 1, i))];
  const thar = api.loans.find((l) => l.starts_month != null);
  const worst = api.loans.filter((l) => l.prepay_rank != null).sort((a, b) => (a.prepay_rank ?? 0) - (b.prepay_rank ?? 0))[0];
  const refi = api.loans.find((l) => l.refi_month != null);

  const rungs = [
    { l: "Today", i: 0 },
    { l: "After the transfer", i: refi?.refi_month ?? 1 },
    { l: "Car EMI starts", i: (thar?.starts_month ?? 5) + 1 },
    { l: worst ? `${worst.name.split(" ")[0]} closes` : "Worst loan closes", i: (worst ? p.closed[worst.id] ?? 8 : 8) + 1 },
    { l: "Sale clears the rest", i: s.sale_month + 1 },
    { l: "Chit ends", i: H - 1 },
  ];
  const rungVals = rungs.map((r) => at(r.i).free);
  const rungMax = Math.max(...rungVals, 1);

  const openNow = api.activities.filter((a) => a.month_index <= now && !a.done).slice(0, 3);

  return (
    <div className="flex flex-col gap-7">
      {/* hero */}
      <section>
        <Figure label="Total debt" value={lakh(row.totalDebt)} hero />
        <p className="text-[13px] text-ink2 mt-2">
          {lakh(p.rows[0].totalDebt)} today → <span className="num">{lakh(end.totalDebt)}</span> by {monthLabel(H - 1, s.start_year, s.start_month, true)}
        </p>
        <div className="mt-3">
          <Spark values={p.rows.map((r) => r.totalDebt)} color="var(--crit)" />
        </div>
        <div className="grid grid-cols-3 gap-4 mt-5">
          <Figure label="EMIs" value={lakh(row.emiTotal)} sub={`${Math.round((row.emiTotal / s.salary) * 100)}% of salary`} />
          <Figure label="Free cash" value={inr(row.free)} tone="signal" sub="each month" />
          <Figure label="Debt-free" value={lastClear == null ? "—" : monthLabel(lastClear, s.start_year, s.start_month)} sub="consumer debt" />
        </div>
      </section>

      {/* open items */}
      {openNow.length ? (
        <section className="flex flex-col gap-2.5">
          <h2 className="sect">Open now</h2>
          <div className="group">
            {openNow.map((a) => (
              <label key={a.id} className="row cursor-pointer">
                <input
                  type="checkbox"
                  className="tick"
                  checked={a.done}
                  aria-label={`Mark "${a.title}" done`}
                  onChange={(e) => api.updateActivity(a.id, { done: e.target.checked })}
                />
                <span className="flex-1 min-w-0">
                  <span className="block text-[14px] font-medium leading-snug">{a.title}</span>
                  <span className="num block text-[11px] text-ink3 mt-0.5 uppercase tracking-wider">
                    {monthLabel(a.month_index, s.start_year, s.start_month, true)}
                  </span>
                </span>
                {a.is_milestone ? <Pill tone="sig">milestone</Pill> : null}
              </label>
            ))}
          </div>
        </section>
      ) : null}

      {/* loans */}
      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <h2 className="sect">What you owe</h2>
          <button type="button" className="btn btn-quiet !py-1.5 !px-2.5 !text-[12px]" onClick={() => api.addLoan()}>
            Add
          </button>
        </div>
        <div className="group">
          {api.loans.map((l) => {
            const bal = row.balances[l.id] ?? 0;
            const emi = row.emis[l.id] ?? 0;
            const rate = row.rates[l.id] ?? l.rate;
            const pending = l.starts_month != null && now < l.starts_month;
            const cleared = !pending && bal <= 0;
            return (
              <button key={l.id} type="button" className="row" onClick={() => setEditing(l)}>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2">
                    <span className={`text-[14.5px] font-medium truncate ${cleared || pending ? "text-ink3" : ""}`}>{l.name}</span>
                    {pending ? (
                      <Pill tone="mute">{monthLabel(l.starts_month!, s.start_year, s.start_month)}</Pill>
                    ) : cleared ? (
                      <Pill tone="good">clear</Pill>
                    ) : (
                      <Pill tone={rateTone(rate)}>{pct(rate)}</Pill>
                    )}
                  </span>
                  {!cleared && !pending && emi > 0 ? <span className="num block text-[11.5px] text-ink3 mt-0.5">{inr(emi)} a month</span> : null}
                </span>
                <span className="num text-[15px] font-medium tabular-nums">{pending ? "—" : lakh(Math.max(0, bal))}</span>
                <Chevron />
              </button>
            );
          })}
        </div>
      </section>

      {/* snowball */}
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="sect">The snowball</h2>
          <p className="text-[13px] text-ink2 mt-1">Free cash after every EMI, the chit and living costs.</p>
        </div>
        <div className="flex flex-col gap-2.5">
          {rungs.map((r, n) => (
            <div key={r.l} className="flex items-center gap-3">
              <span className="text-[12.5px] w-[38%] shrink-0 leading-tight">
                {r.l}
                <span className="num block text-[10.5px] text-ink3 uppercase tracking-wider">
                  {monthLabel(Math.max(0, Math.min(H - 1, r.i)), s.start_year, s.start_month)}
                </span>
              </span>
              <span className="flex-1 h-2 bg-surface3 rounded-full overflow-hidden">
                <span className="block h-full bg-signal rounded-full" style={{ width: `${Math.max(4, (rungVals[n] / rungMax) * 100)}%` }} />
              </span>
              <span className="num text-[12.5px] font-medium w-[62px] text-right">{inr(rungVals[n])}</span>
            </div>
          ))}
        </div>
      </section>

      {/* chart */}
      <section className="flex flex-col gap-2">
        <h2 className="sect">Debt down, corpus up</h2>
        <LineChart
          ariaLabel={`Total debt falls from ${lakh(p.rows[0].totalDebt)} to ${lakh(end.totalDebt)} while the CPL fund reaches ${lakh(end.cpl)}`}
          series={[
            { values: p.rows.map((r) => r.totalDebt), color: "var(--crit)", fill: "var(--crit-soft)", endLabel: true },
            { values: p.rows.map((r) => r.cpl), color: "var(--signal)", endLabel: true },
          ]}
          labels={(i) => monthLabel(i, s.start_year, s.start_month)}
          fmt={lakh}
          marker={s.sale_month}
          markerLabel="SALE"
        />
        <div className="flex gap-4 text-[11.5px] text-ink2">
          <span className="inline-flex items-center gap-1.5"><i className="w-2 h-2 rounded-full bg-crit" />Debt</span>
          <span className="inline-flex items-center gap-1.5"><i className="w-2 h-2 rounded-full bg-signal" />CPL fund</span>
        </div>
      </section>

      {/* rules */}
      <section className="flex flex-col gap-2.5">
        <h2 className="sect">Non-negotiable rules</h2>
        <Fold title="Six rules this plan rests on" hint="From the master plan">
          <ol className="flex flex-col gap-3.5">
            {RULES.map(([rule, why], i) => (
              <li key={i} className="flex gap-3">
                <span className="num text-[11px] text-ink3 pt-0.5 w-3 shrink-0">{i + 1}</span>
                <span className="text-[13.5px] leading-snug">
                  {rule}
                  <span className="block text-[12px] text-ink3 mt-0.5">{why}</span>
                </span>
              </li>
            ))}
          </ol>
        </Fold>
      </section>

      {editing ? <LoanSheet loan={api.loans.find((l) => l.id === editing.id) ?? editing} api={api} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}
