# Dev notes: where the build stands

The running record of where the build stands, the rules in force, open questions and what's next. It exists so
any Claude account or machine can pick up the work with no chat history. **Read `CLAUDE.md` first, then this
file.** The full history (every finished step, balance review, milestone and report, with the decisions in detail)
is in `docs/dev-notes-archive.md`: read it only when a task needs it.

Last updated: 12 Oct 2026 (M64 on branch `m64`, one PR open to `main`; `main` = `800b965`, M63 merged). The Prologue, Act I, Act II,
Act III and Act IV (M27–M34) with the energy options and ventures (doc 38, M35–M36), Finances (doc 39, M37), the energy data fixes
(doc 41, M39) and the M40-M41 answers are merged into `main` and public on GitHub Pages. **Act V ("Firm", doc 43 with §0.1-§0.20)
is built through M63 and merged, behind the dev flag** (dev, staging and tests have it; the Pages build doesn't; the owner flips it).
See "Next".

## UI: sell Max and Sell all (branch `ui-sell-max` from `main`, not a milestone)
- "Your machines" (`FleetDialog`): a Max button per batch (fills the full count, working and broken), the Sell button reads "Sell 2,105 for $4.8M" (the count entered and the sim's dry-run cash), and a "Sell all" per machine type behind a confirm line ("Sell all 3,158 GPU Rig Gen 1 for $7.26M?"). Sell all is the same SELL_MACHINES actions as row by row, one per batch, run in order. UI only (`components/sellCount.tsx`, `screens/dialogs.tsx`, 7 new keys, `ui.fleet_dialog.sell_for` replaced); the Prologue's Rig screen keeps its own quick picks and labels. No sim, content or golden change. Tests: `tests/ui/fleetSellMax.test.tsx`.
- (mine, reversible) Sell all lists one line per type under the table (not in the table rows); it covers every batch of the type whatever its condition; the confirm sits in the line itself (Yes, sell / Cancel).
## M78: Acts I-II ventures behind the flag (doc 58 v1.1 §2-§5, §10) (branch `m78` from `main` at `68b9c21`, M77 merged as PR #49)
Flag `ACTS12_VENTURES` in `src/platform/preview.ts` (off in production; a save with a Larkspur stake or a lot on an alt coin / rental is refused there). Opt-out: nothing runs in a game that never joins, picks a coin or buys an LK; goldens re-run after M78.1 and byte-identical.
- **M78.1 Larkspur** (`src/sim/systems/larkspur.ts`, `src/content/larkspur.json`): the start-up's slip and outcome are replayed from the seed (`larkspur:slip`, `larkspur:outcome`), the same with or without you; joining, thirds as calls (pay/dilute/walk), memory pick at the tape-out call, reservation, LK buying, value and the cash resolution at Act I's end; LK-5/LK-6 live in `larkspur.json` (not `machines.json`) and `getModel` finds them. Lots earning dollars directly (alt coin, rental, LK past its wall) use `LotWeek.direct`: sold at once, ledger line `mining_other`.
- (mine, reversible) Stake value after volume = your share x units shipped x $6,000 margin per unit, 1,500 units a quarter shipped (doc 58 gives the formula but not these two numbers); a reserved unit's deposit is credited per unit bought; the reservation window runs from the tape-out call to volume; the world's machine is whichever memory the backer picked.
- **M78.2 After the Merge** (`src/sim/systems/afterMerge.ts`, `src/content/after_merge.json`): `SET_LOT_USE` points a GPU lot at ETC, RVN, ERG or rental from Act II (RigShare: cards x rate x hours x utilisation, power only on rented hours); an LK unit goes to ETC by itself at its wall (log line); views in `src/sim/ventures12Views.ts` (`larkspurView`, `lotChoices`: sell / own / each coin / rent per lot).
- **M78.3 Ventures tab** (`src/ui/screens/Ventures12.tsx`): the nav's Ventures item shows in Acts I-II from the 2020Q2 offer on (flag on), holding Larkspur (join, calls with the memory pick, reserve, buy) and a sell / own coin / ETC / RVN / ERG / rent row per GPU lot; Act III keeps its energy ventures. Tests started early in `tests/sim/larkspur.test.ts`, `tests/sim/afterMerge.test.ts`, `tests/ui/ventures12.test.tsx` (RUN 2 completes them).
- **M78.4 tests, M78.5 bots** (commit `ad9e530`): `larkspur-backer` (20%, pays every call, LK-6, reserves and buys a block; saves a first third from 2019Q3 and takes 10% at the last chance, because a 2020 company has well under $1.3M spare), `larkspur-backer-5gb`, `post-merge-miner`, `post-merge-renter`. Goldens: the two backers on seed 22 (20% stake, 20 units bought), the two post-merge bots on seed 3 through Act II. Every earlier golden byte-identical (Y-B1); the sim-runner's `idleShare` now uses `getModel` (it crashed on an LK lot).
- **M78.6 measured** (`npm run sim -- --ventures12`, 50 seeds, 197 s for 300 runs; `tools/ventures12-runner.ts`). Y-B1: PASS (goldens; `--act2 --act3` on m78 against main: all 1,402 shared files identical, only the 200 files of the 4 new bots are new, summary.csv gains 4 rows; `--prologue` `prologue-runs.csv` identical to main, X-B table unchanged, X-B3 the same known miss).
  - **Y-B2 MISS (large).** 41/50 backers joined (24 at 20%, 17 at 10%). The stake alone returns 0.09x of cash paid in (median, 20% backers): it is written down to a tenth at the Merge. Against the same cash on Gen 2 at street price the median return is -1.25x (-0.99x where Larkspur shipped); backers end Act I 52% below gen2-street (median $5.9M against $14.9M) and 15 game overs against 7. The comparison includes the cost of holding cash back from 2019Q3.
  - **Y-B3 PASS.** Cancelled 24% (30% with the 5% acquired); LK-5's wall (2022-08-17) is before the Merge, and 17/17 runs holding LK-5 logged it.
  - **Y-B4 half MISS.** A Gen 2 rig's last ETH quarter is $472; the best alt coin grosses $109-137 a quarter, 23-29% of it: under 25% in only 3/17 quarters. Net below zero at $0.10/kWh in 17/17. The miner earned on an alt coin in a median 14 of 17 quarters (a loss-making lot switches itself off).
  - **Y-B5 PASS.** By the tables rental nets more than the best alt coin in 16/16 quarters from 2023Q1; played, the renter ends level or above the miner in 46/50; renter over the idle-rig bot median +0.5% (max +18.9%, so the under-5% bound holds for the median only).
  - **Y-B6 PASS.** Median 5.4 actions per Plan phase that has any for the backer (raise-climb 3.9, renter 4.3); the ventures add a median 3 actions to a backer run and 6 to a renter run.
- **Player-visible in RUN 2:** no (tests, bots, a runner and measurements only).
- (mine, reversible) the Y-B2 return is measured as net worth gained over raise-climb plus the spend, against a Gen 2 bot spending the same, so it includes the saving cost; the backer bot's 10% fallback at 2020Q4.
- **STOPPED:** none. **Open questions for the design thread:** (1) Y-B2: backing is a heavy loss as built (stake worth a tenth after the Merge, a 2020 company needs about a year of saving for a first third): intended trap, or should the Merge write-down, the stake size or the machines' ETH income change? (2) Y-B4: ETC pays 23-29% of the last ETH quarter, not under 25%: accept, or lower the 2022-09 and 2022-10 ETC points? (3) The offer needs $0.67M-$2M in 2020, which most raise-climb companies lack until 2021: widen the window or lower the budget? (4) Trademark check on Larkspur Silicon, LK-5, LK-6 and RigShare is still the owner's pre-ship task.

## M77: Gen 2 street price or retail queue (doc 58 v1.0 §1) (branch `m77` from `main` at `40d342f`, M76 merged as PR #48)

- M77.0 doc 58 v1.0 (copied with `cp`, byte-exact; doc 60 is not in `~/dev/g2g-project-files/claude/`, it lives in the Project). M77.1 done (RUN 1: build only, no test suites): `gpu_gen2` prices as §1.1's table (new and used, price_source updated), the 2021Q1-Q3 lead time removed (street price, no wait), and the retail queue (content `retail_queue` on gpu_gen2: $4,100 a rig, at most 4 a quarter in 2021Q1-Q3, each rig delivered 1, 2 or 3 quarters later at 50/35/15%, drawn on substream `gen2_queue` one draw per rig, counter in optional `state.gen2Queue`); `BUY_MACHINES` takes `queue: true`; queued lots (`queued: true`) show "on order, earns from {quarter}"; the buy dialog has two Gen 2 rows in those quarters ("Gen 2 - street price (now)", "Gen 2 - retail queue (1-3 quarters)") and the 2021Q1 hint.
- (mine, reversible) each queued rig is its own draw ("one order per retail drop"); queued rigs log one `log.bought` (so the GPU shortage cap counts them) plus a `log.gen2_queued` line with the arrival split; no save-version bump (`gen2Queue` and `queued` are optional and absent in every earlier game, so every old save loads as it is; a test will say so); `docs/act1-content/machines.json` (the original pack, already different from the game copy) is left as it is. 
- **M77.2 (tests, Y-B0):** lint, 2,042 tests and build green. **No Act I golden moved, and no other golden**: the 11 Act I golden bots never buy a Gen 2 rig (they fill their sites with ASICs; the Gen 2 table and the removed wait reach only a bot that buys one), so there was nothing to re-accept; Act II onward is byte-identical to a replay from the same Act I ends (see the `--act2 --act3` line below). New `tests/sim/gen2Queue.test.ts` (10 tests: the price table, no lead time, the two rows only in 2021Q1-Q3, the cap of 4 across orders, the odds over 6,000 draws, on-order status, the GPU shortage cap, an old 2021Q2 save loads and queues, a round trip). The production-build gate test got a 30 s limit (it timed out at 5 s on a busy machine).
- **M77.3 (bots):** `gen2-queuer` (raise-climb that queues 4 Gen 2 rigs a quarter in 2021Q1-Q3, selling its least efficient BTC machines at its biggest site first, because raise-climb has every site full by 2021) with golden `gen2-queuer-seed-2017.json`, and `gen2-street` (the same buying at the street price) as Y-B7's comparison.
- **M77.4 (measure).** **Act I, 50 seeds, median end valuation, main against `m77`:** every existing Act I bot is unchanged (0.0%) except `texas-ipo-upgrade`, which buys about 880 Gen 2 rigs by 2021Q4 (the same count before and after) and ends 5.4% lower ($330.4M to $312.6M: the corrected, higher 2021 prices; under the 10% line, reported, not tuned). No bust-rate change for any bot. Gen 2 rigs bought by 2021Q4 (median): 0 for every existing bot but `texas-ipo-upgrade` (882 before and after).
- **Y-B7 (report only), `gen2-queuer` against `gen2-street`, 4 rigs ordered a quarter in 2021Q1-Q3, medians over 50 seeds:** 12 ordered each; delivered by 2021Q4: 9 against 12 (3 still on order); spent $49,200 against $83,600; Act I end valuation $14,907,557 against $14,898,135 (+0.06%). The queue saves $34,400 on the same 12 rigs, but its late arrivals cancel it.
- **`--act2 --act3` against main (the previous run, `out-base`):** 90 of the 1,300 per-run files differ, in the bots that buy a Gen 2 rig: `texas-ipo-upgrade` 50 of 50 seeds; `texas-shell`, `texas-ipo`, `texas-capital`, `overleveraged`, `asic-retirer` 7 seeds each; `raise-borrow` 5; plus `summary.csv` and `act2-valuation.csv`; 100 files are new (the two new bots x 50 seeds). **All 90 differing runs bought a Gen 2 rig in Act I and none of the other 1,210 differs** (a script played every bot and seed to check); 166 runs that bought Gen 2 rigs only before 2021 (at the unchanged $3,600) are identical. Act II onward therefore changes only through the new Act I ends: Y-B0 holds.
- **`--prologue` 50 seeds, X-B table:** X-B1 PASS (17 bots x 50 seeds byte-identical, `prologue-runs.csv` byte-identical to the M75 run); X-B2 PASS, X-B3 MISS as before (28 pps-operator game overs), X-B4 PASS 86%, X-B5 PASS 1.01x, X-B6 PASS, X-B7 altcoins PASS 0.76x, club PASS 1.00x (trusting 0.96x), pool INFO 8.77x; pacing PASS; timing 133.7 s for 1,000 runs (target 150 s) PASS.
- **M77's run is the new baseline for Y-B1 in M78** (the Act I and Act II sim outputs `m77-act23`, the Act I summary `act1-m77`, and the Prologue run above).
- **Player-visible in RUN 2:** no (tests, bots and measurements only); the owner's staging build of M77.1 is current.
- **STOPPED:** none. **Open questions for the design thread:** (1) No Act I golden moved because no golden bot buys Gen 2 after 2020Q4: should one golden bot (or the `gen2-queuer` golden I added) be the Act I price-table guard from now on? (2) The queue saves $34K on 12 rigs but 3 arrive after 2021Q4 and the net worth is a wash: is that the intended trade (cheap and late against dear and now)? (3) `texas-ipo-upgrade` loses 5.4% to the dearer 2021 street prices: expected, but it is the one bot that shows the table; keep it as the watch bot?


## M76: live chart follow-up (doc 61 v1.1 §7) (branch `m76` from `main` at `35a9b16`, M75 merged as PR #47)

- M76.0 doc 61 v1.1 (copied with `cp`, byte-exact; diff: header and §7 only). M76.1 done: **A** Act V's weekly power prices now ride through the Act IV to Act V market glide (`act5` weeks carry `power_usd_kwh_<region>`; `act3Week` also keeps the two Rubin rent columns for Acts III-V; all optional fields of `MarketWeek`, never read by the sim: a test greps `src/sim`), and the chart's power series reads them week by week (no flat line, no quarterly fallback). **B** the GPU rent line is named by the column shown through `t()`: "GPU rent (H100)", "(Rubin)", "(Rubin Ultra)". **C** no Prologue chart code or keys existed (M75 built none); the two old chart-title keys (`ui.live.chart_title`, `_btc`), left over from the old chart, were removed.
- Checks: lint, 2,024 tests and build green; every golden byte-identical (the gate to keep the weekly power columns). New tests in `tests/ui/liveChart.test.tsx`: the power series varies week to week and matches the weekly market; the sim does not read the carried columns; the legend name per GPU class (H100, Rubin, Rubin Ultra; Gen 2037 and Bowline take Rubin Ultra, B200 and H200 take H100).
- **Found on the way (fixed, mine, reversible):** M75's GPU rent series for a Rubin-renting company never appeared, because `act3Week` dropped the Rubin weekly columns, so the series had no data; carrying them (needed for the legend name) fixes that. Player-visible: Acts III-V now offer the Rubin rent series.
- `npm run sim -- --act2 --act3` on `m76` against main: all 1,302 output files identical (`diff -r`). Not run: `--prologue`, `--act4`, `--act5`, `--energy` (the carried columns are optional fields no sim code reads; every golden passes).
- STOPPED: none. Open question for the design thread: (1) the newer classes still take the nearest column (doc 61 §7.3); with the Rubin columns now carried, B200 and H200 still show the H100 neocloud rate: acceptable, or should they take the Rubin hyperscaler rate?

## M75: the Live chart by act (doc 61 v1.0), the 2009Q1 hint (doc 51 v1.8 §19.5) (branch `m75` from `main` at `0eefbc9`, M74 merged as PR #46)

- M75.0 doc 61 v1.0 and doc 51 v1.8 (copied with `cp`, byte-exact; doc 51 diff: header and §19 only). M75.1 done (RUN 1: build only, no test suites): `src/ui/liveChart.ts` (series, defaults, the Acts III-V column allow-list) and `Live.tsx`'s chart with a segmented switch above it (series with data this week that apply to the company; the default is the act's main driver from last quarter's revenue split, doc 61 §3). Acts I to V; the Prologue has no chart on its Live screen (its quarters are cards), so nothing changes there and the altcoin series is not drawn. Act V with no machines now shows the chart too (power price by default, no BTC, M66).
- (mine, reversible) the remembered choice lives in the browser (`src/platform/chartChoice.ts`, key `g2g.chart`, per game seed and act), not in the game state or the save file: no sim file changes, no golden can move; Act V's power price is the quarterly row held flat across the weeks (the weekly power columns do not survive the glide from Act IV's weeks into Act V's market), like the launch price; GPU rent in Acts III-V is the h100 neocloud column or the Rubin or Rubin Ultra hyperscaler column by the newest generation on the company's projects; "Your company" draws weekly revenue and cash as % change; every line is % change against the quarter's first week, the flat series show the price and its change against last quarter in the legend.
- M75.2 done: the 2009Q1 rig hint reads "One PC is a hobby. Five is a habit. Build the home rig to fit more." (en.json only). RUN 2 (tests, X-B1 against the M74 baseline, `--act2 --act3`, the PR) waits for the owner's staging build.
- **M75.3 (tests, RUN 2):** lint, 2,021 tests and build green; every golden byte-identical (UI and text only). New `tests/ui/liveChart.test.tsx` (11 tests): the default per act (Act I BTC and ETH; Act II before 2023-07-03 Your company, from it GPU rent, mining BTC keeps BTC; Act III GPU rent or BTC over half; Act IV GPU rent or launch price with orbital revenue over half and blocks; Act V power price by the largest site's region, BTC with machines), the switch (only series that apply, remembered across quarters, reset at an act change, another game's choice ignored, a stale choice falls back), the leak guard (every column on the allow-list, none a scenario, future, Signals or hidden-file name, the module imports no hidden file). The tests found one real fault, fixed: in Act IV's first quarter the launch-price comparison with the quarter before read Act III's market and threw; it now shows the price without a comparison. One existing test (`miningTiles`) now expects the chart's new title ("BTC") on the empty panel at a quarter's start, where the panel is kept (it opens on BTC, or Your company in Act V with no machines).
- **M75.4 (check):** `--prologue` 50 seeds against the M74 baseline: X-B1 PASS, 17 bots x 50 seeds byte-identical (header too); `prologue-runs.csv` and `prologue-pool-runs.csv` are byte-identical to M74's run; timing 116.7 s for 1,000 runs. `--act2 --act3` on `m75` against main: all 1,302 output files identical (`diff -r`). Not run: `--act4`, `--energy`, `--act5` (UI and text only; nothing in `src/sim/` or `src/content/` changed).
- **Player-visible change in RUN 2:** yes, small: the first Act IV quarter's launch price no longer throws (see M75.3), and the chart panel before a quarter's first week is kept (it was dropped in RUN 1's build). The owner should rebuild staging to see both.
- **STOPPED:** none. **Open questions for the design thread:** (1) The Prologue's Live screen has no chart (its quarters are cards), so doc 61's Prologue rows (BTC and ETH, altcoins) have nothing to change; should the Prologue get a chart, or is §2's Prologue row dropped? (2) Doc 61 names weekly power columns for Act V, but only the quarterly price survives into Act V's market at run time, so the power series is a flat line with the change against last quarter in the legend: is that what you want, or should the weekly power data be carried through (a small content change, golden-free)? (3) GPU rent in Acts III-V uses three columns (h100 neocloud, Rubin and Rubin Ultra hyperscaler) because the weekly market has no h200, b200, Gen 2037 or Bowline columns; the newer classes map to Rubin Ultra: acceptable? (4) The remembered choice is kept in the browser per game seed and act, not in the save file: should it travel with an exported save?


## M74: opening changes (doc 51 v1.7 §18) (branch `m74` from `main` at `1dec37e`, M73 merged as PR #45)

- M74.0 doc 51 v1.7 (copied with `cp`, byte-exact; diff: header and §18 only). M74.1 done (build only; tests and measurement are RUN 2, after the owner's staging build): Spare PC cap 5 (starter included), on sale 2009Q1 to 2010Q2 only (`spare_pc.last_quarter`, no tail rule), the purchase log names a spare "Spare PC (CPU)" (the log's model param is `pc_cpu_spare`), 2009Q2 added to `decision_quarters` (content), the small unit opens from 2011Q3 (still after moving out, Act I cost and power; the lock text is the generic "Not yet: this opens in {quarter}"); `docs/alpha-0.3-scope.md` §2.4 amended with a note.
- (mine, reversible) the 2009Q1 rig hint keeps its "Four is a habit" wording (doc 51 §17 text); the docs pack copy of `events_prologue.json` got a 2009Q2 focus line; the docs pack `machines_prologue.json` price table lost the 2010Q2 key. Not done: RUN 2 (tests, golden re-accepts with reasons, bots, measurement).
- **M74.2 done (RUN 2):** lint, 2,010 tests and build green. Act I, Act II, Acts III-V goldens and the 2017 start byte-identical. **Moved goldens and why:** prologue-careful-hodler, prologue-alts, prologue-pool, prologue-club moved by one line each: the 2009Q2 report's `auto` flag went true to false (2009Q2 is a Plan phase now, doc 51 §18 item 5); prologue-cpu-farmer additionally moved because the bot buys 4 spares (not 3) and the log names the model `pc_cpu_spare` (item 4); `prologue-to-act1` did not move (its bot plans every quarter). The small unit from 2011Q3 (item 6) moved no existing golden (no earlier bot leases one). Tests updated: 14 Plan phases for a passive run, 2009Q2 is a decision quarter (the "Stop here" test now uses 2010Q4), the auto-played random card test uses 2009Q3, the small-unit test (2011Q3, locked while at home), the Spare PC tests (cap 5, window 2009Q1 to 2010Q2, log name, menu agrees).
- **M74.3 done:** `cpu-farmer` buys 4 spares; new `unit-farmer` (setting `unitFarm`): sells $60K of BTC in the 2011Q2 Plan, stops at the 2011Q2 report so 2011Q3 is a Plan phase, moves out and leases the small unit there, then at each later Plan phase sells $40K of BTC and fills the free room with gaming GPUs, keeping a quarter of its rent and power in cash; golden `prologue-unit-farmer-seed-2009.json`. (mine, reversible) the two dollar amounts, the GPU-only fill, the stop at 2011Q2's report; the runner's pacing proxy is now at most 14 Plan phases (15 for the scrypt-switcher).
- (mine, reversible) the price table keeps a 2010Q2 key because the market's 4-quarter tail rule would otherwise end the Spare PC sale at 2010Q1; the real cutoff is `spare_pc.last_quarter`.
- **M74.4 (measure), `--prologue` 50 seeds against the M73 main:** X-B1 MISS for a §18 reason: every run has one more Plan phase (`planPhases` +1 in all 800 rows) and 134 runs shift a little in coins and net worth (`cardsShown` in 193 rows, `prologueUsd` and `btcMined` in about 135, `lostExchangeBtc` and `goxShare` in 6, `lostWalletBtc` in 4, one run's wallet-loss flag and end), because a Plan phase at 2009Q2 resolves cards where an auto-played quarter took defaults (item 5). Nothing else moved. X-B2 PASS (50 of 50 at or under 2%), X-B3 MISS as before (theft 6%, insolvent 74%, 28 pps-operator game overs), X-B4 PASS 86%, X-B5 PASS 1.01x, X-B6 PASS 263.6x / 98.8%, X-B7 altcoins PASS 0.76x, club PASS 1.00x (trusting 0.96x), pool INFO 8.77x; pacing PASS (14 Plan phases for the plain bots, 15 for the scrypt-switcher); timing 126.9 s for 1,000 runs (target 150 s) PASS. `--act2 --act3` on `m74` against main: all 1,302 output files identical (`diff -r`).

| 50 seeds, medians | careful-hodler | cpu-farmer (5 PCs) | unit-farmer |
| --- | --- | --- | --- |
| Blocks found by 2010Q4 | 24,190 | 46,175 | 46,175 |
| Prologue BTC mined | 1,219,860 | 2,319,379 | 2,339,887 |
| Prologue net worth (stash) | $1.170B | $2.224B (1.90x) | $2.125B (1.82x) |
| Act I carryover multiple | 11.70x | 11.69x | 11.69x |
| Act I end net worth | $13.7B | $26.1B | $24.9B |
| Plan phases / cards needing a choice | 14 / 19 | 14 / 18.5 | 15 / 16 |
| Game overs (of 50) | 0 | 1 | 0 |

- **The 4x guard did not trip** (1.90x and 1.82x). The unit-farmer ends a little below the cpu-farmer: it sells BTC into a thin 2011 market (a $60K sale ahead of the unit, $40K at each Plan phase after, at up to 20% slippage) to buy GPUs, and the GPUs (285 in the 100 kW unit, replaced as they fail) do not earn that back before the handover; the carryover multiple is identical (11.69x). By PC count, BTC mined over the Prologue against one PC is 1.9x with 5 PCs (M73: 1.78x with 4).
- **The one cpu-farmer game over (seed 47, 2015Q2):** the dead-hard-drive card took the wallet (2.2M BTC) in 2014Q3, then a forced sale and a forced move home left cash at -$1,160; the same slide as the no-backup bot's game overs. Not new rules; reported.
- **Open questions for the design thread:** (1) X-B1 now means "identical but for 2009Q2's Plan phase": should the baseline for the next milestone's X-B1 be this run (14 Plan phases)? (2) The farmers carry 1.8x to 1.9x of careful-hodler's stash and an identical carryover multiple: is the extra Prologue stash what you wanted, or should the cap come down? (3) The unit-farmer's farm earns less than the BTC it sold: should a farmer be able to do better (a smaller unit fill, a later sale), or is that the lesson? (4) The 2009Q2 Plan phase: does the owner's playtest show it earns its place?
- **STOPPED:** none. **Gameplay changed in RUN 2:** no (tests and bots only); the owner's staging build from RUN 1 is current.


## M73: buyable CPU PCs in the Prologue opening (doc 51 v1.6 §17) (branch `m73` from `main` at `3523943`, M72 merged as PR #44)

- **Commits:** M73.0 doc 51 v1.6 (copied with `cp`, byte-exact; diff: header and §17 only), M73.1 buyable CPU PCs, M73.2 tests and the cpu-farmer bot, M73.3 results (this section). **Staging:** built by the owner from M73.1 (`npm run staging:build`, local: `npm run staging`, http://localhost:4173); nothing after M73.1 changed the game, only tests and the bot.
- **M73.1 (build):** `pc_cpu` is buyable as a "Spare PC (CPU)" ($350 new, 2009Q1 to 2011Q2; into the home rig only, the bedroom row says "Needs the home rig"; 4 CPU PCs in all, the starter included; new only), text through `t()`, the 2009Q1 Plan hint on the rig panel, the starter keeps its name (bought copies are told apart by condition), earlier bots' buy filters skip `pc_cpu`.
- **M73.2 (tests):** lint, 2,004 tests and build green; every existing golden byte-identical (the Prologue x2 included); `cpu-farmer` (careful-hodler plus the rig and 3 Spare PCs in 2009Q1, setting `sparePcs`) with `tests/golden/prologue-cpu-farmer-seed-2009.json`; `tests/sim/prologueSparePc.test.ts` (price, rig gate, cap, Max (N), used refused, sale window, old save, no earlier bot buys one); one existing test (power-bound Max in prologueBulkBuy) now skips the Spare PC, whose max is the cap.
- **M73.3 (measure), `--prologue` 50 seeds:** X-B1 PASS (15 bots x 50 seeds byte-identical to main, header too). X-B2 PASS (pool stays small, 50 of 50 at or under 2%), X-B3 MISS as before (theft 6%, insolvent 74%, 28 game overs), X-B4 PASS 86%, X-B5 PASS 1.01x, X-B6 PASS 263.6x / 98.8%, X-B7 altcoins PASS 0.76x, club PASS 1.00x (trusting 0.96x), pool INFO 8.77x; timing 123.8 s (target 150 s). `--act2 --act3` on `m73` against main: all 1,302 output files identical (`diff -r`). Not run: `--act4`, `--energy` (nothing in them changed).

| 50 seeds, medians | careful-hodler | cpu-farmer | ratio |
| --- | --- | --- | --- |
| Blocks found by 2010Q4 | 24,200 | 43,290 | 1.79x |
| BTC mined by 2010Q4 | 1,210,580 | 2,165,583 | 1.79x |
| Prologue BTC mined (whole Prologue) | 1,220,499 | 2,173,901 | 1.78x |
| Prologue net worth ($, stash at 2016Q4) | $1.171B | $2.086B | 1.78x |
| Act I carryover multiple (2016Q4 to 2026Q4) | 11.70x | 11.69x | 1.00x |
| Act I end net worth | $13.7B | $24.5B | 1.78x |

- **STOPPED (reported, not changed):** the cpu-farmer's median Prologue stash is **1.78x** careful-hodler's, above the 1.5x guard (doc 51 v1.6 decision 4: the owner lowers the cap to 3 if so; I did not change it). Four CPU PCs give 4x the hashrate (the gain by PC count: 2 PCs 1.38x, 3 PCs 1.62x, 4 PCs 1.78x in BTC mined) but the early blocks rise only 1.79x, because the player's share of a very small network saturates; the extra stash is carried unchanged through Act I (the multiple is the same, 11.7x), so the whole difference is the extra Prologue coins.
- **(mine, reversible):** the Spare PC is on sale through 2011Q2 (price keys 2009Q1 and 2010Q2 with the market's 4-quarter tail); used copies are not offered (the used price is 0); bought lots are told apart from the starter by condition; the purchase log line still names the model, so a spare shows as "Your Gaming PC (CPU)" there; the docs pack copy of `machines_prologue.json` got the new price and note.
- **Open questions for the design thread:** (1) The guard tripped at 1.78x. Measured (BTC mined over the Prologue, 50 seeds, median, against one PC): 2 CPU PCs 1.38x, 3 PCs 1.62x, 4 PCs 1.78x. A cap of 3 would still be above 1.5x; a cap of 2 gives 1.38x. Which cap, or a different fix? (2) Should the log line name spares? (3) Should the Spare PC stay on sale until 2011Q2, or only in the opening (2009Q1 to 2010Q2)? (4) The opening still has no 2009Q2 Plan phase (parked in doc 50): does the rig-and-PCs loop feel enough after the playtest?

## M72: header difficulty, the pps-operator fix and the restated pool target (doc 51 v1.5 §16) (branch `m72` from `main` at `243f669`, M71 merged as PR #43)

Split (doc 51 v1.5 copied from the design thread's file, diff checked: header, the X-B2 row, §16):
- M72.0 doc 51 v1.5 (copied with `cp`, byte-exact: mine, reversible)
- M72.1 done: `headers_difficulty.py` pauses 1 s between calls, backs off on HTTP 429 (30 s, doubling, cap 15 min, then stops cleanly with exit 3), caches every Dogecoin block and finished week and resumes; the cache is git-ignored (and untracked: M71 had committed it by mistake); check week 2014-05-26 is LTC 8,900; Dogecoin starts 2013-12-02.
  **Found on main:** the golden act5-v3 and v4 failed on `main` after the merge of M71 (the other session's Heat NaN fix, `e6dbd81`, had moved those goldens separately; the two together move cash by about $5.7K of $2.45B). Re-accepted here; Perfect's Heat table is unchanged (re-run: identical to M71's).
- M72.2 done: the full header run completed (Litecoin 271 of 271 weeks, Dogecoin 161 of 161; about 6 h wall time against BlockCypher's cap); check weeks all ok (LTC 2013-12-16 3,231; LTC 2014-05-26 8,900; DOGE 2014-05-26 713; LTC 2014-09-15 33,203). Header ÷ reconstruction (weekly median): LTC 2011Q4 0.75, 2012Q1 1.05, Q2 1.01, Q3 2.59, Q4 2.75, 2013Q1 0.93, Q2 1.20, Q3 1.30, Q4 1.05, 2014Q1 1.05, Q2 1.16, Q3 1.52, Q4 1.27, 2015Q1 0.98, Q2 0.91, Q3 0.80, Q4 0.94, 2016Q1 0.90, Q2 0.73, Q3 0.69, Q4 0.61; DOGE 2013Q4 0.94, 2014Q1 0.84, Q2 1.20, Q3 2.19, Q4 1.47, 2015Q1 1.12, Q2 1.05, Q3 0.98, Q4 1.06, 2016Q1 1.09, Q2 0.75, Q3 0.74, Q4 0.64.
- M72.3 done: `gen_alts.py` takes difficulty from the headers wherever they exist (hashrate follows; grade A in the difficulty slots); the reconstruction fills gaps only (none now). X-B6 (a 2010 GPU, 2013Q4): LTC $243 vs BTC $18.67 a quarter = 13.0x (before: 13.0x; best scrypt coin DOGE $4,823 = 258x, before 79.5x); LTC income 2014Q1 $172 to 2014Q4 $2.80 (fall 98.4%; before 98.1%). Early-Litecoin stack per 2010 GPU: 116,171 LTC by 2013Q1 (before 110,775), worth $3.12M at the 2013Q4 close of $26.83 (before $2.97M); the weekly limits are unchanged (about $71K in 2013Q1, $0.55M in 2013Q4, $3.05M in 2014Q1). Goldens prologue-alts and prologue-club re-accepted (the new difficulty); prologue-pool did not move.
- M72.4 done: bot setting `moveOutCashQuarters` (the pps-operator carries 4: deposit plus four quarters of rent, power and the pool's bills); the runner's X-B2 is the pool's peak share of bitcoin hashrate (at most 2% in at least 95% of runs, median fee income reported, below careful-hodler), X-B7 (pool) is printed as INFO with no verdict, timing target 150 s. Test `tests/sim/prologueBotMoveOut.test.ts`. No golden moved.
- M72.5 done: see the M72 results below.

### M72 results (15 Oct 2026; commits M72.0 to M72.4 on branch `m72`)
- **X-B table (`--prologue`, 50 seeds, X-B1 against main after M71):** X-B1 differs only for the feature bots that mine altcoins or run a PPS pool (sell-as-mined-scrypt, scrypt-switcher, pool-and-scrypt, club-trusting, club-all, pps-operator); every non-feature bot, the pool-operator and the club-bot are byte-identical. **X-B2 (restated) PASS:** the pool-operator's peak share of bitcoin hashrate is at most 2% in 50 of 50 runs (median peak 1.307%, max 1.570%); median Prologue fee income $184K; it ends at $344.1K against careful-hodler's $1.2B (8.54x the sell-as-mined bot: reported). X-B7 (pool) is INFO only (8.77x). X-B7 altcoins PASS 0.76x, club PASS 1.00x (trusting 0.96x). X-B3 MISS as before (theft 6% of pps-operator runs, 2/50 with cold storage; insolvent 74%). X-B4 PASS 86%. X-B5 PASS 1.01x. X-B6 PASS: 2013Q4 scrypt $4,823 vs bitcoin $18.30 a quarter (263.6x; before 79.5x), income falls 98.8% from 2014Q1 to 2014Q4 (before 98.1%). X-B8 (reported): club-bot 24 choice cards median (max 27), club-all 27 (max 33), pool-operator 21 (max 26), pps-operator 21 (max 29). Timing 116.4 s for 1,000 runs (target 150 s): PASS.
- **pps-operator game overs: 28 of 50 (M71: 33).** The four-quarter rule did not remove them. Each is the same slide: the pool closes insolvent in 2013Q4, the bot (with cash for the deposit and four quarters) moves out in 2014Q1, and with no other income its cash runs out between 2015Q1 and 2016Q2 (rent about $3K a quarter); the game forces it home and ends at 2016Q2 in 19 of the 28. The pool is the start, not the last cause.
- **Header coverage and X-B6 / early-Litecoin numbers:** see M72.2 and M72.3 above.
- **Byte-identity:** `npm run sim -- --act2 --act3` on `m72` against main: all 1,302 output files identical. Every non-feature golden unchanged; the act5-v3 and v4 goldens were re-accepted in M72.1 (found failing on main, see above); prologue-alts and prologue-club moved in M72.3.
- **(mine, reversible):** docs 51 v1.5 copied with `cp` (byte-exact; the prompt says Read and Write); the four-quarter cost rule counts rent, the machines' power and the pool's bills, with rent counted before the move; the pool's peak share counts outside miners only (the bot's own rigs add under 0.0001%); the loop reran the header tool after each clean stop for about 6 hours; the grade string's slots are ltc difficulty / ltc price / doge difficulty / doge price.
- **STOPPED:** none. The header run completed.
- **Open questions for the design thread:** (1) pps-operator game overs: 28 of 50 survive the four-quarter rule. Do you want the bot to stay at home until it has cash for the rest of the Prologue, to sell its machines for rent, or to accept the game over as the PPS lesson (the target says 0 caused by the pool)? (2) X-B3's insolvency clause (at least 5%) passes at 74% and its theft clause (at least 10% without cold storage) misses at 6% in 50 runs; the 200-run measure was 17%: keep the clause as written? (3) The header ÷ reconstruction ratio is 0.61 to 0.75 in 2016 and 2011Q4: the 2016 Litecoin difficulty is a third lower than the reconstruction, which raises late-game scrypt income; check against sourced points before ship? (4) Early Litecoin: 116,171 LTC per 2010 GPU by 2013Q1 and $3.12M at the 2013Q4 close; confirm it stays literal.

## M71: licensed prices, renames, the Prologue expansion behind the flag, the M70 fixes and the balance pass (doc 51 v1.4 §14-§15, doc 43 §0.28) (branch `m71` from `main` at `95929aa`, M70 merged as PR #41)

Split (docs 55 and 57, `research-2/` and `research-3/` moved out of `docs/prologue-content/`; docs 43 and 51 copied from the design thread's files, diffs checked):
- M71.0 docs
- M71.1 done: renames (Kestrel Foundry, Nell Hartigan with id `nell`, Slagwheel) through `gen_content.py` plus a rename pass in `merge_alts.py` for the already-merged text (logged in the pack README); `PROLOGUE_EXPANSION` in `src/platform/preview.ts` (off in production: no Ventures item, no coin selector, no expansion headlines, a save that used a feature refuses with `error.save_test_build`); gate test `tests/ui/prologueExpansionGate.test.tsx`. No golden moved.
- M71.2 done: `gen_alts.py` and `gen_content.py` ported from the design thread (build changes kept: live copies, LF, paths); every regenerated pack file matches the design thread's in values (only the build's `pool_insolvent*` text keys differ); `merge_alts.py` rebuilds the merged custody and selling-limit blocks and updates the news_ltc_launch card in place; schemas take the new columns and fields; `market-csv-to-json.ts` reads the `grade` column as text.
- M71.3 done: Litecoin opens 24 Oct 2011 (data-driven), selling limits use the week's real daily volume, the boycott is the week-by-week bump (`boycottBumpPp`), DDoS from 2013Q2 (data), PPS insolvency pays from cash down to one quarter of committed costs (`committedCostsUsd`; `poolEnded.unpaidUsd`; text `chapter.p0.pool_insolvent_unpaid`), friendship +10% per point below 0 on the buy-out price, `pool_sale_offer` pauses auto-play, the chapter line's later-price clause, the credit line (coin panel and title screen, behind the flag). Goldens prologue-alts, prologue-pool and prologue-club re-accepted (real prices, new bills and shares, the pause); the switcher bot mines no Dogecoin on the real prices. No other golden moved.
- M71.4 done: the pool's quarter keeps `operatorUsd` (and the report the method), so the report line and the pool panel show fees, luck and net under PPS (fees and net under PPLNS); "1 unlucky week" has its own key. Only the prologue-pool golden moved (the new fields). Tests: `tests/ui/prologuePoolReport.test.tsx`.
- M71.5 done (code): `complaintAnswer` in `tools/act5/bots.ts`: the perfect reader answers the neighbour complaint with the answer that leaves the site's Heat lowest (cheaper on a tie), ignoring only when it cannot pay. Perfect's hottest-site Heat (10 seeds): FB 38.2/33.9 (v1, v2), 34.5/34.5 (v3, v4); OL 39.5/38.3 (v1, v2), 34.5/34.5 (v3, v4) at 2040Q3/after 2040Q4: over 50 in 0 of 80 runs. Act V goldens v1-v4 moved (the perfect bot only). `--act5` table: below.
- M71.6 done: `tools/prologue/headers_difficulty.py` (standard library; litecoinspace.org for Litecoin, BlockCypher for Dogecoin; `--checks` and `--all`, resumable cache); not wired into the game. Check weeks: LTC 2013-12-16 3,231 (about 3,150: ok), LTC 2014-05-26 8,900 (about 7,000: outside 15%), DOGE 2014-05-26 713 (about 700: ok), LTC 2014-09-15 33,203 (about 30,000: ok). Full-run result: see the M71 results.
- M71.7 done (lever (a) kept): `start_pull` 0.005 to 0.0025 (X-B2 16.50x to 8.54x, X-B7 pool 17.02x to 8.77x); lever (b) fee elasticity -0.08 to -0.12 made it worse (9.04x) and was reverted. Both targets still miss; every other target keeps its verdict. Pool tests read the pull from content; the prologue-pool golden re-accepted.
- M71.8 (H) final checks: `--act2 --act3`, goldens
- (mine, reversible) docs 43, 51, 55, 57 were copied with `cp` (byte-exact) rather than Read and Write.

### M71 results (15 Oct 2026; commits M71.0 to M71.7 on branch `m71`)
- **X-B table (`--prologue`, 50 seeds, X-B1 against main after M70).** Before the levers / after lever (a) (kept):
  X-B1 differs only for the feature bots (sell-as-mined-scrypt, scrypt-switcher, the pool, PPS, club and club-all bots; expected: new prices, bills, shares), every non-feature bot byte-identical / same.
  X-B2 MISS 16.50x / 8.54x (target 1.2-3x). X-B7 pool MISS 17.02x / 8.77x. X-B7 altcoins PASS 0.76x. X-B7 club PASS 1.00x (trusting 0.96x). X-B3 MISS: theft 6% of pps-operator runs (2/50 with cold storage), insolvent 68% / 74%, pps-operator game overs 25 / 33. X-B4 PASS 84% / 86%. X-B5 PASS 1.01x (club bot $40.1K vs group-solo $39.7K). X-B6 PASS 79.5x in 2013Q4, income falls 98.1% in 2014. X-B8 (reported): club-bot 24 choice cards median (max 27), club-all 27 (max 33), pool-operator 21 (max 26), scrypt-switcher 19 (max 22).
  Lever (b) (-0.12) made X-B2 9.04x and was reverted. The 1,000-run timing target missed (124-128 s against 120 s) with two other sims running; not a rule change.
- **pps-operator game overs (target 0 caused by the pool):** 25-33 of 50. Each comes 1 to 6 quarters after the pool closes: the bot moves out in 2014Q1 whatever its cash, the pool then takes the cash down to the floor (one quarter of committed costs), and the bot has no other income. The pool is the start of the slide, not the last cause.
- **Early-Litecoin hodler (computed from the data, not a bot run):** one 2010 GPU mines about 110,800 LTC by 2013Q1 (109,700 by 2012Q4), worth about $2.97M at the 2013Q4 close ($26.83; the week's high was $53.15). The weekly limits (2% of the week's daily volume) let it sell about $0.28K in 2012Q4, $71K in 2013Q1, $77K in 2013Q2, $83K in 2013Q3, $0.55M in 2013Q4 and $3.05M in 2014Q1: a jackpot that can only be cashed from 2014Q1.
- **Act V (`--act5`, 30 seeds; 0 unreconciled):** Perfect Firm Builder 1.660/1.304/1.187/1.271, Orbital Landlord 1.350/1.171/1.062/1.387 (M70: 1.659/1.304/1.186/1.271 and 1.350/1.170/1.061/1.387). V-B1, V-B2, V-B4, V-B7 (0 busts in 120), V-B8, V-B9, V-B10, V-B11 pass (V-B11 FB 0.988/0.875/0.815/0.810, OL 0.956/0.884/0.821/0.806; V4 above 0.80 on both); misses V-B3 Orbital Landlord and V-B5 Firm Builder (information), unchanged. No stop rule tripped. Perfect's hottest-site Heat at 2040Q3 / after 2040Q4: FB 38.2/33.9 (v1, v2) and 34.5/34.5 (v3, v4); OL 39.5/38.3 (v1, v2) and 34.5/34.5 (v3, v4); over 50 in 0 of 80 runs (M70: over 50 in 5 of 8 cells). Verdict: the complaint interrupt was the source; no balance issue left.
- **Header tool (chunk F):** BlockCypher answered `HTTP Error 429: Too Many Requests` at `https://api.blockcypher.com/v1/doge/main/blocks/235799` after 136 weeks (Litecoin to 2014-09-15, Dogecoin to about 2014-06); the tool is written and its partial output is in `research-2/ltc_doge_difficulty_headers.csv` (`--write` rebuilds it from the cache). Not retried by another route (STOPPED). Against the reconstruction (header ÷ reconstruction, weekly median): LTC 0.75 (2011Q4), 1.05, 1.01, 2.59 (2012Q3), 2.75 (2012Q4), 0.93, 1.20, 1.30, 1.05 (2013Q4), 1.05, 1.05, 1.07 (2014Q3); DOGE 0.96 (2013Q4), 0.84 (2014Q1), 1.02 (2014Q2). Check weeks: LTC 2013-12-16 3,231 (about 3,150), DOGE 2014-05-26 713 (about 700), LTC 2014-09-15 33,203 (about 30,000), LTC 2014-05-26 8,900 (about 7,000: outside 15%).
- **Byte-identity:** `npm run sim -- --act2 --act3` on `m71` against main: all 1,302 output files identical (`diff -r`). Not run: `--act4`, `--energy` (nothing in them changed). Every non-feature golden is byte-identical; the feature goldens (prologue-alts, prologue-pool, prologue-club) and the Act V goldens v1-v4 moved as explained above.
- **(mine, reversible):** `club-all`, `group-solo` and the club bots stay as in M70; lever (b) reverted; `PROLOGUE_EXPANSION` gates the UI and saves (the sim's actions stay reachable only through a test build or a save); the credit line also sits on the title screen behind the flag; the friendship step (10%) is a code constant because the content states it as text; the pool's net under PPS is the operator's weekly take at each week's price (`operatorUsd`); "1 unlucky week" drops "in a row"; the committed-costs floor = rent once moved out + the power the machines draw + the server bill + protection.
- **STOPPED:** the header run (429 above).
- **Open questions for the design thread:** (1) X-B2 and X-B7 (pool) miss by 8-9x and neither lever helps: a lower small-pool share for a new pool, an outside-hashrate cap, or a new target? (2) PPS game overs: make the bot move out only with cash for a few quarters, or raise the floor? (3) The Litecoin check value for 2014-05-26 (about 7,000) against 8,900 from headers: which is right? (4) The header ÷ reconstruction ratio is 2.6-2.75 in 2012Q3-Q4: do you want the shipped file to use headers once the full run exists? (5) The scrypt-switcher bot mines no Dogecoin on the real prices: accept? (6) The 1,000-run timing target (120 s) is tight under load: relax it?


## M70: the mining club (doc 51 §4), PPS insolvency (doc 51 §13) and the Heat habit check (doc 43 §0.27) (branch `m70` from `main` at `3918d3e`, M69 merged as PR #40)

Split (docs 43 §0.27 and 51 v1.2 §13 are in the repo):
- M70.0 doc 43 §0.27, doc 51 v1.2
- M70.1 done: a PPS pool that cannot pay (cash short, or below zero) pays its miners from your cash down to zero, closes and sells for nothing (`poolEnded.kind: 'insolvent'`, key `chapter.p0.pool_insolvent`, shown in the chapter report and on Ventures); the old "half the miners leave, reputation -30" rule is gone. Goldens unchanged (prologue-pool's bot is PPLNS). Fixed `merge_alts.py`'s README guard, which had appended a copy of the M68.3 block on every run; the README is clean again.
  X-B3 on full runs (50 seeds, `pps-operator`): insolvent in 35 of 50 (70%, target 5%); theft without cold storage over 200 full PPLNS runs: 17.0% (34/200; target 10%) (the pps-operator's own 3/50 is cut short by its early closure); pps-operator game overs 27 of 50, all through the Prologue's existing rule (the pool took the cash to zero, and rent then cannot be paid).
- M70.2 done: the 2040Q4 rise is ordinary grievances (an ignored complaint interrupt +10, event cards +5, `grievance` 5 to 15 in the heat parts), not an end-of-act card or the exit; so the habit now acts on every site at 45 or more (`tools/act5/bots.ts`, skipping non-finite Heat). Perfect's hottest-site Heat at 2040Q3 / after 2040Q4 (10 seeds): Firm Builder v1 43.9/53.9, v2 43.9/53.9, v3 43.5/52.5, v4 43.5/52.5; Orbital Landlord v1 48.3/48.5, v2 48.3/48.5, v3 43.5/52.5, v4 43.5/43.5. Verdict: Q3 is under 50 in all 8 cells, Q4 still over 50 in 5; the habit alone does not hold it (the lever is answering the complaint interrupt: open question).
  Full `--act5` re-run (30 seeds, 0 unreconciled): Perfect FB 1.659/1.304/1.186/1.271, OL 1.350/1.170/1.061/1.387 (identical to M69); V-B2, V-B4, V-B11 pass (V-B11 FB 0.988/0.875/0.815/0.810, OL 0.956/0.884/0.821/0.806, V4 above 0.80), V-B7 0 busts in 120, V-B8 1.157/1.005/1.162/1.098 and 1.079/1.007/1.120/1.296 pass; misses V-B3 OL (1.186 vs Flex 1.138) and V-B5 FB (1.093, information), unchanged from M69. Goldens act5-v3 and v4 moved by the habit change only.
- M70.3 done: `club.json` and `preorders_additions.json` generated into the pack and `src/content/` (schemas `clubFileSchema`, `preordersAdditionsFileSchema`, `CONTENT.prologue.club`); the 7 club_ cards and 3 text keys merged in each file's own format (logged in the pack README); effect key `club{}`, `cash` may be `club_power_quarter`. Goldens unchanged.
  **`club_form` is a headline (type `news`) in the game, and joining is the action `P0_JOIN_CLUB` from the Ventures screen in 2013Q1's Plan phase (mine, reversible):** the card fires after that quarter's Plan phase and the next Plan phase is 2013Q4, past the group buy's window; a pausing card would also change every game that never joins.
- M70.4 done: the club in the sim (`src/sim/prologue/club.ts`, `clubLoad.ts`): actions `P0_JOIN_CLUB`, `P0_CLUB_GPU_COIN`, `P0_CLUB_ENDING`; state `prologue.club` and `prologue.clubEnded` (absent unless you join); save format 9 (identity migration); Jun's key loss on its own substream; the 6 random cards pause auto-play. 23 tests in `tests/sim/prologueClub.test.ts`. All goldens unchanged.
- M70.5 done: the club panel (`Club.tsx`, inside Ventures; `prologueClubView`), the club line in the chapter report; component tests in `tests/ui/prologueClub.test.tsx`; the reachability test passes. The panel's quarter table is the club's report row (the Prologue has no separate quarter report screen).
- M70.6 done: bots `club-bot` ($2,000, own keys, your place, passes both traps, buys out), `club-trusting` (Jun's keys, both traps taken), `club-all` (altcoins + pool + club), `group-solo` (sell-as-mined with its own group-buy unit, X-B5's comparison); golden `prologue-club-seed-2009.json` (club-trusting).
  `--prologue` 50 seeds, X-B1 (vs main `3918d3e`): only `pps-operator` differs (chunk A's insolvency rule); X-B5 PASS 1.02x (club-bot $40.4K vs group-solo $39.7K); X-B7 club PASS 1.01x, trusting 0.96x; X-B2 MISS 4.95x and X-B7 (pool) MISS 5.14x (M69, unchanged); X-B3 MISS (theft 6% of pps runs, 2/50 with cold storage; insolvent 70%, target 5%); pacing club-bot 13 Plan phases, 24 cards median (max 27); club-all 14 phases, 26 median, max 33 (above 30; reported).
  `npm run sim -- --act2 --act3` on `m70` vs main (`3918d3e`): all 1,302 output files byte-identical (`diff -r`). Not run: `--act4`, `--energy` (nothing in them changed beyond what the goldens cover).
- Assumptions (mine, reversible): cloud payout 10% then 2% of principal, nothing after; friendship recorded, no effect; unarrived box refunds at the group-buy refund share; the panel's quarter table is the club's report row; X-B5's comparison bot is `group-solo`; random club cards pause auto-play.

## M69: your own pool (doc 51 §3) and Heat in Act V (doc 43 §0.26) (branch `m69` from `main` at `bbb5874`, M68 merged as PR #39)

Split (docs 43 §0.26, 51 v1.1 §12 and 54 are in the repo; only the pool is built, the club waits):
### M69 results (14 Oct 2026; the commits are M69.0 to M69.6 on branch `m69`)
- **Gates:** X-B1 PASS (7 bots x 50 seeds, header too, byte-identical to main, the scrypt-switcher included); `--act2 --act3` PASS (1,301 files identical to main's); every Prologue, Act I-IV golden unchanged (the prologue-alts one is compared at format 7); only the four act5-v goldens moved, in M69.5, by the Heat habit; Act V ledger: 0 runs unreconciled.
- **X-B table (Prologue, 50 seeds):** X-B1 PASS · X-B4 PASS (pool-operator at the median fee gains outside miners 2014Q1 to Q3 in 50/50 runs; share 0.574% to 0.815%) · X-B6 PASS (13.5x, -98.2%) · X-B7 altcoins PASS (sell-as-mined-scrypt lifts 0.76x) · **X-B7 pool MISS: 5.14x** (pool-operator $199.3K vs sell-as-mined $40.3K; careful-hodler $1.2B) · **X-B2 MISS: 4.95x** (target 1.2-3x; p10 $173K, p90 $225K) · **X-B3 MISS:** theft in 6% of the 50 pps-operator runs (target 10%; many of them end early) and insolvent in 68% (target at least 5%; 31 of 50 end in a game over) · X-B8: pool-operator Plan phases 13 (max 13), cards median 20 (max 25); pool-and-scrypt 14 and 21 (max 26); pps-operator median 10 phases, 19.5 cards (target at most 14 and 30). All misses are reports: no lever was touched (doc 51 §11 item 4 is the balance milestone).
- **V-B table (Act V, 2,400 runs, 5,442 s):** unchanged from M67.6 in every cell (the Perfect row to three decimals: FB 1.659 / 1.304 / 1.186 / 1.271, OL 1.350 / 1.170 / 1.061 / 1.387). V-B1 PASS both · V-B2 PASS (FB 1.354 / 1.101) · V-B3 PASS on FB (Flex 1.295 vs Orbit 1.270), OL MISS (information; 1.138 vs 1.186) · V-B4 PASS (FB 1.346 / 1.039) · V-B5 PASS on OL 1.223 (FB information 1.093) · V-B6 information · V-B7 PASS (0 busts in 120) · V-B8 PASS in its §0.21 form (Perfect ÷ Passive FB 1.157 / 1.005 / 1.162 / 1.098, OL 1.079 / 1.007 / 1.120 / 1.296; Over-reactor at most 0.931; V2 still 1.005 and 1.007, above 1.00) · V-B9 PASS (FB +28 / +2 / +40 / +19) · V-B10 PASS · V-B11 PASS (FB 0.988 / 0.875 / 0.815 / 0.810; OL 0.956 / 0.884 / 0.821 / 0.806: V4 above 0.80) · V-B13 20 Plan phases · V-B12 and V-B14 by tests. No stop condition tripped.
- **What the Heat habit did:** it cost nothing the table shows (the Perfect medians equal M67.6's to three decimals; the bills are about $0.3M against $2.3B). Perfect's hottest-site Heat at 2040Q4 (10 seeds): **Orbital Landlord V1 49, V2 49, V4 44 (none over 50), V3 53; Firm Builder V1 54, V2 54, V3 53, V4 53 (over 50 in every run)**. So the habit keeps Perfect under 50 in 3 of 8 cells (reported, not a stop). In the cells it misses, Heat first passes 50 in 2040Q4: the grievance part rises by 15 in the act's last quarter, after the habit's one talk and one mitigation have been spent, and Firm Builder's hottest site is a different one each time. Output: `tools/act5/heatReport.ts`.
- **New:** actions `P0_OPEN_POOL`, `P0_POOL_SETTINGS` (not `P0_SET_POOL`, which is the existing "join a pool" switch), `P0_POOL_DDOS_PROTECTION`, `P0_POOL_COLD_STORAGE`, `P0_SELL_POOL`, `P0_CLOSE_POOL`; state `prologue.ownPool`, `prologue.poolEnded`, report `pool`; schema: `poolsPlayerFileSchema`, card type `trigger`, effect key `pool{}`, requirement `pool_open`; save format 7 to 8 (identity migration, tested); a Ventures item in the Prologue nav; `tests/ui/prologueReachability.test.tsx`.
- **(mine, reversible):** the pull's growth rule (new miners each quarter at start_pull x fee factor x reputation x luck, 5% leave; luck only under PPLNS, clamped 0.5-1.5; the pack gave none); "unlucky week" = under half the expected blocks in a week expecting at least one; pool-operator and pps-operator sell as mined so that X-B2's ratio is against sell-as-mined; the default answers (ride out a DDoS, repay a theft, keep paying under a PPS crunch, keep your fee, keep the pool on a sale offer); the `trigger` card type with the pool's own risk rolls (3% DDoS, 1% theft, own streams) instead of the shared random deck; a pool is sold at the last four completed quarters of fee income x 2; `glossary.hot_wallet` keeps its existing text; the m69 `--baseline` compares every bot the baseline has.
- **STOPPED:** none.
- **Open questions for the design thread:** (1) X-B2, X-B7 (pool) and X-B3 are all misses: the pool earns about five times sell-as-mined, mostly fee income in a rising bitcoin price, and a PPS pool at 2% goes bust two runs in three. Which way to move for the balance milestone: smaller `small_pool_share_by_year` / `start_pull`, a higher server bill, or a different PPS reserve? (2) Should a PPS-bust player see a game over, or should insolvency end the pool (sold for nothing) and let the game go on? (3) The Heat habit's thresholds: start at 45 does not stop the last-quarter jump; start at 40, or a second mitigation, or a habit on every site? (4) Is a theft rate near 1% a quarter enough for X-B3's 10% (it is 6% over runs that end early)? (5) The second research pass (doc 54) is still to come.

- M69.0 doc 43 §0.26, doc 51 v1.1, doc 54
- M69.1 (A) X-B7 restated: paired-seed check per feature in the Prologue runner, a sell-as-mined-scrypt variant (reporting only)
- M69.1 done: `tools/prologue-runner.ts` reports X-B7 per feature on paired seeds (sell-as-mined with and without; lift at most 3x, below careful-hodler), the scrypt-switcher's gap reported not judged; bot `sell-as-mined-scrypt` (the pool pair is read as soon as `sell-as-mined-pool` exists).
- M69.2 done: `pools_player.json` is generated into the pack and `src/content/` (schema `poolsPlayerFileSchema`, `CONTENT.prologue.pool`); `merge_alts.py` merges the 5 pool_ cards and 8 text keys in each file's own format (new card type `trigger`, effect key `pool{}`); logged in the pack README. Goldens unchanged.
- M69.3 done: `src/sim/prologue/pool.ts` (outside miners, PPLNS and PPS, bills, risk cards on their own streams, the 2014 boycott, sale and the automatic handover sale); actions `P0_OPEN_POOL`, `P0_POOL_SETTINGS` (not `P0_SET_POOL`: that name is the existing "join a pool" switch), `P0_POOL_DDOS_PROTECTION`, `P0_POOL_COLD_STORAGE`, `P0_SELL_POOL`, `P0_CLOSE_POOL`; save format 8. All goldens unchanged (the prologue-alts one is compared at format 7).
  The pack gives no growth rule for the pull: new miners arrive each quarter at start_pull x fee factor x reputation x luck (PPLNS only, clamped 0.5-1.5) and 5% leave; "unlucky week" = under half the expected blocks in a week expecting at least one (mine, reversible).
- M69.4 done: Ventures in the Prologue nav (`Ventures.tsx`: open with method and fee, outside hashrate, luck, reputation, the quarter's fees and bills, settings, protection, cold storage, sell or close), the quarter report's pool row and the chapter report's pool-sale line; `tests/ui/prologueReachability.test.tsx` (every P0_ action is sent by a Prologue screen, plus the panel's flows). Checked in the browser.
- M69.5 done: the Act V Perfect bot's Heat habit (`heatHabit` in `tools/act5/bots.ts`: talk to the neighbours at Heat 45+, noise mitigation if it talked there last quarter and it is still 45+; sent after its other moves); no other bot or Heat value changes; `tests/sim/act5HeatHabit.test.ts`.
  The four act5-v goldens moved, each the same way and no other: its cash is lower by the outreach and mitigation bills (v1: $317.80M to $317.51M at the end), the hottest site's Heat is lower (v1 report quarters 47.2 to 38.9) and the valuation follows the cash; their stored `siteHeat` now carries the outreach quarter.
- M69.6 code done: bots `pool-operator`, `pps-operator` (both sell as mined, so X-B2's ratio is against sell-as-mined: mine, reversible), `pool-and-scrypt` (pacing), the runner's X-B2, X-B3, X-B4 and pool CSV (`prologue-pool-runs.csv`, apart from the main CSV), `--baseline` compares every bot the baseline has, golden `prologue-pool-seed-2009`. Sims and results: see "M69 results" below.

## M68: doc 43 §0.25 and the Prologue's altcoins (doc 51 v1.0) (branch `m68` from `main` at `4cf8373`)

Split (the owner approved doc 51 v1.0 and the Prologue scope changes in its §9 by pasting the prompt; this milestone builds only
doc 51 §11 item 1, altcoins for old GPUs; no pools or club yet):
- M68.0 doc 43 §0.25, doc 51 v1.0, doc 53 and the expansion pack in `docs/prologue-expansion-content/` (copied, checked byte for byte)
- M68.1 (A) Heat in Act V by source and its reachability, the news band in Acts III-V (doc 43 §0.25)
- M68.2 (B) generators into `tools/prologue/`, `npm run content:prologue-expansion`, the two alt CSVs in `src/content/`, byte-identity test, Zod schemas
- M68.3 (C) merge the altcoin content into the Prologue files (machines, custody, events, text, the 2014Q3 decision quarter), schemas
- M68.4 (D) the sim: coin per GPU lot, `SET_LOT_COIN`, scrypt income, altcoin sales and limits, the 2014Q3 card, handover, save version
- M68.5 (E) screens: coin selector on the Rig, LTC and DOGE in the treasury and sell dialog, news headlines
- M68.1 done: the Plan news band in Acts III-V (`src/sim/planNews.ts`: Act V's first Signals headline; Acts III-IV the quarter's first shared card title or nothing; test `tests/ui/planNewsBand.test.tsx`); Heat's meter and mitigation rows added to the Act V reachability test (all reachable, nothing to fix).
  Heat report: `node tools/act5/heatReport.ts` (10 seeds, Perfect and Holder, both presets, four futures; output kept for the final M68 section). Heat values unchanged.
- M68.2 done: generators in `tools/prologue/` (`npm run content:prologue-expansion`; they write the docs folder and the two live CSVs, LF line endings, outputs identical to the delivered values); `market_*_prologue_alts.csv/.json` in `src/content/` (JSON via `npm run content:market`), schemas, `tests/prologueExpansionContent.test.ts`.
- M68.3 done: `tools/prologue/merge_alts.py` merges the altcoin content (17 cards, scrypt rates, selling limits, handover rule, 7 text keys) into the docs files and the game's own formats; schema fields `news` card type, `sell_scrypt_gpus`, `scrypt_khs`, `opt_in_decision_quarters`. Goldens unchanged. **The pack's "2014Q3 decision quarter" is opt-in in the game (mine, reversible):** an always-on decision quarter changed both Prologue goldens (the bots sell in that Plan phase), so it applies only to a player with a GPU on scrypt.
- M68.4 done: `src/sim/prologue/alts.ts` (coin per lot `lot.altCoin`, scrypt income and merged mining, wallet-only LTC/DOGE in `prologue.alts`, the thin-market limits, the 2014Q3 card `sell_scrypt_gpus`, the 2016Q4 handover sale and 0.9 conversion); actions `P0_SET_LOT_COIN`, `P0_SET_ALT_HODL`, `P0_SELL`/`P0_CANCEL_SALE` take LTC and DOGE; save format 7 (identity migration); the Act V goldens are compared at format 6 as the older ones are; `market-prologue-alts` is its own chunk. All goldens unchanged.
  New state exists only after a lot is pointed at an altcoin (opt-out invariance). Slippage is continuous: -1% per further 0.5% of the day's volume, so a sale of 0.75% loses 0.5% (mine, reversible). Forced sales at quarter end also sell altcoins at the week's price (mine, reversible).
- M68.5 done: the coin selector on each GPU lot (Rig screen, only coins open that quarter), an altcoin panel in the Coins screen (held, keep %, percent buttons, exact amount, the week's limit), the quarter report's altcoin line, headline cards in the Prologue news list, the chapter report's altcoin sale line without the later-price clause (TODO to doc 51 §10 item 7); `tests/ui/prologueAlts.test.tsx`. Checked in the browser (Rig, Coins, news band).
- M68.6 done: bot `scrypt-switcher` (`tools/prologueBots.ts`), the X-B checks in `tools/prologue-runner.ts` (X-B1 with `--baseline <main's prologue-runs.csv>`, X-B6, X-B7, pacing), golden `prologue-alts-seed-2009`; an opt-in decision quarter is flagged `planned_now` so a card that sells the GPUs doesn't turn it into an auto-played quarter.

### M68 results (14 Oct 2026)
- **X-B1 PASS:** the 6 earlier Prologue bots × 50 seeds are byte-identical to main (`prologue-runs.csv` rows and header); all existing goldens unchanged (the Act V ones are compared at format 6). **`--act2 --act3` PASS:** 1,301 files identical to main's (`diff -r`).
- **X-B6 PASS:** a 2010 GPU in 2013Q4 earns $248 on scrypt vs $18.30 on bitcoin (13.5×, target ≥ 10×); scrypt income 2014Q1 $281 → 2014Q4 $5.0 (fall 98.2%, target ≥ 95%).
- **X-B7 MISS (report only):** scrypt-switcher median $1.2B vs careful-hodler $1.2B, the switcher $115.6K *above* (median gap per seed +$141.8K). The GPU stacks are tiny against the paper wealth of the Satoshi-scale tail, so the chase barely registers; the switcher also keeps GPUs the careful-hodler sells as obsolete.
- **Pacing:** scrypt-switcher Plan phases median 14, max 14 (≤ 14); cards needing a choice median 19, max 22 (careful-hodler 18, 21). The existing "1,000 runs in reasonable time" line misses on main too (203.7 s) and here (174.7 s) when four sims share the machine; unchanged.
- **Act V Heat by source** (`node tools/act5/heatReport.ts`, 10 seeds, Perfect and Holder, both presets, four futures; Heat values unchanged): the hottest site starts at 37-40 and ends at 53-58 (44 for Orbital Landlord V4 Perfect); every run passes 50 (first in 2036Q4 for Orbital Landlord, 2040Q4 for Firm Builder). The rise is the grievance part (0 → 15: cards and unanswered neighbours); tier 15-20, national policy +10, era +5, Anger +2-3 are carried in from Act IV. MW added moves only the load part: Perfect adds 20-50 MW on V1 and the load part moves by 1-4 points. Neither bot ever uses Talk to the neighbours or noise mitigation. Heat's meter (top bar) and both mitigation rows are reachable in Act V (tests added); V-B7 (0 busts in 120) and the hold ÷ sell figures are as the M67.6 re-measure left them, since nothing in M68 touches Act V's sim.
- **New:** actions `P0_SET_LOT_COIN { lotId, coin }` (named with the Prologue's P0_ prefix, mine, reversible), `P0_SET_ALT_HODL`, `P0_SELL`/`P0_CANCEL_SALE` take LTC and DOGE; fields `lot.altCoin`, `prologue.alts`, report `alts`; schema: card type `news`, effect `sell_scrypt_gpus`, machine `scrypt_khs`/`available_scrypt_from`, `opt_in_decision_quarters`, `altcoin_selling_limits`, `altcoin_handover`; save format 6 → 7 (identity migration, tested).
- **(mine, reversible):** the pack's 2014Q3 decision quarter is opt-in (only with a GPU on scrypt); slippage is continuous; quarter-end forced sales also sell altcoins; headline cards are display-only and `news_ltc_launch` is a `news` card (its one flag was read by nothing); a card with no week gets its quarter's first week; the game's Prologue files are not byte copies of `docs/prologue-content/` (they never were), so the data went into each in its own format and the README logs it; generators write the live CSVs too and use LF; `market-prologue-alts` is its own chunk.
- **STOPPED:** none.
- **Open questions for the design thread:** (1) X-B7 as written cannot bite while the paper wealth is $1B+; measure the chase on altcoin-and-GPU income, or on a percentile, or give the switcher a bigger GPU stack? (2) Should 2014Q3 be a decision quarter for everyone (doc 51 §2.2) at the price of re-accepting the two Prologue goldens, or stay opt-in? (3) Show the later-price clause of the chapter line once the second research pass dates the closes (doc 51 §10 item 7)? (4) Slippage as a continuous curve or in whole 0.5% steps? (5) The pack's volume and hashrate placeholders (2011-2012 LTC volume, designed hashrate) await the second research pass.
- (old plan line, kept) M68.6 the `scrypt-switcher` bot, `npm run sim -- --prologue` and the X-B table, the `prologue-alts` golden, the `--act2 --act3` byte-identity run

## M67: doc 43 §0.24 (branch `m67` from `main` at `7a5605e`)

- **Split (unattended run, the owner's prompt of 13 Oct 2026):** M67.0 doc 43 §0.24 (byte-identical to the project copy; header and §0.24 only) · **M67.1 (A)** Act IV note (B5) and docs 50-52 · **M67.2 (B)** Signals headlines · **M67.3 (C)** preset seeds · **M67.4 (D)** the Act II rules gate in Act V · **M67.5 (E)** the ETH header · **M67.6 (F)** the re-measure.

- **M67.1 done (Act IV note and new docs):** B5 recorded as a miss (F4: Ground Holder not best in M64-M65; doc 43 §0.24), in `docs/act4-scope.md` §6 item 22; the Act IV recorded-misses list is now B1, B3, B4, B5, B6, B8, B13, E-B2. Docs 50, 51 and 52 copied byte-identically into `docs/game-project-files/` and listed in CLAUDE.md under the Prologue (reference only; nothing built from doc 51).

- **M67.2 done (Signals headlines):** Acts III and IV carry no Signals headlines (their files have none); Acts III-V share `Act3SignalsPanel`, and `SignalsPanel` serves Acts I-II only, so Act V's headlines show in `Act3SignalsPanel` in the same news markup ("Headline · Q3 2037"), from `signalsPanelV(...).headlines` (this quarter's only; the schema keeps `headline`). The leak test (`tests/sim/act5Headlines.test.ts`, all four futures) found no leak:
  no headline before its trigger quarter names a future, a trigger card or a decoy or quotes the decoy's reason or tell. `act5Futures.test.ts`'s "no future name in the runtime Signals content" now ignores the `headline` field (a trigger-quarter headline may name its trigger, e.g. V2's "The Flexible Lane Opens"). UI test `act5Headlines.test.tsx`. No golden moved. 1,823 tests.

- **M67.3 done (preset seeds):** a "Start at Act V" preset start draws its future from `toSeed(the title screen's seed field)` (empty = random, as a new game) passed as `act5Seed` to `toAct5`; the preset's 2035Q4 company is unchanged (`act5Seed` only re-seeds Act V's draws). `toSeed` moved to `src/ui/seed.ts`; `TitleScreen`'s `act5Start` is now `(seedText) => node`. Test `act5PresetSeed.test.tsx` (4: seeds 1-40 draw more than one future; the company is the same). No golden moved (they force their futures); no test relied on the fixed draw. 1,827 tests.

- **M67.4 done (the Act II rules gate in Act V):** `isAct2RulesQuarter` covers Act V's quarters (`src/content/index.ts`, one clause). **The four Act V goldens moved** (Acts I-IV did not): e.g. the V1 Perfect run's cash 362 → 318 ($M) and valuation 3,814 → 3,769, V4 2,420 → 2,392 and 2,917 → 2,889, and **Heat ends at about 54 (V1) and 53 (V4), was 28 and 30** (regional Heat and Anger now apply; 50 is the rate-hike tier).
  **Rules turned on in Act V, and what each reads:** (1) power reservation (`payReservationWeek`: idle and building MW pay 25% of full-load power; reads `BALANCE.powerReservation` and the site's region power price, column `power_<region>_usd_kwh`, which Act V's files carry); (2) regional Anger (`regionAnger`: energized MW and Act II's standing policy bumps; content only); (3) regional power adders, regional Heat modifier, national Heat deltas and the project policy (`regions.ts`; dated policy content, no market column);
  (4) ERCOT curtailment of AI halls and their SLA credits (`curtailment.ts`; `CONTENT.curtailment` and SB6 from 2026Q1: content, no market column); (5) staff salaries (`hires.ts`: Act II's last series value, 2026Q4, held as in Acts III-IV); (6) ASIC purchase and resale prices (`market.ts` `act2Prices`: `asic_price_usd_th_*`, which Act V's weekly files carry); (7) the Q4 depreciation audit (a card's lasting effect; no market column); (8) equipment-loan terms (`equipmentTerms`: SOFR column `sofr_pct`, present, plus the rating band);
  (9) crypto-loan availability (`BALANCE` only) and the ETH GPU resale curve (irrelevant). Rivals are unchanged (Act V's own are chosen first). **No column was missing**: Act V's weekly and quarterly files carry every column Act IV's do. Loans stay hidden from Act V's Plan UI.
  **Instruments that read the rating in Act V now:** `equipmentTerms` (loan-to-value and APR by rating band; hidden in the UI), the corporate debt in `corporateDebt.ts` (spread by `ratingLoanBand(loanRating)`, three sites), and the Capital screen's rating and refinancing views (`capitalViews.ts`). Plant debt is not one of them (priced on its contracted share). Tests `tests/sim/act5Act2Rules.test.ts` (5). 1,832 tests.

- **M67.5 done (ETH header):** the quarter report's header shows the ETH price only when the company holds ETH in its treasury or mined some this quarter (`holdsEth`, `src/ui/mining.ts`; mine, reversible: the mined-this-quarter clause keeps an Act I-II ETH miner's price). The top bar already shows no ETH from Act II on (H100 spot replaces it) and is unchanged. Test `ethHeader.test.tsx` (3). UI only; no golden moved.

- **M67.6 done (the re-measure after chunk D; `--act5`, 2,400 runs, 0 unreconciled, 70 min):** all 2,400 runs moved (Act II's rules cost money: reservation, salaries, Heat and Anger), by **-0.85% on average**; Seller -0.1% (it sells in 2036), Firm Builder's holding bots -1.2% to -2.0%, Orbital Landlord's -0.5% to -0.6%, the largest fall the FB V4 Orbit Replacer -4.7%. No bust. No stop rule fired.
  `--act2 --act3` was run (chunk D touched `src/content/index.ts`): **byte-identical to `main`'s outputs** (1,302 files each, `diff -r` empty, 0 unreconciled). 1,835 tests.

**Commits (branch `m67`):** M67.0 doc 43 §0.24 and the chunk split · M67.1 B5 recorded and docs 50-52 · M67.2 Signals headlines · M67.3 preset seeds · M67.4 the Act II rules gate in Act V (the four Act V goldens moved) · M67.5 the ETH header · M67.6 this section.

**§18 table** (medians, 2040Q4 before the exit ÷ act5Entry; v1 v2 v3 v4; change against M66's table in brackets):

| Bot | Firm Builder | Orbital Landlord |
|---|---|---|
| Holder | 1.664 1.251 0.905 1.079 (-1.2% -1.5% -1.7% -1.6%) | 1.402 1.079 0.854 0.978 (-0.5% -0.6% -0.6% -0.6%) |
| Flex | 1.657 1.295 0.899 1.073 | 1.350 1.138 0.811 0.929 |
| Seller | 1.229 1.223 1.217 1.241 (-0.1%) | 1.133 1.124 1.114 1.150 (-0.1%) |
| Locker | 1.510 1.222 0.940 1.062 | 1.299 1.096 0.870 0.985 |
| Orbit Replacer | 1.684 1.270 0.869 1.180 (-2.4% -2.5% -0.8% -4.7%) | 1.548 1.186 0.909 1.196 (-0.4% -0.5% -0.6% -0.5%) |
| Builder | 1.662 1.248 0.899 1.075 | 1.425 1.101 0.875 0.999 |
| Passive | 1.434 1.298 1.021 1.158 (-1.4% -1.4% -1.5% -1.5%) | 1.251 1.162 0.948 1.070 (-0.5% -0.5% -0.6% -0.6%) |
| Perfect | 1.659 1.304 1.186 1.271 (-1.2% -2.4% -0.4% -1.0%) | 1.350 1.170 1.061 1.387 (+1.2% -1.2% -0.2% -0.3%) |
| Over-reactor | 1.206 1.209 0.906 1.063 | 1.088 1.077 0.846 0.935 |

**Verdicts (V-B8 in its §0.21 form):** V-B1 PASS both · V-B2 PASS (FB Holder ÷ Seller 1.354, ÷ Locker 1.101) · **V-B3 PASS on Firm Builder, margin now 2.0%** (Flex 1.295 against the Orbit Replacer 1.270; was 0.4%); OL (information) MISS (1.138 against 1.186) · V-B4 PASS (FB Seller ÷ Holder 1.346, Locker ÷ Holder 1.039) · V-B5 PASS on OL 1.223 (FB information 1.093) · V-B6 information · V-B7 PASS (0 busts in 120) ·
**V-B8 PASS on both presets:** Perfect ÷ Passive FB 1.157 / **1.005** / 1.162 / 1.098, OL 1.079 / 1.007 / 1.120 / 1.296; Over-reactor ÷ Passive at most 0.931 in all 8 (limit 0.97). **V2 is down to 1.005 (FB) and 1.007 (OL): above 1.00 by half a percent** · V-B9 PASS (FB +28 / +2 / +40 / +19) · V-B10 PASS · V-B11 PASS (FB 0.988 / 0.875 / 0.815 / 0.810; OL 0.956 / 0.884 / 0.821 / 0.806: V4 still above 0.80) · V-B13 20 Plan phases · V-B12, V-B14 by tests.

**Assumptions (mine, reversible):** (1) M67.0 applied with Edit and compared byte for byte with the project copy. (2) Headlines show in `Act3SignalsPanel` (the Signals panel Acts III-V share), not `SignalsPanel` (Acts I-II), because Acts III-IV have no headlines and `SignalsPanel` is not rendered in Act V; the news markup is the same. (3) A preset start's seed is the title screen's seed field, else random (as a new game); `toSeed` moved to `src/ui/seed.ts`.
(4) The ETH header rule shows the price to a company with ETH in its treasury or mining ETH this quarter (the second clause keeps an Act I-II ETH miner's price). (5) The existing check "no future name in the runtime Signals content" ignores the `headline` field, because a trigger-quarter headline may name its trigger (V2's "The Flexible Lane Opens"); the new test covers headlines. (6) An untracked file `docs/prologue-content/52-prologue-expansion-research.md` appeared in the working tree during the run; it is not mine and is not committed.

**STOPPED:** none. **Not stops:** V-B8's V2 cell is 1.005 (above 1.00).

**Open questions for the design thread:**
1. **Heat in Act V:** with regional Heat and Anger on, the Perfect run's Heat ends at about 54 (V1) and 53 (V4), was 28 and 30; 50 is Act I's rate-hike tier. No bust and no number moved more than 5%, but does Act V mean to reach Heat consequences (rate hike at 50, moratorium at 70)?
2. **V-B8's V2 cell is 1.005 (FB) and 1.007 (OL):** any further cost the Act II rules add moves it to 1.00 or below (reported, not a stop). Keep the sign check as it is, or revisit?
3. **The rating:** it now moves and is read by the corporate debt spread (three sites), the equipment-loan terms (hidden in the UI) and the Capital views; plant debt is unaffected. No bot reads it. Fine as it is (§0.24 item 4)?
4. **The Signals headlines are shown only in the Signals panel.** The news band at the foot of the Plan screen still shows Act I-era text and nothing in Act V. Show the quarter's first headline there too, or leave it?
5. **Who put `docs/prologue-content/52-prologue-expansion-research.md` in the repo?** It looks like doc 52's research dossier (doc 51's numbering). It is untracked: commit it in its own docs PR, or leave it out?

## M66: doc 43 §0.22 and §0.23 (merged, PR #35, tag `m66-done`; was branch `m66` from `main` at `82bdf24`)

- **Split (unattended run, the owner's prompt of 13 Oct 2026):** M66.0 doc 43 §0.22-§0.23 (the file is byte-identical to the project copy; §0.22 was already on `main` through the docs-only PR #34, so this commit adds the header's "§0.23: the staging check" and
  §0.23 only: mine, reversible) · **M66.1 (A)** Act IV notes · **M66.2 (B)** the rating in Act V and the `isAct2RulesQuarter` audit · **M66.3 (C)** copy and formatting · **M66.4 (D)** mining tiles · **M66.5 (E)** the Act V screen check (dev build) · **M66.6 (F)** the re-measure.

- **M66.1 done (Act IV notes):** nothing to add: B1 and B8 were recorded by the docs-only PR #34 (`docs/act4-scope.md` §6 item 21 and the M66-docs notes below), worded as §0.22 gives them.
- **M66.2 done (the rating in Act V):** `quarter.ts` reviews the rating when `isAct2RulesQuarter(quarter) || inActV(state)` (only that gate; `isAct2RulesQuarter` is unchanged); `Report.tsx` never prints "null" (`ui.report.a2_rating_none`, "none yet"). The covenant needs no fix: it runs through
  `inAct3Rules`, which already includes act 5. Tests `tests/ui/act5Rating.test.tsx` (3; two fail on the old gate). **The four Act V goldens moved**: each report now carries `creditRating` and `ratingWhy`, the log gains `rating_changed` lines (V4 seed 1 falls to CCC- in 2038), and the end state's rating differs in two of the four; no other field. Acts I-IV goldens unchanged.

**`isAct2RulesQuarter` audit (doc 43 §0.23 item 1; true for Act II, III and IV quarters, false for Act V; nothing here changed except the rating):**

| Call site | Rule it gates | Continues in Act V per doc 43? | What happens in Act V now |
|---|---|---|---|
| `quarter.ts:184` | quarterly credit rating review | yes: §3.1 "creditRating", §11.4 | **fixed (M66.2)** |
| `quarter.ts:177` | Q4 depreciation audit (card ec18, aggressive depreciation) | not named; §3.1 carries "lasting events" | no audit; a lasting depreciation card would never restate |
| `mwUse.ts:100` | power reservation: idle and building kW pay a share of full-load power (Act II owner decision A2) | not named; §3.1 carries ground, sites and projects | **idle and building MW pay nothing in Act V** (115 MW at Firm Builder: 37 idle, 11 building) |
| `anger.ts:28` | regional Anger from energized MW and policy bumps | yes: §3.2 "Heat, Anger ... carry" | Anger is 0 in Act V |
| `regions.ts:42, 54, 59, 100` | regional power adders, regional Heat modifier, national Heat deltas, project reservation share and capex multiplier | Heat carries (§3.2); policies are dated content | all neutral in Act V (adder 0, Heat multiplier 1, delta 0, no policy) |
| `curtailment.ts:46, 109` | Act II's ERCOT sites are grid sites; AI halls there go dark and owe SLA credits | "Texas enrolment" carries (§3.1) | AI halls in ERCOT are never curtailed in Act V |
| `loans.ts:72` | equipment loan terms: SOFR + the rating band, 8 quarters | §3.1 "every loan and facility" carries; new loans are hidden in Act V (M62) | falls back to Act I's era terms (`eraTerms`) if an equipment loan is ever opened |
| `cryptoLoan.ts:35` | crypto loans offered from 2023Q3 | no (hidden in Act V, M62) | never offered: matches the UI |
| `hires.ts:93` | Act II salaries, 2026Q4's held in Act III-IV | §3.1 "staff" carries | **salaries fall back to Act I's formula** (`to` × `salary2022Mult`) |
| `market.ts:165` | ASIC purchase and resale prices from the scenario's weekly tiers | not named | Act I's frozen 2022Q3 table is used for machines bought in Act V |
| `market.ts:245` | ETH GPU rigs' resale curve | no (ETH mining ended in 2022) | irrelevant |
| `rivals.ts:157` | Act III's five rivals | no: Act V has its own six (`act5Rivals` is chosen first) | correct |

Rows to decide on (reported, not changed): the power reservation, Anger and regional Heat, ERCOT curtailment, staff salaries and ASIC prices all change at the Act IV to V boundary; §3.2 says Heat and Anger carry. The reservation and the salaries move money inside the Act V sim.

- **M66.3 done (copy and formatting):** the orbit line on the shared report panel uses `fmt.signed` ("+$11.3M"), checked on the act4-f1 and act5-v4 golden reports (Act IV's public report gets the fix too; UI text only). Ventures in Act V: `ui.ventures.intro_v` (replaces the intro and the closed line) and
  `error.venture_closed_v` (sim picks the key by act; Acts III-IV keep theirs). The Halyard diligence line already shows "P(volume within 8 years) ≈ 0.30" from `text_chips.en.json`; a test pins it. Tests `tests/ui/act5Copy.test.tsx` (4). No golden moved.

- **M66.4 done (mining tiles; UI only, no sim state or golden):** `src/ui/mining.ts`. Act V with no machines: the Live screen shows `Act5Dashboard` and `Act5ReportPanel` (A5-02's strip, plants, queue, plants' output) in place of the mining tiles and the chart; with miners it keeps them. The report hides "Cost per coin" when nothing was mined (any act) and the cost chart when
  nothing was mined after 2022Q3. After 2022Q3, in any act, the Live chart is "BTC this quarter" (no ETH line, label or legend) and the note drops its ETH half (new keys `ui.live.chart_title_btc`, `ui.live.hodl_note_btc`). **This changes public Acts II-IV UI text, not their sim state.** Tests `tests/ui/miningTiles.test.tsx` (5). (Mine, reversible: the report header's ETH price stays; it is a price, not a mining tile.)

- **M66.5 done (Act V screen check, dev build on :5173; nothing fixed, only reported):**
  - **How V4 was reached:** Act V has no URL forcing (`?future=` is Act IV's; `toAct5(end, { preset })` draws). I started Orbital Landlord, then in the console set `vFutureId = 'v4'` and `vFutureForced = true` on the 2036Q1 Plan state and `g2g.load` it (the future enters Act V's state only as that field and the market key `scenarioOf` builds from it). Played passively with a script that took each default to 2038Q2.
  - **Signals (V4, Orbital Landlord; displayed Capacity Market / Firm Build-out / Launch Cadence):** 2037Q2 51 / 53 / 54; **2037Q3 62▲ / 50 / 69▲; 2037Q4 75▲ / 49 / 70; 2038Q1 58▼ / 50 / 73▲; 2038Q2 48▼ / 51 / 85▲**. The Capacity Market squeeze is there, Firm Build-out stays flat, Launch Cadence climbs every quarter.
  - **The decoy card** "Firm Power Runs Short" plays in 2037Q4 week 2 (choices "Note it" default, "Buy a queue-holding site before prices run", -$2.0M); the **trigger card** "Launch Breaks $200" plays in 2038Q2 week 2 (its own quarter, §0.21). Rating BBB every quarter. **No leak:** a regex for the four future names, the decoy names, the trigger titles, "decoy" and "false alarm" matched nothing on any Plan, Live or Report screen through 2038Q1 (the V3 stance is a hidden file and no screen shows it; `act5Leak.test.tsx` also covers it).
  - **Firm Builder, one quarter, items B to D confirmed on screen:** rating row "BBB, unchanged since last quarter" (no "null"); orbit line "EBITDA +$26.1M"; Ventures intro in Act V wording, no "Acts III and IV", diligence "P(volume within 8 years) ≈ 0.30"; the Live screen shows the MW strip, plants and queue and no mining tiles; the report has no "Cost per coin" and no ETH chart.
  - **Other visible defects (reported, not fixed):** (1) **Act V's Signals headlines never reach the player.** The Signals panel (`Plan.tsx` `SignalsPanel`) shows each indicator's value and arrow and Act I's `news.<quarter>` lines; the 71 authored headlines in `signals_v_*.json` (the four new V4 capacity ones among them) are dropped by the runtime schema (`signalPoint` in `schemas.ts` has no `headline`) and read by no code. §0.22 and the files' own note say headlines are shown in play.
    (2) **Both presets draw V1 on a default start.** Firm Builder and Orbital Landlord both drew V1 ("Seed 1"): `toAct5(end, { preset })` draws from the preset company's fixed seed, so the preset start is the same future every time. (3) The report header still shows the ETH price after 2022Q3 (kept on purpose: a price, not a mining tile).
  - **Screenshots** (tool-result paths, under `/Users/tmacbookair/.claude/projects/-Users-tmacbookair-dev-garage-to-gigawatt/5c74bdda-c811-4fc4-bd64-5184b768f53e/tool-results/`): `mcp-Claude_Browser-blob-1791889382219-e6midr.jpg` (OL V4, 2038Q2 Plan, signals strip), `...-1791889390339-0rn4bf.jpg` (trigger card), `...-1791889421249-k2tvul.jpg` (decoy card), `...-1791889472143-bdoir1.jpg` (Firm Builder Live screen).

- **M66.6 done (the re-measure after chunk B; `--act5`, 2,400 runs, 0 unreconciled, 57 min):** **every cell equals M64's: the runs CSV is byte-identical** (multiples, readings, moves). The rating now moves in Act V (the golden's V4 Perfect run falls to CCC- in 2038, the Passive company stays BBB), but nothing the bots do reads it: loans are hidden in Act V and plant debt is priced elsewhere.
  `--act2 --act3` was also run because chunk B touched `quarter.ts` and `ventures.ts`, which Acts II-IV run through: **byte-identical to `main`'s outputs** (1,302 files each, `diff -r` empty, no unreconciled runs). `--act4` and `--energy` were not run: no Act IV rule or bot changed (Act IV's report line is UI text).

**Commits (branch `m66`):** M66.0 doc 43 §0.22-§0.23 and the chunk split · M66.1-2 the rating in Act V, the audit, the four Act V goldens · M66.3 copy and formatting · M66.4 mining tiles · M66.5 the screen check · M66.6 this section.

**§18 table** (medians, 2040Q4 before the exit ÷ act5Entry; FB / OL; v1 v2 v3 v4): identical to M64's:

| Bot | Firm Builder | Orbital Landlord |
|---|---|---|
| Holder | 1.683 1.270 0.920 1.097 | 1.408 1.085 0.860 0.984 |
| Flex | 1.677 1.308 0.894 1.066 | 1.334 1.151 0.816 0.935 |
| Seller | 1.230 1.224 1.218 1.242 | 1.134 1.124 1.115 1.150 |
| Locker | 1.530 1.240 0.956 1.079 | 1.305 1.103 0.875 0.990 |
| Orbit Replacer | 1.726 1.303 0.876 1.238 | 1.554 1.192 0.914 1.202 |
| Builder | 1.682 1.267 0.918 1.095 | 1.432 1.107 0.879 1.005 |
| Passive | 1.454 1.317 1.036 1.176 | 1.257 1.168 0.953 1.076 |
| Perfect | 1.679 1.336 1.192 1.284 | 1.334 1.184 1.063 1.391 |
| Over-reactor | 1.211 1.215 0.921 1.081 | 1.090 1.079 0.851 0.941 |

**Verdicts:** V-B1 PASS both · V-B2 PASS (FB Holder ÷ Seller 1.368, ÷ Locker 1.100) · V-B3 PASS on Firm Builder by 0.4% (Flex 1.308 against 1.303; OL information MISS) · V-B4 PASS (FB 1.324 / 1.039) · V-B5 PASS on OL 1.222 (FB information 1.128) · V-B6 information · V-B7 PASS (0 busts in 120) ·
**V-B8 (§0.21 form) PASS on both presets**: Perfect ÷ Passive FB 1.155 / 1.015 / 1.150 / 1.092, OL 1.061 / 1.014 / 1.116 / 1.292 (V2's 1.014-1.015 is the thin cell; none at or below 1.00); Over-reactor ÷ Passive ≤ 0.97 in all 8 · V-B9 PASS (+28 / +2 / +40 / +19 FB) · V-B10 PASS · V-B11 PASS (V4 0.806 on both presets, floor 0.80, not a stop) · V-B13 20 Plan phases · V-B12, V-B14 by tests.

**Assumptions (mine, reversible):** (1) M66.0 applied with Edit, byte-compared with the project copy; §0.22 was already on `main` from PR #34, so the commit adds the header's "§0.23: the staging check" and §0.23 only. (2) The rating gate is `isAct2RulesQuarter(quarter) || inActV(state)`; the covenant already ran in Act V through `inAct3Rules`. (3) In Act V the Ventures intro text replaces both the intro paragraph and the "closed" line; the join error key is chosen by act in the sim.
(4) After 2022Q3 the Live chart is kept as "BTC this quarter" (not hidden) for companies that mine, and the ETH half of the hold note is dropped; the report header's ETH price stays. (5) The report hides "Cost per coin" in every act and quarter when nothing was mined. (6) The V4 screen check used a console-set future (Act V has no URL forcing) and a passive script. (7) M66.1 needed no commit: §0.22's Act IV notes were already on `main`.

**STOPPED:** none.

**Open questions for the design thread:**
1. **Headlines:** the 71 authored Signals headlines (including the four new V4 capacity ones) are never shown in Act V. Wire them into the Signals panel (a "Headline" line per indicator that moved, as the files' note says), or cut them? Wiring is a build task; the leak guard and the V4 decoy's "no tell" rule apply.
2. **Presets always draw V1:** both preset starts use the preset company's fixed seed, so "Start at Act V" always plays V1. Intended (a known company, a known future), or should a preset start draw from a fresh seed (the presets' numbers in §18 are measured per forced future, so none would change)?
3. **The isAct2RulesQuarter audit** (table above): the power reservation (idle and building MW pay nothing in Act V), regional Anger and Heat, ERCOT curtailment, staff salaries (Act I's formula) and ASIC prices (Act I's table) all change at the Act IV to V boundary. §3.2 says Heat and Anger carry. Which should continue? Each changes Act V's economics and moves Act V goldens and the sim table, so it needs its own run.
4. **The rating has no economic effect in Act V** (display and log only). Fine as a status line, or should it price something (plant debt spread, the covenant)?
5. **The report header's ETH price after 2022Q3:** leave it (it is a price), or hide it with the ETH mining views?

## M66-docs: doc 43 §0.22 (merged, PR #34, tag `m66-docs-done`; docs only)

- **Act V's balance loop is closed per doc 43 §0.22.** Every core target passes (V-B1, B2, B4, B11); no balance run is scheduled, no lever is allowed. The next Act V input is the owner's playthrough on staging (rebuild it first: the owner
  runs `npm run staging:build`); the flag flips only on the owner's word. A drop of V4's hold ÷ sell below 0.80 in any later run is a stop.
- **Act IV recorded misses** (also in `docs/act4-scope.md` §6 item 21): B1 recorded as a miss (M65, 30 seeds: Ground 0.98 against the 0.999 line in f4 after the link-rental bot fix; doc 43 §0.22).
  B8 stays a recorded miss (F3 Perfect ÷ Passive 0.99; doc 43 §0.22). With B3, B4, B6, B13 and E-B2 that makes the list: B1, B3, B4, B6, B8, B13, E-B2. **Flag for the design thread:** B5 (F4: Ground best, Sprinter game overs ≤ 40%) also misses in every M64-M65 run (links off and on: Ground 0.98, best other 1.07 off and 1.11 on), but it was not on the older recorded list and §0.22 does not name it; record it, or note why it passes elsewhere. No change to the link price or the preload (§0.22 decisions 2 and 4).
- No code, content or golden changed.

## M65: doc 43 §0.21 (merged, PR #33, tag `m65-done`; was branch `m65` from `main` at `27a1455`, M64 merged as PR #32)

- **Split (unattended run, the owner's prompt of 12 Oct 2026):** M65.0 doc 43 §0.21 (committed; the file is byte-identical to the project copy; header and §0.21 only) ·
  **M65.1 (A)** V-B8 restated, no sim · **M65.2 (B)** Act V's production preload · **M65.3 (C)** Act IV B1 diagnosis (`--act4` at 30 seeds, `rentLinks` off and on).

- **M65.1 done (V-B8 restated, no sim):** the new form is "Perfect > Passive in every future on both presets; Over-reactor ≤ 0.97 × Passive in every future". On M64's table
  it **PASSES on both presets**. Perfect ÷ Passive: FB 1.155 / 1.015 / 1.150 / 1.092, OL 1.061 / 1.014 / 1.116 / 1.292 (all 8 above 1; V2's margin 1.014-1.015 is thin);
  Over-reactor ÷ Passive: FB 0.833 / 0.923 / 0.889 / 0.919, OL 0.866 / 0.924 / 0.893 / 0.874 (all ≤ 0.97). The `--act5` runner prints the new form (`tools/act5/verdicts.ts`, reporting only); test `act5Verdicts`.

- **M65.2 done (Act V preload): no change, it is more than moving imports.** Cause: `src/content/index.ts` imports every Act V JSON statically (lines 56-72: the four market, weekly and
  chips files, `gpus_v`, the four signals files) and builds `CONTENT` synchronously (`act5Futures` / `act5Markets`, about line 2150); `src/i18n/t.ts` and the sim systems `market`, `plants`, `queue`,
  `ventures`, `flex`, `act5Cards`, `act5End` read those tables. So the entry script's static graph includes the Act V chunks and Vite preloads them. Moving them behind `Act5Entry`'s dynamic import would
  mean building the Act V part of `CONTENT` after load (a loader that `Act5Entry`, a save load, `toAct5` and the sim's tests all await): the async seam §0.20 item 4 and §0.21 decision 5 rule out.
  **Correction to the M64 note:** the Act V chunks in the preload list (`content-v` plus the four `market-v-v*`) are **91.8 kB gzip**, not 41; the sum stays **785.4 kB** (same method, nothing changed).

- **M65.3 done (Act IV B1 diagnosis; `--act4 --seeds 30`, rentLinks off on a checkout of `800b965`, on with this branch; 3 presets × 4 futures × 3 grades; 1 game over in the on run's 360 Sprinter runs):**
  - **B1-B14, off → on:** B1 **PASS → MISS**; B2 2.38× → 3.21× (vs Ground 1.13×); B3 "1.03× vs 0.98×" → "1.03× vs 1.07×"; B4 div 1.44× / lunar 1.41× / sprinter 1.40× → 1.53× / 1.42× / **2.60×**;
    B5 best other 1.07× → 1.11× (Sprinter game overs 11% → 1%); B6 "1.18× vs 1.20×" → "1.21× vs 1.33×"; B9 f1 1.48× → 1.81×; B3-B6, B8, B13 MISS in both; B7, B9-B12, B14 PASS in both.
  - **Best archetype per B1 cell (future × grade; wins):** off sprinter 3 (all f1), lunar 4 (f2 ×3, f4/patchy), balanced 5 (f3 ×3, f4/dry, f4/rich); on **sprinter 6 (f1 ×3, f3 ×3)**, lunar 3 (f2 ×3), balanced 3 (f4 ×3).
    By preset × future: off sprinter 6, diversified 3, passive 1, balanced 1, ground 1; on **sprinter 8**, diversified 3, ground 1 (Ridge/f2).
    **The "9 or more of 12" trigger is not met at 30 seeds** (6 of 12 B1 cells; 8 of 12 by preset × future). The 10-seed 9 was noise.
  - **Why B1 flips:** its third clause needs Ground within 10% of the best somewhere. Ground is 0.98 in all three f4 cells; with the links on, Balanced rose 1.07 → 1.11, so the line is 0.999 and Ground misses it by 0.019. Nothing else changed (Diversified, Lunar and Balanced stay within 10% somewhere).
  - **Sprinter, links on, medians of its 2035Q4 split (rich grade, 360 runs):** all runs: link rent over the act $9M, interactive-block revenue over the act $369M (a Plan-phase estimate), blocks live 2.0, launched 3.0, orbit value $5.2B, cash $0.7B, debt $1.1B,
    valuation $7.5B; mining EV and AI EV $0. By future: f1 rent $14M, revenue $1,023M, 5 live of 6 launched, orbit $38.7B, cash $3.3B, debt $2.2B, valuation $41.5B, multiple 3.21; f2 $6M, $353M, 2 of 2, $1.2B, $0.2B, $0.6B, $3.0B, 1.07;
    f3 $0M, $0M, 1 of 1, $5.6B, $0.9B, $0.9B, $8.1B, 2.60 (no interactive tenant); f4 $12M, $858M, 2 of 4, $3.7B, $0.5B, $0.8B, $5.8B, 1.08. By preset: Fortress multiple 1.69 (orbit $5.1B, AI EV $0.5B), Neocloud 1.87 (rent $29M, revenue $2.0B, 7.5 blocks live, orbit $20.9B, valuation $37.0B), Ridge 0.79 (no orbit).
    The columns are in `act4-runs.csv` (`linkCostUsd`, `linkRevUsd`, `blocksLive`, `launched`, `orbitValueUsd`, `miningEvUsd`, `aiEvUsd`, `cashUsd`, `debtUsd`, `valuationUsd`; 0 for the other bots), added to `tools/act4/runner.ts` as reporting only (a seed-1 run's multiple is unchanged).
  - **The link content:** `src/content/tenants_iv.json` lines 52-61, a byte-identical copy of `docs/act4-content/tenants_iv.json`: `units_per_mw_interactive` 0.2 (line 53), `rent_unit_usd_yr` 800,000 (line 54), `ground_station` capex $15M, 4 units, 3 Heat, 1 quarter, 1 Bandwidth (lines 55-60).
    The rent is charged each quarter at units × $0.8M ÷ 4 (`src/sim/systems/orbitOps.ts:282`); there is no lease term, minimum or cap: a player sets the number of units in any Plan phase (`RENT_LINK_UNITS`). A station's 4 units replace $3.2M a year of rent for $15M (about 4.7 years).
    Source: `docs/act4-content/README.md` lines 204-207 ("Links: 1 unit per 5 MW of interactive work, rented at $0.8M a unit-year or from an optical ground station ... (designed)"); doc 33 §7.4 sets the mechanic and puts the station's Heat in ⚙. Every value is **designed**; nothing is sourced or derived.
  - No change to Act IV content, rules or bots.

**Commits (branch `m65`):** M65.0 doc 43 §0.21 (byte-identical to the project copy; header and §0.21 only) and the chunk split · M65.1 V-B8 restated · M65.2 the preload report · M65.3 this diagnosis and the runner columns.
No golden, no file in `src/sim/` or the content folders changed; no lever. 1,800 tests (was 1,796: the four V-B8 cases).

**Assumptions (mine, reversible):** (1) "Rent off" runs on a checkout of `800b965` (before `rentLinks` existed), not a flag in the runner, so no runner switch was added. (2) The Sprinter's "link-rental income" is the Plan-phase estimate of the quarterly revenue of its interactive-tenant blocks
(`blockRevenueUsd` at the link share the quarter will play with), summed over the act: the rent is a cost, the revenue is what the links unlock. (3) Cells are B1's own (future × grade, medians over presets and seeds), and preset × future is added.

**STOPPED:** none. M65.2 changed nothing by design (more than moving imports).

**Open questions for the design thread:**
1. At 30 seeds the Sprinter wins 6 of 12 B1 cells (8 of 12 by preset × future), under the 9-of-12 line. B1 fails only because Ground sits 0.019 below the within-10% line in f4. Record B1 as a miss like B3-B13, or reword its third clause?
2. The link price is designed, about 1-2% of the revenue it unlocks (Neocloud: $29M of rent against $2.0B), and the Sprinter's value is almost all orbit (f1: $38.7B of $41.5B). Is the link meant to be a cost that bites? A content change moves public play and the Act IV goldens (owner sign-off).
3. Act IV's own B8 still asks for Perfect ≥ 1.15 × Passive in F1 and F3 and misses (F1 1.66×, F3 0.99×: Perfect and Passive both 1.10-1.11×) for the structural reason §0.21 gave for Act V. Restate it as a sign check too?
4. M65.2: leave Act V's 91.8 kB preload (a loader that builds the Act V part of `CONTENT` after load, awaited by `Act5Entry`, save loads and `toAct5`), or schedule it as its own milestone? The M64 note's "41 kB" was wrong.

## M64: doc 43 §0.20 (merged, PR #32; branch `m64` from `main` at `800b965`)

- **Split (unattended run, the owner's prompt of 12 Oct 2026):** M64.0 doc 43 §0.20 (committed; the file is byte-identical to the
  project copy, made with Edit on the repo copy because only the header and §0.20 differ: mine, reversible) · **M64.1 (A)** V4 Signals decoy ·
  **M64.2 (B)** V3's ideal stance and the V4 perfect reader · **M64.3 (C)** Act IV bots' link rental (`rentLinks`, default off) ·
  **M64.4 (D)** load size · **M64.5 (E)** housekeeping · **M64.6 (F)** CLAUDE.md and dev-notes refresh · **M64.7 (G)** the re-measure.
- **M64.1 done:** V4's Signals decoy is `capacity_market` ("The capacity squeeze"), latents and headlines as §0.20; only `signals_v_v4.json`
  changed; new test `act5DecoyConsistency` (4 futures); act5-v4 golden moved only in its reveal (decoy indicator and name). 1,796 tests.
- **M64.2 done:** V3's ideal is -1 from act quarter 4 (`content.py`); V4's perfect reader replaces and grows orbit every quarter (cash only before
  quarter 12: `orbitStep` gets a `noEquity` option, default off). Goldens act5-v3 (sells in quarter 4) and act5-v4 (8 orbit blocks, was 3) moved by
  design; V3 oracle snapshot v3 line changed. Moves added: orbit actions log nothing (0), replace 0; no +1 in a -1 quarter, no -1 in a 0 quarter.
- **M64.3 done (Act IV bots):** `orbitStep` has a `rentLinks` option (default off); `act4Archetypes(bot, { rentLinks })` passes it, and only the `--act4` and
  `--energy` runners turn it on. `content:act5-presets` regenerated `presets_v.json` byte-identical to main (no pin needed). Act IV (10 seeds, before → after):
  **B1 PASS → MISS** (Sprinter best in 9 of 12 cells, was 3; Ground no longer within 10%: gate 1, fix kept, no lever); B2 "2.27× vs 1.13×" → "3.17× vs 1.13×"; B3 "1.03× vs 1.05×" → "1.03× vs 1.23×" (MISS both; the
  Sprinter's side rose); B4, B5, B6, B8, B13 MISS both; B9 PASS both; B7, B10-B12, B14 PASS both. Energy: E-B1 and E-B5 PASS, E-B2 MISS both (control mean $35M → $39M; egs best $29M → $97M).
- **M64.4 done (load size):** the files `dist/index.html` references (entry script, 24 modulepreloads, 2 CSS) sum to **785.4 kB gzip**
  (786.0 with the HTML; under the 1 MB reopen line). Note: the production page also preloads Act V's content and four market chunks (about 41 kB).
- **M64.5 done (housekeeping):** `git branch -d` removed m51-m63 and m61-report (none refused); the two stale worktrees were removed and pruned.
- **M64.6 done (refresh):** CLAUDE.md now has Act V (status, commands, the sim-runner flag order, key docs, layout, act5 goldens, "Act V rules");
  dev-notes header, "Where the build stands" and "Next" refreshed, M62 and M63 moved under M64. Descriptions only: no rule changed.
- **M64.7 done (the re-measure, once, at the end):** `--act5`: 2,400 runs, 0 unreconciled (81 min under load). `--act2 --act3`: byte-identical to `main` (1,302
  files each, `diff -r` empty; `main` run in a separate checkout). No stop rule fired. 1,796 tests (was 1,784: the three-file decoy test, 12 cases). No lever used.

**Commits (branch `m64`):** M64.0 doc 43 §0.20 (byte-identical to the project copy; header and §0.20 only) and the chunk split · M64.1 V4's Signals decoy · M64.2 V3's ideal
stance and the V4 perfect reader · M64.3 Act IV's `rentLinks` · M64.4-5 load size and housekeeping · M64.6 CLAUDE.md and dev-notes · M64.7 this section.

**§18 table** (medians, 2040Q4 before the exit ÷ act5Entry; FB / OL; v1 v2 v3 v4). Changed from the fifth-run table by M63 (orbit rows, flex 0.5) and M64 (Perfect):

| Bot | Firm Builder | Orbital Landlord |
|---|---|---|
| Holder | 1.683 1.270 0.920 1.097 | 1.408 1.085 0.860 0.984 |
| Flex | 1.677 1.308 0.894 1.066 | 1.334 1.151 0.816 0.935 |
| Seller | 1.230 1.224 1.218 1.242 | 1.134 1.124 1.115 1.150 |
| Locker | 1.530 1.240 0.956 1.079 | 1.305 1.103 0.875 0.990 |
| Orbit Replacer | 1.726 1.303 0.876 1.238 | 1.554 1.192 0.914 1.202 |
| Builder | 1.682 1.267 0.918 1.095 | 1.432 1.107 0.879 1.005 |
| Passive | 1.454 1.317 1.036 1.176 | 1.257 1.168 0.953 1.076 |
| Perfect | 1.679 1.336 **1.192** **1.284** (was 1.141, 1.311) | 1.334 1.184 **1.063** **1.391** (was 1.089, 1.207) |
| Over-reactor | 1.211 1.215 0.921 1.081 | 1.090 1.079 0.851 0.941 |

**Perfect ÷ Seller / ÷ Orbit Replacer / ÷ Passive** (v1 v2 v3 v4): FB 1.365 1.092 0.979 1.034 / 0.973 1.025 1.361 1.037 / 1.155 1.015 1.150 1.092;
OL 1.176 1.053 0.953 1.210 / 0.858 0.993 1.163 1.157 / 1.061 1.014 1.116 1.292.

**Verdicts:** V-B1 PASS (both; best per future FB orbit, flex, seller, seller) · V-B2 PASS (FB Holder ÷ Seller 1.368, ÷ Locker 1.100) · **V-B3 PASS on Firm Builder, by 0.4%** (Flex 1.308
against 1.303); OL (information) MISS, Orbit Replacer 1.192 over Flex 1.151 · V-B4 PASS (FB Seller ÷ Holder 1.324, Locker ÷ Holder 1.039) · V-B5 PASS on OL 1.222 (FB information 1.128) ·
V-B6 information (Builder − Holder: FB median 0.000, OL +0.02) · V-B7 PASS (0 busts in 120) · **V-B8 MISS** on both presets (FB ≥ 1.15 in one future: V1 1.155; V3 is 1.150, missing by under
0.001; OL only V4 1.292); Over-reactor ÷ Passive ≤ 0.97 in all, both presets · V-B9 PASS (FB Perfect − Passive reading +28 / +2 / +40 / +19; OL +33 / +2 / +40 / +19) · V-B10 PASS · V-B11 PASS (FB
0.988 / 0.876 / 0.817 / 0.806; OL 0.941 / 0.879 / 0.821 / 0.806: V4 sits 0.006 above the 0.80 floor) · V-B13 20 Plan phases, Balanced median 2.6 actions · V-B12, V-B14 by tests.

**V-B8 after the bot change (§0.20 item 2: report and stop, no tuning).** V3 went 1.141 → 1.192 (Perfect ÷ Seller 0.937 → 0.979) with the new stance, and on FB Perfect ÷ Passive 1.101 → 1.150.
V4 split by preset: OL 1.207 → 1.391, but **FB 1.311 → 1.284** (Perfect ÷ Passive 1.115 → 1.092): growing orbit on cash costs a ground-heavy company more than it earns by 2040.

**Perfect-reader moves added (V3 and V4; the golden's moves, seed 1):** V3 from act quarter 4: renew_long ×2, blend_and_extend_long, contract_plant_output, sell_plant_stake_to_fund, sell_site_free_mw ×2 (q4);
blend_and_extend_long ×4, sell_site_free_mw ×3 (q5): all -1 in -1 quarters. V4: q12 contract_plant_output, sell_plant_stake_to_fund, sell_site_free_mw ×2; q13 renew_long ×2, sell_site_free_mw ×3: all -1. Orbit growth adds no
logged move (open, tenant, capital, launch, insurance, link rental log nothing, `orbit_replace` is 0). No +1 in a -1 quarter, no -1 in a 0 quarter (no raise before quarter 12: `orbitStep`'s new `noEquity`). V4 seed 1 ends
with 8 orbit blocks and 2 link units rented (was 3 blocks, none).

**Assumptions (mine, reversible):** (1) M64.0 applied with Edit to the repo copy (only the header and §0.20 differ), then compared byte-for-byte with the project copy, instead of Write of the whole file. (2) V4's perfect
reader also runs `replaceBlocks` (0) every V4 quarter, so blocks reaching their end in a -1 quarter are replaced. (3) With `noEquity` a block is opened only when cash covers its build, so none sits proposed. (4)
`--act4` and `--energy` baselines at 10 seeds (CLAUDE.md's command; the Act IV runner's default is 30). (5) Load size counts every file `dist/index.html` references (24 preloads included).

**STOPPED:** none. **Not stops, reported:** Act IV B1 flipped PASS → MISS after the rental fix (gate 1: kept, no lever); V-B3 on OL; V-B8.

**Open questions for the design thread:**
1. V-B8 misses in both presets after the two bot changes. The remaining gaps are structural (V2 ≈ 1.015: flexibility moves little; V3 1.150: Seller sells from quarter 0). Accept "3 of 4" as unreachable for FB (V1 and V3 at the edge) or change the bar?
2. V4 on Firm Builder: the orbit-growing perfect reader is 1.092 against Passive 1.176 (OL 1.292). Is that the right shape (orbit pays more to an orbit company), or should the perfect reader's orbit growth depend on the company?
3. Act IV B1 flipped to MISS with the rental fix: Sprinter now best in 9 of 12 cells and Ground is no longer within 10% anywhere. Accept it as the honest result of a bot that can do what a player can, or revisit B1's wording?
4. The V-B11 floor: V4 hold ÷ sell is 0.806 on both presets, 0.006 above 0.80. Any change that touches V4 values will trip it; keep the floor as it is?
5. The production page preloads Act V's content and four market chunks (about 41 kB gzip) although the flag hides Act V. Worth a lazy load behind the flag, or leave (the sum is 785 kB, under the 1 MB line)?
6. Chunk C's rental fix lives in Act IV's bots only; the Act V preset companies are still built by bots that never rented links. Re-base the presets on the fixed bots (it reopens §18), or leave them as they are?

## M63: doc 43 §0.19 (merged, PR #31, tag `m63-done`)

- **1-6** done: orbit unit economics (V4 post-trigger 3.5-5.1× capex: no cost change); the Orbit Replacer's bug found: it never rented
  ground-link units, so its interactive tenants earned nothing (V4 FB 1.030 → 1.238); V-B3 "Flex best in V2"; flex rating back to 0.5;
  V4's decoy "Firm Power Runs Short" (+1); lunar distress sale dropped; Act I-II rows hidden from Act III on; Act III/IV content chunks
  (main bundle 245 KB, largest chunk `sim-energy` 392 KB). 1,784 tests. Re-measure below.
- **7** done (2,400 runs, 0 unreconciled; FB / OL medians v1-v4): Orbit Replacer FB 1.726 / 1.303 / 0.876 / 1.238, OL 1.554 / 1.192 /
  0.914 / 1.202. **Pass:** V-B1 (both), B2, B4, B5 (OL 1.222), B7, B9, B10, B11 (0.806-0.988); the over-reactor is ≤ 0.97 of Passive
  everywhere now. **Miss:** V-B3 on OL (the Orbit Replacer 1.192 beats Flex 1.151 in V2; FB passes, Flex 1.308 against 1.303); V-B8's
  perfect-reader clause (≥ 1.15 only FB V1). FB's V-B5 (information) 1.128.

## M62: the Act V screens (doc 43 §0.18 and §17; merged, PR #30, tag `m62-done`)

- **Done as one chunk:** the Orbit tab under Act IV's rules (Moon stays Act IV); the lunar holding panel and SELL_LUNAR_HOLDING (bloc
  × 0.5, 1 BW, move 0); A5-02 dashboard (four-column MW strip, plants and queue at a glance), A5-03 (plants: output, CF), A5-06 (plants
  panel and lunar holding in Capital), A5-07 (report panel), the queue's request hint; Act I-II rounds, loans and auctions hidden in
  Act V; the header shows act5Entry until Act V's first report (the $7.1B was the 2035Q4 report's Act IV mark); Act V block sales and
  the Orbit board on the remaining-life multiple; a reachability test. 1,784 tests; main bundle 244.8 KB (was 231.3). PR #30.

## How the owner works

- The owner is a beginner programmer. Explain every change in plain language, say how to see or test it.
- Plans and design decisions come from a separate Claude chat (the "design thread", on the owner's personal
  Claude account, with the design docs as project files). The owner pastes tasks from there. When a task
  raises a design question, stop and give the owner a short report they can paste back into that thread.
- One small working step = one commit. **Push only when the owner asks:** the `git push` deny rule was removed from
  `.claude/settings.json` (owner, 1 Oct 2026, to push from a remote session); the owner still decides every push and
  merges `main` (Terminal panel: `git push origin <branch>`, and `main` after a merge).
- Ask before adding any dependency. Don't edit `docs/` unless asked (this file is the exception: keep it current).
- Never touch `staging/` (the owner's playtest snapshot) or run `npm run staging:build` unless asked.
- Only one Claude account works on the repo at a time. Start with `git pull`.

## Machine setup (new computer, e.g. a Mac)

1. Install Git and **Node.js 24** (`node --version` → `v24.x`). Node 24 runs the `.ts` tools directly.
2. `git clone https://github.com/tudorc44/garage-to-gigawatt.git`, then `cd garage-to-gigawatt`.
3. `npm install`, then `npm test` (should be all green) and `npm run dev`.
4. `npm run staging:build` once to make a local staging snapshot (it isn't in git).

Line endings are pinned to LF by `.gitattributes`, so the golden files match on Windows and macOS.

## Commands

See `CLAUDE.md` for the full list. The main ones:

- `npm run dev`: play in the browser at http://localhost:5173. Console helpers in every build (GitHub Pages
  too): `g2g.setCash(n)`, `g2g.state()`, `g2g.load(state)` (through the save loader, so old states load).
- `npm test`, `npm run lint`, `npm run build`: all three before calling anything done. `npm run format` (Prettier).
- `npm run play`: the terminal game (Act I, then Act II). `npm run sim`: bots × 50 seeds → `sim-output/`;
  `npm run sim -- --act2` also plays the Act II bots to 2026Q4 and prints the scope 0.2 §5 table (~5 min);
  `npm run sim -- --prologue` plays the 6 prologue bots and prints the scope 0.3 §5 table (~8 min). Add `--out <dir>`.
  Act III: `--act3` (the bots' Act III runs, ~55 min with `--act2`), `--act3-anchors` (~15 min), `--act3-presets`.
- `npm run content:market`: regenerate the market JSON files after editing a market CSV.
- Golden replays: accept intended changes with `npm test -- -u tests/golden-replay.test.ts`, and explain every one.

## Where the build stands

**Act I (Alpha 0.1): complete**, balance pass done, the 11 goldens unchanged. Playtests are postponed (owner).
**The Prologue (Alpha 0.3): complete** (Act 0, 2009–2016; economy, cards, wireframe screens P0-01…P0-08, handover).
**Act II (Alpha 0.2, scope frozen v1.0): complete** (details in the archive):
- Act boundary (one 40-quarter timeline, save v2/v3 migrations, Merge → Act II intro); MW by use; hosting; projects
  (AI shell, AI cloud, pilot; Power / Tenant / Capital slots; delays, GPU queue, take-or-pay, valuation); GPU contracts and
  resale; project debt, DDTLs, equipment loan, credit rating, equity / ATM, JV partner, backstop, foreclosure; head starts,
  lifeline, standalone preset; regions, policies, Anger; hires and Bandwidth; event deck and interrupts; rivals and league;
  chapter report; game-over causes; onboarding tips; bots and a §5 table. M7.0 = the owner's A1–A9 answers.
- **M8 (this milestone):** the Act II quarter report panel (MW before → after with a total row, backlog change, rating change
  with its reason, project milestones, tenants signed or lost); the GPU failure wave interrupt (`systems/gpuWave.ts`); "GPU
  know-how N of 3" on the Dashboard with a tooltip built from the rules, and the utilisation in use in the Deal builder;
  the Deal builder's return net of a JV partner; prologue auto-play starts at 2×; measurement decisions (below).
**Act III (doc 27 v1.2): built, balance pass closed** (M10–M18; D16 steps 1–7, scoring and the chapter report). The design record of
every change from the real sim is doc 27 §17 (`docs/game-project-files/claude_27-act-iii-design.md`).

**Act IV (doc 33, `docs/act4-scope.md`): built and public** (M27–M34; energy options and ventures M35–M36; Finances M37; data fixes M39;
M40-M41 answers). **Act V (doc 43): built through M63, behind the dev flag** (M43–M63: the gate, content generators, futures engine and
reading score, plants, grid queue, chips, orbit replacement, exit, the Act V screens). Its sim table (V-B1..V-B14) and the open misses are in
the M63 and M64 sections above; the targets are doc 43 §18 as amended by §0.15-§0.20. 1,796 tests at M64.

**Numbers (end of M8.7):** 721 tests pass; lint and build pass; the 11 Act I goldens and both prologue goldens unchanged.
Act II §5 (50 seeds): 9 PASS, 3 accepted MISS (good path, lifeline, preset), 1 MISS (overleveraged, accepted as a known design risk).
Prologue §5 (last run in M8, no prologue bot or content changed since): all PASS (296/300 runs reach 2026Q4; the other 4 end in the
prologue). Tables: `npm run sim -- --act2` / `--prologue`. **End of M18:** 1,229 tests; Act I/II sim output byte-identical through M18.

## Rules and decisions in force

### Working rules
- **Branches:** the current milestone branch (`m8`), made from `main`; `main` is the stable, deployable version (GitHub Pages).
  The owner reviews, pushes and merges. Never commit to `main`.
- **Batch mode** (CLAUDE.md): sub-steps `M<n>.<k>`, each lint + test + build → a short dev-notes update → one commit;
  small decisions labelled "(mine, reversible)"; blockers under "STOPPED"; change files only with the Edit / Write tools.
- **Content copies:** the game reads `src/content/`; the Act II files there are byte-for-byte copies of
  `docs/act2-content/` (a test checks it). Edit both, and note data changes in `docs/act2-content/README.md`.
  `regions.json`, `sites_act2.json` and `events_act2.json` are game copies (reshaped), edited in `src/content/` only.
- **Scope docs:** `docs/alpha-0.2-scope.md` and `docs/game-project-files/claude_20-alpha-0_2-scope.md` stay identical
  (`claude_26-alpha-0_3-scope.md` already differs from `alpha-0.3-scope.md`, which wins).
- **Saves:** `tests/fixtures/saves/v1-*.json` are real old saves: keep them forever, never reformat them. New state
  fields go in the save test's `ADDED_SINCE_V1` list with their new-game value.
- **Goldens** play Act I only (`playGame(seed, bot)` stops at the Act I chapter report); `{ through: 2 }` plays on.
- New Act II randomness uses its own `substream(seed, label)`, so Act I games never change.
- Every "(mine, reversible)" choice recorded in the archive stands until the owner says otherwise.

### Owner decisions: Act I (details: archive › "Decisions" and the balance reviews)
- Start: $10k, no rigs; machines earn from the quarter after purchase; 13-week quarters; the Merge in week 11 of 2022Q3.
- Prices exactly as in the market CSV; coins sold weekly; keep/sell % per coin; "Sell treasury coins" (1 BW).
- Power contracts, negotiation, Texas fixed / index and Winter Storm Uri (firm load) as specified by the design thread.
- Funding rounds (F&F, seed, Series A, IPO / SPAC) from `capital.json`; seed and Series A can be pitched.
- Hires, Read the market, Community Heat (50 rate hike / 70 moratorium / 90 shutdown), event cards, the failure wave,
  the Merge and chapter report, save / load, sound (`zzfx`), the left-nav screens and Settings.
- Balance pass: 2021 era multiples (Q1 35, Q2–Q3 22, Q4 20), IPO needs $3M quarterly EBITDA, the GPU cap on all GPU rigs
  (2020Q4–2022Q1, 250 kW a quarter), phased Texas (5 × 20 MW, 2-quarter phases, construction loans), transformer upgrade ($150K).
- Act I as built, confirmed (answer 18): `requires.min_mw` = a built, powered site big enough; equipment loan one at a time
  (era LTV, 8 quarters, early repay free); crypto loan 50% LTV, margin call 70%, liquidation 80%; distressed auctions a Plan action
  (2 BW, one sealed bid); curtailment (Texas, ≤ once per Q3, 35%); Heat 50 read at quarter end; a due power renewal left alone
  repeats for 4 quarters; the first Texas contract is fixed.

### Closed decisions after M23 (design thread, 5 Oct 2026)
- **Act II project debt stays on the `lenders.json` rate path.** SOFR + HY + a premium is rejected: the implied premium (doc 18 §15, M23.2)
  isn't stable (−0.17 to +1.5 points).
- **S3's rate sensitivity is accepted** (0.96–1.04× across the M23.3 sweep, always ≥ 0.12 above S1); no watch item.

### Owner decisions: Act II (details: archive › "Act II readiness", the M2–M6 decisions)
- Scope 0.2 v1.0 frozen: take-or-pay 3% of the annual contract per late quarter; mining → hosting $0.1M/MW; pilot 0.5–2 MW;
  ratings CCC− to BBB; delays 15% a quarter. Pilot = neocloud price × utilisation from 70% (+5 at know-how 2, +10 at 3).
- Valuation counts projects under construction at capex spent; the top-bar backlog is unweighted; backlog weights A/AA 20%,
  backstopped 20%, BBB 15%, AI lab 8%, spot 0%; contracted AI floor 15× (never binds at 2026Q4, where the era multiple is 15×: intended).
- Hosting defaults in winter (15% in 2022Q4 / 2023Q1, else 5%), free re-letting; idle and building MW pay 25% of full-load power.
- GPU contracts (neocloud, AI-lab, enterprise cards; overflow at know-how 3); GPU resale 15%/year, floor 35%; the pilot waits 1 quarter.
- Equipment loan priced on the rating (BBB SOFR + 2.5% / 60% LTV … CCC + 9% / 25%); equity off the valuation; ATM equity 2 raises a
  quarter, 8–30% each; interest during construction capitalised; sub-BBB AI labs get project debt at 50% (+3 pts); AI-lab distress
  from 2026Q2; before an Act II game over: sell the smallest curing project (×0.85), else emergency equity at −50%, ≤ 30%.
- Lifeline: under 20 MW **and** under $5M cash; a 20 MW site for $6.5M on a bridge at 14%, 12 quarters, interest only for 4, then eighths.
- Head starts each have their own opening (guaranteed offers, distressed fleet, parked GPUs); the head-start check is judged on a
  GPU-heavy Act I. Act II Bandwidth base 4 (+1 Chief of Staff carries). Anger, regional policies, negotiation limits, the
  air-permit lawsuit, aggressive depreciation: as in the archive (M5 answers 1–19).
- **Design thread's answers to the M8 questions (M8.7):** head starts 3/4 distinct accepted; the hosting head start's cash reserve is bot
  behaviour, not a rule (a player may go all-in: a legitimate risk); the overleveraged target stays an accepted MISS with the scope §5
  note "known design risk: the most leveraged bot is also the best performer, so leverage may not bite enough; revisit after the owner
  has played Act II, not in bots"; other lifeline-taking bots' medians moving 10–16% (busts becoming small survivors) accepted; the GPU
  failure wave numbers confirmed (10% a quarter per qualifying project, 10,000-GPU threshold, run-short bill at the end of the next
  quarter; a silent resolve = replace now if the cash covers it, else run short); stabilized-IG EV/MW band $18–28M.
- **M8 answers (28 Sep 2026):** accepted MISSes (no tuning, no JV lever): good path $412M, lifeline 61/120, preset $181.9M;
  the overleveraged target counts an emergency raise; EV/MW skips "no mining left"; 15× floor stays; prologue: sale cap for prologue
  starts only, loan cap for all, automatic move back home (4 prologue busts left), offers stay until the next decision quarter,
  "Empty garage" wording stays, auto-play starts at 2×.
- **GPU failure wave (M8.4):** live full-stack cloud with ≥ 10,000 GPUs (13.3 MW), 10% a quarter, 0.5–1% of its GPUs (rounded up);
  replace now $30,000 each (default) or run short (out for the rest of the quarter and the next; a contracted tenant gets a 2× SLA
  credit; the bill is paid at the end of the next quarter); counts toward the 3 interrupts; with the cap full it resolves silently with
  the default. Numbers in `interrupts_act2.json › gpu_failure_wave`, both copies.

## Open questions for the design thread

- (Answered, M41.2) The constellation is **Lantern Arc** (id `jade_arc`) and the sovereign tenant **Keelstone Sovereign
  Compute**: the design thread's names after the M40 report.

The Act III balance pass is closed (design thread, 4 Oct 2026): no more mechanics rounds unless the owner asks.

None open from before: all five M11.4c questions below were answered by the design thread and built in M11.5a (1 scouting open, 2 ASIC prices from the scenario weekly files, 3 hashprice rebased, 4 hosting rate = region power price + Act II's margin, 5 accepted); kept here for the record:
1. **Scouting and site offers in Act III** (`scouting.ts`, `sites.ts`): Act II's site categories are dated windows; with scouting off a company can't buy new sites in 2027–2030 (the bots can't grow by sites). Open it, or does Act III use other content?
2. **ASIC purchase prices in Act III** (`market.ts` `act2Prices`): the scenario weekly files carry the $/TH tiers, but ASICs bought in Act III still price off Act I's 2022Q3 table (an S21, launched in 2024, has none). Read the scenario tiers?
3. **BTC hashprice seam:** the four scenarios open with hashprice $47.9–50.7/PH/day against Act II's last week at $43.7 (+10–16%), which lifts a pure miner's 2027Q1 valuation by 24–47% (48 of 49 texas-ipo runs). Same kind of data seam as the multiples' (rebased in M11.4a); other seam fields over 10%: H200 hyperscaler rent, hyperscaler capex.
4. **Hosting margin:** the hosting all-in rate stays at 2024's $0.060/kWh, so at the scenario's power prices a hosting-only company loses money (22 of 32 game overs).
5. Act III salaries hold at 2026Q4 (the file has no 2027+ series), and the small-shell cap rate moves with the scenario's hyperscale rate: both mine, reversible.
(The runway question was answered earlier: yes, look ahead, done in M9.0.)

## STOPPED

- ~~M13.2: the automated UI smoke test~~: unblocked in M15.2 (happy-dom and @testing-library/preact approved).
- Balance tuning stays stopped by the owner's A1 answer.
- ~~Act IV run stopped at step 0 (doc 33 not reachable)~~: resolved 5 Oct 2026, the owner put docs 31–34 and the cost model in the
  repo (M27.0); the run resumed at M27.1.
- ~~M40.1's target~~ (Perfect's reading ≥ Passive's): resolved by M41.1's raise rule; all 12 cells meet Perfect ≥ Passive − 2.
- ~~**M42.1 (F-10)**~~ resolved: the design thread closed F-10 as already fixed by the 27 Sep rebuild; no `btc_usd_mean` column.
  The finding, for the record: "quarterly BTC = mean of its 13 weekly closes" not applied: it would replace the sourced quarter-end closes
  (e.g. 2023Q1 28,478 → mean 23,203) and fail the load check `index.ts` (quarterly close = the weekly file's last week); the
  sim never reads the quarterly BTC columns (`act2QuarterOf` omits them), so play can't change. Design thread's question.

## Small follow-ups

- (Done, 14 Oct 2026, branch `fix/heat-zero-capacity`) **Heat NaN at a sold-out site** (`src/sim/systems/heat.ts` `loadHeat`): `heat_load_max * min(1, runningKw / capacityKw)` was 0 ÷ 0 = NaN once Act V's SELL_SITE_POWER sold all of a site's power, so that site's Heat `value` and `load` were NaN (JSON null) and the `log.complaint_ignored` line carried `heat: NaN`. Now a site with no capacity has load 0 (its base, flaw, grievance, era and region parts still count). Sites with capacity are untouched. Only `act5-v3` and `act5-v4` move (sites 3, 9, 14: null → 22, 27, 32; v3's quarter-76+ record `heat` 39 `texas_site` → 42 `own_site`, as the NaN sites no longer drop out of the "hottest site" pick; v3's complaint log `heat` null → 42). Acts I–IV goldens and v1/v2 unchanged; `npm run sim -- --act2 --act3` CSVs byte-identical to `main` (1302 files). Not touched (UI only): `Plan.tsx:720` divides used by capacity for the bar width, which is NaN at a zero-capacity site.

- (Done, 14 Oct 2026, branch `fix-sell-amounts`) **Exact amounts when selling** (owner request, UI only; no sim, content or golden change). Machines: the Prologue Rig screen's Sell on a stack of several opens a count picker (default 1; quick picks 1, 10, half, all; a number field capped at the stack; the cash shown on the button through `cashChange`); a stack of 1 sells at once. It is Act I's count control, extracted to `components/sellCount.tsx` and used by both.
  Coins: "Sell treasury coins" (`SellCoinsDialog`) gains an exact amount field beside 25 / 50 / 75 / 100% (BTC to 8 decimals, ETH to 4; typing clears the buttons, a button fills the field); the action stays `SELL_TREASURY { coin, pct }` with pct = amount ÷ holding, and zero, negatives, too many decimals and more than the holding show an inline message. Tests `prologueSellCount.test.tsx`, `sellCoinsExact.test.tsx`.

- (Done, 13 Oct 2026) **Prologue "Power options" crash** (owner bug report, with the console log): opening Power options on the home rig threw `Cannot read properties of undefined (reading 'capacity_kw')` and no dialog opened. `EnergyDialog`'s title used `siteLong`, whose `siteFacts` reads the room's size from Act I's tier table (`getTier(site.tier)!` in `nominalKw`); the Prologue's bedroom and home rig are household tiers in `prologue.json`.
  Fix in `src/ui/names.ts`: in act 0 `siteLong` returns the room's short name. Test `tests/ui/prologuePowerOptions.test.tsx` (2; both fail without the fix). Checked in a dev build: the dialog opens, no console errors, End Quarter moves to the Live screen. Not reproduced: the owner's stuck End Quarter after the crash (it moved on normally in the dev build).

- (Done, 6 Oct 2026) **Dialog hotfixes 1 and 2** (owner bug reports): on `hotfix-dialog` from `main` (`1ca4e6b`,
  `8c72e9a`), merged into `main` and pushed by the owner on 6 Oct 2026; cherry-picked onto `m32`. 1: `.dialog > *` keeps
  `flex-shrink: 0`, so a dialog taller than the window scrolls instead of squeezing its `.seg` switches to 0 px (they were
  3 px in a browser before, 39 px after). 2: `.deal-panel td.num-s` wraps, so the Deal builder fits its 760 px dialog (the
  longest notes measured 1,265 px before); the capex note joins its parts with " · ", the utilisation note ends with a full
  stop before the contract note, one year reads "1 yr" (`ui.deal.years_one`), a rating note reads "B+, rising". A sweep of
  every dialog this Act II save reaches (11) at 1024 and 1280 px also found the fleet dialog ("Your machines", 876 px):
  `.fleet-table` lets its batch name and working count wrap (mine, reversible). Tests: `tests/ui/dialogLayout.test.ts`
  (the CSS rules; happy-dom has no layout) and `tests/ui/dealBuilderText.test.tsx`. On `m32` an Act IV game's 12 dialogs
  (Read the market included) fit too. Not swept in a browser: the prologue's and Act I-only dialogs (coin sales, crypto
  loans, the auction, renewals) and Act IV's prospect report (four short columns).
- (Done, 6 Oct 2026) **New project dialog, shorter site list** (owner request): on `hotfix-dialog` (`c16f975`), cherry-picked
  onto `m32`. Sites sort by free power, largest first, and the dialog picks the first. Sites with less free power than the
  pilot's minimum size (`pilotSizes[0]`, the threshold: mine, reversible) fold under "Show N more sites" and can be shown
  or hidden again (hiding a picked small site moves the pick back to the largest). If no site reaches the threshold, every
  site shows and nothing folds (mine, reversible): the Act III presets are like that. UI only; test
  `tests/ui/openProjectSites.test.tsx`.
- An ear test of the sounds; the 4 sample fallbacks if a synth sound is wrong (owner task, DT C3 after M20).
- (Done, 29 Sep 2026) The big JS chunk is split: `vite.config.ts` puts the market data, card text, other content JSON and
  libraries in their own files, and the prologue screens load only when a prologue game starts (`LazyPrologue` in `app.tsx`).
  Every file is under 500 KB (main 444 KB) and the Vite warning is gone.
- The ASIC $/TH tiers, SOFR and spread series are estimates (doc 18 §15): pull real data before final balance.
- Backlog (deferred, DT C1 after M20): the pitch opening reacts to company performance (era EV/EBITDA × trailing EBITDA, ±30%).
- (Done, M8.7d and M21.3) Power and Capital slot log lines: in the report's milestones, nuclear included; card-bought rack pilots log both.

## Next

**Now (12 Oct 2026): M64's PR waits for the owner's review and merge; then the design thread answers its open questions (M64 section).**
The owner can play Act V on staging (`npm run staging:build`, owner only; "Start at Act V"); the dev flag flips only on the owner's word.
Open owner item: the Prologue "End Quarter leaves the Plan screen on the page" report (no reproduction on main; the build thread asked for the
browser, a hard-reload result, console errors and window width).

**Before (11 Oct 2026): the Act V gate waited for the owner's call on M43.0d (since passed: doc 43 §0.11)** (5 of 6 targets pass; Fortress's V3 Locker ÷
Holder 1.031 misses 1.05). PR #11 (M43.A, the Act IV test image) and PR #12 (doc 43 §0.7, M43.0c, M43.0d) merged (`main` =
`b8d766f`); `m43a` and `m45` tagged `m43a-done`, `m45-done` and deleted. PR #13 merged (`main` = `4557f43`): doc 43's latest
edits, doc 46 (the content task), doc 47 (the Act V content pack, data in `docs/act5-content/` with its generators), doc 48
(new chips research); `m46` tagged `m46-done` and deleted; `m47` (from `main`) holds this cleanup.

**Before (10 Oct 2026): the Act V gate, third try (M43.0c, doc 43 §0.7) on `m45`.** PR #10 merged (`main` = `4512775`): docs
43 v1.1, 44, 45 and the gate prototypes M43.0 and M43.0b (both FAIL, STOPPED below); `m44` tagged `m44-done` and deleted.
`m43a` (the Act IV test image, M43.A) has its own PR. Nothing else for Act V is built until the gate passes.

**Before: no milestone open.** Doc 42 (concepts), doc 43 (the Act V design, "Firm", 2036-2040) and doc 44 (the brief for the
third research pass, doc 45). F-10 closed (M42; doc 27 §16 marks it). PR #9 merged (`main` = `c08bb2c`); `m43` tagged
`m43-done` and deleted.

**Before: PR #7 merged (`main` = `71f36cb`): M41 (the raise rule, Lantern Arc / Keelstone); `m41` tagged
`m41-done` and deleted; `m42` (from `main`) holds this cleanup and M41's `--act4` results (merged before the run finished).**

**Before: PR #6 merged (`main` = `464a6ad`): M40 (Act IV reading rules, venture delivery at CF); `m40` tagged
`m40-done` and deleted.**

**Before: PR #5 merged (`main` = `ff442df`): M37.7, Prologue bulk buy, M38 (report), M39 (energy data fixes);
`m38` tagged `m38-done` and deleted; staging rebuilt from `main` by the owner. `m40` (from `main`) holds this cleanup. Open: the
design thread's answers on M38's fix options and M39's three questions (reactor CF on delivery, venture marks scaling with
price, Iceland's 2018 warning as a row reason).**

**Before: M37 Finances merged (PR #4, `main` = `3e67c1d`), live; `m37` tagged `m37-done` and deleted.** `m38`
starts at `m37`'s tip (it carries M37's last dev-notes commit, `d4a28ef`, not yet on `main`). Open: the design thread's
answers on M37's four questions (the 120 s prologue timing line, prepayments, gains on sales, the report's revenue tile).
Recorded misses (balance targets, not defects): B3, B4, B6, B8, B13, E-B2 (numbers in "Milestones M35-M36"); since M65 also B1 (see "M66-docs" at the top). B5 also misses in the M64 and M65 tables (10 and 30 seeds, links off and on) though it is not on this older list: not covered by §0.22, flagged in "M66-docs".

**M38 done (report below, "M38"); now M39 (energy data fixes, doc 41,
`docs/game-project-files/claude_41-energy-data-fixes.md`).** M38's brief was (the Perfect-bot investigation, design thread answer 1):** investigate the Perfect bot's in-play reading
(F1 23, F3 55, below Passive's 53 and 58; the oracle gives 95/96). List its logged moves per quarter in one F1 run and
one F3 run (kind, sign, the ideal stance that quarter) and say which kinds pull it below Passive. Hypothesis (DT):
financing moves (raises, debt draws) taken to fund an offensive move score as defensive; if confirmed, propose "funding
follows purpose" (a raise or loan in the same quarter as an offensive move takes its sign, Act IV; say whether Act III
has the same effect). **Report before changing anything.**

**Before (6 Oct 2026):** the owner playtested Act IV on `m32` (staging built from `m32`); the findings below.

**Act IV playtest findings** (fixed on `m32` unless marked open; the staging snapshot needs a rebuild to show a fix):
- (Fixed, 6 Oct 2026) Plan dashboard: a tall panel above it (Renewals due, also the wildcard and Act IV's alerts) squeezed
  Market / to-do / Signals into small scroll boxes. Now the columns keep 460 px (mine, reversible), the main area scrolls,
  and the news line with Start quarter stays pinned at its bottom; renewal cards are 640 px wide minimum, so the three
  choices sit on one row. Then a compact renewal card (`dcb5df1`): the details left, the choices right (about 165 px tall
  at 1440 px, was about 280), stacked as before on a narrow card; a negotiation spans the card. Both are on
  `hotfix-plan` from `main` (`8278b19`, `726c21b`, pushed) for the owner to merge, as Act III is public.
- (Done, 6 Oct 2026, owner request) `npm run staging` serves on the local network too (`--host`): open the printed Network
  URL on another device. Saves stay per browser (and per address); restart the server to pick it up.
- (Fixed, 6 Oct 2026) Orbit board and Moon page, window 1280 px and up: panels drawn over each other ("Launch manifest" and
  "Licences and registry" cut to their titles, "Links to the ground" over them; "Polar sites" on the Moon). A section is a
  grid with auto rows; a panel that scrolls sideways (`.panel:has(> table)`, M21.1) may shrink to 0 there, so in a page
  taller than the window its row fell to 24 px. Fix: `.section { grid-auto-rows: min-content; }`, as `.capital2` already
  has. `main` isn't affected (its table panels sit inside wrapper columns; checked in a browser, no overlap); a browser
  sweep of every Act IV page at 1440×800 shows no overlap now. Test: `tests/ui/dialogLayout.test.ts`.

**`main` = `4557f43`** (11 Oct 2026, PR #13 merged): docs 43 (latest), 46-48, the Act V content pack; `m46` tagged `m46-done`
and deleted. Before: `b8d766f` (11 Oct 2026, PRs #11 and #12 merged): the Act IV test image; doc 43 §0.7, the gate M43.0c and M43.0d;
`m43a` and `m45` tagged `-done` and deleted. Before: `4512775` (10 Oct 2026, PR #10 merged): docs 43-45, the gate M43.0 and M43.0b; `m44` tagged `m44-done` and
deleted. Before: `c08bb2c` (10 Oct 2026, PR #9 merged): doc 42, doc 27's F-10 note; `m43` tagged `m43-done` and deleted.
Before: `4b633a7` (10 Oct 2026, PR #8 merged): M42 (notes only; F-10 closed); `m42` tagged `m42-done` and deleted.
Before: `71f36cb` (10 Oct 2026, PR #7 merged): M41; `m41` tagged `m41-done` and deleted.
Before: `464a6ad` (10 Oct 2026, PR #6 merged): M40; `m40` tagged `m40-done` and deleted.
Before: `ff442df` (10 Oct 2026, PR #5 merged): M37.7, bulk buy, M38, M39; `m38` tagged `m38-done` and deleted.
Before: `3e67c1d` (10 Oct 2026, PR #4 merged): M37 Finances; `m37` tagged `m37-done` and deleted.
Before: `319a660` (10 Oct 2026, PR #3 merged by the owner): M27–M36, Act IV and doc 38. Branches `m27`…`m35` tagged
`m27-done`…`m35-done` and deleted (remote and local). Before: `726c21b` (6 Oct 2026): M26, the dialog hotfixes 1 and 2
and the shorter site list (`hotfix-dialog`),
then the Plan dashboard fix and the compact renewal card (`hotfix-plan`); both hotfix branches are merged and deleted, and
the same commits are cherry-picked on `m32`. Earlier: M26 at
`209622e`, M25 at `f8cf61f`, M24 at `ebcda47`, M23 at `37a3535`, M22 at `6c623d3`, M21 / M21.6 at `48d16b4`, M19–M20 at
`7804dd0`, M16–M18 at `e0846d3`. Every finished milestone branch is tagged `m<n>-done` (m9 … m26, m21.6, prologue-done)
and deleted; the remote holds `main` (and the working milestone branch). Still open: the owner's tasks (the Act III playtest, the Act I
playtests, the ear test of the sounds). (D15 resolved by the owner in M20.1.)

## Overnight run, 11-12 Oct 2026 (owner asleep; doc 43 v1.2; stacked branches, no merges)

Branches stack: `m47` (step 0 docs, step 1 M43.0e) → `m48` (step 2 content fixes) → `m49` (step 3) → … one PR each, base =
the previous branch. The morning report is at the end of this section.
- **M48 (step 2) done:** doc 47's generators in `tools/act5/` (Python kept, mine, reversible; `npm run content:act5`); they
  reproduce all 21 files byte for byte; the §0.11 errata applied (raise rule 0, en dashes, exit bids hidden, flex rating, CC/CT
  flat); `check.py` PASS; the game's copies in `src/content/` (byte-identity test). README "Data changes" lists each change.
- **M49 (step 3, §19 items 1-2) part 1:**
  - **Content:** the timeline runs to 2040Q4 (76-95); 64 glided Act V markets ("s2.f3.v1"), the glide skipping the subsidy
    and hashprice; Gen 2037's columns merged at load.
  - **Sim:** act 5, `inActV`, `inAct4Rules`, save v6, `toAct5`/`enterAct5` (the Moon → one holding, Act IV-only state
    dropped), `act5End`, and Gen 2037 from 2037Q1 in Act V only.
  - **UI:** "Continue to Act V" / "Retire at 2035", the A5-01 intro and a skeleton chapter. Goldens byte-identical.
- **M49 part 2, the presets:** `tools/act5/presetRun.ts` (a recipe: an Act IV preset line + future + seed, the Balanced bot
  and the energy runner's joins or battery) and `presets.ts` (`npm run content:act5-presets`), and "Start at Act V".
  - **Found:** only **Orbital Landlord** (Fortress line, F1, seed 1: orbit 62% of value).
  - **Not found:** Firm Builder (the SMR reaches first power in 2035Q1 with no offtake, since there's no nuclear-region
    site; ground 18% < 40%) and Small Grid (Ridge with a battery goes bust; Fortress has 4 sites). Not targeted; DT question.
- **M49 gate review** (doc 43 §3.2: each Act IV-only gate's answer, mine, reversible):
  - **Carry on in Act V (`inAct4Rules`):** the orbital business (blocks, launches, manifests, ops, orbital debt, fire
    sales, ground stations), Act IV's grid and gas rules (until the queue milestone), the orbit Bandwidth bonus, Act IV's
    hires, and the tenant default read through Act V's key.
  - **Stay Act IV-only (`inActIV`):** the Moon (offstage), Act IV's Signals, wildcards, move log and Orrery's news and
    auction, the space-equity window and its capital view (§11.1: it closes), and joining new ventures (follow-on units
    come with plants).
  - **Also:** `inAct2Rules` and `inAct3Rules` include act 5 (§3.2). End-of-act clamps use the current act. Log labels
    past the game's act stay "—", so Act IV logs are unchanged.
  - **Carry-over checked against `state.ts`:** every §3.1 field carries; dropped: act4Moves, act4Wildcards,
    act4SignalReads, marketRead, act4Moon (→ lunarHolding).

### Morning report (12 Oct 2026)

**Steps done:**
- **Step 0 (docs):** `m47`, PR #14.
- **Step 1 (M43.0e):** `m47`, PR #14.
- **Step 2 (M48, content fixes):** `m48`, PR #15.
- **Step 3 (M49, act-aware refactor + walking skeleton + Gen 2037):** `m49`, PR #16.

**Not reached:** steps 4 (futures engine, Signals, hidden files, reading score), 5 (plants), 6 (the queue) and 7 (chips
part 2). Not stopped by a rule: time. Each is a milestone of its own, and step 3 took most of the night.

**M43.0e (no tuning):**
- **V1, Holder ÷ Seller:** Fortress 1.311, Firm Builder 1.463 (target ≥ 1.2).
- **V1, Holder ÷ Locker:** 1.137 and 1.142 (target ≥ 1).
- **V3, Locker ÷ Holder:** Firm Builder 1.074 (pass); Fortress 1.028, a recorded near-miss (target 1.05).
- **Information, V3 Seller ÷ Holder:** 1.031 and 1.035.
- **Gap, V1 Fortress, Holder − Seller:** multiple +9.4%, leases +7.1%, site sale +11.0%, cash yield −6.8%.
- **Gap, V3 Fortress, Holder − Locker:** leases −4.6%.
- **V2 and V4:** in `gate-e-summary.txt` (scratchpad) and the PR.

**Content fixes (M48):** the generators reproduce the 21 files byte for byte, then only the errata change (listed in the
README). `check.py` PASS.

**Goldens and tests:**
- **Every milestone:** all goldens (Acts I-IV and the prologue) byte-identical.
- **M49:** the Act IV goldens are compared at format 5, as earlier format bumps were; Act IV log labels past 2035Q4 kept
  as "—".
- **Tests:** 1,646 after M48, 1,656 after M49.
- **Main bundle:** 225.66 → 226.64 KB; Act V's markets in four chunks of 281 KB.

**Assumptions (mine, reversible):**
- the generators kept in Python;
- the Locker and Seller rules as M43.0d;
- the M43.0e glide on power, capacity, AI multiple and SOFR;
- pumped storage's capacity path ∝ the PJM price;
- Act V rivals = Act IV's frozen at 2035Q4 until the rivals milestone;
- the act-gate answers above;
- Act V borrows the orbit theme;
- Gen 2037 contracts priced off its neocloud rent;
- the preset fit tests in `tools/act5/presets.ts`.

**Open questions for the design thread:**
1. **Presets:** Firm Builder and Small Grid fit no company in the scan. A Fortress-line SMR switches on in 2035Q1 with no
   offtake (no nuclear-region site), and no line has one site with a battery that survives. Change the descriptions, let
   the preset scan add a later venture or a site, or ship with Orbital Landlord only?
2. **Fortress's V3:** 1.028 on the real files; confirm the balance pass owns it (§0.11's levers).
3. **Generators:** keep them in Python, or port them to TypeScript?

## Second unattended run, 12 Oct 2026 (doc 43 v1.2 with §0.13; steps A-F)

- **Step A:** doc 43 §0.13 committed. Act V's entry points sit behind a dev flag (§0.13):
  - **How:** `Act5Entry.tsx` loads only when `import.meta.env.MODE !== 'production'` (mine, reversible: the codebase's
    test-build pattern), so dev, staging and tests have Act V, and the GitHub Pages build drops the chunk.
  - **The chapter report in production:** without it, Act IV's chapter report shows "The finale →" as today.
  - **Saves:** production refuses an Act V save.
  - **Tests:** act3Gate checks production has no `ACT5_ENTRY_MARKER` or Act5Entry chunk, and staging has both. 1,658 tests.
- **Step B (M50, branch `m50`):** preset rescan per §0.13 (`presets_act5.json` renamed `presets_v.json`). **Firm Builder:**
  Fortress F2 seed 1 `[egs2]` (gate recipe 182 of 720), leases 57%, orbit 11%, V-B7 busts 0/12. **Orbital Landlord:** as M49.
  **Small Grid:** Ridge F1 seed 1 +queue, recipe 1; it fits §0.13's letter but holds 0.1 MW, orbit 88%, founder $0.7M (open question).
- **Step C (M51, branch `m51` on `m50`): §19 item 3.** Signals (`signals_v_v1..v4` runtime view, `READ_SIGNAL_V`, the shared panel),
  `signalsHiddenV.ts` + `readingScoreV.ts` read only by `act5End.ts` (the reveal, `Act5Reveal.tsx`), the move log `act5Moves.ts`
  (kinds only; signs from the hidden file), M40.1/M41.1/low-exposure rules, leak and grep tests. `rivals_v.json` stays frozen (not cheap: item 6).
- **Step D (M52, branch `m52` on `m51`): plants.** Split: **1** scarcity repricing (§0.2, §0.7, §0.9 item 2) · **2** plant operations and
  valuation · **3** plant debt and its covenants · **4** fund sales and contracted output · **5** the V2 flex payment · **6** follow-on
  units. Chunks: 1 · 2-4 · 5 · 6. Act V only: Acts I-IV and their goldens unchanged.
  - **1** done: `scarcity.ts`; rents (RFP, renewal bands, GPU renewal indices, GPU contracts) × s; the AI multiple and spot rents ×
    (1 + 0.5(s − 1)); the market panel shows them repriced, the old demand index × s (mine, reversible). 1,683 tests.
  - **2-4** done: `plants.ts` (operations, stake × EBITDA × 4 × plant multiple, distributions outside EBITDA, plant debt with lock-up /
    restructure / lenders take, fund sales × `infra_bid_index`, output contracts) and `plantsContent.ts`. Mine: developer contracts at the
    base multiple (term not in files), 15-year contracted debt, 12-year output contracts, a plant's region = its campus's. 1,693 tests.
  - **5** done: `flex.ts`, V2's flex payment on enrolled curtailable MW (`site.flexKw`, set by step E's fast lane, plus Texas DR sites'
    curtailable MW: mine) as a grid credit. No carried load qualifies on its own, so it pays only once step E enrols load. 1,694 tests.
  - **6** done: follow-on units (EGS at $4,000/kW, 7 q; SMR unit 2 at 0.85 × unit 1's realised cost, with unit 1's licence and build:
    mine), one per class, 2 BW, +1; the Ventures page's "Your plants" panel (the four actions); browser-checked at 1280 px. 1,697 tests.
  - **Sims:** M52 changes Act V only; the goldens (Acts I-IV byte-identical) cover it; no Act V sim runner exists yet.
- **Step E (M53, branch `m53` on `m52`): the queue.** `queue.ts`: positions (regional wait × 0.8-1.2; $50/kW security returned at
  energisation; the study's bill a quarter later, median × U(0.6,1.4) or a 20% $400-600 tail; paying buys no speed, an unpaid bill
  holds the power); withdraw (0, the hall ends); V2's fast lane (enrols `flexKw`, −0.5% of the enrolled share's AI revenue: mine);
  selling a site's free MW and positions (the leases go by PROJECT_SELL: mine); co-location shown; the Projects page's Queue panel.
  Act IV's carried requests are adopted without a security (mine). 1,705 tests; main bundle 229 KB.
- **Step F (M54, branch `m54` on `m53`): chips part 2.** (a) `tools/act5/chips.py` (ported, Python): start 2032Q1, hazards re-tuned
  only: `calibration_check` (20,000 games) volume 0.301, gain 0.151, loss 0.248, cancelled 0.295, still building 0.005; median volume 2036Q2.
  (b) `accelerator.ts` (its own system, not a VentureType: mine), Ventures-page card, Bowline gated on the game's draw. (c) 9 tests. 1,714 tests.
  M54.2: the card behind Act V's dev flag (mine; gate test), a reservation deposit counts at cost. (d) E-B2 (`tools/act5/chipsEb2.ts`, 10 seeds,
  not tuned): mean −$9M (2035Q4) / $4M (2040Q4) vs control $37M / $192M: cap PASS; best $84M / $225M vs 3 × control best: MISS. 1,715 tests.

## Third unattended run, 13 Oct 2026 (doc 43 v1.2 with §0.14; steps A-C)

- **Step A (M55, branch `m55` on `m54`): §0.14 fixes.** Split: **1** cut Small Grid · **2** act5Entry after the switch to
  earnings · **3** (developer contracts: no change) · **4** the fast lane's energy saving · **5** the whole-site sale · **6** the
  accelerator diagnosis. Chunks: 1-5 · 6. Then merge #17-#21 and M55 to main in order.
  - **1-5** done: two presets (Firm Builder valuation 2,376.9 → 2,345.8 M: the −$31.1M revaluation); `plantsRevaluedUsd` on A5-01
    and the chapter report; fast lane saves 0.5% of the enrolled share's power cost; `SELL_SITE` (2 BW, one −1 move). 1,717 tests.
  - **6** done (`tools/act5/chipsDiagnosis.ts`, 200 draws on `accelSeed`, Fortress f1, 10% stake: the guard refuses 20%). Built 56:
    2040 value $386M vs paid-in $99M (3.91×); bought at a gain 33 (2.34×), at a loss 59 (0.62×), cancelled 52 (0). Sanity (built, all
    calls paid, ≥ 3×): 31/41; the misses: 7 in V3 (units ×0.6, 15× multiple: the binding term), 2 in V4 (2.9-3.0×), 1 late volume (0.67×).
  - **Merged:** #17-#22 to `main` in order (merge commits), full suite green after each (1,658 → 1,717); `main` = `63ae112`;
    m50-m55 tagged `-done` and deleted from the remote.
- **Step B (M56, branch `m56` from `main`): §19 item 6.** Split: **1** rivals_v.json (league, Orrery gating, V3 auction) · **2** the
  Act V wildcards (2 of 5) · **3** the orbit replacement cycle. One chunk each.
  - **1** done: `rivalsVContent.ts`, `act5Rivals` (six; Orrery after F1/F3; firm MW and Ironvale's orderbook in the league), the V3
    Orrery auction through BUY_ORRERY_BLOCKS. Fates stay out of the runtime view (step C's chapter report).
  - **2** done: `wildcardsV.ts`, 2 of 5 drawn at the boundary. Mine: Q-Day = mining revenue and the treasury mark ×0.6 (coin sales
    still at the market price), then a week down and $250K; fusion = the lasting EV multiplier ×1.1 then ×0.95; dry year on pumped
    storage; moratorium blocks grid projects ≥ 50 MW in its region; transformer delay on grid requests. 1,728 tests.
  - **3** done: `orbitEol.ts`: at a block's public design end, replace (new block, newest gen: gen38 from 2038Q4 via its market column),
    extend (once; refit = a year's in-orbit insurance on capex: mine; failures ×1.5), bring home (contracted shells only, to the site with
    most free MW, rent to term: mine), retire (default). Neutral card text (the per-future bodies aren't shown: leak caution). 1,733 tests.
  - **Sims:** Act V only; goldens byte-identical. The rest of events_v.json's cards (incl. the triggers' cards) isn't wired: open question.
- **Step C (M57, branch `m57` on `m56`): §19 item 7.** Split: **1** lock or roll + the exit · **2** scoring, chapter report, the 2040
  finale · **3** bots, `--act5` sims, goldens act5-v1..v4 · **4** the §18 table and the balance pass. One chunk each.
  - **1** done: RENEWAL_TERM (shell renewals: long 9 y −1, short 2 y +1; mine: 9 = the middle of 8-10; GPU contracts keep the offered
    term); BLEND_ACCEPT logs −1; `act5Exit.ts` (bid drawn 2040Q3; sell / sell plants / hold; net worth after the exit in act5End;
    the hidden part read only there); the Plan screen's exit panel. Mine: a sale settles on the 2040Q4 valuation. 1,739 tests.
  - **2** done: act5End adds the career, reading and megawatt titles, venture and rival fates (`rivalsHiddenV.ts`, act5End only); the chapter
    report's exit (outlook revealed), titles, fates; `Act5Finale.tsx` (2035 + 2040 rows, epilogue_v.json, the chip line). Mine: the MW split
    (firm = the rest of energized ground + plant share); bedroom/garage/fusion lines only where they fit. 1,743 tests.
  - **3** done: `tools/act5/bots.ts` (holder, flex, seller, locker, orbit, balanced, overreactor, passive, perfect: the game's Act V actions
    only, no ground growth, all hold at the exit: mine), `tools/act5/runner.ts` (`npm run sim -- --act5`, ~1.1 s a run), goldens act5-v1..v4
    (Firm Builder, the perfect reader, act5Seed 1). Acts I-IV goldens byte-identical. 1,759 tests.
  - **4** done: `npm run sim -- --act5 --seeds 30` (2,160 runs, 43 min, 0 unreconciled). **No balance change:** §0.11's levers apply
    only if V-B4 misses on the ground-heavy start (Firm Builder passes, 1.137); §0.12's only if the accelerator is too rich (it isn't).
    Every miss is reported below with a proposed fix (no listed lever).

## Fourth unattended run (doc 43 §0.15; steps A-C)

- **Step A:** #23 and #24 were merged before the run (`main` = `cd4d3b2`); §0.15 committed as M58.0 on `m58`.
- **Step B (M58, branch `m58` from `main`): the §0.15 fixes, no ⚙ change.** Split: **1** lease renewals · **2** interest on cash ·
  **3** enrol existing load · **4** events_v.json cards · **5** end-of-life bodies · **6** bots (Orbit Replacer adds orbit, Builder)
  and the judging rules. Chunks: 1-2 · 3 · 4-5 · 6.
  - **1-2** done: Act V shell renewals at the lease's 2035Q4 rent × `scarcity_index` (signed in Act V: ÷ the index at signing), walks ÷
    the index (GPU contracts keep the GPU index; mine: the walk rule applies to them too); cash earns SOFR ÷ 4, booked as net interest.
    Act V goldens updated (intended); Acts I-IV byte-identical. 1,763 tests.
  - **3-5** done: ENROL_FLEXIBLE (a site's running load, 1 BW, −1, every future; Queue panel); all 43 cards in Act V's deck
    (`act5Cards.ts`: effects through the Plan systems, the sign logged once; interrupts: trips 15%, transformer 10%; the call and
    end-of-life cards are their Plan panels: mine); EOL body neutral until the trigger. Trigger cards show the hidden trigger titles (Q). 1,770 tests.
  - **6** done: Orbit Replacer carries each new block through (Act IV's `orbitStep`, newest generation) and opens one more when cash ≥
    $500M (mine); Builder (Holder + every follow-on unit, 20% else 10%); V-B5 judged on OL, V-B9 on FB, V-B6 reported as Builder − Holder
    (Act V has no control). 1,770 tests; main bundle 230.9 KB. PR #25.
- **Step C (M59, branch `m59` on `m58`):** split: **1** diagnostics (`tools/act5/diagnose.ts`) · **2** the re-measure · **3** balance pass.
  - **1** done: OL's halving is its orbit book aging out (all 5 blocks retire by 2040; orbit $4.36B of $7.05B → 0 for Passive, V4 too);
    OL V3's −21 is no scoring bug: the perfect reader made ±1 moves in ideal-0 quarters; it now rests there (as Act IV's). act5-v3/v4 goldens move.
  - **2** done: the re-measure (2,400 runs, 0 unreconciled): V-B1, B2, B5, B7, B9, B10, B11 pass; B3, B4 (FB 1.025), B8 miss.
  - **3** done: §0.11 lever b (V3 scarcity end 0.80 → 0.75): V-B4 FB 1.025 → 1.039, still a miss; lever c tried, no effect, reverted;
    V1 targets unchanged; act5-v3 golden moves. Full re-run (2,400 runs): table below. 1,770 tests; main bundle 230.9 KB. PR #26.

## Fifth unattended run (doc 43 §0.16; steps A-C)

- **Step A:** #25 and #26 were merged before the run (`main` = `554a393`); §0.16 committed as M60.0 on `m60`.
- **Step B (M60, branch `m60` from `main`): the §0.16 fixes, as one chunk.** 1 orbit on remaining life · 2 V-B4's form · 3 the Flex
  diagnosis · 4 V2's stances · 5 follow-on units · 6 the launch-slot card · 7 the card rules · 8 the trigger guard.
  - **1-8** done: OL act5Entry $7.06B → $3.46B (orbit −$3.60B; FB −$73M); Flex builds (FB 20 MW, OL 50 MW through the fast lane);
    follow-ons drew on the fixed act4Seed (FB's SMR unit undersubscribed in all 240 runs): now Act V's seed; V2 scores flexibility
    only after its trigger; the slot reserve, card Bandwidth to the next Plan, bid picks, a trigger guard test. 1,776 tests. PR #27.
- **Step C (M61, branch `m61` on `m60`):** split: **0** §0.17 · **1** descriptions + the SMR note · **2** re-measure · **3** balance pass.
  - **0-1** done: §0.17 committed; preset descriptions reworded (presets_v.json, text_v, Start screen); "First power expected after 2040".
  - **2-3** done: re-measure (0 unreconciled): core V-B2, B4, B11 pass, V-B1 misses on FB (orbit never within 10%); V-B3's lever
    (V2 flex rating 0.5 → 0.75) moves it 1.030 → 1.032 only; full after-run below. 1,776 tests. PR #28.

### Report (fifth run, 13 Oct 2026)

**Steps:** A done (§0.16 as M60.0) · B done (M60, #27, merged) · C done (M61, #28, merged; this report on `m61-report`). §0.17 (mid-run
answers) committed and applied with M61.

**Per milestone:** Acts I-IV goldens byte-identical throughout; Act V goldens and `presets_v.json` moved by design. M60: 1,776 tests,
231.3 KB. M61: 1,776 tests, 231.3 KB.

**Orbital Landlord before/after the remaining-life rule:** act5Entry $7,056M → $3,460M (orbit −$3,596M: $68M/q at 16×, every block
≤ 4 years left), founder $1,118M → $548M; leases 0.24 → 0.48, orbit 0.62 → 0.22. Firm Builder $2,346M → $2,272M (orbit −$73M). Rows:
OL Holder 0.691 / 0.532 / 0.422 / 0.482 → 1.408 / 1.085 / 0.860 / 0.984 (the multiples are now on the lower entry).

**Flex diagnosis:** the Flex Operator builds through the fast lane in V2: FB 2 halls (20 MW) connected and leased, $16.5-20.7M rent;
OL 3 halls (50 MW), $47-54M. No growth change was needed.

**Follow-on units:** cause, the follow-on's draws and Act V's venture steps used the preset's fixed act4Seed, so all 240 runs drew FB's
one SMR unit (others subscribed 0.22 < 0.3: 40%/yr cancellation while licensing). Fixed to act5Seed: 3 of 8 seeds cancel, the rest
carry past 2040 at their mark. The EGS follow-on was always offered (the Builder takes it in 2036Q1 at 10%).

**§18 table** (medians, 2040Q4 before the exit ÷ act5Entry; before = M61.2, after = M61.3; FB / OL, v1 v2 v3 v4):

| Bot | FB after | OL after |
|---|---|---|
| Holder | 1.683 1.270 0.920 1.097 | 1.408 1.085 0.860 0.984 |
| Flex | 1.677 1.311 0.894 1.066 (V2 was 1.308) | 1.334 1.156 0.816 0.935 (V2 was 1.151) |
| Seller | 1.230 1.224 1.218 1.242 | 1.134 1.124 1.115 1.150 |
| Locker | 1.530 1.240 0.956 1.079 | 1.305 1.103 0.875 0.990 |
| Orbit Replacer | 1.505 1.109 0.756 1.030 | 1.293 0.950 0.684 0.950 |
| Builder | 1.682 1.267 0.918 1.095 | 1.432 1.107 0.879 1.005 |
| Passive | 1.454 1.317 1.036 1.176 | 1.257 1.168 0.953 1.076 |
| Perfect | 1.679 1.348 1.141 1.311 (V2 was 1.336) | 1.334 1.194 1.089 1.207 (V2 was 1.184) |
| Over-reactor | 1.211 1.215 0.921 1.261 | 1.090 1.079 0.851 1.155 |

| # | Result | Verdict |
|---|---|---|
| V-B1 | FB best: holder, flex, seller, seller; Orbit Replacer never within 10% (OL: within 10% once) | FB MISS, OL PASS |
| V-B2 | FB V1 Holder ÷ Seller 1.368, Holder ÷ Locker 1.100 (OL info 1.242 / 1.079) | PASS |
| V-B3 | V2 Flex ÷ Holder FB 1.032, OL 1.065 (lever applied) | MISS |
| V-B4 | FB V3 Seller ÷ Holder 1.324, Locker ÷ Holder 1.039, no busts (OL info 1.297 / 1.018) | PASS |
| V-B5 | OL V4 Orbit Replacer ÷ Holder 0.966 (FB info 0.939) | MISS |
| V-B6 | Builder − Holder: FB median 0.00 (best +0.06), OL +0.02 (best +0.09) | information |
| V-B7 | 0 busts in 120 | PASS |
| V-B8 | Perfect ÷ Passive FB 1.155 / 1.024 / 1.101 / 1.115; Over-reactor ÷ Passive V4 1.072 | MISS |
| V-B9 | FB +28 / +2 / +33 / +19 | PASS |
| V-B10, B12, B14 | as before | PASS |
| V-B11 | FB 0.909 / 0.885 / 0.818 / 0.810; OL 0.938 / 0.874 / 0.819 / 0.806 | PASS |

**Core targets (V-B1, B2, B4, B11):** B2, B4, B11 pass; **V-B1 misses on Firm Builder**, with one named cause: since the remaining-life
rule a replacement block is worth at most 5× its earnings, so the Orbit Replacer's spending never earns back inside the act (FB V4 1.030
against Seller 1.242). It is within 10% on Orbital Landlord.

**Balance changes:** one. V2's post-trigger `flex_capacity_rating` 0.5 → 0.75 (§0.16's one step): V-B3 FB 1.030 → 1.032, OL 1.061 →
1.065. No other lever was triggered (V-B2, B4, B11 pass; §0.11 and §0.12 not needed).

**Misses and proposed fixes:**
1. V-B1 (FB) and V-B5: the orbit payoff can't show inside the act on the remaining-life rule. Proposed: value a new block at min(the
   file's multiple, its design life) from launch rather than its remaining life (a fresh block at 5× today; 5 years of earnings at
   most), or judge orbit on cash generated by 2040 rather than value.
2. V-B3: flexibility's payment is small next to ground rents (FB +3%). Proposed: count the fast lane's earlier connection (V2's
   design payoff) by letting fast-lane halls sign at the scarcity rent from connection, or accept the miss.
3. V-B8: Perfect beats Passive by 2% in V2 and the Over-reactor gains in V4 (its decoy, selling in 2037, happens to pay).
   Proposed: V4's decoy window moved before selling pays (2037Q1-Q2), or the decoy's wrong stance there set to +1.

**Assumptions (mine, reversible), this run:** the orbit unit multiple is the blocks' EBITDA-weighted average; the preset scan
chooses on Act IV's marks; card Bandwidth is charged to the next Plan; the bid picker defaults to the largest stake / most valuable
site; the perfect reader's V2 moves are enrol and fast lane; the over-reactor reads the decoy's stance from the file.

**Open questions:** 1. V-B1/V-B5: which orbit fix, if any? 2. V-B3: accept, or the fast-lane rent? 3. V-B8: V4's decoy window?
4. The ready-for-playthrough note waits for M62 (the Act V screens) and V-B1: is FB's V-B1 miss acceptable for the playthrough?

### Report (fourth run, 13 Oct 2026)

**Steps:** A done (#23, #24 merged before the run; §0.15 as M58.0) · B done (M58, [PR #25](https://github.com/tudorc44/garage-to-gigawatt/pull/25),
open, base `main`) · C done (M59, PR #26, open, base `m58`). Nothing stopped.

**Per milestone:** Acts I-IV goldens byte-identical throughout; Act V goldens moved by design (renewals and interest; the cards; the
perfect reader's rest; lever b). M58: 1,770 tests, 230.9 KB. M59: 1,770 tests, 230.9 KB. Long sims: Act V only (Acts I-IV untouched).

**Renewals before/after** (Firm Builder, a 10 MW hall leased at $18.00M a year): V1 2038Q4 offer ×0.749 ($13.49M) → ×1.233
($22.20M), walk 1.7% → 1.3%; V3 2039Q4 ×0.486 ($8.75M) → ×0.800 ($14.40M), walk 4.4% → 5.5% (before lever b; ×0.75 after it).

**OL decomposition** (2035Q4 $7.05B: orbit $4.36B, AI $1.44B, lunar $0.59B, construction $0.55B, cash $0.12B; medians of 5 seeds):
all five live blocks reach their 5-year design end inside the act and retire. Passive loses the whole orbit book (−$4.36B) in every
future, V4 included; cash grows +$1.30-1.33B, construction −$0.43B, AI +$0.78B (V1) to −$0.10B (V3), lunar −$59M to +$59M. Multiples
0.62 / 0.57 / 0.48 / 0.53. The Orbit Replacer (13 new blocks, 10 live by 2040) keeps −$1.96B to −$3.76B of orbit; in V4 the
multiple 16× → 20× adds +$0.48B, in V1-V3 it falls to 9× / 7.5× / 6× (−$0.85B to −$0.99B); it borrows ($0.2-0.4B). Multiples 0.72 /
0.52 / 0.38 / 0.74. The founder stake is unchanged (0.158). Cause: an orbit-heavy 2035 company's fleet ages out by 2040; no rule bug.

**OL V3 move list:** −21 wasn't a scoring bug. The perfect reader took the Balanced habits in ideal-0 quarters (19 short renewals,
+1, 10 of them in the decoy window: penalty 30). Fixed in the bot (rests in 0s): seed 1 now scores 93 against Passive's 60, its 8 moves
all −1 in q7-q8, all marked "match".

**§18 table** (medians, 2040Q4 before the exit ÷ act5Entry, 30 seeds; before = M59.2, after = M59.3; FB / OL, v1 v2 v3 v4):

| Bot | FB before | FB after | OL before | OL after |
|---|---|---|---|---|
| Holder | 1.631 1.230 0.931 1.063 | 1.631 1.230 0.891 1.063 | 0.691 0.532 0.438 0.482 | 0.691 0.532 0.422 0.482 |
| Flex | 1.625 1.267 0.904 1.032 | 1.625 1.267 0.866 1.032 | 0.654 0.564 0.415 0.458 | 0.654 0.564 0.400 0.458 |
| Seller | 1.192 1.186 1.180 1.203 | same | 0.556 0.551 0.547 0.564 | same |
| Locker | 1.482 1.202 0.954 1.046 | 1.482 1.202 0.926 1.046 | 0.640 0.541 0.440 0.486 | 0.640 0.541 0.429 0.486 |
| Orbit Replacer | 1.560 1.134 0.778 1.291 | 1.560 1.134 0.742 1.291 | 0.719 0.519 0.380 0.738 | 0.719 0.519 0.363 0.738 |
| Builder | 1.501 1.099 0.798 0.932 | 1.501 1.099 0.759 0.932 | 0.650 0.490 0.395 0.440 | 0.650 0.490 0.379 0.440 |
| Passive | 1.409 1.275 1.038 1.139 | 1.409 1.275 1.004 1.139 | 0.617 0.573 0.481 0.528 | 0.617 0.573 0.467 0.528 |
| Perfect | 1.627 1.212 1.106 1.270 | same | 0.654 0.563 0.534 0.592 | same |
| Over-reactor | 1.173 1.177 0.932 1.047 | 1.173 1.177 0.893 1.047 | 0.534 0.529 0.433 0.461 | 0.534 0.529 0.417 0.461 |

| # | After the balance pass | Verdict |
|---|---|---|
| V-B1 | best FB: holder, flex, seller, orbit; OL: orbit, flex, seller, orbit; each within 10% in ≥ 2 | PASS |
| V-B2 | FB V1 Holder ÷ Seller 1.368, Holder ÷ Locker 1.100 (OL info 1.242 / 1.079) | PASS |
| V-B3 | V2 Flex ÷ Holder FB 1.030, OL 1.061 (≥ 1.15) | MISS |
| V-B4 | FB V3 Locker ÷ Holder 1.039 (was 1.025; ≥ 1.05), no busts; Seller ÷ Holder 1.324 | MISS (0.011 short) |
| V-B5 | OL V4 Orbit Replacer ÷ Holder 1.530 (FB info 1.215) | PASS |
| V-B6 | Builder − Holder: FB −0.13, OL −0.04 in every future and seed (the follow-ons: EGS runs, the SMR unit is cancelled) | information |
| V-B7 | 0 busts in 120 | PASS |
| V-B8 | Perfect ÷ Passive FB 1.155 / 0.951 / 1.101 / 1.115; OL 1.061 / 0.983 / 1.143 / 1.121; Over-reactor ≤ 0.924 everywhere | MISS (perfect) |
| V-B9 | FB +28 / +40 / +33 / +19 (OL info +33 / +47 / +33 / +19) | PASS |
| V-B10 | no fusion before 2038; EGS2 first power 1.00 | PASS |
| V-B11 | hold ÷ sell FB 0.922 / 0.880 / 0.824 / 0.813; OL 0.942 / 0.866 / 0.833 / 0.810 | PASS |
| V-B12, B14 | by tests | PASS |
| V-B13 | 20 Plan phases | information |

**Balance changes:** one. §0.11 lever b, V3's `scarcity_index` end 0.80 → 0.75 (`tools/act5/market.py`, `market_v_v3.csv` and its
JSON, README logged): V-B4 FB 1.025 → 1.039. Lever c (V3's merchant fall two quarters earlier) moved nothing (EGS2 is 90% contracted;
2040's value sees the same end price) and was reverted. Lever a (the lease-term mix) is no value in any file: not applied. V-B2's and
V-B11's levers weren't triggered (both pass). Every V1 target still passes.

**Misses and proposed fixes** (no lever left):
1. V-B4 (FB 1.039): proposed, the V3 renewal factor one more step (0.75 → 0.70), or judge V3 on Seller ÷ Holder (1.32), which already
   rewards the hedge.
2. V-B3 (FB 1.030, OL 1.061): flexibility earns only V2's capacity payment × 0.5 on enrolled MW, and enrolment costs 0.5% of output.
   Proposed: V2's `flex_capacity_rating` 0.5 → 1.0 after its trigger, or a lower grid wait for flexible requests.
3. V-B8 (Perfect ÷ Passive in V2 0.95-0.98): V2's ideal is +1 for 8 quarters, then −1; the +1 moves (short renewals) earn less than the
   offered terms Passive keeps. Proposed: re-check V2's ideal stances against the V2 economics, or let V2's early scarcity rise (1.07)
   reach renewals faster.

**Assumptions (mine, reversible), this run:** walks ÷ scarcity apply to GPU renewals too; interest is net interest below EBITDA;
enrolment takes a site's whole running load, with no un-enrolling; card choices act as their Plan actions without Bandwidth; the cash-call
and end-of-life cards are their Plan panels (not second interrupts); a fund bid takes the largest stake, a site bid the most valuable site;
a bought position is 20 MW at the biggest site; a lease lock touches leases ending within 4 quarters; the trip cost is the stake's lost
energy revenue; the licensing clock shifts SMRs still licensing; the follow-on card takes a 10% stake, its 5% discount as a rebate;
the space window's raise is 10%; the launch-slot reservation is noted only; Orbit Replacer opens blocks at cash ≥ $500M (20 MW,
newest generation, project debt); the Builder takes 20% stakes (else 10%); the perfect reader rests in 0 quarters.

**Open questions for the design thread:**
1. The four trigger cards' titles are the hidden trigger titles, and V2's names its future ("The Flexible Lane Opens"); they play from
   the trigger quarter as §0.15 asks. Keep, or give them neutral titles in doc 47's generator?
2. V-B4 at 1.039: take a further step (0.70), accept the near-miss, or judge V3 on Seller ÷ Holder?
3. V-B3 and V-B8: which of the proposed fixes, if any?
4. V-B6: Act V has no control venture; is Builder − Holder (negative: the SMR follow-on is cancelled in every run) the measure you want?
5. The launch-slot reservation (V4 card) has no system; build one (e.g. a faster replacement launch), or leave it a note?
6. The live site: by §0.15's recommendation the core targets (V-B1, B2, B4, B11) still miss on B4; keep the flag on until settled?

### Report (third run, 13 Oct 2026)

**Steps:** A done (M55; #17-#22 merged, `main` = `63ae112`) · B done (M56, PR #23, open, base `main`) · C done (M57, PR #24, open,
base `m56`). Nothing stopped. Not reached: nothing in the prompt; the open gaps are listed under the questions.

**Per milestone** (Acts I-IV goldens byte-identical in all three; main bundle 230.4 KB):
- M55: Small Grid cut, act5Entry after the earnings switch, fast-lane saving, whole-site sale, accelerator diagnosis. 1,717 tests.
- M56: rivals_v.json, 2 of 5 wildcards, the orbit end-of-life cycle. 1,733 tests.
- M57: lock or roll, the exit, titles and fates, the 2040 finale, bots, `--act5`, new goldens act5-v1..v4. 1,759 tests.
- Long sims: M55-M57 change Act V only (Act IV energy goldens unchanged), so `--act2 --act3/--act4/--energy` weren't re-run.

**Accelerator diagnosis** (§0.14 item 5; 200 draws, Fortress f1, 10% stake, the most the cash guard allows): built 56 at 3.91×
median (2040 value ÷ buy-in plus calls), acquired at a gain 33 at 2.34×, at a loss 59 at 0.62×, cancelled 52 at 0×. Sanity target
(built, calls paid, ≥ 3×): 31 of 41 pass. The misses: 7 in V3 (the binding term: units ×0.6 with the 15× multiple from the trigger),
2 in V4 (2.87-2.97×), 1 late volume (2040Q1, 0.67×). Best built: draw 28, 6.25×. Not tuned.

**§18 table** (medians, 2040Q4 before the exit ÷ act5Entry, 30 seeds; FB = Firm Builder, OL = Orbital Landlord):

| Bot | FB v1 | v2 | v3 | v4 | OL v1 | v2 | v3 | v4 |
|---|---|---|---|---|---|---|---|---|
| Holder | 1.140 | 0.827 | 0.644 | 0.736 | 0.502 | 0.385 | 0.326 | 0.361 |
| Flex | 1.146 | 0.884 | 0.651 | 0.740 | 0.491 | 0.427 | 0.323 | 0.357 |
| Seller | 1.024 | 1.019 | 1.013 | 1.036 | 0.487 | 0.482 | 0.478 | 0.495 |
| Locker | 1.288 | 0.912 | 0.732 | 0.802 | 0.545 | 0.410 | 0.339 | 0.374 |
| Orbit Replacer | 1.140 | 0.827 | 0.644 | 0.736 | 0.502 | 0.385 | 0.326 | 0.361 |
| Balanced | 1.139 | 0.826 | 0.646 | 0.736 | 0.502 | 0.385 | 0.326 | 0.361 |
| Over-reactor | 0.940 | 0.949 | 0.646 | 0.728 | 0.439 | 0.434 | 0.329 | 0.356 |
| Passive | 1.160 | 0.915 | 0.749 | 0.823 | 0.506 | 0.417 | 0.352 | 0.388 |
| Perfect | 1.148 | 0.982 | 0.928 | 0.938 | 0.491 | 0.465 | 0.434 | 0.441 |

| # | Result | Verdict |
|---|---|---|
| V-B1 | Best per future FB: flex, seller, seller, seller; OL: holder, seller ×3; each of the four within 10% in ≥ 1 | PASS |
| V-B2 | FB V1 Holder ÷ Seller 1.113 (≥ 1.2), Holder ÷ Locker 0.885 (≥ 1.0); OL (information) 1.033 / 0.921 | MISS |
| V-B3 | V2 Flex ÷ Holder FB 1.069, OL 1.109 (≥ 1.15) | MISS |
| V-B4 | FB V3 Locker ÷ Holder 1.137 (≥ 1.05), Holder busts 0%; OL (information) 1.041; Seller ÷ Holder 1.57 / 1.47 | PASS |
| V-B5 | V4 Orbit Replacer ÷ Holder 1.000 on both | MISS |
| V-B6 | Not re-measured (no Act V bot joins a venture); the M54 E-B2 cap passes; the diagnosis above | not measured |
| V-B7 | Firm Builder passive: 0 busts in 120 | PASS |
| V-B8 | Perfect ÷ Passive FB 0.99/1.07/1.24/1.14, OL 0.97/1.11/1.23/1.14; Over-reactor ÷ Passive FB V2 1.038, OL V2 1.040 | MISS |
| V-B9 | Perfect − Passive reading FB +28/+38/+7/+12; OL +33/+45/−21/−3 | FB PASS, OL MISS |
| V-B10 | No fusion output before 2038; EGS2 first power 1.00 (120 held); waits by tests | PASS |
| V-B11 | Hold ÷ sell FB 0.949/0.888/**0.791**/0.805, OL 0.956/0.875/0.816/0.807 (0.80-1.25) | FB MISS (V3, 0.009 short) |
| V-B12 | By the plant tests, not the runner | by test |
| V-B13 | 20 Plan phases; Balanced 2.6 actions a phase (bot count) | information |
| V-B14 | By `act5Futures.test.ts` | PASS (test) |

The medians barely move with the seed: Act V's own draws matter little to these bots; the company and the future decide.

**Balance changes:** none (see chunk 4). **Misses and proposed fixes** (for the design thread; nothing changed):
1. V-B2: the Locker beats the Holder in V1 because contracting the EGS plant's output lifts it from the merchant multiple (8.5× after
   V1's trigger) to the contracted 10×; renewal offers stay below the old rents even in V1 (price multiples 0.4-0.9), and short terms add
   walks (9 against 4). Proposed: V1's merchant multiple ≥ the contracted one after the trigger, and renewal offers that carry the full
   `scarcity_index` rise.
2. V-B3: the only way to enrol flexible load is the fast lane on a new position; the `enrol_flexible` move exists in the reading score
   but no action enrols existing load. Proposed: an "enrol existing load as curtailable" action in V2 (−1), paid by `flex_capacity_rating`.
3. V-B5: few blocks reach design end live inside the act (OL: 1 of 5 by 2039Q1), and a replacement is valued at cost. Proposed: judge
   V-B5 on an orbit-heavy start, or let a replacement carry V4's orbital multiple from launch.
4. V-B8: selling pays in V2-V4 (Seller ≈ 1.02 flat while holders fall), so the over-reactor's V2 decoy (sell) helps; Perfect can't beat
   Passive in V1, where Passive's default terms are already near-best. Proposed: V2's early ideal (+1) needs a payoff (the flex fix).
5. V-B9 (OL): the orbit-heavy start reads −21 in V3; its few ground moves fall in low-exposure quarters. Proposed: report on ground-heavy
   starts only, as V-B2/B4.
6. V-B11 (FB V3 0.791): proposed: V3's outlook factor up 0.01-0.02 (exit_v.json, hidden), or the V3 bid range's top 1.10 → 1.08.

**Assumptions (mine, reversible), this run:** M55: Fortress at a 10% stake for the diagnosis; act5Entry includes the revaluation.
M56: Q-Day hits mining revenue and the treasury mark, not coin sales; refit = a year's in-orbit insurance; bring-home to the site with
most free MW; neutral EOL card text. M57: long = 9 years; a sale at the exit settles on the 2040Q4 valuation; the megawatt split;
epilogue lines naming the bedroom, garage or fusion only where they fit; bots use only Act V actions (no ground growth) and all hold at
the exit, the sale priced from the same run (V-B11); judged on Firm Builder for V-B2/B4 (OL's lease share is 24%).

**Open questions for the design thread:**
1. The misses above: which fixes, if any (none has a listed lever)?
2. §0.8/§0.11 adopted "proceeds repay debt, the rest earns SOFR" for the Seller; the game pays no interest on cash. A game rule for
   every Act V company, or a gate-only assumption?
3. events_v.json's cards beyond end of life (including the triggers' cards) aren't wired. Wire them, and in which milestone?
4. Per-future end-of-life card bodies are hidden (they'd hint at the future). Keep them neutral?
5. V-B6 in Act V needs bots that join ventures in Act V (follow-on units, the accelerator). Add them, or keep E-B2 as the measure?
6. Should the Act V entry points leave the dev flag once these misses are settled, or only after the owner's playtest?

### Morning report (second run, 12 Oct 2026)

**Steps done:** A (merges #14-#16, dev flag) · B `m50` · C `m51` · D `m52` · E `m53` · F `m54`; none stopped. PRs stacked on
each other (m50 → main, m51 → m50 … m54 → m53), unmerged.

**Long-sim drift (M49's gate changes):** none. Act II/III 1,302 CSVs byte-identical to M39; Act IV identical to M41;
energy identical to M40.2; prologue runs identical (only the summary's timing line: 123 s vs 103 s, machine busy).

**Presets:** Firm Builder found (Fortress F2 seed 1 [egs2], leases 57%, orbit 11%; V-B7 0/12 busts). Small Grid kept by
§0.13's letter (Ridge F1 +queue) but it's 0.1 MW, 88% orbit, founder $0.7M, and its "position" is a proposed project's
grid request (no wait until its build starts): see open questions.

**Per milestone (all goldens byte-identical; Act IV energy goldens didn't move: no bot joins the accelerator):**
- **M50:** presets rescan + labels. 1,658 tests; main 226.4 KB.
- **M51:** Signals, hidden files and guards, move log, reading score, reveal. 1,679; 226.4 KB. Oracles: perfect/passive/
  opposite V1 100/50/0, V2 100/50/0, V3 93/60/28, V4 86/67/46.
- **M52:** scarcity repricing, plants (operations, valuation, debt and covenants, fund sales, output contracts), V2 flex
  payment, follow-on units, plants panel. 1,697; 226.4 KB.
- **M53:** the queue and its panel. 1,705; 229.0 KB.
- **M54:** chips part 2. `calibration_check` (20,000 games): volume 0.301, gain 0.151, loss 0.248, cancelled 0.295,
  still building 0.005 (hazards 0.1051 / 0.0525 / 0.0876). E-B2: cap PASS, best case MISS (above). 1,715; 229.0 KB.

**Mine, reversible (beyond the lines above):** Signals' short labels GQ/CM/AD/RD/LC/FB; PROJECT_SELL scores as
`sell_site_free_mw`; low-exposure = AI book EBITDA × 4 × multiple + powered + ventures over act5Entry; operating plants
switch from mark to earnings at 2036Q1 (the Firm Builder's EGS stake dips $137.5M → $106M on day one); a lock-up sweeps
all distributions into the debt; withdrawing a position ends its hall (capex sunk); the accelerator card behind the dev
flag; reservation deposits priced at the 2036Q1 baseline; foundry ration closes Bowline to non-reservers for 4 quarters.

**Open questions for the design thread:**
1. Small Grid: keep the letter-fit preset, require "little orbit" and a started grid build, or cut it (two presets)?
2. The 2036Q1 seam for operating plants (mark → earnings): accept the dip, or measure act5Entry with the earnings value?
3. Developer contract terms (for the contract-tail multiple) aren't in the files: base multiple for now. A term to add?
4. The fast lane's −0.5% output: modelled as 0.5% of the enrolled share's AI revenue. Right reading?
5. E-B2 for the accelerator misses its best case (0.15× vs 3×): accept, or apply §0.12's levers in reverse?
6. Should the accelerator be offered on the live Act IV before Act V ships, or wait (as now)?
7. `rivals_v.json` still frozen (Act IV's rivals at 2035Q4): wire it with item (6)?
8. Selling a site is "its free MW and positions" + PROJECT_SELL for its leases: enough, or a whole-site sale?

## Milestone M43.A (branch `m43a`, from `main` at `c08bb2c`; an Act IV test image, presentation only)

Split: **1** the asset (WebP 1152 and 640 px in `src/assets/art/`; the PNG original in `docs/art/incoming/`) · **2** the art
manifest `src/ui/art.ts` · **3** test art only in dev and staging · **4** the A4-01 intro banner and the "First block live"
report panel, in Act IV's lazy chunk · **5** design · **6** checks (tests, bundle, browser at 1024 and 1440 px).
- **1** done: one-off `npx sharp-cli@5.1.0` (no dependency), quality 85: 26 KB (1152 × 768) and 12 KB (640 × 427).
- **2-3** done (one commit: the gate lives in the manifest, mine): `src/ui/art.ts` (`ART`, `artFor`, `SHOW_TEST_ART` = mode ≠
  production or `VITE_SHOW_TEST_ART=true`); alt and credit through `t()`; test `tests/ui/art.test.ts`.
- **4-6** done: `components/artFrame.tsx` (panel frame, cover to 260 px, lazy img with srcset, credit, "Test art" tag, a fade
  off under reduced motion); A4-01 banner above "Enter 2031 →"; the report's "First block live" panel on the quarter the first
  block went live (worked out from `liveQuarter`, no state flag: mine). Main bundle 225.63 → 225.66 KB; browser 1024/1440 OK.

## Milestone M43.0 (branch `m44`; the Act V gate, doc 43 §19, design thread prompt of 10 Oct 2026)

Sim-only prototype, no UI, nothing in `src/` (goldens and sim outputs unchanged): `tools/act5-gate/` (`states.ts` plays
the 2035Q4 companies as the energy runner; `gate.ts` the 20 stub V1 quarters, §11.3 valuation, Firm Holder vs Seller,
30 seeds; `README.md` lists every assumption, all mine, reversible). On `m44` (unmerged, holds docs 43-44): mine.
- **Result (30 seeds, 1,232 runs with a stake): FAIL**, Holder ÷ Seller 1.009 overall, 0.94-1.05 in every cell (target 1.2).
  Plant alone: holding beats selling for thermal plants (×1.27-1.46), but one 10-20% stake is 1-4% of company value; pumped
  storage loses when held (calls at ×4 overrun, capacity-only earnings). STOPPED: the design thread revises V1 or the gate.
- **M43.0b** (doc 43 v1.1 §0.6, `gate-b.ts`, 30 seeds, 2,160 runs per stub): **FAIL both**, V1 Holder ÷ Seller 1.040 (best cell
  Fortress F2 1.162), V3 Seller ÷ Holder 1.024. Gap = leases (V1 +3.1%, Fortress +8.6%); powered value 0 (median free MW 0);
  plants ≈ 0. act5Entry is leases 55% (Fortress), 10% (Neocloud, firm-heavy), 0% (Ridge). STOPPED for the design thread.
- **M43.0c** (§0.7, `gate-c.ts`, branch `m45`, 30 seeds): **V1 passes, V3 fails**: V1 Fortress 1.400, Firm Builder 1.570 (475 of
  2,160 runs qualify, all Fortress); V3 0.958 and 0.937. The Seller's fair-value site sale costs it 15-21% in both futures (its
  cash earns nothing: five years of rent lost). Stop rule (V1 passes only where V3 fails): reported, not tuned. STOPPED.
- **M43.0d** (owner's option A, `gate-d.ts`, 30 seeds; confirmation, no tuning): V1 targets pass (Holder ÷ Seller Fortress 1.295,
  Firm Builder 1.398; Holder ÷ Locker 1.122, 1.131). V3 Locker ÷ Holder: Firm Builder 1.061 passes, **Fortress 1.031 misses
  1.05**; info V3 Seller ÷ Holder 1.034, 1.047. Gate FAIL on one target by 0.019: the owner's call.
- **M43.0e** (doc 43 v1.2 §0.11: the gate passed; rerun on doc 47's market files, `gate-e.ts`, 30 seeds, no tuning; V1 and V3
  judged, V2/V4 information; the seam glide from each company's 2035Q4): **every V1 target passes** (Holder ÷ Seller 1.311
  Fortress, 1.463 Firm Builder; Holder ÷ Locker 1.137, 1.142). V3 Locker ÷ Holder: Firm Builder 1.074 passes; **Fortress
  1.028, a recorded near-miss** (was 1.031; the balance pass owns it, §0.11's levers). Info V3 Seller ÷ Holder 1.031, 1.035.

## Milestone M42 (cleanup; design thread prompt of 10 Oct 2026)

PR #8 (`m42`: the PR #7 cleanup and M41's run) opened for the owner. **M42.1** (F-10, Act II data): checked, not changed:
STOPPED (below). Both issues are in the superseded v1 pack (`docs/game-project-files/claude_act2-content_market_*.csv`: weekly
last week 85,889.70 vs quarterly 88,000; hashprice hand-drawn). The live files (`docs/act2-content/` = `src/content/`, rebuilt
27 Sep 2026, README §"fixes of 27 Sep") already hold: 222/222 weekly rows on the formula; each quarterly BTC column = the
sourced quarter close = its last week (2026Q4 88,000 both), quarterly hashprice on the formula (within 0.01).

## Milestone M41 (branch `m41`, from `main` at `464a6ad`; design thread answers to the M40 report, 10 Oct 2026)

Answers: 2 keep the quarter-level "that build's own"; 3 E-B2 stays a recorded miss (the reactors' fat tail, M40.2 numbers:
smr mean $171M, best $5.2B; adv_fission $148M, $5.4B; control $35M; finished-plant valuation is an Act V design item).
Split: **M41.1** rule (b) replaced: a raise takes the sign of the next scored move after it in Act IV, 0 with none (never a
decoy); target Perfect ≥ Passive − 2 in all 12 cells, a short cell is a recorded miss · **M41.2** names: Lantern Arc
Constellation (id `jade_arc` kept), Keelstone Sovereign Compute · then the `--act4` run and the PR.
- **M41.1** done (`scoredSignsIv`): a raise takes the sign of the next non-raise ±1 move after it in the log (play order: a raise
  logged after its quarter's build looks further on, mine, reversible); none: 0. Goldens: act4-energy-f2/f4 reading only.
- **M41.2** done: Lantern Arc (en.json, short code JA → LA: mine, reversible) and Keelstone Sovereign Compute (tenants_iv.json
  both copies and its tool, orbit guide, README log); ids kept. Doc 33/34 and act4-scope keep the old names as history.
- M41 run (`--act4`, 10 seeds; identical to M40 but the reading): Perfect ≥ Passive in all 12 cells (PASS): F1 fortress 82→84,
  neocloud 89, ridge 13→73 (Passive 53; its raises all take + from the build, none a decoy); F3 fortress, ridge 56→58, neocloud 73
  (58); F2 100, F4 62 (= Passive). B8 MISS, B9 PASS unchanged (money). Merged (PR #7) before the run ended: recorded on `m42`.

## Milestone M40 (branch `m40`, from `main` at `ff442df`; design thread answers after M37.7-M39, 10 Oct 2026)

The PR the answers asked for was already merged (PR #5), so `m40` starts at `main` (same content as `m38`). Answers 3 and 4
need no change: venture marks stay scaled by the buy-in (egs2's 1.26× in F2 accepted); Iceland 2018 stays the row's reason.
Split: **M40.1** the Act IV reading (a build quarter's hedges and debt at 0; a raise takes + before an offensive move) ·
**M40.2** venture delivery = contracted MW × the quarter's CF · then the runs (`--act4`, `--energy`; Act III untouched).
- **M40.1** done (`scoredSignsIv`, readingScoreIv.ts; the reveal shows the scored sign): in a quarter with a commit or orbital
  debt draw, presale, insurance and the debt draw count 0 and are never decoys (no block ids in the log: "that build's own" =
  that quarter's, mine, reversible); a raise is + if a + move follows that quarter or the next. Act IV goldens: reading only.
- **M40.2** done: `deliveredKw(v, quarter)` = offtake × CF (reactors 0.80 × 8 q then 0.92; EGS 0.9, weak field 0.6 until fixed);
  savings on delivered kWh only (the rest is grid at the site's price). weak_field was read before (M36.1: delivery × 0.6/0.9).
  `ventureEbitdaUsd` kept, unused, for Act V. Energy goldens: SMR 75 MW → 60 MW firm (90 → 75 MW with the control).
- M40 runs: `--act4` identical to M39 but the reading; Perfect/Passive F1 fortress 22→82, neocloud 40→89, ridge 6→13 (Passive 53);
  F3 neocloud 53→73, fortress and ridge 56 (58): STOPPED. B8/B9 unchanged (money). `--energy`: smr mean $216M→$171M, adv_fission
  $186M→$148M, control $35M; E-B1 PASS, E-B2 MISS, E-B5 PASS. Act I-III and the prologue untouched (no rerun).

## Milestone M39 (branch `m38`; energy data fixes, doc 41 of 10 Oct 2026, from doc 40's research)

Split (one commit per step; doc 41 numbers them M38.x, renumbered M39.x by the owner): **M39.1** Texas: the credit split
into demand response (grid_credits) and fixed-price resale (energy_income), 4CP as a flat saving, the $30M-a-payment
backlash · **M39.2** hydro timelines per kind (PUD ramp on existing load, muni overage, Québec grandfathering and block) ·
**M39.3** Iceland (price locked at signing, 2018 every other quarter, 2021Q4 dry week) · **M39.4** owned generation and
batteries (prices, ITC steps, small wind CF, battery losses, the PJM derate path, ERCOT battery income) · **M39.5**
ventures (EGS prices and PPAs, nuclear running cost and CF ramp) · **M39.6** card text · **M39.7** provenance, README,
tests, the E-B anchors, `--energy`, the 2,000-game venture table. Non-energy goldens and sims stay byte-identical.
Before: battery payback (E-B5 formula) 2022Q4 81.3 q, 2024Q1 66.9 q, 2027Q1 34.5 q; anchors and `--energy` = `energy-m37f`.
- **M39.1** done: DR $8/18/30K (grid_credits) + fixed-price resale $10/30/75K (energy_income) at Q3; 4CP a flat $50K (2020-25),
  $60K (2026+) per MW off next year, a quarter each quarter (power +); backlash on a $30M payment. Goldens unchanged.
- **M39.2** done: per-kind hydro timelines (PUD 2.6¢, closed 2018Q1-2019Q1, tariff ramp from 2019Q2 on every PUD site; muni 2.0¢,
  closed 6 q, overage = max(own, warehouse price) from 2018Q1; Québec 4.5¢, closed 2018Q2-2019Q3, −3.4% for sites from 2019Q4).
- **M39.3** done: Iceland's price locked at signing (4.3¢ 2017; U(5.1, 7.1)¢ 2018+), every other quarter in 2018, a dry week in 2021Q4.
  Mine: the 2018 "warning event" is the row's reason ("rationed"), not a log line, so games without energy options stay identical.
- **M39.4** done: home battery $1,000/750/900, utility battery $1,500 (2015) … $625 (2018), $513 (2019, straight line: mine), ITC 0%
  from 2026 and 30% from 2022Q1, small wind CF 0.20 × U(0.3, 1), battery 85% / 2.5% fade, PJM derate by year, ERCOT battery income.
- **M39.5** done: EGS $7,000/kW, PPA $90; block 2 $5,500/kW, $90; reactors $40/MWh, CF 0.80 for 8 q then 0.92 (`ventureCf`). Goldens
  act4-energy-f2/f4 change (the cheaper EGS buy-in); the others don't. Open: delivery to the campus stays firm (CF not applied).
- **M39.6** done: the energy cards' reality lines (doc 40 §Q5): $540/MWh in 2015 under rooftop solar and the home battery;
  $185/MWh under on-site solar and the utility battery (mine: those four kinds).
- **M39.7**: `source` replaces `verify` where doc 40 answered (Québec's Rate LG and the flare pad stay `verify`); the energy README
  rows updated with a "Still gaps" list. Runs (`--energy`, the byte-identity sims, the venture table): below.
- M39 runs: `--act2 --act3` = M34, `--act4` = M36.11, prologue CSV identical (102-103 s). `--energy`: E-B1/E-B5 PASS, E-B2 MISS as
  before; battery payback 2022Q4 33 q, 2024Q1 31 q, 2027Q1 20 q (were 81, 67, 35); egs2 F2 median 1.13 → 1.26 (the mark scales with
  the pitch). Venture table unchanged (EGS 0.804, block 2 0.796, SMR 0.561, advanced 0.388, pumped 0.136, fusion 0, control 1.0).

## Milestone M37 (branch `m37`, from `main` at `319a660`; Finances: the P&L and cash flow, doc 39 of 10 Oct 2026)

Split (one commit per step): **M37.1** the ledger: `src/sim/ledger.ts` with `book()`, every cash change in `src/sim`
converted (186 sites in 55 files at the start), the reconciliation (test and self-check), a grep test that only the
ledger writes `state.cash`, old saves start the ledger at load · **M37.2** attribution: business and site/project/block
views (`src/sim/financeViews.ts`) · **M37.3** the Finances screen, P&L tab (left nav, every act) · **M37.4** the Cash flow
tab and the weekly chart · **M37.5** summaries in the quarter report and the chapter reports · **M37.6** tests and the
browser check (1024 and 1440 px; Acts I, II, IV). Sims: `--act2 --act3` (and the Act I/prologue tables) byte-identical.
- **M37.1** done: `src/sim/ledger.ts` (`book`, `bookSplit` for a combined amount, `accrue` for mined coins, `roundCash`); all 186
  cash changes converted (grep test `sim/ledger`); 23 goldens reconcile, diff ledger only; old saves partial; tools' `checkedLedger`.
  Mine: lunar_revenue/lunar_opex/energy_opex/taxes added; prepayments income when received, set off later; no gain/loss on sales.
- **M37.2** done: `src/sim/financeViews.ts` (periods, P&L, by business, by site with projects/ventures under their site and blocks
  under Orbit, cash flow, chart, summaries); test `sim/financeViews` (sums, periods). Moon is its own business column (mine).
- **M37.3** done: left-nav "Finances" (every act, the prologue too; own chunk 12 KB), P&L tab by line/business/site, period picker,
  biggest changes. Mine: prepayments are cash outside the P&L (`prepayments`, operating cash), so revenue is never negative.
- **M37.4** done: Cash flow tab (start, operating = net profit − coins mined + prepayments, investing, financing, treasury, end =
  the cash), weekly chart (quarter) or quarterly (longer) with the low marked, "why cash fell/rose". Mine: "coins mined" adjustment.
- **M37.5** done: quarter report block (revenue, opex, EBITDA, net, cash change; "Open Finances ›" in place, with a way back);
  each chapter report (prologue, I-IV) "The act in figures" + best/worst site. Ledger stores only off-category business bookings.
- **M37.6** done: tests `sim/ledgerActs` (each act's lines vs its own report), `ui/finances`; browser at 1024/1440 (I, II, IV): no
  sideways scroll, no cut cell. Tests 1,569 → 1,621; main bundle 221.1 → 224.9 KB (Finances chunk 11.4 KB). Merged (PR #4), live.
- M37 runs (final code): `--act2 --act3` identical to M34 (1,302 files), `--act4` and `--energy` identical to M36.11, prologue CSV
  identical. The ledger costs ~20% speed: prologue "1,000 runs" 104.6 → 126.1 s, a MISS on its 120 s line (open question).
- **M37.7** (design thread after M37): ledger = open quarter + a shared, never-changed history (`cloneState` in state.ts copies the
  open quarter only); overhead 25-34% → 1-2%, prologue 1,000 runs 102.1 s (PASS); Revenue tile = total revenue ("of which
  mining"), a Revenue row on the prologue report; doc 39 amended (A1-A10). M37-format saves split at load.
- **Prologue bulk buying** (owner, 10 Oct 2026; presentation only): each machine card has a count (− / +, 1 / 10 / Max (N)), the
  total and power, one Buy; N = `p0MaxBuy` (views.ts: cash and free power, confirmed by p0BuyBlocker). Act I's Buy dialog
  already had a count. The used offer and pre-orders are one unit or one order by their rules: unchanged. Goldens unchanged.
- **M38** (Perfect-bot reading, report only, no change): a build quarter logs presale− debt+ booking+ insure− = net 0 (0.5, not
  1); raises the quarter before a build score 0; the build's own −1 moves count as decoy moves (F1 penalty 30). Same-quarter
  "funding follows purpose" alone barely helps (F1 41→41, 23→33, 6→6); hedges neutral too: 41→90. Act III: 10 of 209 build quarters.

## Milestones M35-M36 (branch `m35`, from `m34` at `b194400`; energy options and ventures, doc 38 of 9 Oct 2026)

The design thread's handover of 9 Oct 2026: build doc 38 (`docs/game-project-files/claude_38-energy-ventures-design.md`;
evidence docs 36, 37 and `docs/act5-research/cost_curves.csv`); E-D1…E-D15 approved; Act V is not in scope. Act I-III
goldens and the `--act2 --act3` CSVs stay byte-identical (every feature is opt-in, with its own substreams; bots don't use
the early-era options). Data and every designed value: `docs/energy-content/README.md`. Split (mine, reversible):
- **M35.1 Data:** `market_energy.csv` (prices by year 2009-2040, one file for every act, not columns in each act's market
  files: the series are by year and the same in every scenario; mine) and `energy.json`, `energyContent.ts`.
- **M35.2 Early-era options:** rooftop solar, small wind, home battery (Prologue and Act I); special sites (hydro PUD,
  muni, Québec, Iceland, flare pads); on-site solar and wind, firmness with storage.
- **M35.3 Texas flexibility and batteries:** demand response, 4CP, the AI exclusion and the battery exit; utility battery
  (BESS) and iron-air; the Power options dialog, the Plan's special-site rows, the report's energy line.
- **M36.1 The venture mechanic** (Site, Offtake, Capital; diligence; overruns; three cash calls; slips; debt rules).
- **M36.2 The venture set** (EGS, LWR SMR, advanced fission, fusion, pumped storage, iron-air, the solar+BESS control,
  on-site gas's overrun and turbine slip in Act IV).
- **M36.3 Bots and the E-B1…E-B5 checks, new Act IV goldens, the end checks and the report.**

- M34.4 (closed here): the `--act2 --act3` CSVs are byte-identical to M33 (1,302 files, `bi-m34`), so M34 added no Act II/III
  rule beyond `acquiredQuarter`. The owner's 1b decision (fix the Ground Holder bot or relax B3/B5) is still open.
- M35.1-M35.3 built in one chunk (they share `energy.ts`, `en.json` and the site card). Every golden unchanged (91 checks).
  New: `systems/energy.ts`, `energyAssets.ts`, `texasPower.ts`, `specialSites.ts`, `overrun.ts`, `sim/energyViews.ts`,
  `ui/components/energyDialog.tsx`; tests `energy`, `texasPower`, `ui/energyDialog`. Vite splits `sim-energy`, `sim-space`.
- Decisions (mine, reversible): Texas requires any fixed contract (the game has no 8-year PPA); refusing a grid call while
  enrolled forfeits the year; 4CP at a site with AI halls needs a battery covering them; special sites lease like a
  warehouse (1 Bandwidth) from a warehouse up, and show in the Plan's to-do; a home battery covers its machines' outages
  fully; a battery fire costs 10% of capex (no offline week). The rest: `docs/energy-content/README.md`.
- **For the design thread:** doc 38 §5.1's lognormal parameters don't give its stated tail shares (nuclear σ 0.70 → ~25%
  at or under budget, not ~3%); built as written, E-B3 will report it.
- M36.1-M36.2 built (one chunk): `ventures.json`, `systems/ventures.ts`, `sim/ventureViews.ts`, `ui/screens/Ventures.tsx` (a
  Ventures page in Acts III-IV, lazy with the Act III panels); Act IV gas overrun and turbine slip (`power.ts`); tests
  `ventures` (E-B3, E-B4). Goldens unchanged. Mine: see the venture rows in `docs/energy-content/README.md`.
- M36.3: `npm run sim -- --energy` (tools/act4/energyRunner.ts), new goldens act4-energy-f2/f4, one venture per type. Run
  `energy-m36` (10 seeds, 960 runs): E-B1 MISS (only on busts: venture-free 5 of 120 vs fusion's 2; within 15% of best in
  all four futures), E-B2 PASS, E-B3 PASS on P(m>1.5) and the mean, P(m≤1) 25% not 3%, E-B4 PASS, E-B5 MISS (16-75 q).
- End checks: `--act2 --act3` byte-identical to M34 (1,302 files, `bi-m35`); lint, 1,559 tests, build pass.
- **M34.4 (design thread's answers of 9 Oct 2026, done on `m35`: no bot uses energy, ventures or gas, and every Act IV
  golden is unchanged, so `m35`'s Act IV balance equals `m34`'s):** the Ground Holder borrows first (debt ≤ 4× trailing
  EBITDA, inside the covenant), then raises (founder ≥ 50%), else skips; a company with no free MW buys one site ≤ 50% of
  its energized MW. Run `act4-m344`: **table identical to M34**; Fortress skipped 800 offers (founder already 49% at
  entry, so no equity; $17M EBITDA caps debt near $68M); Neocloud bought its site in all 40 runs but it never powered in
  time; Ridge ($14M cash, no EBITDA) did nothing. B3 MISS 1.08× vs 1.21×; B5 MISS as written (ground 1.03× vs 1.07×).
  The space-multiple knob is **not run**: the fix had no effect, so the owner decides first (report questions).
- **Design thread answers after M34.4 + doc 38 (9 Oct 2026; owner: 11a).** Split (mine, reversible): **M36.4** (9) Act IV's
  Power slot reads doc 33's waits; **M36.5** (1-3) Ground Holder: 15-point dilution budget, pro-forma leverage, powered
  sites only if offered; **M36.6** (4) the F2 space-multiple knob; **M36.7** (6, 7, 8, 10) overrun refit, E-B5 and E-B1
  redefined, Meridian Arc; **M36.8** (11a) ventures marked to milestones; **M36.9** runs and the report.
- M36.4: Act IV grid upgrades wait grid_wait_q × 0.8-1.2 (16-24; F4 8-12 at 10; spread mine), shifted by policies and
  hires as before; Act IV gas 6-10 q (replaces M36's 2-4 q slip; overrun kept). No golden changed (no golden script
  builds Act IV ground power). Test `act4PowerWaits`.
- M36.5 (tools only): Ground Holder dilution budget 15 points from the entry stake; pro-forma leverage on the project's
  own EBITDA ((debt + loan) ÷ (trailing EBITDA + project EBITDA) ≤ 4×, DSCR sizing, covenant); powered sites only.
  One seed: Fortress now builds 2 clouds (stake 49% → 35%); Act IV scouting offers no powered site, so Neocloud and Ridge renew only.
- M36.7: overruns refitted (nuclear 3% uniform 0.85-1.00 else 1 + X, X median 0.6 σ 1.0; pumped hydro 10%, X median 0.58
  σ 1.02, fitted by me): realised nuclear 2.4% / 57.2% / mean 1.93, pumped 10.4% / 48.8% / 9.7% at ≥ 3×. E-B1 (Fisher) and
  E-B5 (≤ 60 q from 2028, falling) redefined; Meridian Arc. act4-energy-f2/f4 goldens changed (the SMR's draws: licensed a quarter earlier, an $80M call in 2035).
- M36.8 (11a): ventures marked to milestones in the valuation (buy-in × 1.5 per milestone × 0.8 per slip, calls at par,
  offtake savings to the act's end at first power), shown as "Ventures (marked to milestones)" on Capital and both chapter
  reports. act4-energy goldens: ventures $512M → $934M, growth 0.90× → 1.32× (an operating EGS at ~4× its buy-in).
- M36.6 (4): F2's space multiple **× 0.60** (the floor) from its 2033Q1 trigger, in `tools/act4/market.ts`. The search
  was flawed: its runtime option scaled the shared F2 table once per scenario key (k⁴, so "0.60" tested ~0.13; fixed in
  the runner). Measured on the written data: F2 Sprinter 1.05× vs Ground 1.03× → **B3 a recorded miss at the floor**;
  no passed anchor broke (`act4-m366`). act4-f2 golden: the busy orbit script now goes bust in 2033Q1, as F3's does.
- M36.9: venture, energy and Act IV gas draws use act4SeedOf (each Act IV run of a preset had drawn the same values).
  Energy run `energy-m369`: E-B1 PASS (5/120 vs 36/720, p = 0.72), E-B2 MISS (EGS mean $65M vs control $2M; the control
  never leaves its grid wait), E-B3/E-B4 PASS (tests), E-B5 PASS (31 q in 2028 → 16 q in 2035). Open questions: report.
- **B3 recorded as a miss** (design thread, 10 Oct 2026; × 0.60 kept): "Ground can't expand in Act IV (power scarcity is
  the act's premise, doc 31/33), so 'ground ≥ 1.2 × Sprinter in F2' can't be met; the honest check, 'ground doesn't lose to
  orbit in the bust', holds (1.03× vs 1.05×)."
- **M36.10** (design thread answers of 10 Oct 2026): Ground Holder builds only clouds that pay back by 2035Q4; marks × 1.25;
  ventures on calendar dates (one developer per type, running from its start whether you join or not), slips and the SMR
  cancellation calibrated to doc 38's P(power by 2035); a cash guard in the energy harness's bots; re-runs and the report.
  Built: one developer per type from its doc 38 start (2027Q1; fusion 2028Q1), replayed quietly; joining takes it over as
  it stands (milestones count after joining). Fitted (mine, to the targets, 2,000 games): EGS slip σ 0.2 → 1.14 (80.4%),
  SMR slip 1.6 → 1.06 and cancel below 30% subscribed (was 80%) (56.1%), advanced 1.07 and 30% (38.8%), pumped 1.45 → 1.27 (13.6%), fusion 0% (the 2038 rule).
- M36.10 runs: Act IV table unchanged from `act4-m366` (Fortress builds 2 clouds a run, holds 360 quarters); `--act2 --act3`
  byte-identical to M34 (1,302 files). Energy (`energy-m3610b`, after the fusion-2038 fix): E-B1 PASS, **E-B2 MISS recorded**
  (SMR mean $305M, advanced $254M vs control $35M; EGS −$0M), E-B3-E-B5 PASS; the cash guard: BTM game overs 15 → 2 of 120.
- Playtest fix (owner, 10 Oct 2026: "click Talk, then Confirm, for each site is repetitive"): in the site list Talk and noise
  mitigation act at once (each row shows its cost), plus "Talk at every site at Heat 30+" with one confirm; a lone to-do
  row keeps its confirm (M34.2 3f, partly reversed). Test `ui/talkPicker`.
- **M36.11** (design thread, 10 Oct 2026): venture offtake capped at 100 MW; EGS block 2 (`egs2`, from 2031Q1, $4,500/kW, 7 q;
  slip median 1.0 fitted, mine: P(power by 2035Q4) 0.796); F2 reading counts quiet, unexposed quarters as matches (goldens
  act4-f2 37 → 59, act4-energy-f2 55 → 100: that rule only). Ground Holder accepted as weak. Runs: Act IV table unchanged;
  F2 reading Passive/Perfect 50 → 100, Lunar 61 → 68; **E-B2 still a recorded miss** with the cap (SMR $217M, advanced
  $187M vs control $35M: scarce firm power is the act's premise); EGS2 operating 82/120; `--act2 --act3` identical to M34.
- **Design thread after M36.11 (10 Oct 2026):** E-B2's miss is final (no second lever); F2's reading not telling cautious
  players apart is intended; EGS block 1 is the Act III bet, block 2 the Act IV window. **Accepted as recorded misses:**
  B4 (F3: Diversified 1.53× vs Sprinter 1.51×, needs 1.25×; Lunar 1.42×; review after the owner's Act IV playtest),
  B6 (Rich: Lunar 1.20× vs Balanced 1.14×, needs 1.2× the ratio; Dry ratio passes, game overs 28% > 25%),
  B8 (Perfect ≥ 1.15× Passive in F1 only, 1.54× vs 1.09×; F3 1.10× vs 1.11×; Over-reactor 1.00/0.95/1.00/1.00× Passive).

## Milestone M34 (branch `m34`, from `m33` at `1864da9`; the owner's answers after M33, 9 Oct 2026)

The owner's answers to the three open questions after M33 (Act IV balance, orbit rule gaps, site-name follow-ups) and
the names check. Chunks (CLAUDE.md: check once per chunk):
- **M34.1 Rules and bots** (one chunk, one Act IV run): 1a orbital cloud returns carry the cost premium (rent premium
  capped, orbital-only opex, true failure rate and useful life with zero residual, space multiple to ~6× F2 / ~8× F4 by
  2034; a payback test); 1b the Ground Holder bot builds ground clouds and renews; 1c F3's cascade 40–60% destroyed,
  shell shut 8 quarters, hard market on the rebuild; 1d the Lunar Bettor skips a pilot below breakeven; 1e B8/B9 reworded;
  1f B13 accepted; 2b a block's sale price on its run-rate until a quarter is booked; 2c licence halving floored at MW in
  use. Then `--act4 --seeds 10`, the 7×4 table and verdicts (relax B3/B5 as given if they still miss), new act4 goldens.
- **M34.2 Presentation:** 2a the exposure line includes take-or-pay penalties through a rebuild; 3b `site.acquiredQuarter`;
  3c project names "Own site 3 · AI 1"; 3d the dashboard's Fleet & sites panel capped from 6 sites; 3e site names linked
  in alerts, the log and to-do rows; 3f one eligible site opens the confirm; 3g "the" dropped before site names.
- **M34.3 Names:** Pallas → Dorado/Carrack (clash check), Aegis → Rampart/Bulwark; hire names checked against real
  people; Jade Arc kept, flagged as doc 33 Q16.
- **M34.4** End checks and the report.

- M34.1–M34.3 built, in one commit (the chunks share `en.json`, `orbitViews.ts`, `Act4Panels.tsx` and the goldens). Payback
  test: orbit 3.59 y vs ground 2.42 y × 1.58 (ratio 0.94). Act IV run, 10 seeds (`act4-m34`): ground 1.18/1.08/1.20/1.03,
  sprinter 2.27/1.21/1.51/0.80, diversified 1.67/1.23/1.53/1.03, lunar 1.23/1.32/1.42/1.07 (28% GO), balanced
  1.34/1.22/1.47/1.07, passive 1.09/1.01/1.11/0.98, perfect 1.54/1.01/1.10/0.98. PASS B1 B2 B7 B9–B12 B14; MISS B3 B4 B5
  B6 B8 B13 (accepted). **1b had no effect** (Ground row unchanged): the Fortress has 71 MW free and GPU offers but $14M
  cash (a 1 MW cloud needs ~$24M own); Neocloud and Ridge have no free MW. Owner's call before relaxing B3/B5 (report).
  Goldens: Act I–III ×17 identical apart from `acquiredQuarter`; act4-f1…f4 changed (rules, rename). Names: Carrack,
  Ironwall (mine); hires pass.

## Milestone M33 (branch `m33`, from `m32` at `bd22812`; telling sites apart, design thread's doc 35 of 9 Oct 2026)

The design thread's prompt calls it "M22"; that number is taken (`m22-done`), so it runs as **M33** on `m33`, from `m32`
since `m32` isn't merged (mine, reversible). Presentation only: no rule changes. Invariants: goldens and `npm run sim`
outputs byte-identical except the new stored serial (the goldens serialise state: their diff must be serial fields only,
plus the serial added to site log entries so logs can name a site); tests green; main bundle under 500 KB.
Sub-steps:
- **M33.1 Naming:** a stored `site.serial` and `state.siteSerials` counter, set when a site is acquired (never reused);
  a load-time migration; short names ("Own site 3", "Powered shell 2", "Garage") and long names ("Own site 3 · Georgia ·
  20 MW") everywhere a site is named, logs included; pickers and lists show free MW, a Heat chip, flag icons.
- **M33.2 SitePicker and grouped to-do rows:** one dialog component for one-action-many-sites (ground station, leave,
  buy machines, hosting, power renewal); Plan to-do rows grouped per action kind.
- **M33.3 Site card:** a drawer (≥ 1280 px) or dialog with a site's power, uses, money, Heat and actions.
- **M33.4 Long lists:** Fleet & Sites and New project grouped by type, with sorts and filter chips.
- **M33.5** End checks (byte-identity sim, browser check at 1024 and 1440 px with a 20-site save) and the report.

- M33.1 done: `systems/siteSerials.ts` (`addSite` at every acquisition, `numberUnnumbered` on load, `siteParams` on ~50 log
  lines and messages; `i18n/t.ts` renders `{tier}` with a number as the short name). Goldens: 21 changed, identical with the
  serial fields stripped. Sentences name a site in plain text; table cells and lists use `<SiteName>` (tooltip = long name)
  (mine, reversible). Prologue screens and the report's "Heat · site type" tile keep the type (reports store no site).
- M33.2 done: `components/sitePicker.tsx`, `screens/planPickers.tsx`. Pickers: ground station (Orbit), leave, renewal,
  transformer, talk, mitigation, hosting (a site with a contract stays pickable), Buy machines' site (fact: power price).
  One eligible site is named inline and acts at once (talk, mitigation) (mine, reversible); facts and labels mine.
- M33.3 done: `components/siteCard.tsx` (host mounted in `app.tsx`; `<SiteName>` is a link to it), `siteCardView`. No
  acquired quarter is stored, so the header says "powered since/from" (mine, reversible). Drawer 460 px from 1280 px.
- M33.4 done: `components/siteGroups.tsx`. Fleet & Sites shows the grouped list instead of the per-site cards with their
  Heat breakdown (now in the site card) (mine, reversible); New project groups in its free-power order, the picked
  site's group open whatever its size (mine, reversible). Folds: a module-level map, so "the session" = until reload.
- M33.5 done (9 Oct 2026): `npm run sim -- --act2 --act3` on `m32` (`bd22812`) and `m33`: all 1,302 CSVs byte-identical.
  Browser, a 20-site Act IV save at 1024 and 1440 px: Plan to-do (4 grouped rows), Orbit links (3 buttons, picker of 20),
  Fleet & Sites (7 groups), the card (drawer at 1440, dialog at 1024), New project: no sideways scroll anywhere. Tests 1,502.
- (Done, 9 Oct 2026) The design thread's Orbit launch-slot clarity fix, on `m33` after M33: `launchFit` in `orbitViews.ts`;
  the launch slot explains "nothing fits" (mass vs the most free, the largest size that fits and from when), counts the
  quarters left out for slots, and Open a block shows the mass and warns when too heavy. Test `tests/ui/launchFit.test.tsx`.
- **Next:** the owner's review of M33 and its questions (the M33 report), then the Act IV playtest goes on.

## Milestone M19 (branch `m19`, from `main` at `f2e2e24`; Heat relief: the Community Relations Manager and the yearly Community Deal)

Owner request via the design thread (4 Oct 2026), run in one go: M19.1 the hire (hires.json; −5 Heat at every site, outreach 0 BW, needs a
site beyond the garage); M19.2 the yearly Community Deal (Plan-phase offer every 4 quarters on the hottest site ≥ 30, Heat to 12, fades 5 a
quarter); M19.3 screens (Hires card, Heat breakdown lines, the Plan deal card), tests, the forced-hire run, a browser check. Invariants: no
bot hires her, so every golden and the `--act2 --act3` sim stay byte-identical.
**M19.1 done:** hires.json `community_relations` (effects heat_base −5, outreach_bw 0, community_deal, needs_site_beyond_garage); heat.json `community_deal`
block (schema); her −5 in base Heat, recalculated on hiring/firing her only; Acts II–III salary = 2021 × 1.08 (hires_act2.json is a frozen copy:
`BALANCE.act2Hires.act1FormulaOnly`, mine). Goldens unchanged. 1229 → 1234 tests.
**M19.2 done:** `systems/communityDeal.ts` (offer at the new quarter's start, END_PLAN lapses it; COMMUNITY_DEAL_SIGN / _DECLINE, unlogged moves);
`SiteHeat.dealOffset` added after the region scaling so Heat lands on 12 exactly, never raises Heat (mine); the fade in endQuarterHeat; two log
lines (the "faded" one is logged in the new quarter). Goldens unchanged. 1243 tests.
**M19.3 done:** People card (via hires.json + en.json); the Plan deal card (all acts, wildcard-card style, "Not this year" tagged Default); the game had no
Heat breakdown, so the Community dialog's site cell gains the two lines (mine). Forced-hire run (raise-climb × 10, from 2019Q1, every deal): Heat
2019 20→15, 2020 15→7.9, 2021 37.7→23.7, 2022 30→19.8; complaints/quarter 0.130→0.090; 19 deals; but 2 of 10 seeds go bust (salary + deals). 1244 tests.

## The Act IV run (M27–M32, the owner's unattended-run prompt of 5 Oct 2026: `docs/game-project-files/claude_34-act-iv-build-prompt.md`)

Scope and rules: `docs/act4-scope.md` (doc 33 approved with the owner's 16 defaults; milestone plan; B1–B14; cut order;
"Changes from doc 33"). Branches chain: `m27` from main, `m28` from `m27`, … (no merges during the run). Push after every
sub-step commit.

### Milestone M27 (branch `m27`, from main at `209622e`; setup and the walking skeleton)

Split: M27.0 the design docs committed; M27.1 `docs/act4-scope.md` and the CLAUDE.md updates; M27.2 the act-aware refactor
(act 4, `inActIV`, gates, save version 5 and its migration, the timeline to 2035Q4, `act4Seed`, `act4Entry`); M27.3
`docs/act4-content/` (README, the four quarterly and four weekly market files, schemas, loader, copy test, B14 test);
M27.4 the Act III → IV boundary (carry-over and drop rules, the future draw, the seam glide); M27.5 20 playable quarters
with the ground systems and a stub chapter report; M27.6 the screens (the light `orbit` theme, "Continue to Act IV",
A4-01, the test-build quick starts and `?future=`); M27.7 the byte-identity check and the M27 report.
- **M27.0 done** (`f01f142`): docs 31–34 and the cost model committed as the owner placed them.
- **M27.1 done.** `docs/act4-scope.md` written; CLAUDE.md: status, Act IV summary, key docs, scope guard, "Act IV rules that must hold".
- **M27.2 done.** `act: 4`, `isActIV`/`inActIV`, new `inAct3Rules` (Act III or IV, for the Act III systems that run on), `inAct2Rules` and `covenantBreached` cover act 4; `FUTURE_IDS`/`MarketKey`; state fields `futureId`, `futureForced`, `act4QuickStart`, `act4Seed` (`act4SeedOf`), `act4Entry`; save version 5 (4 → 5 changes nothing; Act IV saves need the Act IV span). The Act III goldens are compared at their stored format 4, as Act I's are at 2 (no golden file changed).
- **M27.3 done.** `tools/act4/market.ts` (`npm run content:act4`) generates `market_iv_f1–f4` + weekly into `docs/act4-content/` and `src/content/` (README flags every column); the loader adds 2031Q1–2035Q4 (56–75) and 16 glided markets keyed "s2.f3" via `scenarioOf`; `quarterRow`/`act4Row`; market params typed `MarketKey`; `logQuarterLabel` keeps Act I–III log text unchanged; Vite gives each future its own chunk. Tests: B14, the glide, copies. act4-scope §6 items 6–9.
- **M27.4 done.** `systems/act4Entry.ts` (`buildAct4Entry`, `enterAct4`: doc 33 §3.1 carries, §3.2 open renewals resolve by default, blend offers lapse, Act III-only state drops) and `toAct4`/`drawFuture` in state.ts (future on substream `act4_future`, weights in `BALANCE.act4`); needs an Act III scenario (the seam reads it). Tests: `act4Entry.test.ts`, helpers `act4Helpers.ts`.
- **M27.5 done.** Act IV plays 2031Q1–2035Q4 to the chapter phase (`act4End` stub, `systems/act4End.ts`; replay `through: 4`). **Gate review** (doc 33 §3.1): run on in Act IV via `inAct3Rules` — renewals, reopeners, blend-and-extend, the calendar and renewal wall (now the current act's span), density and retrofits, nuclear PPAs, political capital and lobbying, Anger, Act III hires, the covenant, the standby facility, lender cures, card payouts, capacity charges, hosting repricing, lab distress, "no random cards", "no Read the market" (Signals instead); **stay Act III-only** (`inActIII`) — Act III's wildcards, Signals panel and reads, move log, `act3End`/reveal, `act3Finished`. Act III spans extended to Act IV with an Act IV key: capacity charge, hosting rate, SOFR/HY project-debt and DDTL rates, the facility label; GPU contract rate × Act III's end value in Act IV (mine, reversible). An Act IV quarter read without an Act IV key finds nothing (Act III's behaviour kept). Goldens unchanged.
- **M27.6 done** (`M27.6a` + this): Act III panels that run on show in Act IV; `screens/Act4Entry.tsx` (lazy: A4-01 intro, chapter stub); test-build quick starts `act4QuickStart.ts` + `Act4Preview.tsx` (designed recipes, mine, reversible: fortress texas-shell 3/s0, neocloud sign-then-raise 1/s3, ridge lifeline-shell 19/s0; all survive Act III) and `?future=` with its tag and save guard; "Continue to Act IV" on the Act III chapter report; the light `orbit` theme; `averagePrice` reads the market key (an Act IV report crashed without it); intro boxes no longer squeeze (`flex: none`). Tests: gate, grep (`toAct4`, `futureId`), screens; layout notes in `docs/wireframes/act4/README.md`. Browser-checked at 1024 px: quick start → intro → 2031Q1 Plan → report, no sideways scroll.

### Milestone M32 (branch `m32`, from `m31`; scoring, finale, presets, bots, balance)

Split: M32.0 branch and split; M32.1 the Act IV move log (doc 33 §6.7's orbital-exposure signs), the reading score
(`readingScoreIv.ts`, the only reader of `reading_score_iv.json`) and `act4End`'s reveal (the future, the lunar grade and
what the prospects said, the reading score and title, the career and frontier titles, the rivals' fates); M32.2 the
chapter report A4-11 and its leak guards; M32.3 the campaign finale A4-12 (career ledger, multiple, megawatt line,
epilogue pools); M32.4 the three presets (generated by the sim), A4-13 "Start at Act IV" and Scenario Mode for Act IV;
M32.5 the seven bot archetypes, `npm run sim -- --act4` and the B1–B14 table; M32.6 the goldens `act4-f1..f4`; M32.7
the balance pass (at most 3 rounds, each recorded); M32.8 the byte-identity check and the run's final report.
- **M32.1 done.** `systems/act4Moves.ts` (the move log in `applyAction`: +1 capital committed / orbital debt / a launch booking / Orrery's blocks; −1 insurance, a block sold, a take-or-pay presale, a cancelled booking or block, an equity raise; 0 ground and lunar moves); `systems/readingScoreIv.ts` (Act III's rules on `reading_score_iv.json`, oracles; read only by `act4End`); `buildAct4End`'s reveal (future name, trigger, decoy, reads; lunar grade, each site's estimate beside its truth; the fleet's true failure rate and life beside your telemetry; reading score, marked moves, career, reading and frontier titles; rivals' fates) and `act4Outcome`. Tests `act4End.test.ts`; the hidden guard checks the reading score's importer.
- **M32.2 done.** `screens/Act4Reveal.tsx` (A4-11, in the Act4Entry chunk): the future (name, lead, trigger, decoy), the reading score and title with a 20-quarter timeline (ideal vs you), the ice and each site's estimate beside the truth, the fleet's true reliability beside your telemetry, net worth, growth, career and frontier titles, the rivals' fates, and "The finale →" (a stub until M32.3). The leak guards exempt `Act4Reveal.tsx` exactly as `Act3Reveal.tsx`. Render-tested (`act4Screens`); the browser check waits for a faster way to 2035Q4 (M32.4's presets).
- **M32.3 done.** `src/sim/finaleViews.ts` and `screens/Act4Finale.tsx` (A4-12, opened from the chapter report): the career ledger from stored records only (Act I: its 2022Q3 report when kept; Act II: `act3Entry`; Act III: `act4Entry` and `act3End`'s title; Act IV: the end), the start (bedroom $2,000 / 0.15 kW, garage $10,000 / 5 kW, or a preset), the career multiple, the megawatt line, the frontier title and a 2–5 line epilogue from authored pools (end state, the future, the ice, what comes after 2035; "scenario known" when the future or scenario was chosen). Test `tests/ui/act4Finale.test.tsx`.
- **M32.4 done.** `tools/act4/presets.ts` (`npm run content:act4-presets`, 189 runs, 3 min) picked the first fits in sim-runner's bot order × seeds 1–20 × scenarios: **Ground Fortress** texas-shell 1/s0 ($602.8M, 118 MW, no debt, BBB), **Orbit-Ready Neocloud** overleveraged 1/s0 ($19.8B, 121 MW of clouds, $462.9M debt, BB), **Last Ridge** asic-retirer 10/s0 ($14.0M, 0.1 MW, one site, no debt); `presets_act4.json` (both copies; `PRESETS_IV`); A4-13 "Start at Act IV (2031)" in every build (as Act III's), Act IV Scenario Mode unlocked by an Act IV finish (`act4Finished` setting; `act4ScenarioMode`, "scenario known" in the finale), `act4Preset` on the state. Browser-checked: Start at Act IV → Last Ridge → 20 quarters → A4-11 → A4-12 at 1024 px (fixed: the reveal's sections squeezed; the intro's "arrives in a later build" lines). Test `tests/ui/act4Start.test.tsx`.
- **M32.5 done.** `tools/act4/bots.ts` (Ground Holder, Orbit Sprinter, Orbit Diversified, Lunar Bettor, Balanced, Over-reactor, Passive, and the perfect reader for B8/B9; each tries its actions in order and keeps what succeeds; the ground side is the preset's own bot; a player's discipline: licence first, open only with licence room, fill slots only once the build is funded, raising equity in the space-equity window when short) and `tools/act4/runner.ts` (`npm run sim -- --act4 [--seeds N]`: 3 presets × 4 futures × 3 grades × 8 bots; bots that never touch the Moon are played once per future; `act4-runs.csv`, the B1–B14 table). **Baseline (1 seed):** the Sprinter is best in all 12 cells (F1 5.6×, F2 3.2×, F3 3.3×, F4 2.5× vs Ground 1.0–1.2×); PASS B2 B7 B9 (+ B10 B11 B12 B14 by tests); MISS B1 B3 B4 B5 B6 B8 B13. Diagnosis: orbital EBITDA on a 5-year asset valued at a 12–30× story multiple makes any block worth ~4–7× its capex in every future.
- **M32.6 done (3 rounds; values in the act4-content README).** R1: orbital rent $8.5M → $6.0M/MW-yr, GPU-hour $4.2 → $3.6, space multiple 22× → 14× with harsher F2/F4 paths; R2: F2 lower still, lunar $/t 2,000 → 3,000 (per future), cascade loss 40% → 70%; R3: F2/F4 GPU-hours fall from their triggers, F3 shell closed 8 q. 1-seed after R2: PASS B1 B2 B7 B9 (+ B10 B11 B12 B14 by tests); MISS B3 B4 B5 B6 B8 B13, chiefly because orbital clouds earn like the game's ground GPU clouds (payback ~2 years) while the Ground Holder builds none. **10 seeds after R3 (2,880 runs, 28 min):** medians F1/F2/F3/F4 — Ground 1.18/1.08/1.20/1.03×, Sprinter 2.51/1.15/1.66/0.80×, Diversified 1.67/1.23/1.66/1.03×, Lunar 1.21/1.27/1.40/1.02× (28% game overs), Balanced 1.34/1.22/1.47/1.07×, Passive 1.09/1.01/1.11/0.98×, Perfect 1.55/1.01/1.10/0.98×. PASS B1 B2 B7 (+ B10 B11 B12 B14 by tests); MISS B3 (1.08 vs 1.15), B4 (Div = Sprinter 1.66), B5 (Balanced 1.07 > Ground 1.03), B6 (rich 1.20 vs 1.23; dry go 28%), B8 (perfect ≥1.15× in 1/4), B9 (F3 perfect 1.10 < passive 1.11), B13 (bots 2.3 decisions/q). No rounds left: reported as MISS.
- **M32.7 done.** Goldens `act4-f1…f4` (a busy orbit + Moon strategy in high LEO; F3 ends in a game over after the cascade, by design of the strategy); Act I–III goldens unchanged.
- **M32.8 byte-identity: passed.** `npm run sim -- --act2 --act3` on `m32` vs `main` (`209622e`): all 1302 CSVs identical (`cmp`); the summary log differs only by 40 added rows listing Act IV's cards at 0% in the card-frequency table (they can't occur before 2031).
- **Run report (M27–M32)** is in the chat of 6 Oct 2026; the owner's playtest of `m32` via staging is next.
- (mine, reversible) M32's order: the balance pass (M32.6) before the goldens (M32.7), so the goldens capture the balanced game.
- (mine, reversible) The presets' descriptions as tests: Fortress no clouds, ≥ 40 MW, debt ≤ 25% of value, investment grade; Neocloud ≥ 5 MW of clouds, some debt, cash; Ridge one site, < $300M, debt ≤ 20%.
- (mine, reversible) Act I's row shows no MW or title (not stored; doc 33 §15.2 allows it); a preset start's ledger begins at the preset.
- (mine, reversible) Frontier titles: Selenian (a pilot processed water), Cislunar (a held lunar site and orbital MW), Orbital (≥ 10% of MW in orbit), else Earthbound; spot isn't a presale; arranging capital counts as committing the block.

### Milestone M31 (branch `m31`, from `m30`; money and rivals)

Split: M31.0 branch and split; M31.1 the content (`capital_iv.json`: export credit, orbital project debt and its
insurance covenant, sovereign co-funding, the space-equity window, lunar task orders, fire-sale haircuts;
`hires_iv.json`: the four hires; `rivals_iv.json`: the five fictional rivals per future, Orrery's failure and auction;
schemas, loader, README); M31.2 the orbital Capital slot (export credit, project debt with the insurance covenant and
its cure, co-funding; debt service at quarter end); M31.3 the space-equity window, lunar funding (task orders; no lunar
debt), fire-sale haircuts in the rescue; M31.4 the four hires and Bandwidth; M31.5 the rivals and the league (Act III's
retire; Orrery's auction); M31.6 the screens A4-09 (Capital) and A4-10 (quarter report additions); M31.7 tests and the
M31 report.
- **M31.1 done.** `tools/act4/money.ts` (`npm run content:act4-money`) writes `capital_iv.json`, `hires_iv.json`, `rivals_iv.json` (both copies; README section); zod and the rivals' per-quarter paths in `src/content/moneyContent.ts` (`MONEY`). Test `act4MoneyContent.test.ts` (rivals identical through 2032Q2; Orrery's failures).
- **M31.2 done.** `systems/orbitCapital.ts`: `ARRANGE_ORBITAL_CAPITAL` takes `capital` (cash default, export credit, project debt, co-funding); loans drawn as capex is paid (`payCapex`, `ownShare`), interest added during the build, equal principal once live (or after a loss), the insurance covenant (cure 2 q, then called); co-funding's revenue share and bloc strings; lender paid first from insurance and sales; orbital debt in `debtUsd`; a rebuild borrows afresh. Tests `act4OrbitCapital.test.ts`.
- **M31.3 done.** The space-equity window (`equity.ts`, Act IV only: `RAISE_EQUITY` shut below a 12× space multiple; blocks under way priced at capex × multiple ÷ 20); agency task orders (`ACCEPT_TASK_ORDER`, 0 BW: part-funds the next mission, Accords strings; never offered to a Station-aligned company; no lunar debt exists); `systems/fireSale.ts` in the rescue before the emergency raise (a live block × 0.4 on the space multiple, a lunar site × 0.2 or × 0.5 to a bloc that wants it; a `sold` claim status). Tests `act4Money.test.ts`.
- **M31.4 done.** The four hires in `allHires()` (Act IV only; `staffEffect`/`staffNumber`): Launch Procurement Lead (−10% launch $/kg, no bumps), Space Operations Chief (GPU failures × 0.75, telemetry noise × the hidden file's 0.5), Lunar Programme Director (+10 landing points, pilot −1 q, +1 BW), Chief Risk Officer (premiums × 0.8, capacity × 1.25); fictional names and bios in en.json. Tests `act4Hires.test.ts`.
- **M31.5 done.** `systems/rivalsIv.ts`: the league in Act IV is the five fictional rivals on the game's future (value, orbital MW, lunar sites landed; Orrery leaves after failing); the League's scale column shows ground / orbit / lunar sites; Orrery's failure news and its auction (`BUY_ORRERY_BLOCKS`, 1 BW, 50 MW live on spot with 12 quarters left, $6M/MW, two quarters), a panel on the Orbit board. Tests `act4Rivals.test.ts` (incl. B14 for the league).
- **M31.6 done.** `src/sim/act4MoneyViews.ts` and `screens/Act4Money.tsx` (lazy chunk, now 27 KB): the Capital screen's Act IV block (A4-09), the report's orbit and Moon panel (A4-10), the deal card's four ways to pay, the Valuation panel's orbital and lunar rows; layout in `docs/wireframes/act4/README.md`. Browser-checked at 1024 px. Test `tests/ui/act4Money.test.tsx`.
- **M31.7 done.** `act4Played.test.ts`: in every future a busy strategy (orbit on project debt or cash, insured, licences, launches; a lunar claim, missions, power, pilot, offtake) plays all 20 quarters to the chapter; every report's valuation equals the sum of its parts.
- **M31 report.** Commits `8dfc4ec` M31.0, `e194b85` M31.1, `14dfbde` M31.2, `a4947ed` M31.3, `711d6d2` M31.4, `1485425` M31.5, `3ac0ebc` M31.6, M31.7 (this commit). Act I–III goldens unchanged; 1451 tests; main bundle 214.2 KB, Act4Panels 27.5 KB. See it: `npm run dev`, an Act IV game → Capital (space and lunar capital), the Orbit board's Capital slot, People (four new hires), the report's League and "Orbit and Moon this quarter".
- (mine, reversible) Rivals' lunar sites count their scripted landings, whoever else holds the ridge; a bought Orrery block's life is the auction's stated 12 quarters (not the future's hidden life).
- (mine, reversible) Capital terms designed inside doc 33's ranges (README); export credit needs the Accords registry; co-funding takes 30% of capex for 30% of revenue; the space-equity window opens at a 12× space multiple.

### Milestone M30 (branch `m30`, from `m29`; the Moon)

Split: M30.0 branch and split; M30.1 the lunar content (`lunar_iv.json`: 8 polar sites, claims, missions, power, pilot,
production, offtake, dust; `lunar_claims_iv.json`: the rivals' and blocs' scripted claims per future; schemas, loader,
README); M30.2 claims, the landing clock and disputes; M30.3 prospect missions, landings and prospect reports (the
resource categories; `lunarGeology.ts` turns the truth into estimates); M30.4 lunar power (solar arrays; the reactor
lease not before 2034, the Reactor Delay wildcard), the pilot plant (output per doc 33 §9.4, dust and night), offtake,
the production decision (no output in the act), the Flag on the Pole, the lunar alerts, the lunar unit in the books;
M30.5 the screens A4-06 (Moon, with the "after 2035" panel) and A4-07 (prospect report); M30.6 tests (B11) and the M30
report. Act I–III state never gains a key.
- **M30.1 done.** `tools/act4/moon.ts` (`npm run content:act4-moon`) writes `lunar_iv.json` and `lunar_claims_iv.json` (both copies; README section); zod in `src/content/moonContent.ts` (`MOON`). Test `act4MoonContent.test.ts`: claims identical through 2032Q2, B11's pilot band from the data, no production output possible in the act.
- (mine, reversible) Lunar values designed inside doc 33's ranges (README lists each); an unprospected claim's estimate is one orbital figure (800,000 t) for every site and grade, so it can't hint at the grade.
- **M30.2 done.** `state.act4Moon` (optional); `systems/moon.ts`: claim (1 BW, $5M, 5 PC; land within 6 q or it lapses), the scripted claims (`otherClaims`, `rivalOn`), disputes (raised when you claim a claimed site or a scripted claim arrives on yours; hold 15 PC, align with the claimant's bloc, share = half the resource, withdraw; unanswered, the first to land holds). Tests `act4Moon.test.ts`.
- (mine, reversible) Disputes are answered in the Plan phase (a card), not as live alerts; an unanswered dispute stays open until someone lands.
- **M30.3 done.** Missions (`SEND_LUNAR_MISSION`: 1 BW, 2 t at the market's delivery $/kg + $60M, lead 3–5 q seeded); the `lunar_landing` alert in its arrival quarter (commit = the market's landing rate; abort = +1 q, $10M; a landing that never came up lands at the quarter's end); success holds the claim and adds a prospect report (`lunarGeology.prospectReport`: truth × exp(N(0, sd)), 90% band; first/second/pilot sds); categories inferred → indicated → measured. `SpaceAlertCard` in Live serves orbit and lunar alerts (`spaceAlertView`). Tests in `act4Moon.test.ts`.
- **M30.4 done.** `systems/moonOps.ts`: solar arrays (output × illumination), the reactor lease (2034Q1; never in the act after the Reactor Delay; aligns you with the Accords bloc), the 1 MWe contract; the pilot (gates, $300M + 8 t, 7 q, output per doc 33 §9.4, measured after 2 run quarters, dust −3%/q unless a $5M crew); offtake (an offer a quarter once you hold a site; 20% prepaid; water delivered in signing order); production (gates; $4B drawn over 24 q; first output 20–32 q on, after 2035); the Flag on the Pole's freeze; dust-fault alerts; the lunar unit (`lunarUnitUsd`) and lunar EBITDA (no multiple) in the report and valuation; the top strip's lunar kWe. Tests `act4MoonOps.test.ts`.
- **M30.5 done.** `src/sim/moonViews.ts` (read-only: your estimates and observed output, never the grade) and `screens/Act4Moon.tsx` (re-exported by `Act4Panels`, same lazy chunk, now 23 KB): nav "Moon" (Act IV only) with the polar sites, programme cards, disputes (also on Plan), offtake, the megawatt contract, "after 2035", and the A4-07 report modal; a moon icon drawn like the orbit one. Browser-checked at 1024 px. Tests `tests/ui/act4Moon.test.tsx`; the hidden guard covers `moonViews.ts`.
- **M30.6 done.** B11 test `act4B11.test.ts`, played at the first opportunity at the de Gerlache ridge (claim + mission 2031Q1, retry on failure, solar 100 kWe and the pilot on landing, crew on): the pilot runs from 2034Q1 and processes **Rich 27.5, Patchy 13.8, Dry 4.1 t a year** by 2035Q4 (bands 15–60, 5–30, 0–8); production decided 2034Q3 produces nothing in the act; launch prices never move with the Moon.
- **M30 report.** Commits `27c8792` M30.0, `2ff1a9a` M30.1, `696e5b8` M30.2, `e7e4c99` M30.3, `4258ef0` M30.4, `6ffda7f` M30.5, M30.6 (this commit). Act I–III goldens unchanged; 1421 tests; main bundle 213.6 KB, Act4Panels 23.2 KB. See it: `npm run dev`, an Act IV game → Moon in the left nav.
- (mine, reversible) Only landed (held) sites carry resource value (an unlanded claim adds nothing, so claiming isn't free paper value); offtake buys surface water only; a solar array per site, no upgrades.
- (mine, reversible) Prospect missions are capitalised (they don't hit EBITDA); `lunarGeology` builds e^x from a series (no `Math.exp`, as the rest of the sim avoids engine-dependent maths).

### Milestone M29 (branch `m29`, from `m28`; orbit)

Split: M29.0 branch and split; M29.1 the orbit content (`launch_providers.json`, `satellites_iv.json`, `shells_iv.json`,
`insurance_iv.json`, `licences_iv.json`, `tenants_iv.json`: schemas, loader, README); M29.2 orbital blocks and their
slots (open a block: kind, size, shell, generation; the Tenant slot's offers; the Capital slot, cash in M29, M31 adds the
rest), licences and the registry; M29.3 launch manifests (bookings, deposits, slips, the dominant launcher's bumps,
failures, rebooking), insurance and the hard market, congestion, debris losses, the closed shell; M29.4 live operation
(rent and GPU-hour revenue, opex, link units and optical ground stations, fleet telemetry from `orbit_truth_iv`, useful
life), the books (optional quarter fields, orbital EBITDA at the space multiple), the storm, grounding and export-clampdown
wildcards, the orbit interrupts; M29.5 the screens (A4-03 Orbit board, A4-04 Launch manifest, A4-05 the block's deal card,
A4-08 Licences and registries, A4-02's exposure warnings) in a lazy `Act4Panels` chunk; M29.6 tests (B10's cost ratios,
B12's single-failure rule) and the M29 report. Act I–III state never gains a key (new fields optional, set in Act IV only).
- **M29.1 done.** Six orbit files (README section: values and flags; `launch_providers.json` hand-written, the rest from `tools/act4/orbit.ts`), zod-checked in `src/content/orbitContent.ts` (`ORBIT`); B10 test `act4OrbitCost.test.ts` (the data's cost ratios match the model in 2031, 2033 and 2035).
- **M27.7 byte-identity: passed.** `npm run sim -- --act2 --act3` on `main` (`209622e`) and on `m27`: all 1302 CSVs identical (`cmp`), the logs equal apart from timings (Act III: 532 runs, 0 crashed, 489 chapter, 43 game over).
- **M29.2 done.** `state.act4Orbit` (optional: blocks, licences, registry, links, insurance market); `systems/orbit.ts`: open a block (0 BW; size, shell, available generation; mass t/MW × MW × shielding), tenant offers (2 a quarter, own stream per block), sign (prepay credited) or spot, Capital = cash (1 BW), licences (1 BW + $1M, 200 MW, approval 2 q + registry + F2's +2 from 2033Q1 via `approval_extra_from`; fast track 10 PC, −1 q), registry (free before the first filing), link units, ground stations (1 BW, $15M, +3 Heat, 4 units next quarter). Tests `act4Orbit.test.ts`.
- **M29.3 done.** `systems/orbitLaunch.ts`: bookings (1 BW, 15% deposit at the locked $/kg, 2–6 q ahead, capped by the quarter's slots less your other bookings; Kestrel ≤ 250 t; sovereign launcher waits for M31); the build at END_PLAN (cash, licence room; the launch waits for it); launches at quarter end (grounding, closed SSO, slips, Pallas bumps when slots < 1,000 t, then failures by provider year), live 2 quarters after launch; insurance (young/mature rates, capacity cap, payouts, the hard market); the clampdown's ×1.15 cloud capex. Debris moved to M29.4 with live operation. Tests `act4OrbitLaunch.test.ts`.
- **M29.4 done.** `systems/orbitOps.ts`: live 2 q after launch (true life from `fleetReliability`, hidden), term ends to spot, deorbit; quarter-end revenue (shell rent, spot 80%, cloud GPU-hours × utilisation × health; links for interactive work; safe mode −3/13), ops and link rent, prepayments credited, lateness 3% of ACV a quarter, telemetry (truth + noise × √(10/MW)), GPU wear, debris by congestion, the SSO cascade, the 2035Q2 licence milestone; alerts `orbit_conjunction` (manoeuvre/accept) and `orbit_storm` (safe mode/ride; climbing blocks −40%); `SELL_ORBITAL_BLOCK`; Bandwidth +1 once live, max 9; report and valuation carry the orbital unit at the space multiple (Act I–III reports unchanged). Tests `act4OrbitOps.test.ts`.
- **M29.5 done.** `src/sim/orbitViews.ts` (read-only views, blockers called directly) and `screens/Act4Panels.tsx` (lazy chunk via `components/act4Lazy.tsx`, 13 KB): nav "Orbit" (Act IV only) with the Orbit board, deal cards, manifest, licences and registry, links; the Plan screen's exposure warnings; `OrbitAlertCard` in Live; the top strip's orbit MW. Browser-checked at 1024 px (no sideways scroll). Layout in `docs/wireframes/act4/README.md`. Test `tests/ui/act4Orbit.test.tsx`; the hidden guard covers `orbitViews.ts`.
- **M29.6 done.** B12 test `act4B12.test.ts`: in every future, shell and cloud, Pallas and Northgate, a company inside the rule loses its launch with no forced sale, no covenant breach, no game over. The exposure view now checks all three of the rule's conditions (uninsured share > 15% of equity, cash after the launch bill, leverage after the loss against the covenant limit) and the warning shows them.
- **M29 report.** Commits `f17c563` M29.0, `a27182a` M29.1, `87c1ef7` M29.2, `cc86e54` M29.3, `5937dbb` M29.4, `1456848` M29.5, M29.6 (this commit). Act I–III goldens unchanged; 1390 tests; main bundle 213.4 KB, Act4Panels 13.4 KB. M27.7's byte-identity check passed (above); the next run is at the end of the Act IV run. See it: `npm run dev`, Act IV preview (test build) or a finished Act III → Continue to Act IV → Orbit in the left nav.
- (mine, reversible) An orbit icon drawn in the design system's line style (the bundle has none); equity for the 15% rule = the latest report's valuation.
- **Open question for M31:** a carried Act III company can have little cash (the seed-3 autosave: $6.6M) against a 5 MW block's $8M deposit and $72M build: orbit needs M31's capital (export credit, project debt, co-funding, equity) to be playable; check it in M32's bots.
- (mine, reversible) Orbit revenue settles once at the quarter's end (not weekly); `conjunction_accept_hit_share: 0.25` and `sale_share_of_value: 0.8` added to the content; a live block's sale price is its last quarter's EBITDA × 4 × the space multiple × 0.8.
- (mine, reversible) Launch slips and failures resolve at the quarter's end with a log line, not as live-quarter alerts (doc 33 §14.2 lists them as interrupts); a failed block goes back to "proposed" (tenant kept) to rebuild and rebook; insurance premiums count in orbital costs (EBITDA); `tight_below_slots_t_q: 1000` added to `launch_providers.json`.
- (mine, reversible) M29 cuts the orbital tenant negotiation: offers are accepted as drawn (0 BW); a block's licence MW counts from its build start until it leaves orbit.

### Milestone M28 (branch `m28`, from `m27` at `f5cc011`; the hidden future)

Split: M28.0 branch and split (and M27.7's byte-identity result, recorded here when the runs end); M28.1 the Signals data
(`signals_iv_f1–f4.json`, generated by `tools/act4/signals.ts`: six indicators, displayed values with seeded noise, one decoy
each, triggers 2032Q2–2033Q3), schema, loader, hidden view `signalsHiddenIv.ts`; M28.2 Signals in play (Act IV's Read the
market, the Signals panel and top strip; A4-02's three MW columns and the exposure-warning slot); M28.3 the lunar-grade
draw and the three hidden files (`lunar_truth.json`, `orbit_truth_iv.json`, `reading_score_iv.json` first pass) with
their guards; M28.4 `events_iv.json` (~45 cards) in the event engine; M28.5 `wildcards_iv.json` (2 of 6 drawn; the
storm, grounding, Flag on the Pole and reactor-delay effects land with M29/M30's systems); M28.6 the M28 report.
- **M28.1 done.** `tools/act4/signals.ts` (`npm run content:act4-signals`) writes `signals_iv_f1–f4.json` (README section; designed paths, decoys, triggers in `tools/act4/futures.ts`); `SIGNAL_IDS_IV`, `signalsIvFileSchema`, `CONTENT.signalsIv` (runtime fields only); hidden view `src/content/signalsHiddenIv.ts`; guard `tests/sim/act4Hidden.test.ts`; copy test extended.
- **M28.2 done.** `act4SignalReads`, `READ_SIGNAL_IV` (`systems/signalsIv.ts`, Act III's rule: 1 BW, once a quarter), `signalsPanelIv` (Act III's shape), `act4MwColumns` (ground from the sites; orbit and Moon 0 until M29/M30); the Signals panel, Read dialog and top strip serve Act IV (short labels LQ FR OC GP DG RC; the strip adds "MW · ground / orbit / moon"). The exposure warnings (A4-02) need launches: they come with M29. Browser-checked at 1024 px.
- **M28.3 done.** Hidden files `lunar_truth.json`, `orbit_truth_iv.json`, `reading_score_iv.json` (README: designed values); `systems/lunarGeology.ts` (zod-checked, `drawLunarGrade` on substream `act4_lunar_grade`, set at the boundary as hidden `state.lunarGrade`) and `systems/fleetReliability.ts` (`trueReliability`, for M29); guards in `act4Hidden.test.ts`; F3's decoy shortened to two quarters (mine, reversible).
- **M28.4 done.** `tools/act4/events.ts` (`npm run content:act4-events`) writes `events_iv.json` + `text_iv.en.json` (a third text table `t()` merges; textKeys test covers it); `content/act4Cards.ts` (schema, opaque `a4_` ids, Act III's effect translation, no deferred effect allowed); 40 cards in Act IV's deck, filtered by `future`. The 5 lunar cards wait for M30 (mine, reversible).
- **M28.5 done.** `wildcards_iv.json` (zod, `CONTENT.wildcardsIv`), `systems/wildcardsIv.ts`: 2 of 6 drawn at the boundary (`act4Wildcards`, stream `act4_wildcards`), each fires once at its quarter's start with a news line (also in the report's events block); the Bitcoin Supercycle doubles mining revenue for 3 quarters now; the storm, grounding and export clampdown get their effects in M29, the Flag and reactor delay in M30 (`wildcardFiredIv`).
- **M28 report.** Commits `4c298dc` M28.0, `d05691b` M28.1, `f59b1be` M28.2, `c206487` M28.3, `7b15516` M28.4, `bf8c58b` + `fd34d2f` M28.5 (the fix: Act IV test files take no time limit; `bf8c58b` was pushed with that one test timing out under sim load). Act I–III goldens unchanged; 1336 tests; main bundle 211.5 KB. M27.7's `--act2 --act3` byte-identity runs are still going (started detached at M27.6's end); their result is recorded at M29.0.

## Milestone M26 (branch `m26`, from main at `f8cf61f`; cleanup)

Split (DT spec, 5 Oct 2026): M26.0 housekeeping (m25 tagged m25-done and pushed, deleted locally; it never had a remote branch; the M25 merge
recorded); M26.1 remove the unused `p0.tooltip.*` keys; M26.2 the market fix log (skipped if the project file can't be reached); M26.3 a README
in `docs/game-project-files/` on the superseded v1 market files; M26.4 the "Retrofit done" / "Refit done" lines.
- **Closed (DT, M26.0):** the reading-score card keeps its own text (`term.act3.reading.*`) and no glossary link: the glossary is open during
  play, and any entry could hint at the hidden scenario.
- **M26.1 done.** Removed from `content.en.json` all six `p0.tooltip.*` keys (difficulty, solo_vs_pool, custody, backup, preorders, hodl_sell): no code, test or tool names them, and no dynamic key builds `p0.tooltip.` (the built prefixes are `tooltip.q1.`, `tooltip.act<n>.`, `p0.event/vendor/vanity/news/chapter_title.`). Nothing kept. The pack's own copy stays in `docs/prologue-content/text_prologue.en.json`.
- **M26.2 skipped (as the spec allows).** The design project's `claude/claude_act2-content_market-fixes.md` isn't in the repo, and the build thread can't reach the project's files (a search of this Mac found no copy). To add it: put the file anywhere in the repo, or paste its text, and it gets copied unchanged to `docs/act2-content/market-fixes.md` and linked from that README (and from `docs/game-project-files/README.md`).
- **M26.3 done.** New `docs/game-project-files/README.md`: the folder is the design project's read-only snapshot; its Act II market CSVs are the superseded v1; the build loads `docs/act2-content/` (v2, test-checked copies); the fix log is `docs/act2-content/README.md` (M26.2's `market-fixes.md` wasn't reachable). Nothing deleted.
- **M26.4 done: neither of the spec's cases.** No Act II action retrofits or refits (`RETROFIT` and `REFIT_GPUS` are Act III actions, M16.3, blocked elsewhere by `error.act3_only`), and the Act III lines are already logged at completion (`density.ts › finishDowntimes` builds `` `log.${kind}_done` ``; M25's report missed the runtime-built key). So the keys stay (removing them would break Act III's log); the only change is the sound, `energized` for both (mine, reversible), tested through `finishDowntimes`. No sim, content or golden change: no sim re-run needed.
- **M26 report.** Commits `fbaf25b` M26.0, `51aea59` M26.1, `fde56b1` M26.3, `9e42b7b` M26.4, M26.2 skipped (above). No `src/sim`, `src/content`, `tools` or golden file changed against `main`: every golden unchanged, sim output byte-identical by construction (sims not re-run). 1285 → 1286 tests (133 files); lint, build pass; one key once in both tables. Main bundle 209.3 → 209.4 KB. No screen changed (the new sound plays on an existing log line), so no browser check.

## Milestone M25 (branch `m25`, from main at `ebcda47`; glossary unification, Act II data audit, the rest of the Act III polish)

Split (DT spec, 5 Oct 2026): M25.0 housekeeping (m24 tagged m24-done and deleted, it never had a remote branch; the M24 merge recorded); M25.1
one key per term for the card and the glossary, a "More in the glossary" link, hashprice's halving clause; M25.2 the Act II market data audit (report
only); M25.3 Act III sparklines and sounds / animations. UI and text only: sim output and every golden byte-identical.

- **M25.1 done.** Every term card reads the glossary's keys (`glossary_term` / `glossary_short` card / `glossary` long; the 5 overlaps merged, 21 card-only terms moved in, `term.act*` keys gone) with a "More in the glossary" link that opens Settings at the entry; hashprice halves at each halving. (mine, reversible): the reading score stays out of the glossary (open during play, its line names misleading signals), the glossary is sorted by term, and it no longer shrinks to 9 px in a short window.
- **M25.2 done (audit, nothing changed).** The build loads `src/content/market_weekly_act2.json` (0 cells off its CSV), from `market_weekly_act2.csv` = byte-identical to `docs/act2-content/market_weekly.csv`, the **fixed v2** (the fixes are in `docs/act2-content/README.md`; no `claude_act2-content_market-fixes.md` exists in the repo), not the pack's v1 `docs/game-project-files/claude_act2-content_market_weekly.csv`. Weekly v1 → v2, 222 weeks, same weeks and quarters: `eth_usd` added; **`btc_usd`** every week (2022Q4 rebuilt, up to +24.5% on 24 Oct 2022; other quarters ≤ 2.9%, the ramp to the sourced close); **`btc_difficulty_T`** 11 weeks, 2022Q4 only (−11.0% to +4.1%); **`btc_block_subsidy`** 3 weeks (1–15 Apr 2024: 3.125 → 6.25, halving moved to 22 Apr); **`btc_hashrate_EHs`** every week (derived from difficulty; largest −24.2%, 30 Mar 2026); **`btc_hashprice` (TH and PH)** every week (derived; largest +75.5%, 1 Apr 2024, $65.72 → $115.36/PH/day). Unchanged: fee share, ASIC tiers, H100 rents, `estimate`.
  Quarterly v1 → loaded: multiples removed (B6), `eth_usd_close` and the 2 estimate flags added, hashrate and hashprice derived (largest +66% 2024Q1), H200 rents = H100 × 1.2 (−16 to −30%), SOFR 16 quarters (largest −15.8% 2022Q4) and HY 12 quarters (largest −19.7% 2026Q3) from FRED. **`npm run data:real` writes only the two quarterly copies**; the weekly file was last changed 27 Sep (`d08b9b9`), before M22.
- **M25.3 done.** Signals rows get a 64×16 ink sparkline (A3-03's "past quarters only"): `signalsPanel`'s history + this quarter's displayed value, fixed 0–100 scale, none before 2027Q2. Act III sounds through `soundsFor`, existing sounds only (mine, reversible): renewal / re-let / blend / PPA signed → deal-agreed, renewal walk → walk-away, lobby landed / backfired → auction-won / -lost, covenant breach → margin-call, forced sale / called → liquidation. The `rise` animation on renewal cards, wildcard cards, a read's band and the reveal (reduced motion stops it).
- **M25 report.** Commits: `f189f59` M25.0, `c98ff58` M25.1, `a26793b` M25.2, M25.3. No `src/sim`, `src/content`, `tools` or golden file changed against `main`: sim output byte-identical by construction (sims not re-run). 1278 → 1285 tests (133 files); lint and build pass. Main bundle 208.4 → 209.3 KB; chunks: term 4.1, Act3Entry 16.0, bots 19.7, Act3Panels 30.1 → 30.7, Prologue 43.1. Browser-checked at 1024 px (no sideways scroll): the top-bar Heat card → glossary link → Settings at Community Heat; the Act III Signals panel at 2027Q2. Open: the spec's `claude_act2-content_market-fixes.md` isn't in the repo (audited against the README's fix log instead); the content pack's unused `p0.tooltip.*` texts still repeat some term lines (difficulty, solo vs pool, custody), left as content-pack data.

## Milestone M24 (branch `m24`, from main at `37a3535`; onboarding across all acts, guard-test stability)

Split (DT spec, 5 Oct 2026): M24.0 housekeeping (m23 tagged m23-done and deleted, it never had a remote branch; the M23 merge and two closed
decisions recorded); M24.1 the leak-guard flake (no wall-clock time-out decides pass/fail; 20+ runs under five-sim load; same fix on any guard
test with the pattern); M24.2 onboarding tips for the Prologue and Act I; M24.3 rich tooltips for the Prologue, Act I and Act II core terms.
UI only: sim output and every golden byte-identical.
**M24.1 done:** the cause: the leak guard waited for the lazy Act III panels with `waitFor` (1 s default), and most sections weren't waited for at all
(checked half-rendered). Fix: `preloadAct3Panels()` (act3Lazy.tsx) in the test's `beforeAll`, so every screen is complete on its first render; no
`waitFor`; the guard tests take no time limit (0 = none). Under five parallel full sims (load 7–9 on 8 cores): 20 of 20 consecutive runs pass, and
the full suite passes (load 38). Other guard tests checked: the D15 guard (same file, synchronous) and the hidden-file guard (a text grep) had no
such pattern; nothing else to change.
**M24.2 done:** `Tip act={0|1}` (dismissed as `act0.<id>` / `act1.<id>`; the Settings reset covers every act). Prologue: rig, household (Plan),
mining (Plan › Solo or pool), coins (Coins screen), machines (Machines screen), live (Live screen). Act I (only when `act === 1`, as the panels are
shared with Act II): todo, market, fleet, sell (Plan), live (Live), report (Report › Notes). Tips sit at the top of their panel (mine). 1269 tests.
**M24.3 done:** `Term act={0|1|2}` (keys `term.act<n>.<id>`). Prologue: difficulty (top bar), solo_pool (Solo or pool), patience (Parents' patience),
wallet_exchange (Where your coins are), selling_limit (Coins). Act I: bandwidth, treasury, heat, valuation (top bar, so also in Acts II–III), hashprice
(Market), hodl (Sell). Act II: rating, backlog (top bar, Acts II–III), leverage (Capital › Debt / EBITDA), ddtl (Capital debt row), mw_uses (Where your
megawatts go). Skipped: J/TH, fee share, subsidy (not on any screen), halving (an event card only). 1271 tests.
**M24 report (5 Oct 2026):** commits `e3000e5` `26ce54f` `d48d7c2` + M24.3; no file under src/sim, src/content, tools or tests/golden changed (UI and
text only), so sim output and every golden are byte-identical by construction; browser at 1024 px: every touched screen (Prologue Plan / Coins /
Machines / Live, Act I Plan / Live / Report, Act II Plan / Capital) no sideways scroll, nothing outside its panel. Main 208.4 KB; term 3.7 KB (shared
chunk); Prologue 43.1; Act3Panels 30.1; Act3Entry 16.0; bots 19.7.

## Milestone M23 (branch `m23`, from main at `6c623d3`; rate robustness and Act III clarity polish)

Split (DT spec, 5 Oct 2026): M23.0 housekeeping (m22 tagged m22-done and deleted; it never had a remote branch; this note records the M22
merge); M23.1 SOFR 2026Q4 = the last FRED observation carried forward, the seam into 2027Q1, the sim vs M22; M23.2 the implied miner premium
table (doc 18 §15, report only); M23.3 the robustness sweep (SOFR ±100 bp in Act II, Act III scenario HY ±150 bp; report only, no retuning,
output outside committed files); M23.4 Act III clarity: the renewal-wall chart, rich tooltips, onboarding tips with a setting to show them again.
**M23.1 done:** `carryForward` in tools/data/real-market.ts: SOFR 2026Q4 = 3.87% (2026-10-01), still `sofr_estimate`; seam 2026Q4 → 2027Q1 +8 to +13 bp
(was −5 to 0). **M23.2:** the premium table in doc 18 §15 (+0.4…+1.5 pts through 2024, ≈ 0 in 2025, 2025Q2 −0.07, 2026Q4 −0.17). **M23.3a:**
knobs SOFR2 / HY3 and `--knobs` on the full sim (process only). **M23.4 done:** `renewalWallView` + the wall above Contracts (A3-04); `Term`
(fixed-position hover/focus card, 11 terms); `Tip act={3}` (6 tips, dismissed as `act3.<id>`); Settings › Onboarding tips › Show them again
(`resetDismissedTips`). Mine: GPU contracts count their project's MW; holdovers count this quarter; tips go below title rows; the reading-score
term id is `reading` (the hidden-file grep forbids `reading_score` in UI files). Act3Panels 28.2 → 30.1 KB. 1265 tests.

**M23.3 sweep (report only; 5 full `--act2 --act3` runs, output in the session scratchpad, nothing committed changed):**
- Baseline (M23.1 only) vs M22: every summary table identical; the only CSV change is 19 rows of `act2-valuation.csv` at 2026Q4 (debt-carrying
  bots end ~$0.13M richer: 2026Q4 SOFR 4.00 → 3.87%).

| Run | Game overs (S0/S1/S2/S3 = total) | C1 S0 / S1 / S2 / S3 | Covenant breaches S0 / S1 / S2 / S3 | Act II §5 |
|---|---|---|---|---|
| baseline | 5 / 17 / 15 / 6 = 43 | 1.01 / 0.84 / 1.80 / 0.97 PASS | 5 / 24 / 20 / 9 | 9 PASS, 4 MISS (as M22) |
| SOFR −100 bp (Act II) | 5 / 18 / 15 / 6 = 44 | 1.00 / 0.83 / 1.81 / 0.96 PASS | 6 / 24 / 21 / 8 | unchanged |
| SOFR +100 bp (Act II) | 5 / 19 / 15 / 6 = 45 | 1.02 / 0.85 / 1.77 / 1.04 PASS | 5 / 27 / 18 / 10 | unchanged |
| HY −150 bp (Act III) | 5 / 18 / 15 / 6 = 44 | 1.01 / 0.84 / 1.80 / 0.97 PASS | 5 / 24 / 20 / 8 | unchanged |
| HY +150 bp (Act III) | 5 / 17 / 15 / 6 = 43 | 1.01 / 0.84 / 1.80 / 0.97 PASS | 5 / 24 / 20 / 8 | unchanged |

Margins (baseline value · threshold · flipped by any run?): C1 "S1 lowest": S1 0.84 vs next-lowest S3 0.97 (margin 0.13; smallest 0.13
at SOFR −100) · no. §5 #0 gap 0.44 (≥ 0) · no; #1 17/42 · no; #3 peak $4.6B (band $4–8B) · no; #5 texas-ipo $300.4M ($100–400M) · no; #8 IRR gap
35 pts (≥ 30) · no; #9/#10 EV/MW in band · no; #11 3/4 · no; the accepted MISSes (#2, #4, #12) and #6 stay MISS. **S3:** 0.96–1.04× across the runs:
the most rate-sensitive scenario (it crosses 1.0× at SOFR +100), but always ≥ 0.12 above S1. The Act III HY knob barely moves anything: bots
rarely sign new project debt in Act III, the only thing priced on it.

## Milestone M22 (branch `m22`, from main at `48d16b4` plus the M21 notes fix `d7bab88`; real market data)

Split (DT spec, 5 Oct 2026): M22.0 housekeeping (m21 / m21.6 tagged and deleted; the "not merged" line fixed: `d7bab88`, made on the
branch first called m21.7, renamed m22, mine); M22.1 SOFR and the HY spread from FRED by a committed script over committed raw downloads; M22.2
the sim against the M21 baseline, no retuning; M22.3 the goldens the data touches.
**M22.1 done:** `tools/data/real-market.ts` (`npm run data:real`) + `tools/data/raw/fred_SOFR.csv`, `fred_BAMLH0A0HYM2.csv` (retrieved 5 Oct 2026) +
`tools/data/README.md`. SOFR real 2022Q4–2026Q3, HY 2023Q4–2026Q3 (FRED shows 3 years of the ICE series); a quarter is real only if fully covered
(mine); per-series flags `sofr_estimate` / `hy_spread_estimate` (schema); DDTL spread and ASIC tiers stay estimates (Luxor: Premium / paid API, no
workaround). Doc 18 §15 and the act2-content README updated. Two tests that pinned old SOFR values updated; new test recomputes from raw. 1257 tests.
**M22.2 (sim vs M21, no retuning):** Act I CSVs identical (1301 files); only `act2-valuation.csv` changed. Act III game overs 43 → 43 (s0 4 → 5, s1
18 → 17); C1 1.01/0.84/1.80/1.01× → 1.01/0.84/1.80/**0.97×** (still PASS); covenant s0 breaches in 4 → 5 runs (1 called), s1 26 → 24; Act II
texas-capital 2030Q4 median $1090.5M → $1052.0M, overleveraged 2026Q4 debt cost +$10M. Cause: SOFR alone (Act II prices equipment loans and DDTLs
at SOFR + spread; the HY spread is read only in Act III, from the unchanged scenario files): lower 2022Q4–23Q3, higher 2025Q3–Q4 shift the
debt-carrying bots' 2026Q4 cash and debt slightly, which moves marginal Act III runs. **M22.3:** no golden changed (Act I / prologue never read
these rates; the act3-s* companies hold no debt; Act II has no golden).

## Milestone M21 (branch `m21`, from `main` at `dceb047`; the design thread's answers after M20)

Split (run in one go): M21.0 A1 the M19 hire renamed Mae Holloway; A2 the deal card's "Leaves you $X" line and the cash check; M21.1 layout
from 1024 px (no sideways page scroll; the Plan screen reflows below 1280; the Act III chapter stats wrap); M21.2 the full Heat breakdown
(sums to the value; the thresholds line); M21.3 Power and Capital slot log lines; M21.4 CLAUDE.md brought up to date; M21.5 tags m10-done …
m20-done pushed, the merged remote branches m10 … m20 deleted (owner's go-ahead in the spec). Invariants: goldens and `--act2 --act3`
byte-identical (no rule changes), main bundle under 500 KB.
**M21.0 done:** hire renamed Mae Holloway; the deal card's "Leaves you $X" (loss colour below 0; the existing no-cash blocker greys Sign). Bug found and
fixed: en.json had repeated keys, the later silently winning: `ui.deal.title` (M19's card overwrote the Deal builder's title) → card keys now
`ui.cdeal.*`; `ui.plan.fleet` (the "Sell or repair" row showed the distressed-fleet text) → `ui.plan.distressed_fleet`; `error.no_renewal` (Act III
tenant renewals showed the power-contract text) → `error.no_tenant_renewal`. New test: no repeated keys in either string table. Goldens unchanged.
**M21.1 done (CSS only, game.css):** screen min-width 1280 → 1024; below 1280 the page scrolls down (not across), the Plan to-do spans the top with the
two side columns under it, the top bar packs tighter, sections / Capital / report / tiles / racks / prologue Plan reflow; every width: a panel holding a
too-wide table scrolls it (`:has`), chapter-report stat rows and rival fates wrap, the Act III intro's lines wrap. Browser sweep (dev) at 1024 / 1280 /
1440 over every screen and section of every act: no sideways page scroll, nothing truncated; only the fleet table scrolls inside its panel.
**M21.2 done:** `heatParts` (heat.ts, read-only) + `heatBreakdownView`; `components/heatBreakdown.tsx`: the list on the Sites screen (under each meter)
and in the Community dialog (replacing M19's two lines), the Plan meter's hover tooltip (mine: a tooltip, so the Plan stays compact); region shown as
"Region (×m)" with its ± effect; gas and the hire listed at face value (the region part carries their scaling, mine). Test: parts sum to the pre-clamp
Heat in Acts I–III, order, clamp, thresholds, read-only. Goldens unchanged.
**M21.3 done:** the slot lines already existed (M8.7d: `log.project_power_*`, `log.project_capital_*`); two gaps fixed: `log.project_power_nuclear` was
missing from the report's milestone keys, and a rack card's pilot (born live) logged neither slot, now both. Goldens unchanged (no golden plays a rack card).
**M21.4 done:** CLAUDE.md rewritten: all four acts' status (Act IV not designed), the current docs (27 v1.2, 28, 30, act3-content README, dev-notes),
the Act III rules (hidden files, leak guard, D15 guard, test-only forcing / quick starts, the gate test), the standing invariants, the 1024 px layout
rule, one-key-once text rule, and branches (one per milestone from main; the owner merges; done branches tagged `m<n>-done`).
**M21.5 done:** tags m11-done … m20-done (annotated, at each branch tip, verified on the remote) pushed; remote branches m11 … m20 deleted (each
fully merged into main first). m10 skipped: no branch exists locally or remotely. Left alone (not in the spec): remote `m9` and `prologue`, and the
local copies of m11 … m20.
**M21 report (5 Oct 2026):** commits `79d07a7` `5906943` `8ef6e79` `1e41f00` `a23993a` `35dd8c4`; tests 1247 → 1254; goldens all unchanged; `--act2
--act3`: all 1302 CSVs and the log byte-identical to M20 (timings aside; 43 game overs; C1 1.01/0.84/1.80/1.01×); main bundle 207 KB. Branch m21
not pushed (owner's call). Questions for the design thread: in the final report.
**M21.6 (housekeeping, DT 5 Oct 2026; branch `m21.6` from main):** (1) remote m9 and prologue both fully merged: tagged m9-done (42bdec2) and
prologue-done (fc8ce72), pushed, verified, remote branches deleted: the remote now holds only main. (2) local m11–m20 and prologue deleted with
`git branch -d` after their remote tags checked (local prologue was one commit, 6131d17, past its tag; that commit is in main, so -d allowed it).
(3) m10-done = 5af442f "M10.6: M10 report", the last of M10.1–M10.6 (the next commit, 96c1adf, is M11 groundwork), pushed. (4) Top bar at 1024:
it did switch during play (Act I 56 → 108 ↔ 118 px); below 1280 it now keeps room for two lines (min-height 118 px, CSS only): 79 Plan quarters
of Acts I–III measured, all 118 px. Tests 1254, lint and build pass; `--act2 --act3` byte-identical to M21 (all 1302 CSVs and the log).

## Milestone M20 (branch `m20`, from `m19` at `a4dd432`, since M19 isn't merged yet; the Act III public release)

Owner, 4 Oct 2026: release without waiting for the playtest; run unattended after M19. Split by the design thread: M20.1 D15 resolved by the
owner's decision (both s1 fates cleared, unchanged); M20.2 open the gate (production gets Act III; forcing and quick starts stay test-only;
the save guard and the gate test redefined); M20.3 checks (goldens, `--act2 --act3`, bundle sizes, a production browser check).
**M20.1 done:** `d15_cleared` + `d15_note` on s1 core_scientific and coreweave (both copies; fates unchanged; `d15_review` kept); the reveal's
"Rival fates are scenario illustrations, not predictions." line; `d15Withheld` guard kept and tested; a content test (every flagged fate or card is
cleared). **Golden act3-s1:** only its two rival fates' `withheld` true → false (the expected change). act3-content README logs it.
**M20.2 done:** `screens/Act3Entry.tsx` (lazy, every build: presets, Scenario Mode, Continue to Act III, intro, chapter report); Act3Preview.tsx keeps
only the quick starts (inline mode check); `act3PresetStart.ts` (the bots chunk ships: presets play them, mine); forcing + its top-bar tag inline-gated
(FORCING_MARKER); `act3QuickStart` save mark; save guard refuses forced/quick-start saves only; "Continue to Act III" in every build (mine); gate test
redefined; the toAct3 grep test keeps "one entry" without the gate (mine). Production: main 206 KB, Act3Entry 15.9, Act3Panels 28.2, bots 19.7.
**M20.3 done:** save/title labels "Act III" (no "(test)"); `.claude/launch.json` prod-preview (port 4174). Browser (production preview, `?scenario=s1`
ignored): New career → Start at Act III → Good → intro → 2 quarters → reload → autosave loads (Q3 2027); no forcing tag, no quick starts, no errors.
Test build: GPU-heavy quick start forced to s1, played to the end: both cleared s1 fates in full under the illustration line, nothing withheld.

**M19 + M20 report (4 Oct 2026, run unattended):** commits M19 `1e1fc84` `42fc002` `a4dd432`; M20 `83ffc65` `7b96386` `f4ba669`; branches m19, m20
pushed, main untouched. Tests 1229 → 1247, lint and build pass. Invariants: goldens unchanged except act3-s1's two `withheld` flags (M20.1, expected);
`--act2 --act3` on m19 and m20: all 1302 CSVs byte-identical to M18.13 and the log identical but for timings (43 game overs, C1 1.01/0.84/1.80/1.01×);
leak guard and hidden-file tests unchanged. "Mine" decisions: in the M19.1–M20.3 lines above. Questions for the design thread: in the final report.
Merge (owner, when approved; m20 contains m19, both fast-forward): `git checkout main`, `git merge --ff-only m19`, `git merge --ff-only m20`,
`git push origin main`, `git checkout m20`.

## Milestone M10: the Act III walking skeleton — DONE (branch `m10`; the step log is in the archive › "Milestone M10")

Plumbing only (`isActIII` / `inActIII`, save version 4, the timeline extended past 2026Q4); the stub content it used was replaced by
the real scenario files in M11.3.

## Milestone M18 close-out (branch `m18`; Act III step 7 and the balance pass) — DONE

**Act III balance pass closed (design thread, 4 Oct 2026).** The M15–M18 step logs are in the archive › "Milestones M15–M18"; every
change from M11–M18.13 is recorded in doc 27 v1.2 §17. M18 built: the corporate and standby facilities, the presets (real Act II
companies), A3-12 + Scenario Mode, the archetypes and the anchor harness (`--act3-anchors`), the tuning pass, then six rounds of design-thread
answers (M18.8–M18.13): carried-lease reopeners, S3's rebound, GPU contract walks and the lender cure, the contract-rate multiplier, the
leverage covenant.

**Final values** (`BALANCE.act3` and the content files):
- GPU contracts signed in Act III: × the contract-rate multiplier, glide 1.00 / 0.90 / 0.80 (2027Q1–Q3), then 0.55; Act II contracts
  renewing in Act III take it on their base. Contracted payback at 2027Q3: B200 2.03–2.12 yr, Rubin 2.38–2.52, Rubin Ultra 2.32–2.33.
- Rubin rents × 0.65, Rubin Ultra × 0.60 (K1); the Rubin Ultra rack +$4M in every quarter, all scenarios (2027Q3 $19M).
- Leverage covenant: LTV = debt ÷ the quarter report's valuation; limit max(75%, entry LTV + 5 points); a breach bars new debt and sweeps
  50% of (EBITDA − interest) into debt, highest rate first; cure to the limit − 10 points by the end of the 2nd quarter after; missed:
  forced sales × 0.85 (shells, then clouds/pilots at GPU residual), then the lenders call the rest, then the rescue and game-over rules.
- Standby liquidity facility: 1 Bandwidth, rating BB− or better, 20% of valuation capped at $500M, 1% upfront, 0.5% a year on the
  undrawn part, draws at SOFR + 350 bp, available 8 quarters, each draw an 8-quarter bullet.
- GPU contract walk: AI-lab / neocloud contracts in distress ≥ 2 quarters walk only when spot < half their pay; a walk on a DDTL project
  opens a 2-quarter lender cure. Carried Act II leases are reopenable from 12 quarters served; tenant reopeners on them only by AI labs and
  neoclouds at Band high < 0.75. S3 rents rebound from 2029Q1. Presets: Good $412.6M, Great ~$2.7B, Lifeline $155.7M.

**Final anchor table** (M18.13c, 30 seeds; Good preset shell-capital s9 and the GPU-heavy overleveraged s1):

| Anchor | Result | Numbers |
|---|---|---|
| A1 (Good, S1) hedged ≥ ignorer − 0.05 | PASS | 0.91 vs 0.85 (ignorer breached 30/30, all cured) |
| A1-gpu (GPU-heavy, S1) | information (DT) | 0.50 vs 0.98; no breach |
| A2 GPU-heavy ignorer punished in S1 | information (DT) | 0.98, 0 distress sales |
| A3 S2 long-locked ≥ 1.15 × passive | PASS | 2.41 vs 1.15 × 1.76 |
| A4 S3 flexible ≥ long-locked | retired (M18.9) | — |
| A5 S0 every archetype ≥ 0.85 | PASS | lowest over-reactor 0.94 |
| A6 over-reactor ≤ 0.97 × passive (S0–S2) | PASS | 0.94 / 0.74 / 1.63 vs 1.05 / 0.89 / 1.71 |
| A7 Good passive: no game over | PASS | 0 in every scenario |
| F7 hedged S1 ≥ 0.75 | PASS | 0.91 |
| C1 S1 lowest (population) | PASS | 1.01 / 0.84 / 1.80 / 1.01× |
| C2 Rubin, Ultra ≥ 2.3 yr and ≥ B200 (contracted) | PASS | see above |
| C3 S2 signing ahead; S3 within ±2% | PASS | 1.787 vs 1.759; 0.930 vs 0.922 |

Full sim (532 Act III runs, 0 crashes): 43 game overs (S1 18, S3 6); covenant breaches S0 5, S1 26, S2 20, S3 9; reading medians
75 / 50 / 56 / 50; the oracle unchanged; Act I/II byte-identical.

## Milestone M14 (branch `m14`, from `main` at `e364d54`; Act III scoring, doc 27 D14 + §5) — DONE

Split by the design thread, run in one go: `e191adf` docs (M10–M12 step logs to the archive); M14.1 the reading_score content file and
its hidden-file rule; M14.2 the move log (`act3Moves`); M14.3 the reading score (`readingScore.ts`); M14.4 the reveal record and the
chapter report; M14.5 the sim proof. Paths: the spec's `src/systems/` is `src/sim/systems/` in this repo (mine).

**M14.1 done:** `docs/act3-content/reading_score.json` committed and copied byte-identically to `src/content/` (content test); grep tests: the file is imported only by `sim/systems/readingScore.ts`, that only by `act3End.ts`, and `tools/bots.ts` imports no hidden view or reading score. en.json `act3.reveal.title.*` (five bands), `.description`, `.wording.high/mid/low`; `BALANCE.act3.readingTitles` (band minimums) and `readingWording` (DT: high ≥ 70, mid 40–69). 988 tests.

**M14.2 done (the move log):** `state.act3Moves` ({q, kind}[]; `enterAct3` starts it, the save loader defaults an old Act III save to []); `sim/systems/act3Moves.ts` (kinds, `MOVE_SIGN`, `moveOf`, `cardChoiceMove`), hooked once in `applyAction` after an action applies in Act III. Each Act III card choice carries `act3Effect` (only the effect keys the log reads, so a deferred choice keeps its values) and `act3Distressed` (s1_c6). Mine (questions in the M14 report): ASIC buys/sales neutral, GPU rigs count; a build start that draws debt logs `project_commit` only; card effects `gpu_rack` → gpu_buy, `capex_mw` → project_commit, `mw` > 0 → site_buy (distressed_buy for s1_c6), `debt_maturity_years`, retrofit and power options neutral; a deferred card choice is logged by its authored effect. Goldens: act3-s* gain only `act3Moves` (s0 card_lengthen q5; s1 none; s2 card_lengthen q6; s3 card_shorten q4, q7, project_commit q12), regenerated here and again in M14.4 (each commit must pass). 1005 tests.

**M14.3 done (the reading score):** `sim/systems/readingScore.ts` (hidden; pure): `computeReading(moves, scenario, lastQ)` → {score | null, base, penalty, perQuarter} per the file's formula; `markMoves` (✓ / ✗ / decoy / – per move, for M14.4) and `oracleLogs` (passive, perfect, opposite logs per scenario, for tools and tests). Every value in the spec's table reproduced (`tests/sim/act3ReadingScore.test.ts`). 1016 tests.

**M14.4 done (the reveal record and the chapter report):** `act3End` gains `reading` {score, base, penalty, perQuarter}, `triggerQ`, `careerTitleId` (Act II's valuation bands on the last valuation; "bust" at a game over) and `readingTitleId`; it is now also built at an Act III game over (`quarter.ts`), counting the reading to that quarter. `act3Outcome` adds the wording (DT thresholds) and the end quarter; `act3RevealDetails` adds each move with its quarter, timing against the trigger and its mark. The reveal (`Act3Reveal.tsx`) gains the bare-bones reading panel: score (or "—"), reading title, wording, description, career title, growth multiple (one decimal), "Survived to 2030Q4" / "Out of the game — {quarter}", the moves timeline (✓ / ✗ / ✗ reacted to the decoy / –), the decoy penalty line, or "You made no big moves." Mine: a move in the decoy window with the non-decoy sign where the ideal is 0 is "–". **Goldens:** the four act3-s* gain only the reading block, `triggerQ` and the two titles (s0 76 Signal Reader, s1 50 Steady Hand, s2 56 Steady Hand, s3 53 Steady Hand; career Contender in all; no penalty). The timeline test now expects the record's new keys and a reveal at a game over. Seen in the browser (dev): GPU-heavy on s1, reading 50 Steady Hand, no moves, the two D15 fates withheld. 1019 tests.

**M14.5 done (the sim proof):** `npm run sim -- --act3` prints the reading score per scenario × bot and per scenario (median, p10, p90, share null, median moves) and an oracle row (tools/ reads `readingScore.ts`: passive and perfect logs per scenario), which the sim asserts equals the M14.3 table (it does: passive 78/50/50/50, perfect 78/100/100/100). By scenario (all bots; median / p10 / p90 / null / median moves): s0 76 / 66 / 76 / 0% / 1; s1 50 / 24 / 50 / 1% / 1; s2 56 / 56 / 72 / 0% / 3; s3 53 / 11 / 53 / 0% / 5 (the bot-by-bot table is in the M14 report). The `--act2` output and all CSVs are identical to M13's; the existing `--act3` tables are unchanged. No balance targets (step 7). **M14 done:** 986 → 1019 tests; Act I, prologue and Act II goldens and `--act2` byte-identical; the act3-s* goldens changed only by `act3Moves` (M14.2) and the reading block, `triggerQ` and the titles (M14.4), regenerated in those two commits (the spec asked for one regeneration; each commit has to pass, so twice, each diff limited to the new fields).

## Milestone M13 (branch `m13`, from `m12` at `5add923`; a hidden route into Act III with bare-bones panels) — DONE

**The M13 report in short (what the owner can test now):** in `npm run dev` or the staging build, title → New career → "Act III
preview (test build)" → Growth company / GPU-heavy / Shell landlord (a bot plays 2017–2026 in about a second) → the Act III intro →
16 quarters with Signals, Renewals due, Contracts (reopen, blend-and-extend), idled rigs, greyed card choices and the report's Act III
block → the chapter report with the scenario reveal. Or finish your own Act II game and press "Continue to Act III (test build)".
`?scenario=s0…s3` forces a scenario (tagged in the top bar; leave it off for real playtests). From the iPad on the same Wi-Fi:
`npm run staging:build`, then `npm run staging -- --host`, open the printed address. Nothing of this is in the GitHub Pages build.
**Known gaps (M13 answer 6, left out on purpose):** layout polish; the renewal-wall chart, sparklines, the reveal timeline; rich
tooltips, onboarding tips, sounds, animations; A3-07 racks, A3-08 nuclear, A3-09 Government (steps 5–6); A3-12 presets and Scenario
Mode; the reading score. Also: the automated DOM click-through (STOPPED: needs a dependency).

Split by the design thread, run back to back (owner): `19ce271` docs commit (wireframes A3-01…A3-12, design-system grid theme, doc 30);
M13.1 the gate, the entry and the intro; M13.2 the panels; M13.3 the chapter report with the reveal.

**M13.1 done (the gate, the entry, the intro):** `src/platform/preview.ts`: `ACT3_PREVIEW = import.meta.env.MODE !== 'production'` (on in `npm run dev` and the staging build, off in `npm run build`), the save guard `guardTestBuildSave` (saves.ts decode/import/slots and `g2g.load`: an act-3 save outside a test build → "This save comes from a test build and can't be loaded here."), `forcedScenario` (`?scenario=s0…s3`, test builds only; `toAct3(…, {forced})` marks `scenarioForced`, and the top bar shows "Scenario forced (test)"). The app loads `screens/Act3Preview.tsx` (quick start, "Continue to Act III (test build)" on the Act II chapter report, the A3-01 intro, a stub chapter screen) with a dynamic import behind `import.meta.env.MODE !== 'production'` written inline in app.tsx (mine: reading the ACT3_PREVIEW constant left an orphan chunk in dist/), so production has no preview chunk, no bots and no marker: **the build check is a test** (`tests/ui/act3Gate.test.ts` builds production and staging into temp folders and greps for `PREVIEW_MARKER`). Quick starts (`src/ui/act3QuickStart.ts`): Growth = sign-then-raise 1, GPU-heavy = overleveraged 1, **Shell landlord = texas-shell seed 3** (mine, reversible: no shell-climb or texas-shell seed 1 has a shell lease ending in 2027–30; seed 3 is the lowest that does, 2030Q1); each plays in under a second. Grid theme ported; Act III uses it. Act II's panels now show in Act III (Plan MW panel, hosting/fleet/scouting rows, Capital, regions, league scale, the Projects nav: `inAct2Rules`); two crashes fixed on the way (`averagePrice` and `recentMarket` read Act I/II's weekly market only; now through `marketWeek` with the scenario), and the last report says "Finish Act III →". A quick-start GPU-heavy company played 2027Q1 → 2030Q4 in the browser (dev) with no error. **How to run it:** `npm run dev` → title → New career → "Act III preview (test build)"; or `npm run staging:build` then `npm run staging` → http://localhost:4173; from the iPad on the same Wi-Fi: `npm run staging -- --host`, open the address it prints. Add `?scenario=s2` to the address to force a scenario (leave it off for real playtests). The act3Signals grep test now allows exactly one `toAct3` call in src/ui/app.tsx, inside the gated `enterAct3`. Goldens unchanged. 970 tests.

**M13.2 done (the panels):** `src/ui/screens/Act3Panels.tsx`, loaded on demand by `components/act3Lazy.tsx` behind the same inline gate (so production carries no Act III panel code: the build test checks it, and the main bundle stays at 488 KB, under the 500 KB warning). Top bar: the Signals strip (six short labels, value, ▲ ▶ ▼ in ink) and "Contracts due: N in next 4 Q". Plan: **Renewals due** (one card per renewal: offer with Accept · Default / Counter 2 BW (the negotiation opens inside the card; `dealNegotiationView` and `NegotiationPanel` now handle the renewal side: a multiple of today's rent, negative asks allowed) / Re-let 1 BW or "Let it go to spot"; walked state with "Re-let · automatic · 0 BW · Default" and **"Keep the MW empty"**), and the **Signals panel** (six rows with a 0–100 bar, a read range as a band with its note, "Read the market · 1 BW" opening a radio chooser, "Your reads"); Act I's Read the market row is hidden in Act III. New nav section **Contracts** (A3-04 table; "Reopen · 1 BW · fee $X" in the row when eligible, with its reason; blend-and-extend offers below with Accept / Ignore · Default). Sites & Fleet: "N MW idle" with Turn back on. Event cards: blocked choices greyed with the reason. Report: "Contracts and events this quarter" (the quarter's renewal, reopener, blend and card log lines) and "Act III · the quarter's shape". **New engine action `RENEWAL_KEEP_EMPTY`** (0 BW, a walked shell only, once; one-way, mine): the tenant leaves at quarter end, no re-let RFP; fresh offers come next quarter. Selectors: `renewalsDue` gains walkChance, mw/gpus, reletEstimateUsd, startsQuarter, keepEmpty; `contractCalendar` gains reopenFeeUsd/reopenBlocked; new `act3ReportLines`, `contractsDueSoon`, `idleRigsView`, `blockedCardChoices`. `averagePrice` takes the state (src/ui no longer reads `scenarioId` anywhere). Tests (`tests/ui/act3Panels.test.ts`): the smoke path at action level (GPU-heavy → Act III → read a signal → accept a renewal → end the quarter → the report lists it), every button's action from its panel's view, keep-empty, a source check that each button sends its action, and a grep over src/ui (no scenarioId, scenario name, hidden view, act3End, role, decoy or phase words; the M13.3 reveal file is the only exception). Played in the browser (dev): GPU-heavy quick start, read Lender Spreads, countered and took Meridian Labs' GPU renewal in 2027Q2, report line shown, Contracts section. Goldens unchanged. 979+ tests.

**M13.3 done (the chapter report with the reveal):** `src/ui/screens/Act3Reveal.tsx` (in the test-build preview module; the one UI file allowed to show the scenario, grep-tested): "The market you played was: {name}", the title, what happened (the trigger quarter and the trigger card's title), the false alarm (decoy indicator, its window, its reason and tell), your signal reads, net worth at 2030Q4 vs the Act III entry (the growth multiple), valuation entry → end, survived or not, the rivals' fates with **D15-flagged fates shown as "Fate withheld pending review"**, "Reading score: coming in a later build", Back to title. The figures come from the new `act3Outcome(state)` and `act3RevealDetails(state)` in `sim/systems/act3End.ts` (still the only sim file reading the hidden views), worked out when shown so the stored `act3End` record and the act3-s* goldens don't change; the hidden signals view gained the decoy's `reason` and `tell`. Mine, reversible: the title uses Act II's bands on the 2030Q4 valuation (Act II's bands are by valuation, so "by growth" waits for D14's scoring); a game over in Act III also shows the reveal (built when shown), marked "Out of the game". Tests (`tests/ui/act3Reveal.test.ts`): a quick-start company played to 2030Q4 by its bot on each forced scenario, the reveal's figures and texts, a game over, D15 withholding, only the reveal file reads act3End. Seen in the browser (dev): a GPU-heavy company on Lift-Off (s2), 2.06× growth. 986 tests. **End of M13:** every golden unchanged through M13; `npm run sim -- --act2 --act3` output (CSVs and tables) identical to M12.4's apart from timings.

## Milestones M11 and M12 (DONE, merged into `main` with M13 at `e364d54`; the step logs are in the archive)

M11 built the Act III scenario engine (four scenarios s0–s3, Signals, the 16-quarter timeline and `act3End`, the scenario market
behind `quarterInputs`, the Act II → III boundary `enterAct3`, Act II's systems on the scenario market via `inAct2Rules`, rivals and
league, the 37 scenario cards). M12 built the contract calendar, renewals (walk roll, offers, accept / counter / re-let), the reopener,
the step-4 card effects (`systems/cardContracts.ts`) and blend-and-extend. Key rules still in force are listed in the archive per step.


## Milestones M8, M8.7, M8.8, M8.9 and M9 (finished; the step logs are in the archive)

M8 finished Act II (the report additions, the GPU failure wave, the know-how display, measurement decisions, the hosting head start,
the sell-as-mined bust). M8.7 did the follow-ups (EV/MW band $18–28M, the hosting bot's cost reserve, slot log lines, one report panel,
the bridge payment on the Plan and Capital screens). M8.8 audited what Act III could carry over (`docs/act3-carryover-audit.md`). M8.9
recorded the design thread's answers to that audit. **M9** (branch `m9`, in `main`): M9.0 the runway look-ahead (one figure on the
Dashboard, Plan and Capital screens; the rating rule unchanged; see `docs/act3-carryover-audit.md` and the archive for the sim numbers);
M9.1 the `inActII` / `isActIIQuarter` refactor (a pure refactor: the Act II sim's output was byte-identical before and after); M9.2 the
sim's great-path runway check now uses the same `runway()` function as the game, and the runway definition is in scope 0.2 §2.2 (both
copies). All design decisions from the M9.1 audit (7 questions) are accepted; see the archive for the full list.
