import type { Settings, Loan, Projection, MonthRow, WaterfallItem } from "./types";

/** Standard amortising EMI. */
export function emiFor(principal: number, annualRate: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const i = annualRate / 12;
  if (i === 0) return principal / months;
  const f = Math.pow(1 + i, months);
  return (principal * i * f) / (f - 1);
}

type Live = {
  src: Loan;
  bal: number;
  rate: number;
  emi: number;
  bought: boolean;
};

const n = (v: unknown, d = 0) => (typeof v === "number" && isFinite(v) ? v : Number(v) || d);

/**
 * Runs the whole plan month by month.
 *
 * Everything the engine does is driven by data on the rows, so the behaviour is
 * editable from the UI:
 *   refi_month/refi_rate/refi_emi      a balance transfer
 *   starts_month/purchase_price/...    a purchase that has not happened yet
 *   foreclose_month                    a forced lump-sum closure
 *   prepay_rank                        which loan spare cash attacks, lowest first
 *   prepay_blocked_until_sale          hands off until the property sells
 *   sale_rank                          order the sale proceeds clear loans
 */
export function project(s: Settings, loansIn: Loan[]): Projection {
  const H = Math.max(1, Math.min(600, n(s.horizon_months, 25)));

  const loans: Live[] = loansIn
    .slice()
    .sort((a, b) => a.sort - b.sort)
    .map((l) => ({
      src: l,
      bal: n(l.balance),
      rate: n(l.rate),
      emi: n(l.emi),
      bought: l.starts_month == null,
    }));

  // The opening savings seed the down payment of the earliest planned purchase,
  // or sit as cash when nothing is planned.
  const planned = loans
    .filter((l) => l.src.starts_month != null)
    .sort((a, b) => (a.src.starts_month ?? 0) - (b.src.starts_month ?? 0));

  let fund = planned.length ? n(s.savings_start) : 0;
  let cash = planned.length ? 0 : n(s.savings_start);
  let cpl = 0;

  const closed: Record<string, number> = {};
  const rows: MonthRow[] = [];
  const waterfall: WaterfallItem[] = [];

  const markClosed = (l: Live, i: number, events: string[], word = "paid off") => {
    if (l.bal <= 0.5 && !(l.src.id in closed)) {
      l.bal = 0;
      closed[l.src.id] = i;
      events.push(`${l.src.name} ${word}`);
    }
  };

  for (let i = 0; i < H; i++) {
    const events: string[] = [];

    /* 1. refinance ------------------------------------------------------- */
    for (const l of loans) {
      if (l.src.refi_month === i && l.bal > 0) {
        if (l.src.refi_rate != null) l.rate = n(l.src.refi_rate);
        if (l.src.refi_emi != null) l.emi = n(l.src.refi_emi);
        events.push(`${l.src.name} transferred`);
      }
    }

    /* 2. scheduled EMIs -------------------------------------------------- */
    const paid: Record<string, number> = {};
    let emiTotal = 0;
    for (const l of loans) {
      if (!l.bought || l.bal <= 0.5) {
        paid[l.src.id] = 0;
        continue;
      }
      const interest = (l.bal * l.rate) / 12;
      const principal = Math.min(Math.max(0, l.emi - interest), l.bal);
      const pay = interest + principal;
      l.bal -= principal;
      paid[l.src.id] = pay;
      emiTotal += pay;
      markClosed(l, i, events);
    }

    /* 3. what is left of the salary -------------------------------------- */
    const chit = i < n(s.chit_end_month, H) ? n(s.chit_amount) : 0;
    const free = n(s.salary) - emiTotal - chit - n(s.expenses);
    let pool = free;
    if (pool < 0) {
      const draw = Math.min(cash, -pool);
      cash -= draw;
      pool += draw;
    }

    /* 4. fund the next planned purchase ---------------------------------- */
    let toFund = 0;
    const next = planned.find((l) => !l.bought);
    if (next && i <= (next.src.starts_month ?? 0)) {
      const goal = n(next.src.down_payment);
      const shortfall = Math.max(0, goal - fund);
      const monthsLeft = Math.max(1, (next.src.starts_month ?? 0) - i + 1);
      toFund = Math.max(0, Math.min(pool, shortfall / monthsLeft));
      fund += toFund;
      pool -= toFund;
    }

    /* 5. forced foreclosures --------------------------------------------- */
    for (const l of loans) {
      if (l.src.foreclose_month !== i || l.bal <= 0) continue;
      const need = l.bal;
      const fromPool = Math.min(pool, need);
      const fromCash = Math.min(cash, need - fromPool);
      if (fromPool + fromCash >= need - 1) {
        pool -= fromPool;
        cash -= fromCash;
        l.bal = 0;
        closed[l.src.id] = i;
        events.push(`${l.src.name} foreclosed`);
      }
    }

    /* 6. the property sale ----------------------------------------------- */
    if (i === n(s.sale_month, -1)) {
      cash += n(s.sale_net);
      events.push("Property sold");
      waterfall.push({ key: "net", label: "Net cash in hand", detail: "after tax and transaction costs", amount: n(s.sale_net), kind: "in" });

      const bySaleRank = loans
        .filter((l) => l.src.sale_rank != null && !l.src.prepay_blocked_until_sale && l.bal > 0)
        .sort((a, b) => (a.src.sale_rank ?? 0) - (b.src.sale_rank ?? 0));
      for (const l of bySaleRank) {
        if (cash >= l.bal) {
          const amt = l.bal;
          cash -= amt;
          l.bal = 0;
          closed[l.src.id] = i;
          waterfall.push({ key: l.src.id, label: `${l.src.name} to zero`, detail: l.src.lender, amount: amt, kind: "pay" });
          events.push(`${l.src.name} cleared by the sale`);
        }
      }

      // loans held back until the sale (the home loan) get a capped prepayment
      const held = loans
        .filter((l) => l.src.prepay_blocked_until_sale && l.bal > 0)
        .sort((a, b) => (a.src.sale_rank ?? 99) - (b.src.sale_rank ?? 99));
      let capLeft = n(s.home_prepay_cap);
      for (const l of held) {
        const spare = Math.max(0, cash - n(s.emergency_target));
        const amt = Math.min(l.bal, spare, capLeft);
        if (amt <= 0) continue;
        l.bal -= amt;
        cash -= amt;
        capLeft -= amt;
        waterfall.push({ key: l.src.id, label: `${l.src.name} prepayment`, detail: "secured and cheapest, so it waits", amount: amt, kind: "pay" });
        markClosed(l, i, events);
      }

      const toCpl = Math.max(0, cash - n(s.emergency_target));
      cpl += toCpl;
      cash -= toCpl;
      waterfall.push({ key: "cpl", label: "Pilot fund", detail: "separate account, do not touch", amount: toCpl, kind: "keep" });
      waterfall.push({ key: "keep", label: "Emergency fund held back", detail: "never spent on the sale", amount: cash, kind: "keep" });
    }

    /* 7. keep the liquid floor ------------------------------------------- */
    const floor = i >= n(s.sale_month, -1) ? n(s.emergency_target) : n(s.liquid_floor);
    const topUp = Math.max(0, Math.min(pool, floor - cash));
    cash += topUp;
    pool -= topUp;

    /* 8. prepayments, by rank -------------------------------------------- */
    const extra: Record<string, number> = {};
    let target = "";
    const queue = loans
      .filter((l) => l.src.prepay_rank != null && l.bought && l.bal > 0)
      .filter((l) => !(l.src.prepay_blocked_until_sale && i < n(s.sale_month, Infinity)))
      .sort((a, b) => (a.src.prepay_rank ?? 0) - (b.src.prepay_rank ?? 0));
    for (const l of queue) {
      if (pool <= 0) break;
      const pay = Math.min(pool, l.bal);
      l.bal -= pay;
      pool -= pay;
      extra[l.src.id] = pay;
      if (!target) target = `${l.src.name} prepayment`;
      markClosed(l, i, events, "CLOSED");
    }

    /* 9. leftovers ------------------------------------------------------- */
    let toEmergency = 0;
    if (pool > 0) {
      toEmergency = Math.min(pool, Math.max(0, n(s.emergency_target) - cash));
      cash += toEmergency;
      pool -= toEmergency;
    }
    let toCplFund = 0;
    if (pool > 0) {
      toCplFund = pool;
      cpl += pool;
      pool = 0;
    }
    if (!target) {
      if (toCplFund > 0) target = "CPL fund";
      else if (toFund > 0) target = `${next?.src.name ?? "Purchase"} fund`;
      else if (topUp + toEmergency > 0) target = "Liquid reserve";
    }

    /* 10. make the planned purchase at month end -------------------------- */
    for (const l of planned) {
      if (l.bought || l.src.starts_month !== i) continue;
      const want = n(l.src.down_payment);
      const dp = Math.min(want, fund + Math.max(0, cash - 50000));
      const fromFund = Math.min(fund, dp);
      fund -= fromFund;
      cash -= dp - fromFund;
      l.bal = Math.max(0, n(l.src.purchase_price) - dp);
      l.emi = emiFor(l.bal, l.rate, n(l.src.tenure_months, 60));
      l.bought = true;
      events.push(`${l.src.name} purchased`);
      if (l.bal <= 0.5) closed[l.src.id] = i;
    }

    /* ---- record ---- */
    const balances: Record<string, number> = {};
    const emis: Record<string, number> = {};
    const rates: Record<string, number> = {};
    let totalDebt = 0;
    for (const l of loans) {
      balances[l.src.id] = l.bal;
      emis[l.src.id] = l.emi;
      rates[l.src.id] = l.rate;
      totalDebt += l.bal;
    }
    const extraTotal = Object.values(extra).reduce((a, b) => a + b, 0);

    rows.push({
      i, paid, extra, balances, emis, rates,
      emiTotal, chit, free, toFund, extraTotal, target,
      cash, cpl, fund, totalDebt, events,
    });
  }

  const last = rows[rows.length - 1];
  return {
    rows,
    closed,
    waterfall,
    end: { cash, cpl, balances: last.balances, emis: last.emis },
  };
}

/** Corpus available for the CPL: pilot fund plus anything above the reserve. */
export function corpus(p: Projection, s: Settings): number {
  return p.end.cpl + Math.max(0, p.end.cash - n(s.emergency_target));
}

export function fundingGap(p: Projection, s: Settings): number {
  return Math.max(0, n(s.cpl_budget) - corpus(p, s));
}

/** The plan's own test: a year with no pilot income once training starts. */
export function stressTest(p: Projection, s: Settings) {
  const gap = fundingGap(p, s);
  const pilotEmi = gap > 0 ? emiFor(gap, n(s.pilot_loan_rate), n(s.pilot_loan_tenure)) : 0;
  const servicedEmis = Object.entries(p.end.balances)
    .filter(([, bal]) => bal > 0)
    .reduce((sum, [id]) => sum + n(p.end.emis[id]), 0);
  const monthly = servicedEmis + pilotEmi + n(s.expenses);
  const need = monthly * 12;
  return { gap, pilotEmi, servicedEmis, monthly, need, have: p.end.cash, survives: p.end.cash >= need };
}
