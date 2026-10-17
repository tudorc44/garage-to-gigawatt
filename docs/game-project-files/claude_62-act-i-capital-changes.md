# 62: Act I capital: Texas without Series A, and buying back shares. v1.0, 16 Oct 2026

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
