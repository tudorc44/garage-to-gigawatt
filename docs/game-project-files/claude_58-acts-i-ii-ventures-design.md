# 58: Ventures in Acts I-II: an alternative to GPU Rig Gen 2, and life after the Merge. v1.1, 16 Oct 2026 (v0.2 14 Oct; v1.0 takes in doc 60; §10 after M77)

*Design thread. From the owner's Act II playthrough on staging (14 Oct 2026). v1.0 takes in the research pack, doc 60 (`claude/60-acts-i-ii-ventures-research.md`, data in `claude/acts-i-ii-ventures-content/research/`), and the owner's answers of 14 and 16 Oct. Built on Act I as built (`src/content/machines.json` gpu_gen2) and on Act IV's accelerator venture (doc 49, doc 43 §0.12), whose mechanics it reuses. Doc 60 wins over this doc on any fact; this doc decides the design.*

**How to read this doc.** Grades as doc 36: [A] primary, [B] reputable reporting, [C] estimate, [D] designed. ⚙ = designed number, expected to change in the balance pass. (O) owner decision, (DT) design thread.

## 0. What changed from v0.2 (doc 60 against doc 58)
| Item | v0.2 | v1.0 | Basis |
|---|---|---|---|
| Gen 2 price 2021Q2 | $7,500 | $8,300 (base game) | doc 60 §3: 6 x ~$1,228 eBay avg + $1,000 platform [B-derived] |
| Gen 2 price 2021Q3 / 2022Q2 | $6,800 / $3,900 | $6,600 / $4,200 | same method (Aug-Sep 2021 ~$930; May 2022 $579 + $700 platform) |
| Gen 2 wait 2021Q1-Q3 | fixed 1 quarter | a choice: street price now, or queue at retail (§1.2) | doc 60: wait unsourced; cards always on eBay at a premium |
| Venture offer | 2019Q4-2020Q2 | 2020Q2-2020Q4 | doc 60 design implication 1 |
| Pitched milestones | tape-out 2020Q2, first units 2020Q4, volume 2021Q2 | tape-out 2021Q2, first units 2021Q4, volume 2022Q1 | doc 60: 12-15 months funding to ship (DragonMint 4, Linzhi 27) |
| Slip | median x1.3 scale | 50% none, 30% +1 quarter, 20% +2 quarters | doc 60: 40-60% chance of 1-2 quarter slip [D] |
| Memory limit | drawn 2022Q2-2023Q1 | fixed dates, chosen memory: 5 GB stops ETH 17 Aug 2022; 6 GB lasts to the Merge 15 Sep 2022 | dag_and_merge.csv [B]/[A] |
| Outcomes | ships / late / acquired / cancelled, rates to verify | ships 70%, cancelled at tape-out 25%, acquired 5% ⚙ | doc 60 §6: 5 firms, 1 failed, none acquired - anecdote, so [D] |
| After the Merge, mining | "a fraction of ETH" | gross below power cost at $0.10/kWh; net loss for most | doc 60 §4 [B]; monthly path [D] |
| Rental | to verify | Gen 2 card $0.065-0.12/GPU-hour at 12-30% utilisation, no host fee | gpu_rental.csv [C]/[D]; Vast.ai FAQ [A] |
| Names | Larkspur Hashworks, Larkspur E1 | Larkspur Silicon, LK-5 / LK-6 | doc 60 §7 |

## 1. Gen 2 in the base game (O, 16 Oct: fix the base game)
This part is not opt-in: it corrects Act I's sourced price table and replaces the unsourced fixed wait. Act I's goldens and everything after are re-baselined once, in their own milestone, before the ventures build.

### 1.1 Price table (gpu_gen2.price_new; price_used moved by the same ratio ⚙)
| Quarter | new (was) | used (was) | Grade |
|---|---|---|---|
| 2020Q4 | 3,600 | 3,000 | [C] MSRP + small premium, unsourced |
| 2021Q1 | 6,000 | 5,200 | [D] no 2021Q1 data found |
| 2021Q2 | **8,300** (7,500) | **7,200** (6,500) | [B-derived] |
| 2021Q3 | **6,600** (6,800) | **5,600** (5,800) | [B-derived] |
| 2021Q4 | 6,600 | 5,600 | [B-derived] (Nov 2021 $1,002) |
| 2022Q1 | 5,800 | 4,800 | [B-derived] (Feb 2022 $847) |
| 2022Q2 | **4,200** (3,900) | **3,200** (3,000) | [B-derived] |
| 2022Q3 | 2,800 | 1,800 | [B-derived] (Aug $424, Merge $390) |
price_source gains: "Tom's Hardware eBay GPU price index, RTX 3060 Ti averages Apr 2021-Sep 2022, x6 plus platform $1,000 (2020-21) / $700 (2022) [D] (doc 60 §3)".

### 1.2 The wait becomes a choice (2021Q1-2021Q3)
- **Buy at street price:** the table price, no lead time (lead_time_quarters for 2021Q1-Q3 removed).
- **Queue at retail** ⚙: $4,100 a rig (6 x MSRP $399 x 1.3 + $1,000) [D], at most 4 rigs per quarter (one order per retail drop), delivery drawn per order: 1 quarter 50%, 2 quarters 35%, 3 quarters 15% ⚙. Draws use their own substream (`gen2_queue`).
- Buy menu: two rows for Gen 2 in those quarters, "Gen 2 - street price (now)" and "Gen 2 - retail queue (1-3 quarters)". Outside 2021Q1-Q3 only the street row.
- Existing bots keep buying at street price (now without the wait). One new bot, `gen2-queuer`, uses the queue.

## 2. Feature A: back an Ethereum miner (behind the ventures flag)
### 2.1 The real backdrop (doc 60 §1-§2; names as background only)
Ethash ASICs shipped from Jul 2018 (Antminer E3) to mid-2022, every one later than announced, Linzhi's Phoenix about 18 months late. Memory decided when each stopped mining ETH: 4 GB in Dec 2020, 5 GB on 17 Aug 2022; the Merge on 15 Sep 2022 ended the rest, and every survivor moved to Ethereum Classic. Bitmain teased a 3 GH/s Antminer E9 on 24 Apr 2021 [B]. These appear only in sourced headline cards.

### 2.2 The venture: **Larkspur Silicon** (DT name), machine **Larkspur LK-5** (5 GB) or **LK-6** (6 GB)
- **Offered 2020Q2** by a headline card ("A small hardware team, Larkspur Silicon, is raising for an Ethereum miner"); joined from the Ventures screen in any Plan phase 2020Q2-2020Q4.
- **Stake** 10%, 20% or 30% of a pitched $20M ⚙ budget: a buy-in of a third, then cash calls of a third at tape-out and at first units (doc 49's shape). Pay, dilute (stake halves) or walk (stake forfeited) at each call.
- **Pitched milestones:** tape-out 2021Q2, first units 2021Q4, volume 2022Q1. One slip draw per game at join (substream `larkspur`): 50% on time, 30% +1 quarter, 20% +2 quarters ⚙; it shifts first units and volume.
- **Outcome drawn at tape-out** ⚙: ships 70%; cancelled 25% (the prototype misses spec; stake and deposits lost); acquired 5% (a bigger maker buys it; the stake pays 1.5x paid-in ⚙, deposits refunded, no machines). [D], bounded by doc 60 §6's "20-30% fail".
- **Memory choice at the tape-out call (O, 16 Oct):** a backer with a 20% or 30% stake picks LK-5 (5 GB) or LK-6 (6 GB, +25% unit price ⚙). With 10% or no stake, the founders pick LK-5, the cheaper bet. Shown at the call: "5 GB lasts until the DAG reaches 5 GB (about Aug 2022); 6 GB lasts until Ethereum mining ends."
- **The machine** ⚙, defined against Gen 2 (360 MH/s, 0.85 kW): one unit 1,500 MH/s at 1.2 kW (about 3x Gen 2's MH per W); full price per MH 45% of Gen 2's 2021Q2 street price per MH, so LK-5 about $15,600 and LK-6 about $19,500 a unit ⚙. Lead time 0 once in volume; failure rate as Gen 2.
- **Allocation reservation:** a backer may reserve a block (up to 10 units per 10% of stake ⚙) for a 10% deposit; reserved units get a 10% discount and ship first, in the first two quarters of volume. Non-backers (and backers beyond their block) buy at full price from the quarter after the reserved blocks ship (O, §9.3).
- **Memory wall:** LK-5 stops earning ETH from the week of 2022-08-17 [B]; LK-6 at the Merge (2022-09-15) [A]. Both then switch to Ethereum Classic automatically, at §3's ETC income scaled by MH/s.
- **Competition** ⚙: the E9 teaser headline (2021Q2, sourced) cuts Larkspur's valuation by 20% if it hasn't reached volume.
- **The stake's value:** until the Merge, paid-in capital x (units shipped x margin ⚙ / pitched budget), with doc 49's valuation code; at the Merge it falls to 10% of that ⚙ (an ETC afterlife). It resolves at Act I's end into cash; only cash and machines carry into Act II.

### 2.3 What the player decides
Back it, how big, each cash call, 5 or 6 GB, whether to reserve, and when to sell the machines. A backer usually misses the 2021Q2 price peak and gets two to four ETH quarters; the lesson is timing and memory, not a jackpot.

## 3. Feature B: life after the Merge (Act II, from 2022Q4, behind the flag)
### 3.1 Alternative coins (O: kept, as a slow wind-down)
- A GPU rig or LK unit can point at ETC, RVN or ERG (M68's selector). Gross $ per day per 60 MH/s of 3060 Ti-equivalent, interpolated linearly between these points; power is charged as usual:

| Point | ETC | RVN | ERG | Grade |
|---|---|---|---|---|
| 2022-09 (from the Merge week) | 0.25 best of three | | | [C] (Tom's Hardware net -0.04 at $0.10/kWh) |
| 2022-10 | 0.20 | 0.25 | 0.22 | [D] |
| 2023-06 | 0.12 | 0.18 | 0.20 | [D] |
| 2024-06 | 0.06 | 0.25 | 0.18 | [D] |
| 2026-10 | 0.03 | 0.24 | 0.15 | [C] 2CryptoCalc |
- LK units mine ETC only (Ethash family); RVN (KAWPOW) and ERG (Autolykos) are GPU-only.
- A 3060 Ti at about 125 W uses about 3 kWh a day, about $0.30 at $0.10/kWh: so at Act II power prices this is a net loss for most sites. That is the point.

### 3.2 GPU rental (O: kept, as a bridge)
- An invented marketplace ("RigShare" ⚙ name, generic). List rigs at the going rate; earnings = cards x rate x hours x utilisation; power is charged only for rented hours. No host fee [A, Vast.ai FAQ: host side 0%].
- Gen 2 (3060 Ti-class), interpolated: 2022Q4 $0.10/GPU-hour at 12%; 2023Q3 $0.12 at 30%; 2026Q4 $0.065 at 20% ⚙ [D, bounded by gpu_rental.csv]. Gen 1 (RX 580-class) at half the Gen 2 rate and utilisation ⚙. LK units can't be rented.
- Order of magnitude: a Gen 2 rig in 2023Q3 earns about 6 x 0.12 x 24 x 0.30 ≈ $5.20 a day, about $470 a quarter, against a resale of about $2,340 at the Merge.

### 3.3 Resale
As built (Act II's parked-rig premium). The Ventures tab shows sell, rent and mine side by side for each rig lot.

## 4. Feature C: the Ventures tab in Acts I-II
Appears when Larkspur is offered (2020Q2) and stays through Act II, holding the stake, the reservation, the machines' coin choice and the rental listing. Act III's existing Ventures screen continues it. Behind the ventures dev flag until the balance pass.

## 5. Balance targets (bots)
| # | Target |
|---|---|
| Y-B0 | (M77, base game) Act I's goldens move only through §1; each move explained; Act II onward byte-identical to a fresh replay from the new Act I ends |
| Y-B1 | Opt-out invariance (flag on, features unused): byte-identical to the M77 baseline |
| Y-B2 | A backer (20%, pays every call, reserves a block) ends Act I at 1.0-2.5x the same cash spent on Gen 2 at street price, median |
| Y-B3 | Larkspur cancelled in 20-30% of runs; LK-5 stops ETH before the Merge in every run that ships it (fixed date) |
| Y-B4 | From 2022Q4 the best alternative coin earns under 25% of the rig's last ETH quarter, and nets below zero at $0.10/kWh in most quarters |
| Y-B5 | Rental beats the best alternative coin for a Gen 2 rig from 2023 in most runs, adds under 5% to an Act II company's value |
| Y-B6 | Plan phases and choice cards within Act I's and Act II's pacing targets |
| Y-B7 | (report only) gen2-queuer vs street-buyer: rigs delivered by 2021Q4 and Act I end net worth |

## 6. Research grades, trust and what stays designed
- **Built on as fact:** Gen 2 street prices 2021Q2-2022Q3 [B]; DAG dates 4 GB Dec 2020 and 5 GB 17 Aug 2022 [B]; the Merge 15 Sep 2022 [A]; difficulty-bomb dates [A]/[B]; Vast.ai host fee 0% [A]; post-Merge net loss on 16 Sep 2022 [B]; E9 teaser 24 Apr 2021 [B].
- **Not trusted as fact, used only as bounds or backdrop:** reseller-catalogue ASIC specs and dates [C]; the startup base rates (five firms); rental utilisation (guides, not platform data); the 3 GB retirement date (irrelevant to the window).
- **Designed, becoming content numbers now** ⚙: the queue price, cap and delivery odds; Larkspur's budget, milestones, slip, outcome odds, unit spec and price, memory premium, reservation terms, valuation; post-Merge monthly income Oct 2022-2024; Gen 2 rental rates and utilisation; Gen 1 rental.
- **Another research pass:** not needed to build. Worth one later only for 2020Q4-2021Q1 street prices (the 2021Q1 $6,000 stays [D]).

## 7. Names (DT, 16 Oct)
- **Larkspur Silicon** (not "Dagline": a made-up word reads as jargon, and "Silicon" says chip maker plainly). **LK-5 / LK-6**: the number is the memory, so the trap is on the label.
- Rental marketplace "RigShare" ⚙: generic, to check.
- **Trademark check before release, not before the build.** Names are text keys, cheap to change; the formal USPTO and EUIPO search is already the owner's task before ship. Add Larkspur Silicon, LK-5, LK-6 and RigShare to that list.

## 8. Build plan
1. **M77 (base game, §1):** Gen 2 price table and the queue choice; Act I goldens re-baselined; gen2-queuer bot. Not flagged.
2. **M78 (behind the ventures flag, §2-§4):** Larkspur, the LK machines, the alternative coins, rental, the Ventures tab in Acts I-II, bots and Y-B1 to Y-B6.

## 9. Decisions (owner)
1. (O, 14 Oct) Scope approved for Acts I and II; the same opt-out gate as the Prologue expansion; behind the dev flag until the balance pass.
2. (O, 14 Oct) After the Merge, both: alternative coins and GPU rental.
3. (O, 14 Oct) Non-backers can buy the machine at full price once in volume, after backers' reserved blocks ship.
4. (O, 16 Oct) Fix Gen 2 in the base game; Act I goldens re-baselined once.
5. (O, 16 Oct) The memory choice is the player's at the tape-out call with a 20% or larger stake; otherwise the founders pick 5 GB.

## 10. After M77 (16 Oct 2026)
*M77 merged (PR #49). No golden moved: the 11 Act I golden bots never buy Gen 2 after 2020Q4. texas-ipo-upgrade -5.4% (pays the 2021 street prices on about 880 rigs). Y-B7: the queue saves $34,400 on 12 rigs, 3 arrive after 2021Q4, Act I end level (+0.06%). Act II onward changes only through the new Act I ends; Y-B0 holds. Decisions (DT):*
1. **gen2-queuer and gen2-street are the Act I price-table guards** from now on (their goldens); texas-ipo-upgrade is the watch bot for Act I prices, reported in any milestone that touches Act I prices.
2. **The queue's trade is as intended:** cheap and late against dear and now, level on net worth. A choice with no dominant answer is the goal. No tuning.
3. **No save-version step** for the optional queue fields; the old-save test is enough.
4. M77's run is the Y-B1 baseline for M78 (as built).
