export type Settings = {
  id: string;
  salary: number;
  expenses: number;
  chit_amount: number;
  chit_end_month: number;
  savings_start: number;
  start_year: number;
  start_month: number; // 1-12
  horizon_months: number;
  liquid_floor: number;
  emergency_target: number;
  sale_month: number;
  sale_net: number;
  home_prepay_cap: number;
  cpl_budget: number;
  pilot_loan_rate: number;
  pilot_loan_tenure: number;
};

export type Loan = {
  id: string;
  name: string;
  lender: string;
  balance: number;
  rate: number;
  emi: number;
  sort: number;

  refi_month: number | null;
  refi_rate: number | null;
  refi_emi: number | null;

  starts_month: number | null;
  purchase_price: number | null;
  down_payment: number | null;
  tenure_months: number | null;

  prepay_rank: number | null;
  prepay_blocked_until_sale: boolean;
  sale_rank: number | null;
  foreclose_month: number | null;
};

export type Phase = {
  id: string;
  label: string;
  title: string;
  from_month: number;
  to_month: number;
  sort: number;
};

export type Activity = {
  id: string;
  month_index: number;
  title: string;
  detail: string;
  is_milestone: boolean;
  done: boolean;
  sort: number;
};

export type Actual = {
  id: string;
  month_index: number;
  loan_id: string | null;
  amount: number;
  note: string;
};

/* ---------- engine output ---------- */

export type MonthRow = {
  i: number;
  paid: Record<string, number>;     // loanId -> EMI actually paid
  extra: Record<string, number>;    // loanId -> prepayment on top
  balances: Record<string, number>; // loanId -> balance at month end
  emis: Record<string, number>;     // loanId -> scheduled EMI in force
  rates: Record<string, number>;
  emiTotal: number;
  chit: number;
  free: number;
  toFund: number;        // into the down-payment fund
  extraTotal: number;
  target: string;        // where the spare money went
  cash: number;
  cpl: number;
  fund: number;
  totalDebt: number;
  events: string[];
};

export type WaterfallItem = { key: string; label: string; detail: string; amount: number; kind: "in" | "pay" | "keep" };

export type Projection = {
  rows: MonthRow[];
  closed: Record<string, number>;      // loanId -> month index it hit zero
  waterfall: WaterfallItem[];
  end: { cash: number; cpl: number; balances: Record<string, number>; emis: Record<string, number> };
};
