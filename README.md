# cplplan

A 25-month cash-flow model for clearing personal debt and funding a CPL, Oct 2026 → Oct 2028.
Next.js 14 + TypeScript + Tailwind, Supabase as the store, behind a password.

Figures come from `debt_wealth_pilot_master_plan.xlsx` (Assumptions and Debt Plan sheets).

## Screens

- **Overview** — total debt, EMIs, free cash, what's open now, the loan list, the snowball, the debt/corpus chart.
- **Plan** — phases, activities and milestones. Tick, reword, re-month, add, delete.
- **Months** — every month expandable to its full placement, plus a log for what you actually paid.
- **Model** — results first, then the stress test, the levers, prepayment order and the sale waterfall.

Editing happens in a bottom sheet rather than inline, so the page never shifts under you.

## The engine

`src/lib/engine.ts` is pure and data-driven — no plan is hardcoded. Each loan row carries its own behaviour:

| Column | What it does |
| --- | --- |
| `refi_month` / `refi_rate` / `refi_emi` | A balance transfer in that month |
| `starts_month` / `purchase_price` / `down_payment` / `tenure_months` | A purchase that has not happened yet; the down payment is saved up from surplus first |
| `foreclose_month` | A forced lump-sum closure |
| `prepay_rank` | Order spare cash attacks loans. Lowest first; blank means never |
| `prepay_blocked_until_sale` | Hands off until the property sells |
| `sale_rank` | Order the sale proceeds clear loans |

Each month it pays scheduled EMIs, funds the next planned purchase, runs any foreclosure, applies the
sale waterfall, tops the cash floor back up, then sends what is left down the prepay queue and finally
into the emergency fund and the CPL fund.

## Security

- The app sits behind a password (`AUTH_PASSWORD`), checked in constant time, with a signed
  httpOnly session cookie (`AUTH_SECRET`). `src/middleware.ts` gates every route; API routes return
  401 rather than redirecting.
- **The Supabase key is server-side only.** The env vars are `SUPABASE_URL` / `SUPABASE_ANON_KEY`,
  deliberately without the `NEXT_PUBLIC_` prefix, so they never enter the browser bundle. The browser
  talks to `/api/plan` and `/api/mutate`, which sit behind the same gate.
- `/api/mutate` allowlists both tables and columns, so a crafted request cannot touch anything else.
- RLS is enabled on every table but the policies grant `anon` full access. That is only safe because
  the key never leaves the server. If you ever expose the key, rotate it.

## Running it

```bash
npm install
cp .env.example .env.local   # fill in all four values
npm run dev
```

Then open http://localhost:3002.

If you ever get a blank page, it means `.next` went stale (usually from running `next build` while
the dev server was live). Fix:

```bash
rm -rf .next && npm run dev
```

## Deploying to Vercel

1. Import the repo at vercel.com/new.
2. Add all four environment variables for Production, Preview and Development:
   `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `AUTH_PASSWORD`, `AUTH_SECRET`.
   Use a **different** `AUTH_PASSWORD` and `AUTH_SECRET` than your local ones.
3. Deploy. The default build command and output work unchanged.

Supabase is on `ap-south-1`, so latency is best with the Vercel region set to Mumbai (`bom1`).

## Database

`supabase/migrations/` holds the schema, `supabase/seed.sql` the starting data. Five tables:
`settings` (one row), `loans`, `phases`, `activities`, `actuals`.
