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
