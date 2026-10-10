# The Act V gate (M43.0): a throwaway prototype

Doc 43 §19 (V-D6): before any Act V building, prove V1, "in a jammed-grid 2036-2040 world, does holding firm power beat
selling it?" Pass (V-B2): **Firm Holder ≥ 1.2 × Seller**, median founder net-worth multiple (2040Q4 ÷ 2035Q4).

Sim-only and outside the game: nothing in `src/` changes, so every golden and sim output stays byte-identical. It reads
the game's code (plays Act IV, reads the 2035Q4 market, values ventures) and never writes to it.

```bash
node tools/act5-gate/gate.ts --seeds 30 --out sim-output/act5-gate   # about 40 min; gate-runs.csv and gate-summary.txt
```

## What it does

1. **The 2035Q4 companies** (`states.ts`): the three Act IV presets (Ground Fortress, Neocloud, Ridge) × the four Act IV
   futures × one firm venture class (EGS, EGS block 2, SMR, advanced fission, pumped storage) × seeds, played as the
   energy runner does: the Balanced archetype plus one venture joined in 2031Q1 (a 20% stake, and a 50% offtake to the
   biggest eligible site when there is one; calls paid when cash allows, else diluted), lunar grade rich.
2. **20 stub quarters, 2036Q1-2040Q4, on a V1 market** (`gate.ts`): `grid_wait_q` 24 → 28; the AI demand index 100 → 145
   (relative to 2035Q4) on new-lease rents; PJM capacity at its 2035Q4 price (taken as the cap), lifted 30% from 2037Q4;
   merchant power +25% by 2040Q4 (linear); everything else held at 2035Q4 values. The venture draws carry on.
3. **Valuation** (doc 43 §11.3): an operating plant = stake × plant EBITDA × 4 × (contracted share × 12 + merchant share
   × 7) − stake × plant debt (none: no debt before first power, and neither bot borrows); a venture before first power
   keeps its milestone mark.
4. **Two bots** on the same company:
   - **Firm Holder:** keeps the stake and the offtake, pays the calls still to come (and an unfixed weak field's fix),
     stays merchant, and pays network upgrades ($150/kW) for a third off the wait of its expansion.
   - **Seller:** in 2036Q1 contracts 80% of its share's merchant output forward at market − 10%, then sells the stake at
     value × 1.0 (the milestone mark if the plant isn't running), and keeps the cash. Low debt: it borrows nothing.

## Assumptions the prototype had to make (all mine, reversible)

- **Starting companies:** the energy runner's single-venture runs stand in for the presets' runs, because the Act IV
  archetype runs hold no ventures. Firm classes only: fusion can't deliver before 2038, and the control is solar plus
  batteries. Runs with no stake at 2035Q4 (the cash guard kept the company out, or the project was cancelled) are left
  out of the gate and counted.
- **"Everything else held":** the company without its venture is held at its 2035Q4 valuation, plus 20 quarters of its
  2035Q4 cash earnings (EBITDA − interest). Common to both bots. No taxes, no new raises, the founder's stake unchanged,
  no game overs. Cash earns nothing, as in the game.
- **The plant:**
  - Its region is its offtake campus's, else its class's first eligible region. Its merchant price is that region's
    `power_usd_kwh` (the delivered price the game charges, so likely above a real wholesale price: it flatters the Holder).
  - All non-offtake output is merchant (no developer contracts). The offtake share counts as contracted, at its PPA.
  - Capacity revenue only in PJM and Ohio, on MW × CF.
  - Pumped storage earns its capacity payment less running cost (no peak-spread margin).
  - No fixed $/kW-yr cost for thermal plants.
  - The Holder takes its share of EBITDA as cash each quarter.
  - First power at the drawn quarter. An undersubscribed reactor may still be cancelled while licensing (40% a year),
    but no new slips or seismic pauses are drawn after 2035.
  - A plant not running by 2040Q4 stays at its 2035Q4 milestone mark. The calls paid add to the mark at par, so they
    net out.
- **The offtake:** identical for both bots. The Seller sells the stake, not its PPA, so its campus keeps the power.
- **The queue:**
  - The 2035Q4 companies hold no open grid requests, so each bot requests an expansion in 2036Q1: a quarter of its
    energized MW (at least 10 MW).
  - Only a company whose cash covers the greenfield shell (and the upgrade) requests it.
  - It energizes after the V1 wait at request × U(0.8, 1.2): 16 quarters × U for the Holder after the upgrade, so the
    Seller's (≥ 19.2) never lands by 2040Q4.
  - Energized MW rent at the 2035Q4 stabilized EV/MW ÷ (4 × the AI multiple) × the demand index, and are valued at the
    AI multiple. Not energized: under construction at capex spent (net 0).
- **The Seller's sale:** at 2036Q1 values (its EBITDA with 80% of its merchant share at market − 10%; the 12×/7×
  blend). No infrastructure-fund index (V1's `infra_bid_index` isn't designed yet: × 1.0, as the prompt says).

## M43.0b (doc 43 v1.1 §0; rules in §0.6): `gate-b.ts`

```bash
node tools/act5-gate/gate-b.ts --seeds 30 --out sim-output/act5-gate-b   # about 45 min; gate-b-runs.csv, gate-b-summary.txt
```

The decision is now the whole ground book: lock it in (Seller) or keep it open to the scarcity price (Firm Holder), on two
stub futures, V1 (scarcity up) and V3 (down after a 2037Q4 trigger). Pass: V1 Holder ≥ 1.2 × Seller **and** V3 Seller ≥
1.2 × Holder. Starts: the three presets' single-venture runs (as M43.0) plus a firm-heavy start (EGS + SMR, §0.6 item 6:
the two joins fit, so no top-quartile fallback). The multiple's base is act5Entry = the 2035Q4 valuation + free MW × $300K.

What §0.6 left open, decided here (all mine, reversible):
- **Leases are the live projects with a tenant at 2035Q4** (shell leases and GPU contracts). Spot clusters, hosting and
  projects not yet live are held at 2035Q4 (common to both bots).
- **Market rent:**
  - A shell's is its card rent × the 2035Q4 new-lease reference (the RFP midpoint) × its hall's tier multiple (Act III's
    rolling-lease rule).
  - A GPU contract's is its rate × the GPU renewal index now ÷ at its signing (from 2027Q1, as the renewal offer).
  - Both × `scarcity_index`.
- **Margins:**
  - A shell's margin is rent × (1 − the host's 17.5% opex share); a GPU contract's is its full revenue (its power and
    insurance don't depend on the rate).
  - Our JV share applies. Distress and lab-renegotiation haircuts are ignored.
- **Walks:**
  - The 2035Q4 walk chance at renewal by tenant type, rolled once per end date with the same draw for both bots.
  - The Seller's extensions roll too (§0.6: walks at each end date). A walked lease (GPU contracts too) is empty one
    quarter, then re-lets at that quarter's market rent: 2 years for the Holder, 9 for the Seller.
- **Valuation of the lease change:** the 2040Q4 margin change × 4 × the 2035Q4 AI multiple. The contracted-multiple
  floor (15×, ≥ 20 quarters left) is ignored: the market multiple is 13.8-16.4× in 2035. The cash earned along the way
  is added.
- **Plants:**
  - The developer's contracted share (90% thermal, 50% pumped, §0.4) sells at the class PPA ($90/MWh); the player's
    offtake share at its own PPA; the rest merchant at the region's power price × the stub's path.
  - Capacity revenue (PJM and Ohio) on rating × MW (nuclear 0.95; EGS 0.90).
  - The contracted half of pumped storage keeps 2036's terms; its merchant half follows the stub. Spread $30 → V1 $45,
    V3 $20 from the trigger. Running cost $18/kW-yr (doc 38).
  - Plant multiple = contracted share × 10 + merchant share × the stub's merchant multiple (no 8×/11× by contract
    length: the developer contracts' terms aren't modelled).
- **Everything else is as M43.0:** the company without its ventures held, plus 20 quarters of 2035Q4 EBITDA − interest
  (common); no taxes, raises, dilution or game overs; cash earns nothing; the Holder pays every call.
