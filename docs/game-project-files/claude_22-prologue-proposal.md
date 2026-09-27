# 22: Prologue (Act 0) — "Bedroom to Garage", 2010–2016: proposal and plan

*Draft v0.1, 27 Sep 2026. A proposal, not yet a decision. Outside the Alpha 0.2 scope (doc 20 change rule): planned as its own alpha after Act II, unless the owner decides otherwise.*

---

## 1. The idea
An optional opening chapter before Act I. You mine bitcoin on your own computer in the early days, move to a dedicated rig, and end in the garage in Dec 2016, exactly where Act I starts. The title screen asks whether to play the prologue or start in 2017 as today.

**What it has to prove:** is a short (10–15 minute) prologue a fun, readable introduction to mining (hashprice, difficulty, halvings, custody risk) that makes Act I feel like "your" company, without breaking Act I's balance?

## 2. How complicated is it?
**Medium: smaller than Act II, bigger than one milestone.** Estimate ≈ 4 build milestones plus one design round and one research round (like Acts I and II), roughly the size of M2 + M3.

| Area | Difficulty | Why |
|---|---|---|
| Act plumbing (act field, save versions, act spans, chapter → intro flow) | **Low** | Built for Act II in Step 1; Act 0 reuses it |
| Market data 2010–2016 | **Medium** | New research pack; prices before mid-2010 barely exist (first exchange Mt Gox, Jul 2010) |
| Machines and sites | **Low–medium** | Same systems as Act I with new tiers: CPU → GPU → FPGA → early ASIC; your computer → home rig → garage |
| Pacing (26 quarters in 10–15 min) | **Medium** | The engine is quarterly; the prologue needs "decision quarters" with the rest auto-played |
| **Carry-over balance** | **High (the real risk)** | Real early mining gave thousands of BTC for almost nothing; carried into Act I as is, it makes Act I trivial |
| New mechanic: custody (exchange vs own wallet) | Medium | Small system, but new: Mt Gox hack (2011) and collapse (2014) vs lost-keys risk |
| UI and theme | Low–medium | Title opt-in, prologue intro and handover screens, a retro "2010" era theme |
| Act I invariance | Low if planned | Opting out must give today's exact Act I start; the current Act I goldens must pass unchanged |

## 3. The design problems to solve first

1. **Carry-over (the big one).** Mining 2010–12 on a PC or GPU could earn tens of thousands of BTC worth millions by 2017. Options:
   - (a) **Head start tiers, like the Merge head starts (recommended).** The prologue result converts into an Act I starting package inside a band, e.g. $10K–$150K of cash/BTC plus perks (a used GPU rig, a contact, a lower first power price). Act I's balance targets assume $10K, so the band must stay small.
   - (b) A hard cap on carried value, with the rest "lost" (wallet, exchange collapse). It's historically flavoured, but players may feel robbed.
   - (c) Full carry-over with Act I rebalanced. Not recommended: it reopens a finished balance pass.
2. **Time span and start.** 2009 has no price at all. Recommended: start **Q3 2010** (Mt Gox opens, GPU mining begins, the Pizza Day story just happened) with an optional 2009 "hobby" intro screen. End: **Q4 2016**, handing over to Act I's 2017Q1.
3. **Pacing.** 26 quarters is too long. Recommended: keep the quarterly engine and add **decision quarters**: about 12 quarters get a Plan phase (tied to real moments), and the rest auto-play with a short summary. No engine rewrite needed.
4. **Core choices** (what makes it a game, not a timeline):
   - CPU → GPU switch (late 2010).
   - Solo vs pool mining (solo = a lottery).
   - Keep coins on an exchange (easy to sell, hack risk) vs your own wallet (safe from exchanges, lost-key risk).
   - Pre-order an early ASIC (Butterfly Labs-style delays, 2012–13) or keep GPUs.
   - HODL/sell % through the 2011 and 2013 bubbles.
   - Mine ETH with GPUs from Aug 2015. It sets up Act I, which starts with GPUs.
5. **No rivals or league** in the prologue (the pools and exchanges are the world instead).

## 4. Real timeline hooks (to verify in the research pack)
Jul 2010 Mt Gox opens · late 2010 GPU mining spreads · Jun 2011 bubble (~$31) and Mt Gox hack, then crash · 2011–12 FPGAs · Nov 2012 first halving (50 → 25 BTC) · Jan 2013 first ASICs (Avalon) · 2013 Cyprus rally and Dec 2013 peak (~$1,100) · Feb 2014 Mt Gox collapse · 2014–15 bear market (~$200) · Jul 2015 Ethereum launches · Jul 2016 second halving (25 → 12.5 BTC) · mid-2016 Antminer S9.

## 5. Step-by-step plan
1. **Owner decisions** (short): the placement (after Act II, recommended), the carry-over model (§3.1), the start date and length (§3.2–3.3).
2. **Design doc** (design thread; like docs 07 and 18): the question it proves, turns and decision quarters, machines and sites, custody, the event list, the carry-over rule and its bands, the opt-in flow, what's cut.
3. **Research prompt → content pack** (like docs 11 and 19): weekly BTC price, difficulty, hashrate and fees 2010–2016 (all sources tagged, estimates marked), machine specs and prices by quarter, pool fees, exchange events, 10–15 event cards, ETH from 2015.
4. **Scope freeze** (Alpha 0.3 scope doc, like docs 10 and 20) **+ wireframes** (Claude Design): title opt-in, prologue Plan screen, custody panel, auto-played quarter summary, handover to Act I.
5. **Build in batch mode, 4 milestones on a branch** (`prologue`):
   - **P1 Act 0 boundary:** act 0 in state and saves (version step + migration test), the market prepended, the title opt-in, the prologue → Act I handover with the carry-over rule. Invariant: opting out = today's Act I start, and Act I goldens unchanged.
   - **P2 Economy:** CPU/GPU/FPGA/ASIC machines, your computer → home rig → garage, solo vs pool, custody risk, decision quarters and auto-play.
   - **P3 Events, theme and screens:** the event cards, the 2010 era theme, the intro/summary/handover screens.
   - **P4 Bots and balance:** 10–15 minute runs; the carry-over lands inside its band for every bot; Act I and Act II targets re-checked from prologue starts.
6. **Playtest, then merge** into main, as with Act II.

## 6. Recommendation
Worth doing: it's a strong onboarding hook and fits the game's "your company from the garage" story. But **don't insert it into Alpha 0.2**: Act II is mid-build, and the prologue adds a new balance problem at the front of the campaign. Write the design doc now if the idea is fresh, and start the build after Act II's milestones (M6).
