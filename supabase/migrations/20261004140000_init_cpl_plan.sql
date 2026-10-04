-- ============================================================
-- cplplan : 24-month debt payoff + CPL funding model
-- ============================================================

create table public.settings (
  id               text primary key default 'default',
  salary           numeric not null default 210000,
  expenses         numeric not null default 5000,
  chit_amount      numeric not null default 30000,
  chit_end_month   int     not null default 24,
  savings_start    numeric not null default 300000,
  start_year       int     not null default 2026,
  start_month      int     not null default 10,
  horizon_months   int     not null default 25,
  liquid_floor     numeric not null default 100000,
  emergency_target numeric not null default 350000,
  sale_month       int     not null default 14,
  sale_net         numeric not null default 5000000,
  home_prepay_cap  numeric not null default 1800000,
  cpl_budget       numeric not null default 5200000,
  pilot_loan_rate  numeric not null default 0.11,
  pilot_loan_tenure int    not null default 84,
  updated_at       timestamptz not null default now(),
  constraint settings_single_row check (id = 'default')
);

create table public.loans (
  id        uuid primary key default gen_random_uuid(),
  name      text    not null,
  lender    text    not null default '',
  balance   numeric not null default 0,
  rate      numeric not null default 0,
  emi       numeric not null default 0,
  sort      int     not null default 0,

  -- refinance / balance transfer
  refi_month int,
  refi_rate  numeric,
  refi_emi   numeric,

  -- a purchase that has not happened yet
  starts_month   int,
  purchase_price numeric,
  down_payment   numeric,
  tenure_months  int,

  -- how the engine treats it
  prepay_rank               int,
  prepay_blocked_until_sale boolean not null default false,
  sale_rank                 int,
  foreclose_month           int,

  created_at timestamptz not null default now()
);

create table public.phases (
  id         uuid primary key default gen_random_uuid(),
  label      text not null,
  title      text not null,
  from_month int  not null,
  to_month   int  not null,
  sort       int  not null default 0
);

create table public.activities (
  id           uuid primary key default gen_random_uuid(),
  month_index  int     not null,
  title        text    not null,
  detail       text    not null default '',
  is_milestone boolean not null default false,
  done         boolean not null default false,
  sort         int     not null default 0,
  created_at   timestamptz not null default now()
);

create table public.actuals (
  id          uuid primary key default gen_random_uuid(),
  month_index int     not null,
  loan_id     uuid references public.loans(id) on delete cascade,
  amount      numeric not null default 0,
  note        text    not null default '',
  updated_at  timestamptz not null default now(),
  unique (month_index, loan_id)
);

create index activities_month_idx on public.activities (month_index, sort);
create index actuals_month_idx    on public.actuals (month_index);
create index loans_sort_idx       on public.loans (sort);

-- ------------------------------------------------------------
-- RLS. There is no auth in this build (local-only by design),
-- so anon holds full access. Tighten before any public deploy.
-- ------------------------------------------------------------
alter table public.settings   enable row level security;
alter table public.loans      enable row level security;
alter table public.phases     enable row level security;
alter table public.activities enable row level security;
alter table public.actuals    enable row level security;

create policy anon_all on public.settings   for all to anon using (true) with check (true);
create policy anon_all on public.loans      for all to anon using (true) with check (true);
create policy anon_all on public.phases     for all to anon using (true) with check (true);
create policy anon_all on public.activities for all to anon using (true) with check (true);
create policy anon_all on public.actuals    for all to anon using (true) with check (true);
