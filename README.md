# cplplan

A 25-month cash-flow model for clearing personal debt and funding a CPL, Oct 2026 → Oct 2028.
Next.js 14 + TypeScript + Tailwind, with Supabase as the store. Everything on screen is editable
and the projection re-runs on every change.

## What it does

Four views:

- **Now** — balances, EMIs, free cash, and the snowball ladder. Tap any loan to edit it.
- **Flight plan** — phases, activities and milestones. Tick, edit, move between months, add, delete.
- **Cash flow** — month-by-month placement of every rupee, plus a log for what you *actually* paid.
- **Simulate** — income, levers, prepayment priority, the sale waterfall and the no-income stress test.

## The engine

`src/lib/engine.ts` is pure and data-driven — there is no hardcoded plan inside it. Each loan row
carries its own behaviour:

| Column | What it does |
| --- | --- |
| `refi_month` / `refi_rate` / `refi_emi` | A balance transfer in that month |
| `starts_month` / `purchase_price` / `down_payment` / `tenure_months` | A purchase that has not happened yet; the down payment is saved up from surplus first |
| `foreclose_month` | A forced lump-sum closure |
| `prepay_rank` | Order spare cash attacks loans. Lowest first; blank means never |
| `prepay_blocked_until_sale` | Hands off until the property sells |
| `sale_rank` | Order the sale proceeds clear loans |

Each month the engine pays scheduled EMIs, funds the next planned purchase, runs any foreclosure,
applies the sale waterfall, tops the cash floor back up, then sends what is left down the prepay
queue and finally into the emergency fund and the CPL fund.

## Running it

```bash
npm install
cp .env.example .env.local   # fill in your Supabase URL and anon key
npm run dev
```

Then open http://localhost:3002.

## Database

Schema lives in `supabase/migrations/`. Five tables: `settings` (one row), `loans`, `phases`,
`activities`, `actuals`.

## Security — read this before deploying

This build has **no authentication**, by design: it is meant to run on localhost. RLS is enabled but
the policies grant the `anon` role full read and write on every table, which is what lets the app
work without a login.

That means anyone holding the project URL and anon key can read and write your financial data. The
key is in `.env.local`, which is gitignored and not in this repo — keep it that way.

Before putting this on a public URL, do both of these:

1. Add auth (Supabase Auth, or a password gate in middleware).
2. Replace the `anon_all` policies with ones scoped to an authenticated user id.
