"use client";

import type { PlanApi } from "@/lib/store";
import type { Loan, Settings } from "@/lib/types";
import { corpus, fundingGap, stressTest } from "@/lib/engine";
import { inr, lakh, monthLabel } from "@/lib/format";
import { NumberField, Pill, Slider, Stat, StatGrid, Tone } from "./ui";

function Verdict({ k, v, t, children }: { k: string; v: string; t: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface px-[13px] py-3 grid grid-cols-[1fr_auto] gap-x-2.5 gap-y-[3px] items-baseline">
      <span className="text-[12.5px] font-semibold">{k}</span>
      <span className="num text-[15px] font-semibold text-right">{v}</span>
      <span className="text-[11.5px] text-ink3">{t}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

export default function SimulateTab({ api }: { api: PlanApi }) {
  const s = api.settings!;
  const p = api.projection!;
  const set = (patch: Partial<Settings>) => api.updateSettings(patch);
  const ml = (i: number) => monthLabel(i, s.start_year, s.start_month, true);
  /** What a loan starts at — a purchase that has not happened yet starts at the financed amount. */
  const opening = (l: Loan) =>
    l.starts_month != null ? Math.max(0, (l.purchase_price ?? 0) - (l.down_payment ?? 0)) : l.balance;

  const gap = fundingGap(p, s);
  const corp = corpus(p, s);
  const stress = stressTest(p, s);

  const gapTone: Tone = gap <= 2000000 ? "good" : gap <= 3000000 ? "warn" : "crit";
  const gapWord = gap <= 2000000 ? "small, borrow it" : gap <= 3000000 ? "borrowable — stress-test it" : "too large, cut it down";

  const prepayOrder = api.loans
    .filter((l) => l.prepay_rank != null)
    .sort((a, b) => (a.prepay_rank ?? 0) - (b.prepay_rank ?? 0));
  const neverPrepay = api.loans.filter((l) => l.prepay_rank == null);

  const swap = (i: number, j: number) => {
    const a = prepayOrder[i];
    const b = prepayOrder[j];
    if (!a || !b) return;
    api.updateLoan(a.id, { prepay_rank: b.prepay_rank });
    api.updateLoan(b.id, { prepay_rank: a.prepay_rank });
  };

  const secured = api.loans.filter((l) => l.prepay_blocked_until_sale);
  const securedLeft = secured.reduce((sum, l) => sum + (p.end.balances[l.id] ?? 0), 0);
  const securedStart = secured.reduce((sum, l) => sum + l.balance, 0);

  return (
    <div className="flex flex-col gap-[18px]">
      <div>
        <h2 className="font-display font-bold text-[20px]">Move the levers</h2>
        <p className="text-[14px] text-ink2 max-w-[62ch]">
          These drive the whole model. Every change saves and re-runs the {s.horizon_months}-month projection immediately.
        </p>
      </div>

      <div className="card p-[14px]">
        <div className="eyebrow mb-3">Income and commitments</div>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField label="Monthly salary" value={s.salary} step={5000} onCommit={(v) => set({ salary: v ?? 0 })} hint={inr(s.salary)} />
          <NumberField label="Personal expenses" value={s.expenses} step={1000} onCommit={(v) => set({ expenses: v ?? 0 })} hint={inr(s.expenses)} />
          <NumberField label="Chit contribution" value={s.chit_amount} step={1000} onCommit={(v) => set({ chit_amount: v ?? 0 })} hint={inr(s.chit_amount)} />
          <NumberField
            label="Chit stops at month"
            value={s.chit_end_month}
            onCommit={(v) => set({ chit_end_month: v ?? 0 })}
            hint={`Last contribution ${ml(Math.max(0, s.chit_end_month - 1))}`}
          />
          <NumberField label="Savings at the start" value={s.savings_start} step={25000} onCommit={(v) => set({ savings_start: v ?? 0 })} hint={lakh(s.savings_start)} />
          <NumberField label="Months to project" value={s.horizon_months} onCommit={(v) => set({ horizon_months: Math.max(1, v ?? 25) })} hint={`Ends ${ml(s.horizon_months - 1)}`} />
        </div>
      </div>

      <div className="card p-[14px]">
        <div className="eyebrow mb-3">The levers that move the dates</div>
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-x-6">
          <Slider
            label="Liquid floor before prepaying"
            value={s.liquid_floor}
            min={0}
            max={500000}
            step={25000}
            display={lakh(s.liquid_floor)}
            hint="Cash you refuse to go below while attacking loans."
            onChange={(v) => set({ liquid_floor: v })}
          />
          <Slider
            label="Emergency fund held"
            value={s.emergency_target}
            min={100000}
            max={1000000}
            step={50000}
            display={lakh(s.emergency_target)}
            hint="The reserve after the sale, and the line the stress test uses."
            onChange={(v) => set({ emergency_target: v })}
          />
          <Slider
            label="Property sale, net cash"
            value={s.sale_net}
            min={0}
            max={8000000}
            step={250000}
            display={lakh(s.sale_net)}
            hint="Net after tax and transaction costs — not the asking price."
            onChange={(v) => set({ sale_net: v })}
          />
          <Slider
            label="Sale completes in month"
            value={s.sale_month}
            min={0}
            max={Math.max(0, s.horizon_months - 1)}
            step={1}
            display={ml(s.sale_month)}
            hint="Property timelines slip. Test a slip."
            onChange={(v) => set({ sale_month: v })}
          />
          <Slider
            label="Secured prepayment from the sale"
            value={s.home_prepay_cap}
            min={0}
            max={4000000}
            step={100000}
            display={lakh(s.home_prepay_cap)}
            hint="Whatever you do not spend here becomes pilot fund."
            onChange={(v) => set({ home_prepay_cap: v })}
          />
          <Slider
            label="CPL budget to fund"
            value={s.cpl_budget}
            min={3000000}
            max={8000000}
            step={250000}
            display={lakh(s.cpl_budget)}
            hint="Minimum ₹45L · realistic ₹50–55L · worst case ₹60L."
            onChange={(v) => set({ cpl_budget: v })}
          />
        </div>
      </div>

      <div className="card p-[14px]">
        <div className="eyebrow">Prepayment priority</div>
        <p className="text-[14px] text-ink2 max-w-[62ch] mt-1 mb-3">
          Spare cash each month goes down this list in order. Highest interest first is almost always right — but it is yours to change.
        </p>
        <div className="flex flex-col gap-2">
          {prepayOrder.map((l, i) => (
            <div key={l.id} className="flex items-center gap-2.5 border border-line rounded-[10px] px-3 py-2 bg-surface2">
              <span className="num w-6 h-6 rounded-md grid place-items-center text-[11px] font-semibold bg-signalSoft text-signal shrink-0">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="font-semibold text-[13.5px] block truncate">{l.name}</span>
                <span className="num text-[11.5px] text-ink3">
                  {(l.rate * 100).toFixed(2)}% · {lakh(opening(l))}
                  {l.starts_month != null ? " to finance" : ""}
                  {l.prepay_blocked_until_sale ? " · waits for the sale" : ""}
                </span>
              </span>
              <span className="flex gap-1 shrink-0">
                <button type="button" className="btn !px-2 !py-1" disabled={i === 0} onClick={() => swap(i, i - 1)} aria-label={`Move ${l.name} up`}>
                  ↑
                </button>
                <button
                  type="button"
                  className="btn !px-2 !py-1"
                  disabled={i === prepayOrder.length - 1}
                  onClick={() => swap(i, i + 1)}
                  aria-label={`Move ${l.name} down`}
                >
                  ↓
                </button>
                <button type="button" className="btn !px-2 !py-1 text-[11px]" onClick={() => api.updateLoan(l.id, { prepay_rank: null })}>
                  Remove
                </button>
              </span>
            </div>
          ))}
          {neverPrepay.length ? (
            <div className="text-[12.5px] text-ink3 mt-1">
              Never prepaid:{" "}
              {neverPrepay.map((l, i) => (
                <span key={l.id}>
                  {i ? ", " : ""}
                  <button
                    type="button"
                    className="underline hover:text-ink"
                    onClick={() => api.updateLoan(l.id, { prepay_rank: prepayOrder.length + 1 + i })}
                  >
                    {l.name}
                  </button>
                </span>
              ))}{" "}
              — click one to add it to the queue.
            </div>
          ) : null}
        </div>
      </div>

      <div>
        <div className="eyebrow mb-2">What the model produces</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-line border border-line rounded-[10px] overflow-hidden">
          {api.loans.map((l) => {
            const closedAt = p.closed[l.id];
            const left = p.end.balances[l.id] ?? 0;
            return (
              <Verdict
                key={l.id}
                k={`${l.name} closed`}
                v={closedAt != null ? ml(closedAt) : "—"}
                t={closedAt != null ? `${(l.rate * 100).toFixed(2)}% · started at ${lakh(opening(l))}` : `${lakh(left)} still outstanding`}
              >
                {closedAt != null ? <Pill tone="good">cleared</Pill> : <Pill tone={left > 0 ? "warn" : "mute"}>runs past {ml(s.horizon_months - 1)}</Pill>}
              </Verdict>
            );
          })}
          <Verdict k="CPL corpus at the end" v={lakh(corp)} t="pilot fund plus cash above the reserve">
            <Pill tone="sig">{s.cpl_budget > 0 ? Math.round((corp / s.cpl_budget) * 100) : 0}% of budget</Pill>
          </Verdict>
          <Verdict k="Funding gap to borrow" v={lakh(gap)} t={`against a ${lakh(s.cpl_budget)} CPL budget`}>
            <Pill tone={gapTone}>{gapWord}</Pill>
          </Verdict>
          <Verdict k="Secured debt remaining" v={lakh(securedLeft)} t={`from ${lakh(securedStart)}`}>
            <Pill tone="mute">{securedStart > 0 ? Math.round((1 - securedLeft / securedStart) * 100) : 0}% paid down</Pill>
          </Verdict>
          <Verdict k="Liquid reserve" v={lakh(p.end.cash)} t="at the end, outside the CPL fund">
            <Pill tone={p.end.cash >= 500000 ? "good" : "warn"}>{p.end.cash >= 500000 ? "₹5L+ held" : "below ₹5L"}</Pill>
          </Verdict>
        </div>
      </div>

      <div className="card p-[14px]">
        <div className="eyebrow">The waterfall</div>
        <h3 className="font-display font-bold text-[16px] mt-1 mb-0.5">Property sale · {ml(s.sale_month)}</h3>
        <p className="text-[14px] text-ink2 max-w-[62ch] mb-1.5">
          Order matters. Consumer debt dies first; secured debt gets what is left after the pilot fund is carved out.
        </p>
        <div className="flex flex-col">
          {p.waterfall.length ? (
            p.waterfall.map((w, i) => (
              <div key={`${w.key}-${i}`} className="grid grid-cols-[auto_1fr_auto] gap-2.5 items-center py-[9px] border-b border-dashed border-line last:border-b-0">
                <span
                  className={`num w-[22px] h-[22px] rounded-md grid place-items-center text-[10px] font-semibold ${
                    w.kind === "pay" ? "bg-goodSoft text-good" : w.kind === "keep" ? "bg-signalSoft text-signal" : "bg-surface3 text-ink2"
                  }`}
                >
                  {w.kind === "in" ? "IN" : i}
                </span>
                <span>
                  <span className="text-[13.5px] font-medium block">{w.label}</span>
                  <span className="text-[11.5px] text-ink3">{w.detail}</span>
                </span>
                <span className="num text-[14px] font-medium">{lakh(w.amount)}</span>
              </div>
            ))
          ) : (
            <p className="text-[13.5px] text-ink2">No sale inside this window — move the sale month inside {s.horizon_months} months.</p>
          )}
        </div>
      </div>

      <div className="card p-[14px]">
        <div className="eyebrow">Stress test</div>
        <h3 className="font-display font-bold text-[16px] mt-1 mb-2.5">Pilot income = ₹0 for 12 months from {ml(s.horizon_months - 1)}</h3>
        <div className="grid gap-3 sm:grid-cols-2 mb-3">
          <NumberField
            label="Pilot loan rate"
            value={s.pilot_loan_rate}
            step={0.0025}
            hint={`${(s.pilot_loan_rate * 100).toFixed(2)}%`}
            onCommit={(v) => set({ pilot_loan_rate: v ?? 0 })}
          />
          <NumberField
            label="Pilot loan tenure, months"
            value={s.pilot_loan_tenure}
            hint={`${Math.round(s.pilot_loan_tenure / 12)} years`}
            onCommit={(v) => set({ pilot_loan_tenure: v ?? 1 })}
          />
        </div>
        <StatGrid>
          <Stat k="Remaining EMIs" v={inr(stress.servicedEmis)} s="still running at the end" />
          <Stat k="Pilot loan EMI" v={inr(stress.pilotEmi)} s={`${lakh(stress.gap)} over ${Math.round(s.pilot_loan_tenure / 12)} years`} />
          <Stat k="12 months of cost" v={lakh(stress.need)} s="EMIs plus living costs" />
          <Stat k="Reserve available" v={lakh(stress.have)} s="liquid at the end" />
        </StatGrid>
        <div className={`note mt-3 ${stress.survives ? "note-good" : ""}`}>
          <b>{stress.survives ? "Survives the test." : "Does not survive as configured."}</b> A year with no pilot income costs{" "}
          {lakh(stress.need)} and you hold {lakh(stress.have)}.{" "}
          {stress.survives
            ? "The plan's own stress test passes."
            : `That is short by ${lakh(stress.need - stress.have)}. Three ways out: borrow less by cutting the CPL budget or saving longer, send more of the sale into the pilot fund instead of the secured prepayment, or keep earning into the first months of training.`}
        </div>
      </div>

      <div className="note">
        <b>One correction to the original plan.</b> Do not chase &ldquo;75% of the home loan paid&rdquo; as a number. Zero personal debt, zero car
        debt, a substantially reduced home loan, a ₹20–30L+ pilot corpus and a small aviation loan is a far stronger position than 75% paid plus a
        fresh ₹50L loan and no cash. Push <b>Secured prepayment from the sale</b> up and watch the funding gap and the stress test both move the
        wrong way.
      </div>
    </div>
  );
}
