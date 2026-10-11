// Act V's operating plants (M52.2-M52.4; doc 43 §7.1, §7.3, §11 with §0.4; plants_v.json). A calendar venture that has
// reached first power becomes an operating plant in Act V: it sells its output (the offtakes at their PPA prices, the
// developer's contracted share at the pitched price, the rest merchant at the region's price, or at your own output
// contract), earns capacity revenue in PJM and Ohio, and pays its fixed and variable costs. Your stake's share of its
// EBITDA is paid out as distributions after your plant debt's service (none while the debt is locked up), and your
// stake is valued on its earnings: stake × EBITDA × 4 × the plant multiple (the contracted share at
// `plant_mult_contracted`, the merchant share at `plant_mult_merchant`, market columns per future). Plant debt is
// non-recourse: it is serviced from the plant's cash flow, and its covenants act on the stake (lock-up, restructure,
// the lenders take the plant). Before Act V, and for a venture not yet operating, nothing here applies (Act IV's
// milestone mark stands). Not hidden: every number is a market column or the plant's own visible output.
import { CONTENT, act5Row, quarterInputs, type PowerRegion } from '../../content/index.ts'
import { VENTURES, type VentureType } from '../../content/energyContent.ts'
import { PLANTS, plantClassOf } from '../../content/plantsContent.ts'
import type { Message } from '../../i18n/t.ts'
import { book, roundCash } from '../ledger.ts'
import { inActV, logEntry, roundCents, type GameState, type Venture } from '../state.ts'
import { HOURS_Q } from './energy.ts'
import { scenarioOf } from './market.ts'
import { regionOf } from './sites.ts'
import { ventureCf, ventureRegions } from './ventures.ts'
import { dryYearMult } from './wildcardsV.ts'

const C = PLANTS.classes
const F = PLANTS.finance
const DAYS_Q = 91.25

/** An operating plant in Act V (a firm class: EGS, the reactors, fusion's pilot, pumped storage). */
export function isPlant(state: GameState, v: Venture): boolean {
  return inActV(state) && v.stage === 'operating' && plantClassOf(v.type) !== null
}

/**
 * The plant's power region: its offtake campus's region, else the first region its class may be built in (mine,
 * reversible: the files don't place a plant without an offtake).
 */
export function plantRegion(state: GameState, v: Venture): PowerRegion {
  const site = v.siteId ? state.sites.find((s) => s.id === v.siteId) : undefined
  const own = site ? regionOf(site) : undefined
  if (own) return own
  const r = ventureRegions(v.type)
  return (r === 'any' ? 'ercot' : (r[0] ?? 'ercot')) as PowerRegion
}

/** The class's contracted share at first power (the developer's contracts, including every offtake). */
function developerShare(v: Venture): number {
  const cls = plantClassOf(v.type)!
  return Math.min(1, Math.max(C[cls].contracted_share_at_cod, v.offtakeMw / v.mw))
}

/** Your output contract's share of the merchant output while it runs (0 without one). */
function ownContractShare(v: Venture, quarter: number): number {
  const c = v.outputContract
  return c && quarter < c.endQuarter ? c.share : 0
}

/** The share of the plant's output under contract (the developer's, then yours on the merchant rest). */
export function contractedShare(v: Venture, quarter: number): number {
  const dev = developerShare(v)
  return dev + (1 - dev) * ownContractShare(v, quarter)
}

/** The plant's capacity factor this quarter (reactors ramp 0.80 → 0.92; EGS 0.9 or 0.6 on a weak field; fusion 0.3). */
function plantCf(v: Venture, quarter: number): number {
  const cls = plantClassOf(v.type)
  if (cls === 'egs') return v.weakField && !v.fieldFixed ? C.egs.cf.weak_field : C.egs.cf.normal
  if (cls === 'fusion_pilot') return C.fusion_pilot.cf.pilot
  return ventureCf(v, quarter)
}

export interface PlantQuarter {
  mwh: number
  marketUsdMwh: number
  energyUsd: number
  capacityUsd: number
  costUsd: number
  ebitdaUsd: number
  contractedShare: number
}

/** One quarter of a plant's operations, 100% of the plant (doc 43 §7.1, plants_v.json `sales`). */
export function plantQuarter(state: GameState, v: Venture, quarter = state.quarter): PlantQuarter {
  const cls = plantClassOf(v.type)!
  const key = scenarioOf(state)
  const row = act5Row(quarter, key)
  const region = plantRegion(state, v)
  const marketUsdMwh = (quarterInputs(quarter, key)?.powerUsdKwh[region] ?? 0) * 1000
  const kw = v.mw * 1000
  const capacityRegion = C.pumped.capacity_regions.includes(region)
  const ratingOf = (c: { capacity_rating?: number; capacity_rating_col?: string }) =>
    c.capacity_rating ?? (c.capacity_rating_col ? (((row as Record<string, unknown> | undefined)?.[c.capacity_rating_col] as number | null) ?? 0) : 0)
  const capacityUsd =
    capacityRegion && row ? row.pjm_capacity_price_usd_mwday * ratingOf(C[cls]) * v.mw * DAYS_Q : 0
  const contracted = contractedShare(v, quarter)
  if (cls === 'pumped') {
    // 10 hours a day at the 10-hour peak spread × the round trip (doc 43 §0.4, §7.3); the contracted half counts in
    // the multiple only (the files give pumped storage no contract price: mine, reversible).
    const mwh = v.mw * C.pumped.hours * DAYS_Q
    // (M56.2: the dry year's ×0.75 on pumped storage in its region)
    const energyUsd = mwh * (row?.peak_spread_10h_usd_mwh ?? 0) * C.pumped.round_trip * dryYearMult(state, region)
    const costUsd = (kw * C.pumped.fixed_usd_kw_yr) / 4 + mwh * C.pumped.var_usd_mwh
    return { mwh, marketUsdMwh, energyUsd, capacityUsd, costUsd, ebitdaUsd: energyUsd + capacityUsd - costUsd, contractedShare: contracted }
  }
  const mwh = v.mw * plantCf(v, quarter) * HOURS_Q
  const t = VENTURES.types[v.type as VentureType] as { ppa_usd_mwh?: number; pitch_usd_mwh?: number }
  const pitchUsdMwh = t.ppa_usd_mwh ?? t.pitch_usd_mwh ?? marketUsdMwh
  const offtake = Math.min(1, v.offtakeMw / v.mw)
  const dev = developerShare(v)
  const own = (1 - dev) * ownContractShare(v, quarter)
  const merchant = 1 - dev - own
  const energyUsd =
    mwh *
    (offtake * v.ppaUsdMwh +
      (dev - offtake) * pitchUsdMwh +
      own * (v.outputContract?.priceUsdMwh ?? 0) +
      merchant * marketUsdMwh)
  const c = C[cls]
  const fixedMult = 'single_unit_fixed_mult' in c && c.single_unit_fixed_mult && !v.followOnOf ? c.single_unit_fixed_mult : 1
  const costUsd = (kw * c.fixed_usd_kw_yr * fixedMult) / 4 + mwh * c.var_usd_mwh
  return { mwh, marketUsdMwh, energyUsd, capacityUsd, costUsd, ebitdaUsd: energyUsd + capacityUsd - costUsd, contractedShare: contracted }
}

/**
 * The plant multiple (doc 43 §11.3 with §0.4): the contracted share × `plant_mult_contracted` + the merchant share ×
 * `plant_mult_merchant`. Your own output contract takes the contract tail (8x with ≤ 8 years left, 11x with ≥ 15); the
 * developer's contracts count at the base multiple (their term isn't in the files: mine, reversible).
 */
export function plantMultiple(state: GameState, v: Venture, quarter = state.quarter): number {
  const row = act5Row(quarter, scenarioOf(state))
  if (!row) return 0
  const mc = row.plant_mult_contracted
  const mm = row.plant_mult_merchant
  const dev = developerShare(v)
  const own = (1 - dev) * ownContractShare(v, quarter)
  const tail = PLANTS.valuation.contract_tail
  const yearsLeft = v.outputContract ? (v.outputContract.endQuarter - quarter) / 4 : 0
  const ownMult = yearsLeft <= tail.years_left_le ? tail.mult : yearsLeft >= tail.years_left_ge ? tail.mult_long : mc
  return dev * mc + own * ownMult + (1 - dev - own) * mm
}

/** The plant's value, 100%: its EBITDA × 4 × the plant multiple (never below 0). */
export function plantValueUsd(state: GameState, v: Venture, quarter = state.quarter): number {
  return Math.max(0, plantQuarter(state, v, quarter).ebitdaUsd) * 4 * plantMultiple(state, v, quarter)
}

/** Your stake's value as an operating plant (gross of your plant debt, which counts as debt). */
export function plantStakeValueUsd(state: GameState, v: Venture): number {
  return v.stake * plantValueUsd(state, v)
}

/** Your share of plant debt, $ (non-recourse; counted with the company's debt, doc 43 §11.4). */
export function plantDebtUsd(state: GameState): number {
  return (state.ventures ?? []).reduce((a, v) => a + (v.plantDebt?.principalUsd ?? 0), 0)
}

// ---------- the quarter's end: distributions, debt service and the covenants ----------

/** One quarter's debt service on your plant debt: interest at SOFR + spread, and the scheduled principal. */
function serviceDue(state: GameState, v: Venture): { interestUsd: number; principalUsd: number } {
  const d = v.plantDebt!
  const sofr = (quarterInputs(state.quarter, scenarioOf(state))?.sofrPct ?? 0) / 100
  const rateQ = (sofr + d.spreadBps / 10_000) / 4
  const interestUsd = d.principalUsd * rateQ
  const left = Math.max(1, d.endQuarter - state.quarter)
  const principalUsd =
    d.kind === 'merchant'
      ? Math.min(d.principalUsd, (d.originalUsd * F.debt_merchant.amort_pct_yr) / 100 / 4)
      : // a level (annuity) payment over the quarters left (mine: the files' "sculpted to DSCR 1.30" read as level)
        rateQ > 0
        ? Math.min(d.principalUsd, (d.principalUsd * rateQ) / (1 - (1 + rateQ) ** -left) - interestUsd)
        : d.principalUsd / left
  return { interestUsd, principalUsd }
}

/**
 * At each Act V quarter's end: every operating plant you hold a stake in pays your share of its EBITDA after your plant
 * debt's service. Below DSCR 1.15 the distributions lock up (the cash sweeps the debt); 4 quarters running below 1.0
 * restructure the debt (your stake and your debt × 0.5, once); 8 hand the plant to the lenders (stake and debt to 0).
 * Merchant debt also sweeps 50% of the cash after service. Returns the distributions paid.
 */
export function endQuarterPlants(state: GameState): number {
  if (!inActV(state)) return 0
  let paid = 0
  for (const v of state.ventures ?? []) {
    if (!isPlant(state, v) || v.stake <= 0) continue
    const cfads = v.stake * plantQuarter(state, v).ebitdaUsd
    let cash = cfads
    if (v.plantDebt) {
      const d = v.plantDebt
      const due = serviceDue(state, v)
      const service = due.interestUsd + due.principalUsd
      const dscr = service > 0 ? cfads / service : Infinity
      // what the plant can pay goes to the lenders first; a shortfall is added to the debt (non-recourse: never your cash)
      const toLenders = Math.max(0, Math.min(cfads, service))
      d.principalUsd = roundCents(Math.max(0, d.principalUsd + due.interestUsd - toLenders))
      cash = cfads - toLenders
      d.quartersBelow1 = dscr < 1 ? (d.quartersBelow1 ?? 0) + 1 : 0
      if (dscr < F.covenants.lock_up_below_dscr || d.kind === 'merchant') {
        const sweep = dscr < F.covenants.lock_up_below_dscr ? cash : cash * F.debt_merchant.cash_sweep
        const applied = Math.min(d.principalUsd, Math.max(0, sweep))
        d.principalUsd = roundCents(d.principalUsd - applied)
        cash -= applied
        if (dscr < F.covenants.lock_up_below_dscr && !d.lockedUp) logEntry(state, 'log.plant.locked_up', { ventureType: v.type })
        // (locked up, the whole cash sweeps the debt: what's left is paid out only once the debt is repaid)
        d.lockedUp = dscr < F.covenants.lock_up_below_dscr
      }
      if (d.quartersBelow1 >= F.covenants.lenders_take_after_q_below_1) {
        logEntry(state, 'log.plant.lenders_take', { ventureType: v.type })
        v.stake = 0
        delete v.plantDebt
        continue
      }
      if (d.quartersBelow1 >= F.covenants.restructure_after_q_below_1 && !d.restructured) {
        const m = F.covenants.restructure_stake_mult
        v.stake *= m
        d.principalUsd = roundCents(d.principalUsd * m)
        d.restructured = true
        logEntry(state, 'log.plant.restructured', { ventureType: v.type })
      }
      if (d.principalUsd <= 0) delete v.plantDebt
    }
    if (cash > 0) {
      book(state, 'plant_distributions', cash, { venture: v.id })
      paid += cash
    }
  }
  roundCash(state)
  return paid
}

// ---------- actions: plant debt, fund sales, output contracts ----------

/** Why plant debt can't be arranged on this venture now, or undefined. */
export function plantDebtBlocker(state: GameState, ventureId: string): Message | undefined {
  const v = state.ventures?.find((x) => x.id === ventureId)
  if (!v || !isPlant(state, v) || v.stake <= 0) return { key: 'error.plant_not_operating' }
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  if (v.plantDebt) return { key: 'error.plant_debt_open' }
  if (plantValueUsd(state, v) <= 0) return { key: 'error.plant_no_value' }
  if (state.bandwidth < 1) return { key: 'error.no_bandwidth', params: { needed: 1, have: state.bandwidth } }
}

/** The terms on offer (doc 43 §0.4): contracted (≥ 70% contracted) or merchant. */
export function plantDebtTerms(state: GameState, v: Venture) {
  const contracted = contractedShare(v, state.quarter) >= F.debt_contracted.min_contracted_share
  const t = contracted ? F.debt_contracted : F.debt_merchant
  // tenor: contracted 15 years (the files' range is 15-18: mine, the short end); merchant 7
  const years = contracted ? F.debt_contracted.tenor_years[0] : F.debt_merchant.tenor_years
  return {
    kind: contracted ? ('contracted' as const) : ('merchant' as const),
    principalUsd: roundCents(t.max_ltv * plantStakeValueUsd(state, v)),
    spreadBps: t.spread_bps,
    years,
  }
}

/** Draws plant debt at the full loan-to-value on your stake (1 Bandwidth). Call only when unblocked. */
export function arrangePlantDebt(state: GameState, ventureId: string): void {
  const v = state.ventures!.find((x) => x.id === ventureId)!
  const t = plantDebtTerms(state, v)
  state.bandwidth -= 1
  v.plantDebt = {
    kind: t.kind,
    principalUsd: t.principalUsd,
    originalUsd: t.principalUsd,
    spreadBps: t.spreadBps,
    drawnQuarter: state.quarter,
    endQuarter: state.quarter + t.years * 4,
    quartersBelow1: 0,
  }
  book(state, 'debt_drawn', t.principalUsd, { venture: v.id })
  logEntry(state, 'log.plant.debt', { ventureType: v.type, debtUsd: t.principalUsd })
}

/** The fund's bid for `share` of your stake: operating at plant value, before first power at the mark; × the index. */
export function fundBidUsd(state: GameState, v: Venture, share: number, markUsd: number): number {
  const index = act5Row(state.quarter, scenarioOf(state))?.infra_bid_index ?? 1
  const gross = isPlant(state, v) ? share * plantStakeValueUsd(state, v) : share * markUsd
  return roundCents(gross * index - share * (v.plantDebt?.principalUsd ?? 0))
}

/** Why this sale can't happen now, or undefined. `share` is the part of your stake sold (0-1]. */
export function fundSaleBlocker(state: GameState, ventureId: string, share: number): Message | undefined {
  const v = state.ventures?.find((x) => x.id === ventureId)
  if (!inActV(state) || !v || v.stake <= 0 || v.stage === 'cancelled' || v.stage === 'folded')
    return { key: 'error.plant_no_stake' }
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  if (!(share > 0 && share <= 1)) return { key: 'error.plant_bad_share' }
  if (state.bandwidth < 1) return { key: 'error.no_bandwidth', params: { needed: 1, have: state.bandwidth } }
}

/** Sells `share` of your stake to an infrastructure fund (the buyer takes that share of your plant debt). */
export function sellPlantStake(state: GameState, ventureId: string, share: number, markUsd: number): void {
  const v = state.ventures!.find((x) => x.id === ventureId)!
  const usd = fundBidUsd(state, v, share, markUsd)
  state.bandwidth -= 1
  v.stake *= 1 - share
  if (v.stake < 1e-9) v.stake = 0
  if (v.plantDebt) {
    v.plantDebt.principalUsd = roundCents(v.plantDebt.principalUsd * (1 - share))
    v.plantDebt.originalUsd = roundCents(v.plantDebt.originalUsd * (1 - share))
    if (v.stake === 0 || v.plantDebt.principalUsd <= 0) delete v.plantDebt
  }
  book(state, 'asset_sales', usd, { venture: v.id })
  logEntry(state, 'log.plant.sold', { ventureType: v.type, priceUsd: usd })
}

/** Why this output contract can't be signed now, or undefined. */
export function outputContractBlocker(state: GameState, ventureId: string, share: number): Message | undefined {
  const v = state.ventures?.find((x) => x.id === ventureId)
  if (!v || !isPlant(state, v) || v.stake <= 0 || v.type === 'pumped') return { key: 'error.plant_not_operating' }
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  if (v.outputContract && state.quarter < v.outputContract.endQuarter) return { key: 'error.plant_contract_open' }
  if (!(share > 0 && share <= F.contract_output.max_share)) return { key: 'error.plant_bad_share' }
  if (state.bandwidth < 1) return { key: 'error.no_bandwidth', params: { needed: 1, have: state.bandwidth } }
}

/**
 * Sells `share` of the plant's merchant output forward at today's market price − 10% for 12 years (the files' range is
 * 10-15: mine, the middle) (1 Bandwidth).
 */
export function contractPlantOutput(state: GameState, ventureId: string, share: number): void {
  const v = state.ventures!.find((x) => x.id === ventureId)!
  const market = plantQuarter(state, v).marketUsdMwh
  state.bandwidth -= 1
  v.outputContract = {
    share,
    priceUsdMwh: roundCents(market * (1 + F.contract_output.price_vs_market)),
    endQuarter: state.quarter + 12 * 4,
  }
  logEntry(state, 'log.plant.contracted', { ventureType: v.type, pct: Math.round(share * 100) })
}

/** Readers for the views: each plant you hold, this quarter. */
export function plantsView(state: GameState) {
  if (!inActV(state)) return []
  return (state.ventures ?? [])
    .filter((v) => isPlant(state, v) && v.stake > 0)
    .map((v) => {
      const q = plantQuarter(state, v)
      return {
        id: v.id,
        type: v.type,
        stake: v.stake,
        region: plantRegion(state, v),
        mwh: q.mwh,
        // (M62.3, A5-03: the plant's MW and this quarter's capacity factor)
        mw: v.mw,
        cf: v.mw > 0 ? q.mwh / (v.mw * HOURS_Q) : 0,
        ebitdaUsd: q.ebitdaUsd,
        stakeEbitdaUsd: v.stake * q.ebitdaUsd,
        contractedShare: q.contractedShare,
        multiple: plantMultiple(state, v),
        stakeValueUsd: plantStakeValueUsd(state, v),
        debtUsd: v.plantDebt?.principalUsd ?? 0,
        lockedUp: v.plantDebt?.lockedUp ?? false,
        outputContract: v.outputContract ?? null,
        label: CONTENT.quarters[v.codQuarter],
        // what the Plan phase offers, and why not
        debtOfferUsd: plantDebtTerms(state, v).principalUsd,
        debtKind: plantDebtTerms(state, v).kind,
        debtBlocked: plantDebtBlocker(state, v.id) ?? null,
        bidHalfUsd: fundBidUsd(state, v, 0.5, 0),
        bidAllUsd: fundBidUsd(state, v, 1, 0),
        saleBlocked: fundSaleBlocker(state, v.id, 1) ?? null,
        contractShare: F.contract_output.max_share,
        contractBlocked: outputContractBlocker(state, v.id, F.contract_output.max_share) ?? null,
      }
    })
}
