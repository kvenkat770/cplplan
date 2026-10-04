-- Seed data for cplplan, from debt_wealth_pilot_master_plan.xlsx.
-- Run after the migration in supabase/migrations/.

insert into public.settings (id, salary, expenses, chit_amount, chit_end_month, savings_start, start_year, start_month, horizon_months, liquid_floor, emergency_target, sale_month, sale_net, home_prepay_cap, cpl_budget, pilot_loan_rate, pilot_loan_tenure) values
  ($$default$$, 210000, 5000, 30000, 24, 300000, 2026, 10, 25, 100000, 500000, 14, 5000000, 1800000, 5250000, 0.11, 84);

insert into public.loans (name, lender, balance, rate, emi, sort, refi_month, refi_rate, refi_emi, starts_month, purchase_price, down_payment, tenure_months, prepay_rank, prepay_blocked_until_sale, sale_rank, foreclose_month) values
  ($$Equitas Home Loan$$, $$13% — balance transfer is priority 1$$, 4429334, 0.13, 52253, 1, 1, 0.09, 40220, null, null, null, null, null, true, 3, null),
  ($$HDFC personal loan$$, $$unsecured, 9.99%$$, 1422204, 0.0999, 27781, 2, null, null, null, null, null, null, null, 2, false, 1, null),
  ($$Kotak personal loan$$, $$16.34% — your most expensive rupee$$, 640531, 0.1634, 37269, 3, null, null, null, null, null, null, null, 1, false, null, null),
  ($$Equitas Insurance Home$$, $$13% — the ₹67K nuisance$$, 67221, 0.13, 1308, 4, null, null, null, null, null, null, null, null, false, null, 3),
  ($$Thar car loan$$, $$~₹23K EMI, 60 months$$, 0, 0.095, 0, 5, null, null, null, 5, 1600000, 500000, 60, 3, false, 2, null);

insert into public.phases (label, title, from_month, to_month, sort) values
  ($$Phase 1$$, $$Setup and balance transfer$$, 0, 2, 1),
  ($$Phase 1$$, $$Thar and Kotak closure$$, 3, 8, 2),
  ($$Phase 2$$, $$HDFC attack and property sale$$, 9, 14, 3),
  ($$Phase 3$$, $$Aviation corpus$$, 15, 23, 4),
  ($$Phase 4$$, $$CPL start$$, 24, 24, 5);

insert into public.activities (month_index, title, detail, is_milestone, done, sort) values
  (0, $$Start the home-loan balance transfer$$, $$Your number one task — documents in by 15 October. ₹44.29L at 13% moves to a target of 8.5–9.5%. Do not pick on EMI alone: compare rate, remaining tenure, processing and legal charges, and the foreclosure terms.$$, false, false, 1),
  (0, $$Split the salary into three buckets$$, $$A mandatory — EMIs plus chit. B goals — Thar fund and Kotak closure. C emergency. Three accounts, not one.$$, false, false, 2),
  (0, $$Open the Thar fund$$, $$₹3L in hand, ₹5L needed by March, so ₹33–35K a month for six months. Keep it liquid, not in equity — the money gets spent in March.$$, false, false, 3),
  (1, $$Complete the transfer$$, $$EMI lands around ₹40–42K and releases roughly ₹10–12K a month. That release is the engine for everything that follows.$$, false, false, 4),
  (1, $$Open the Kotak prepayment campaign$$, $$16.34% on ₹6.41L is the most expensive rupee you owe. Every spare rupee after the Thar fund goes here.$$, false, false, 5),
  (3, $$Foreclose the Equitas ₹67K$$, $$Only ₹1,308 a month, so this is not the big financial win — but carrying a ₹67K loan for another eight years is noise you do not need. Window is Dec 2026 to Jan 2027.$$, false, false, 6),
  (3, $$Hold the Thar budget at ₹5L$$, $$You will be tempted to put ₹6–7L down because the cash is sitting there. Do not. The Thar is a lifestyle purchase, not an investment — cash in hand is worth more to you than a slightly smaller car EMI.$$, false, false, 7),
  (4, $$Finalise the Thar financing$$, $$₹16L on-road, ₹5L down, ₹11L financed, EMI around ₹22–24K. Do not stretch the tenure just to make the EMI look small.$$, false, false, 8),
  (5, $$MILESTONE · Buy the Thar$$, $$₹5L paid, around ₹11L financed — and at least ₹1–1.5L still liquid the day after. Do not empty the account.$$, true, false, 9),
  (6, $$Keep attacking Kotak$$, $$The Thar EMI now bites. Free cash drops to roughly ₹46K a month and all of it belongs to Kotak.$$, false, false, 10),
  (7, $$Pull the Kotak foreclosure statement$$, $$Ask for the foreclosure statement, current outstanding, prepayment charge and the exact closure amount. Do not estimate the final figure from the app.$$, false, false, 11),
  (8, $$MILESTONE · Close Kotak completely$$, $$₹37,269 of EMI gone, and from the next month that whole amount becomes a weapon. Check the Simulate tab — on the plan original numbers this date needs help.$$, true, false, 12),
  (9, $$Redirect the Kotak EMI straight at HDFC$$, $$Do not absorb ₹37K into lifestyle. HDFC is around ₹14.2L at 9.99%; the scheduled ₹27,781 plus everything spare means you hit it with close to ₹1L a month.$$, false, false, 13),
  (10, $$Rebuild the emergency fund to ₹3–4L$$, $$Your living costs are low but your obligations are not. The cash reserve does not go below this line again.$$, false, false, 14),
  (11, $$Start the property sale properly$$, $$Three months early, not in December. Title verification, encumbrance check, valuation, buyer conversations, capital-gains assessment, legal review, NOCs. Treat ₹50L as net after tax and costs, not as the asking price.$$, false, false, 15),
  (12, $$Begin aviation research in earnest$$, $$DGCA requirements, Class 1 medical, FTO selection, the South Africa route, CPL conversion, hour building, airline pathway. Researching, not spending.$$, false, false, 16),
  (13, $$Keep hammering HDFC, not the home loan$$, $$Until the property sells, HDFC outranks the home loan. Unsecured and expensive beats secured and cheap, every time.$$, false, false, 17),
  (14, $$MILESTONE · Sell the property$$, $$Around ₹50L net. HDFC to zero, Thar to zero, then split what is left between the home loan and the pilot fund. This is the month the whole plan changes shape.$$, true, false, 18),
  (15, $$Create the CPL fund$$, $$A separate account, labelled CPL FUND — DO NOT TOUCH. Never mixed with the emergency fund.$$, false, false, 19),
  (15, $$DGCA paperwork and Class 1 medical$$, $$January to March 2028. Finish the regulatory work before paying an FTO a rupee, and confirm the current conversion requirements rather than last year ones.$$, false, false, 20),
  (16, $$Shortlist South African FTOs$$, $$Compare all-inclusive cost, never the advertised hourly rate: hours, aircraft availability, fuel surcharge, exams, landing fees, accommodation, visa, transport, conversion costs, extra flying for weather and skill, instructor availability.$$, false, false, 21),
  (17, $$Fix the CPL budget — three numbers$$, $$Minimum ₹45L, realistic ₹50–55L, worst case ₹60L. Built from real written quotations, not brochures.$$, false, false, 22),
  (18, $$Decide on secured borrowing — Plan B, not Plan A$$, $$Corpus plus home equity plus EMI capacity plus a realistic pilot-income timeline gives you the funding gap. Borrow the gap. If the gap is ₹25L you borrow ₹25L, not ₹50L because the property allows it.$$, false, false, 23),
  (19, $$Decide the airline pathway$$, $$CPL, then instructing and hour building, then airline applications — or something else. Do not buy a type rating because someone said airlines require one; the economics depend entirely on the airline and the hiring environment.$$, false, false, 24),
  (20, $$Home loan against property value and LTV$$, $$Only now do the numbers justify a decision on extra secured borrowing. Not before.$$, false, false, 25),
  (21, $$Finalise the FTO$$, $$Written quotation, refund policy, completion timeline, fleet details, average student completion hours, DGCA acceptance pathway, accommodation, insurance, exam costs. No large non-refundable payment early.$$, false, false, 26),
  (22, $$Final stress test$$, $$The model has to survive pilot income of zero for 12 months with the home loan and the pilot loan both running. If it does not, the borrowing is too high. The Simulate tab runs this for you.$$, false, false, 27),
  (23, $$Lock the funding$$, $$CPL cost, cash available, loan requirement, monthly EMI, emergency fund, post-CPL living costs, hour-building plan — all known numbers. Only then do you sign.$$, false, false, 28),
  (24, $$MILESTONE · Start CPL$$, $$No personal loan. No car loan. A manageable home loan. A ₹5–6L reserve. Corpus saved and only the gap borrowed. The chit ends this month too — another ₹30K a month free.$$, true, false, 29);
