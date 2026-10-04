"use client";

import type { PlanApi } from "@/lib/store";
import type { Loan, Settings } from "@/lib/types";
import { corpus, fundingGap, stressTest } from "@/lib/engine";
import { inr, lakh, monthLabel } from "@/lib/format";
import { Fold, NumberField, Pill, Slider, Tone } from "./ui";

function Result({ k, v, t, tone, badge }: { k: string; v: string; t: string; tone?: Tone; badge?: string }) {
  return (
    <div className="row !py-3">
      <span className="flex-1 min-w-0">
        <span className="block text-[13.5px] font-medium">{k}</span>
        <span className="block text-[11.5px] text-ink3 mt-0.5">{t}</span>
      </span>
      <span className="text-right shrink-0">
        <span className="num block text-[14.5px] font-semibold">{v}</span>
        {badge ? (
          <span className="block mt-1">
            <Pill tone={tone ?? "mute"}>{badge}</Pill>
          </span>
        ) : null}
      </span>
    </div>
  );
}

export default function ModelTab({ api }: { api: PlanApi }) {
  const s = api.settings!;
  const p = api.projection!;
  const set = (patch: Partial<Settings>) => api.updateSettings(patch);
  const ml = (i: number) => monthLabel(i, s.start_year, s.start_month, true);
  const opening = (l: Loan) =>
    l.starts_month != null ? Math.max(0, (l.purchase_price ?? 0) - (l.down_payment ?? 0)) : l.balance;

  const gap = fundingGap(p, s);
  const corp = corpus(p, s);
  const stress = stressTest(p, s);
  const gapTone: Tone = gap <= 2000000 ? "good" : gap <= 3000000 ? "warn" : "crit";

  const queue = api.loans.filter((l) => l.prepay_rank != null).sort((a, b) => (a.prepay_rank ?? 0) - (b.prepay_rank ?? 0));
  const idle = api.loans.filter((l) => l.prepay_rank == null);
  const swap = (i: number, j: number) => {
    const a = queue[i];
    const b = queue[j];
    if (!a || !b) return;
    api.updateLoan(a.id, { prepay_rank: b.prepay_rank });
    api.updateLoan(b.id, { prepay_rank: a.prepay_rank });
  };

  const secured = api.loans.filter((l) => l.prepay_blocked_until_sale);
  const securedLeft = secured.reduce((sum, l) => sum + (p.end.balances[l.id] ?? 0), 0);
  const securedStart = secured.reduce((sum, l) => sum + l.balance, 0);

  return (
    <div className="flex flex-col gap-7">
      <section>
        <h1 className="font-display text-[20px] font-bold">Model</h1>
        <p className="text-[13px] text-ink2 mt-1">Change anything here and the whole projection re-runs. Saves as you go.</p>
      </section>

      {/* results first — this is what you came to see */}
      <section className="flex flex-col gap-2.5">
        <h2 className="sect">What it produces</h2>
        <div className="group">
          {api.loans.map((l) => {
            const closedAt = p.closed[l.id];
            const left = p.end.balances[l.id] ?? 0;
            return (
              <Result
                key={l.id}
                k={l.name}
                v={closedAt != null ? ml(closedAt) : lakh(left)}
                t={closedAt != null ? `cleared · opened at ${lakh(opening(l))}` : `still owing at ${ml(s.horizon_months - 1)}`}
                tone={closedAt != null ? "good" : "warn"}
                badge={closedAt != null ? "closed" : "runs on"}
              />
            );
          })}
          <Result
            k="CPL corpus"
            v={lakh(corp)}
            t="pilot fund plus cash above the reserve"
            tone="sig"
            badge={`${s.cpl_budget > 0 ? Math.round((corp / s.cpl_budget) * 100) : 0}% of budget`}
          />
          <Result
            k="Funding gap"
            v={lakh(gap)}
            t={`against a ${lakh(s.cpl_budget)} CPL budget`}
            tone={gapTone}
            badge={gap <= 2000000 ? "small" : gap <= 3000000 ? "borrowable" : "too large"}
          />
          <Result
            k="Secured debt left"
            v={lakh(securedLeft)}
            t={`from ${lakh(securedStart)}`}
            badge={`${securedStart > 0 ? Math.round((1 - securedLeft / securedStart) * 100) : 0}% paid`}
          />
          <Result
            k="Liquid reserve"
            v={lakh(p.end.cash)}
            t="at the end, outside the CPL fund"
            tone={p.end.cash >= 500000 ? "good" : "warn"}
            badge={p.end.cash >= 500000 ? "₹5L+ held" : "under ₹5L"}
          />
        </div>
      </section>

      {/* stress test */}
      <section className="flex flex-col gap-2.5">
        <h2 className="sect">Stress test</h2>
        <div className={`note ${stress.survives ? "note-good" : "note-warn"}`}>
          <b>{stress.survives ? "Survives." : "Does not survive."}</b> With pilot income at ₹0 for 12 months from {ml(s.horizon_months - 1)},
          you need {lakh(stress.need)} and hold {lakh(stress.have)}.
          {stress.survives
            ? " The plan's own test passes."
            : ` Short by ${lakh(stress.need - stress.have)} — borrow less, send more of the sale to the pilot fund, or keep earning into training.`}
        </div>
        <div className="group">
          <Result k="Remaining EMIs" v={inr(stress.servicedEmis)} t="still running at the end" />
          <Result k="Pilot loan EMI" v={inr(stress.pilotEmi)} t={`${lakh(stress.gap)} over ${Math.round(s.pilot_loan_tenure / 12)} years`} />
        </div>
      </section>

      {/* levers */}
      <section className="flex flex-col gap-4">
        <h2 className="sect">Levers</h2>
        <Slider label="Property sale, net cash" value={s.sale_net} min={0} max={8000000} step={250000} display={lakh(s.sale_net)}
          hint="Net after tax and costs, not the asking price." onChange={(v) => set({ sale_net: v })} />
        <Slider label="Sale completes" value={s.sale_month} min={0} max={Math.max(0, s.horizon_months - 1)} step={1} display={ml(s.sale_month)}
          hint="Property timelines slip. Test a slip." onChange={(v) => set({ sale_month: v })} />
        <Slider label="Secured prepayment from the sale" value={s.home_prepay_cap} min={0} max={4000000} step={100000} display={lakh(s.home_prepay_cap)}
          hint="Whatever you do not spend here becomes pilot fund." onChange={(v) => set({ home_prepay_cap: v })} />
        <Slider label="CPL budget" value={s.cpl_budget} min={3000000} max={8000000} step={250000} display={lakh(s.cpl_budget)}
          hint="Minimum ₹45L · realistic ₹50–55L · worst case ₹60L." onChange={(v) => set({ cpl_budget: v })} />
        <Slider label="Emergency fund held" value={s.emergency_target} min={100000} max={1000000} step={50000} display={lakh(s.emergency_target)}
          hint="Ring-fenced. Never spent on tuition." onChange={(v) => set({ emergency_target: v })} />
        <Slider label="Liquid floor before prepaying" value={s.liquid_floor} min={0} max={500000} step={25000} display={lakh(s.liquid_floor)}
          hint="Cash you refuse to drop below while attacking loans." onChange={(v) => set({ liquid_floor: v })} />
      </section>

      {/* prepay order */}
      <section className="flex flex-col gap-2.5">
        <h2 className="sect">Prepayment order</h2>
        <p className="text-[13px] text-ink2 -mt-1">Spare cash goes down this list. Highest rate first is almost always right.</p>
        <div className="group">
          {queue.map((l, i) => (
            <div key={l.id} className="row">
              <span className="num w-6 h-6 rounded-lg grid place-items-center text-[11px] font-semibold bg-signalSoft text-signal shrink-0">{i + 1}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-[13.5px] font-medium truncate">{l.name}</span>
                <span className="num block text-[11.5px] text-ink3">
                  {(l.rate * 100).toFixed(2)}% · {lakh(opening(l))}
                  {l.prepay_blocked_until_sale ? " · waits for the sale" : ""}
                </span>
              </span>
              <span className="flex gap-1 shrink-0">
                <button type="button" className="btn btn-quiet !px-2 !py-1" disabled={i === 0} onClick={() => swap(i, i - 1)} aria-label={`Move ${l.name} up`}>↑</button>
                <button type="button" className="btn btn-quiet !px-2 !py-1" disabled={i === queue.length - 1} onClick={() => swap(i, i + 1)} aria-label={`Move ${l.name} down`}>↓</button>
                <button type="button" className="btn btn-quiet !px-2 !py-1 !text-[11px]" onClick={() => api.updateLoan(l.id, { prepay_rank: null })}>Drop</button>
              </span>
            </div>
          ))}
          {idle.map((l) => (
            <button key={l.id} type="button" className="row text-ink3 text-[13px]" onClick={() => api.updateLoan(l.id, { prepay_rank: queue.length + 1 })}>
              + Add {l.name} to the queue
            </button>
          ))}
        </div>
      </section>

      {/* waterfall */}
      <section className="flex flex-col gap-2.5">
        <h2 className="sect">Sale waterfall · {ml(s.sale_month)}</h2>
        <div className="group">
          {p.waterfall.length ? (
            p.waterfall.map((w, i) => (
              <div key={`${w.key}-${i}`} className="row">
                <span
                  className={`num w-6 h-6 rounded-lg grid place-items-center text-[10px] font-semibold shrink-0 ${
                    w.kind === "pay" ? "bg-goodSoft text-good" : w.kind === "keep" ? "bg-signalSoft text-signal" : "bg-surface3 text-ink2"
                  }`}
                >
                  {w.kind === "in" ? "in" : i}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[13.5px] font-medium">{w.label}</span>
                  <span className="block text-[11.5px] text-ink3">{w.detail}</span>
                </span>
                <span className="num text-[14px] font-medium">{lakh(w.amount)}</span>
              </div>
            ))
          ) : (
            <p className="row text-[13px] text-ink2">No sale inside this window.</p>
          )}
        </div>
      </section>

      {/* the rest, folded away */}
      <section className="flex flex-col gap-2.5">
        <h2 className="sect">Inputs</h2>
        <Fold title="Income and commitments" hint={`${inr(s.salary)} in · ${inr(s.chit_amount + s.expenses)} committed`}>
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField label="Monthly salary" value={s.salary} step={5000} hint={inr(s.salary)} onCommit={(v) => set({ salary: v ?? 0 })} />
            <NumberField label="Living expenses" value={s.expenses} step={1000} hint={inr(s.expenses)} onCommit={(v) => set({ expenses: v ?? 0 })} />
            <NumberField label="Chit contribution" value={s.chit_amount} step={1000} hint={inr(s.chit_amount)} onCommit={(v) => set({ chit_amount: v ?? 0 })} />
            <NumberField label="Chit stops at month" value={s.chit_end_month} hint={`Last one ${ml(Math.max(0, s.chit_end_month - 1))}`} onCommit={(v) => set({ chit_end_month: v ?? 0 })} />
            <NumberField label="Savings at the start" value={s.savings_start} step={25000} hint={lakh(s.savings_start)} onCommit={(v) => set({ savings_start: v ?? 0 })} />
            <NumberField label="Months to project" value={s.horizon_months} hint={`Ends ${ml(s.horizon_months - 1)}`} onCommit={(v) => set({ horizon_months: Math.max(1, v ?? 25) })} />
          </div>
        </Fold>
        <Fold title="Pilot loan terms" hint={`${(s.pilot_loan_rate * 100).toFixed(2)}% over ${Math.round(s.pilot_loan_tenure / 12)} years`}>
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField label="Rate" value={s.pilot_loan_rate} step={0.0025} hint={`${(s.pilot_loan_rate * 100).toFixed(2)}%`} onCommit={(v) => set({ pilot_loan_rate: v ?? 0 })} />
            <NumberField label="Tenure, months" value={s.pilot_loan_tenure} hint={`${Math.round(s.pilot_loan_tenure / 12)} years`} onCommit={(v) => set({ pilot_loan_tenure: Math.max(1, v ?? 84) })} />
          </div>
        </Fold>
      </section>

      <p className="note">
        <b>One correction to the original plan.</b> Do not chase &ldquo;75% of the home loan paid&rdquo; as a number. Zero consumer debt, a
        manageable home loan, a large pilot corpus and a small aviation loan beats 75% paid plus a fresh ₹50L loan and no cash. Push{" "}
        <b>Secured prepayment from the sale</b> up and watch the gap and the stress test both move the wrong way.
      </p>
    </div>
  );
}
