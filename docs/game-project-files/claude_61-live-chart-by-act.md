# 61: The Live screen's chart, by act. v1.0, 15 Oct 2026

*Design thread, from the owner's play (14 Oct 2026): once bitcoin stops being the company's business, watching its price through the quarter's 13 weeks says little. Owner decisions (O, 15 Oct 2026): the chart defaults to the act's main driver, and the player can switch it, with the choice remembered until the act changes. UI only: no sim rule, content value or golden changes.*

## 1. Today
`src/ui/screens/Live.tsx` (`PriceChart`) draws BTC, and ETH until the Merge, as % change against the quarter's first week. Since M66, Act V with no miners hides it.

## 2. Series (all weekly columns the game already carries)
| Series | Column(s) | Acts |
|---|---|---|
| BTC (and ETH before the Merge) | `btc_usd`, `eth_usd` | Prologue-V (ETH to 2022Q3) |
| GPU rent | `gpu_h100_neocloud_usd_hr` (Act II, from 2023-07-03); the newest class the company rents in Acts III-V (`gpu_h100_*` or `gpu_rubin_*`) | II-V |
| Power price, your region | `power_usd_kwh_<region>` of the player's largest site by MW | V |
| Launch price (stepped) | the quarterly launch price the Orbit screens already show, held flat across the quarter's weeks | IV-V, only for a company with orbital blocks |
| Your company | this quarter's weekly revenue and cash, from the sim's weekly report rows | every act |
| Altcoins | `ltc_usd`, `doge_usd` | Prologue, for a player with altcoins (behind the Prologue expansion's flag) |

## 3. Default by act (O: the act's main driver)
- **Prologue and Act I:** BTC and ETH, as today.
- **Act II:** GPU rent from the week its data starts (2023-07-03); before that, Your company. A company still mining BTC (any ASIC lot running) defaults to BTC.
- **Act III:** GPU rent for the newest class the company rents; BTC if mining is still more than half of revenue.
- **Act IV:** GPU rent; Launch price for a company whose orbital revenue is more than half of revenue.
- **Act V:** Power price in the largest site's region; BTC for a company that still mines (M66's rule).
The rule is "what most of this company's money depends on", decided at the start of each quarter from last quarter's revenue split, with the fallbacks above when a series has no data.

## 4. The switch (O: remembered until the act changes)
- A small segmented control above the chart lists only the series that have data in the current week and apply to this company (no launch price without orbital blocks, no altcoins without altcoins).
- The choice is UI state saved with the game (not sim state, so goldens don't move), kept across quarters and cleared when the act changes, when the default takes over again.
- Every label and axis through `t()`; values formatted with `Intl`; deltas carry ▲▼ or +/− as the design system requires.

## 5. Leak guard (Acts III-V)
The switch offers only columns the game's screens already display during play. It never offers a scenario or future tag, a Signals series, or any hidden file's value. The existing leak tests gain a check that every chart series in Acts III-V is on that allow-list.

## 6. Done when
- Each act's default appears as §3 says; a test per act.
- The switch shows only applicable series, remembers the choice across quarters, and resets at the act change; tests.
- Leak test passes in Acts III-V.
- Every golden byte-identical; lint, test and build green.
