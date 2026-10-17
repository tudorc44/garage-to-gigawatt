# 62: Act I capital: Texas without Series A, and buying back shares. v1.2, 18 Oct 2026 (§5 after M79; §6 after M81)

*Design thread, from the owner's play (16 Oct 2026). Base game, not flagged: both change Act I's rules for everyone. Owner decisions (O, 16 Oct): Texas phase 1 opens with Series A or self-funding; buy-backs are allowed, and investors may refuse. All numbers ⚙ designed [D] unless marked.*

## 1. Texas phase 1 without Series A (O)
Today `sites.json › texas_site.phases.requires_round = series_a` (checked in `src/sim/systems/construction.ts`). The gate stands in for "can this company pay for a 20 MW build and sign a utility contract".
- **New rule:** phase 1 can start if **either** Series A is closed (as today) **or** the company self-funds: it pays phase 1's full cost from cash **and** posts a **security deposit of 2 quarters of the site's expected power bill** at phase 1's 20 MW and the contract price chosen ⚙. Large loads are commonly asked for collateral by utilities; the size is designed [D].
- The deposit is held cash (not spendable, shown on the balance sheet), returned when the site has run 4 quarters without a missed payment ⚙, or forfeited towards the bill if cash runs out.
- **The Texas construction loan still needs Series A** (a lender's requirement, unchanged). So self-funding means no loan: the full phase cost in cash.
- Later phases: unchanged (any time after phase 1); a self-funded company pays each phase in cash, or takes the loan after a later Series A.
- Plan screen: the locked text becomes "Needs Series A, or phase 1's cost plus a deposit of {amount} in cash". Through t().

## 2. Buying back shares (O: investors may refuse)
- **Before an IPO:** in a Plan phase, offer to buy back part of one investor round's stake (up to that round's whole stake, at most one offer per quarter), at **the current valuation x 1.2** ⚙ (the valuation the Capital screen already shows). Costs 1 Bandwidth.
- **The investor may refuse** ⚙: base 30% chance; +20 points if bitcoin is up more than 50% on a year ago (a boom: they want to hold); -20 points if it is down more than 30% (a downturn: they want cash). Drawn from its own substream `buyback`. A refused offer costs the Bandwidth, no cash; the round can be asked again next quarter.
- **Accepted:** cash out, the founder's stake rises by the bought share; the round's stake falls. Seed and friends-and-family rounds can be bought back the same way. A fully bought-back round is closed.
- **After an IPO:** an open-market buy-back at the share price, up to 10% of shares a year ⚙, no refusal (it's the market), 1 Bandwidth per quarter used.
- Debt covenants: none today; if a loan is outstanding, a buy-back may not take cash below the loan's next 2 quarters of payments ⚙.
- Act II carry-over: the founder's stake carries as today.

## 3. Balance and goldens
- **Expected effect on goldens:** existing bots always raise Series A before Texas and never buy back, so all goldens should stay byte-identical. Any golden that moves must be explained (e.g. a bot that tried Texas without Series A and was refused before).
- **New bots:** `texas-selffund` (texas-ipo's path, but skips Series A and self-funds Texas phase 1), and `buyback-founder` (raises as raise-climb, then buys back the Seed and Series A stakes from 2021 when cash allows).
- **Targets (report only for now):** texas-selffund's Act I end founder net worth vs texas-ipo's; buyback-founder's founder stake and net worth vs raise-climb; buy-back refusal rate over the runs (expect about 30%, higher in 2017 and 2021).

## 4. Build
One milestone, M79, after M78 merges (both touch Act I; separate PRs keep the golden story clean).

## 5. After M79 (17 Oct 2026)
*M79 merged (PR 53). Decisions (DT) on its open questions:*
1. **Self-funded Texas out of reach (0 of 50, about $11.1M needed):** the rule stays (a 20 MW build is that expensive), but the bot was only trying at the 2020Q3 opening. texas-selffund now tries in any Plan phase through 2022Q4 once its cash covers phase 1 plus the deposit plus 2 quarters of costs; report how many reach it and when. If still under 10 of 50, the next lever is the deposit (2 quarters down to 1), not the phase cost.
2. **Buy-backs lowering median founder net worth:** expected. Paying valuation x 1.2 is buying above book; it pays only if the company grows faster than the premium. Reported, no change.
3. **Refusal rate:** no target; the designed odds (30% base, 50% in a boom, 10% in a downturn) are the rule. Reported per year.
4. **Buy-backs in Act II:** not now. Parked in doc 50.

## 6. After M81 (18 Oct 2026)
*M81 merged (PR 55). texas-selffund still reaches Texas in 0 of 50: its best cash from 2020Q3 is $6.6M (median $1.8M) against about $11.1M plus 2 quarters of costs. The real block is the ladder: Texas can only be scouted once the company owns the tier before it (an own site, $6-8M), and a company without Series A never gets one in the bots.*
1. **(O) Find the real block first.** Diagnose why a company without Series A doesn't reach an own site: a funding gate on the own site (a requires_round, a loan that needs Series A), or only cash. If it is a gate, the owner's rule (Series A not mandatory for Texas, 16 Oct) extends down the ladder: the own site opens to a company that pays in cash, as Texas does, with no new deposit. If it is only cash, nothing changes in the rules; the bot is the problem.
2. **(DT) texas-selffund's path:** after the fix, it saves for and buys an own site without Series A, then self-funds Texas when it can. Report how many reach each rung and when.
3. **(DT) The deposit stays at 2 quarters.**
4. **(DT, doc 58) The Y-B2 net-worth line stays as a report line;** the stake return is the judged basis.
5. **(DT, doc 58) The reservation release is a player option.** larkspur-seller keeps its rule; no bot change.
