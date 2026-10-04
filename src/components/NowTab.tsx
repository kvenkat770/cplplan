"use client";

import { useState } from "react";
import type { PlanApi } from "@/lib/store";
import type { Loan } from "@/lib/types";
import { inr, lakh, monthLabel, pct } from "@/lib/format";
import { LineChart, NumberField, Pill, Stat, StatGrid, TextField, Tone } from "./ui";

function rateTone(r: number): Tone {
  return r >= 0.125 ? "crit" : r >= 0.095 ? "warn" : "good";
}

function LoanRow({ loan, api, now }: { loan: Loan; api: PlanApi; now: number }) {
  const [open, setOpen] = useState(false);
  const s = api.settings!;
  const p = api.projection!;
  const row = p.rows[now];
  const bal = row.balances[loan.id] ?? 0;
  const emi = row.emis[loan.id] ?? 0;
  const rate = row.rates[loan.id] ?? loan.rate;
  const pending = loan.starts_month != null && now < loan.starts_month;
  const cleared = !pending && bal <= 0;
  const closedAt = p.closed[loan.id];

  const original = loan.starts_month != null ? Math.max(1, (loan.purchase_price ?? 0) - (loan.down_payment ?? 0)) : Math.max(1, loan.balance);
  const paidPct = cleared ? 100 : Math.max(2, Math.min(100, (1 - bal / original) * 100));
  const tone: Tone = cleared ? "good" : rateTone(rate);

  const set = (patch: Partial<Loan>) => api.updateLoan(loan.id, patch);

  return (
    <div className="border-t border-line first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-[13px] py-3 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1"
        aria-expanded={open}
      >
        <span className={`font-semibold text-[14.5px] flex items-center gap-2 flex-wrap ${cleared || pending ? "text-ink3" : ""}`}>
          {loan.name}
          {pending ? (
            <Pill tone="mute">starts {monthLabel(loan.starts_month!, s.start_year, s.start_month, true)}</Pill>
          ) : cleared ? (
            <Pill tone="good">cleared {closedAt != null ? monthLabel(closedAt, s.start_year, s.start_month, true) : ""}</Pill>
          ) : (
            <Pill tone={tone}>{pct(rate)}</Pill>
          )}
        </span>
        <span className="num text-[16px] font-medium text-right">{pending ? "—" : lakh(Math.max(0, bal))}</span>
        <span className="text-[12px] text-ink3">{loan.lender || "—"}</span>
        <span className="num text-[12px] text-ink3 text-right">{emi > 0 && !cleared && !pending ? `${inr(emi)}/mo` : "no EMI"}</span>
        {!pending ? (
          <span className="col-span-2 h-1 bg-surface3 rounded mt-1.5 overflow-hidden block">
            <span className="block h-full rounded" style={{ width: `${paidPct}%`, background: `var(--${tone === "sig" ? "signal" : tone})` }} />
          </span>
        ) : null}
        <span className="col-span-2 text-[11px] text-ink3 mt-1">{open ? "Tap to close" : "Tap to edit"}</span>
      </button>

      {open ? (
        <div className="px-[13px] pb-4 pt-1 bg-surface2 border-t border-line grid gap-3 sm:grid-cols-2">
          <TextField label="Name" value={loan.name} onCommit={(v) => set({ name: v })} />
          <TextField label="Note under the name" value={loan.lender} onCommit={(v) => set({ lender: v })} />
          <NumberField label="Outstanding balance" value={loan.balance} step={1000} onCommit={(v) => set({ balance: v ?? 0 })} />
          <NumberField
            label="Annual rate"
            value={loan.rate}
            step={0.0005}
            suffix={pct(loan.rate)}
            hint="As a decimal — 0.1634 is 16.34%"
            onCommit={(v) => set({ rate: v ?? 0 })}
          />
          <NumberField label="Scheduled EMI" value={loan.emi} step={100} onCommit={(v) => set({ emi: v ?? 0 })} />
          <NumberField
            label="Prepay rank"
            value={loan.prepay_rank}
            nullable
            hint="Lowest number is attacked first. Blank means never prepay."
            onCommit={(v) => set({ prepay_rank: v })}
          />
          <NumberField
            label="Refinance in month"
            value={loan.refi_month}
            nullable
            hint={loan.refi_month != null ? monthLabel(loan.refi_month, s.start_year, s.start_month, true) : "Blank = no transfer"}
            onCommit={(v) => set({ refi_month: v })}
          />
          <NumberField label="Rate after refinance" value={loan.refi_rate} nullable step={0.0005} onCommit={(v) => set({ refi_rate: v })} />
          <NumberField label="EMI after refinance" value={loan.refi_emi} nullable step={250} onCommit={(v) => set({ refi_emi: v })} />
          <NumberField
            label="Foreclose in month"
            value={loan.foreclose_month}
            nullable
            hint={loan.foreclose_month != null ? monthLabel(loan.foreclose_month, s.start_year, s.start_month, true) : "Blank = let it run"}
            onCommit={(v) => set({ foreclose_month: v })}
          />
          <NumberField
            label="Cleared by the sale, rank"
            value={loan.sale_rank}
            nullable
            hint="Order the sale proceeds pay things off"
            onCommit={(v) => set({ sale_rank: v })}
          />
          <label className="flex items-center gap-2 text-[12.5px] sm:col-span-2">
            <input
              type="checkbox"
              checked={loan.prepay_blocked_until_sale}
              onChange={(e) => set({ prepay_blocked_until_sale: e.target.checked })}
              className="w-4 h-4 accent-[var(--signal)]"
            />
            Hands off until the property sells (secured debt waits its turn)
          </label>

          {loan.starts_month != null ? (
            <>
              <div className="sm:col-span-2 eyebrow pt-1">Purchase, not yet made</div>
              <NumberField
                label="Bought in month"
                value={loan.starts_month}
                nullable
                hint={monthLabel(loan.starts_month, s.start_year, s.start_month, true)}
                onCommit={(v) => set({ starts_month: v })}
              />
              <NumberField label="On-road price" value={loan.purchase_price} nullable step={10000} onCommit={(v) => set({ purchase_price: v })} />
              <NumberField label="Down payment" value={loan.down_payment} nullable step={10000} onCommit={(v) => set({ down_payment: v })} />
              <NumberField label="Tenure, months" value={loan.tenure_months} nullable onCommit={(v) => set({ tenure_months: v })} />
            </>
          ) : null}

          <div className="sm:col-span-2 flex justify-end pt-1">
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                if (confirm(`Delete "${loan.name}"? This also removes any actuals recorded against it.`)) api.deleteLoan(loan.id);
              }}
            >
              Delete this loan
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function NowTab({ api, now }: { api: PlanApi; now: number }) {
  const s = api.settings!;
  const p = api.projection!;
  const row = p.rows[now];
  const H = p.rows.length;

  const closedMonths = Object.values(p.closed);
  const lastClear = closedMonths.length ? Math.max(...closedMonths) : null;

  const homeish = api.loans.filter((l) => l.prepay_blocked_until_sale);
  const homeBal = homeish.reduce((sum, l) => sum + (row.balances[l.id] ?? 0), 0);
  const restBal = row.totalDebt - homeBal;

  const at = (i: number) => p.rows[Math.max(0, Math.min(H - 1, i))];
  const thar = api.loans.find((l) => l.starts_month != null);
  const kotak = api.loans.find((l) => l.prepay_rank === 1);
  const rungs = [
    { l: "Today", i: 0 },
    { l: "After the transfer", i: (api.loans.find((l) => l.refi_month != null)?.refi_month ?? 1) },
    { l: "Once the car EMI starts", i: (thar?.starts_month ?? 5) + 1 },
    { l: "After the worst loan closes", i: (kotak ? p.closed[kotak.id] ?? 8 : 8) + 1 },
    { l: "After the sale clears the rest", i: s.sale_month + 1 },
    { l: "After the chit ends", i: H - 1 },
  ];
  const rungVals = rungs.map((r) => at(r.i).free);
  const rungMax = Math.max(...rungVals, 1);

  return (
    <div className="flex flex-col gap-[18px]">
      <StatGrid>
        <Stat k="Total debt" v={lakh(row.totalDebt)} s={`secured ${lakh(homeBal)} · rest ${lakh(restBal)}`} />
        <Stat k="EMIs this month" v={lakh(row.emiTotal)} s={`${Math.round((row.emiTotal / s.salary) * 100)}% of your salary`} />
        <Stat k="Free cash" v={inr(row.free)} s="after EMIs, chit and expenses" lift />
        <Stat
          k="Consumer-debt free"
          v={lastClear == null ? "—" : monthLabel(lastClear, s.start_year, s.start_month, true)}
          s="only secured debt runs on"
        />
      </StatGrid>

      <div>
        <div className="flex items-baseline justify-between mb-2 gap-3 flex-wrap">
          <span className="eyebrow">What you owe this month — tap any loan to edit it</span>
          <button type="button" className="btn" onClick={() => api.addLoan()}>
            + Add a loan
          </button>
        </div>
        <div className="card flex flex-col">
          {api.loans.length ? (
            api.loans.map((l) => <LoanRow key={l.id} loan={l} api={api} now={now} />)
          ) : (
            <p className="p-4 text-[13.5px] text-ink2">No loans yet. Add one to start the model.</p>
          )}
        </div>
      </div>

      <div className="card p-[14px]">
        <div className="eyebrow">The one rule for 24 months</div>
        <h3 className="font-display font-bold text-[16px] mt-1 mb-0.5">Every EMI that dies becomes a payment, never a lifestyle</h3>
        <p className="text-[14px] text-ink2 max-w-[62ch] mb-3">
          Free cash after EMIs, chit and expenses. Each rung is a loan closing — the money has to move to the next target the same month it frees up.
        </p>
        <div className="flex flex-col gap-[7px]">
          {rungs.map((r, n) => (
            <div key={r.l} className="grid grid-cols-[minmax(80px,38%)_1fr_auto] gap-2.5 items-center text-[12.5px]">
              <div>
                {r.l}
                <div className="num text-[11px] text-ink3">{monthLabel(Math.max(0, Math.min(H - 1, r.i)), s.start_year, s.start_month, true)}</div>
              </div>
              <div className="h-4 bg-surface3 rounded overflow-hidden">
                <div className="h-full bg-signal rounded" style={{ width: `${Math.max(3, (rungVals[n] / rungMax) * 100)}%` }} />
              </div>
              <div className="num font-medium">{inr(rungVals[n])}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-[14px]">
        <div className="eyebrow">
          Debt down, corpus up · {monthLabel(0, s.start_year, s.start_month, true)} → {monthLabel(H - 1, s.start_year, s.start_month, true)}
        </div>
        <div className="mt-2.5">
          <LineChart
            ariaLabel={`Total debt falls from ${lakh(p.rows[0].totalDebt)} to ${lakh(p.rows[H - 1].totalDebt)} while the CPL fund reaches ${lakh(p.rows[H - 1].cpl)}`}
            series={[
              { values: p.rows.map((r) => r.totalDebt), color: "var(--crit)", fill: "var(--crit-soft)", endLabel: true },
              { values: p.rows.map((r) => homeish.reduce((sum, l) => sum + (r.balances[l.id] ?? 0), 0)), color: "var(--ink-3)", fill: "var(--surface-3)", width: 1.5 },
              { values: p.rows.map((r) => r.cpl), color: "var(--signal)", endLabel: true },
            ]}
            labels={(i) => monthLabel(i, s.start_year, s.start_month)}
            fmt={lakh}
            marker={s.sale_month}
            markerLabel="SALE"
          />
        </div>
        <div className="flex gap-3.5 flex-wrap text-[11.5px] text-ink2 mt-2">
          <span className="inline-flex items-center gap-1.5">
            <i className="w-2.5 h-2.5 rounded-sm bg-crit" />
            Everything you owe
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="w-2.5 h-2.5 rounded-sm bg-ink3" />
            Secured debt alone
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="w-2.5 h-2.5 rounded-sm bg-signal" />
            CPL fund
          </span>
        </div>
      </div>
    </div>
  );
}
