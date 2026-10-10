// Market system: this week's coin prices and mining revenue, and machine prices.
// Everything comes straight from the scripted content (market_weekly + machines.json).
import {
  BALANCE,
  CONTENT,
  act1ValueQuarter,
  actFirstQuarter,
  isAct2RulesQuarter,
  nextQuarter,
  act3ScenarioOfKey,
  isAct4MarketKey,
  type Machine,
  type MarketKey,
  type MarketWeek,
} from '../../content/index.ts'
import {
  inActIII,
  inActIV,
  type Coin,
  type Condition,
  type GameState,
} from '../state.ts'

export function getModel(id: string): Machine | undefined {
  return (
    CONTENT.machines.find((m) => m.id === id) ??
    CONTENT.prologue.machines.find((m) => m.id === id)
  )
}

/** A prologue machine (machines_prologue.json): its prices follow the prologue's own rule. */
export function isPrologueModel(model: Machine): boolean {
  return CONTENT.prologue.machines.includes(model)
}

/**
 * A prologue machine's price in a quarter (Alpha 0.3 §2.5): the latest listed quarter at or before
 * it; none before the first listed quarter, and for buying none more than 4 quarters after the
 * last. Selling uses the latest listed price for good (a machine carried into Act I).
 */
function prologuePrice(
  curve: Record<string, number>,
  label: string,
  buying: boolean,
): number | undefined {
  const keys = Object.keys(curve).sort()
  const at = keys.filter((k) => k <= label).at(-1)
  if (at === undefined) return undefined
  if (buying) {
    let end = keys.at(-1)!
    for (let i = 0; i < 4; i++) end = nextQuarter(end)
    if (label > end) return undefined
  }
  return curve[at]
}

/**
 * The weeks of a quarter. With no `scenario` (every Act I and Act II call) this is the shared
 * `CONTENT.market` array, exactly as before. With a scenario id, and a quarter in Act III, it is
 * that scenario's own file (M11.1): scenario quarter n sits at (first Act III quarter + n). A
 * scenario id given for a quarter before Act III is ignored, so it can never change earlier acts.
 * Act III quarters without a scenario throw. undefined past the end of the data.
 */
export function quarterWeeks(
  quarter: number,
  scenario?: MarketKey | null,
): MarketWeek[] | undefined {
  // Act IV (M27.3): prices exist only inside a scenario and future key ("s2.f3"), glided at the seam. Read without
  // one (an Act III game looking past 2030Q4) there is nothing, as before Act IV's quarters existed (marketWeek throws).
  const act4 = CONTENT.acts.find((a) => a.act === 4)
  if (act4 && quarter >= act4.firstQuarter && quarter <= act4.lastQuarter)
    return isAct4MarketKey(scenario)
      ? CONTENT.act4Markets[scenario].weeks[quarter - act4.firstQuarter]
      : undefined
  const first = actFirstQuarter(3)
  if (
    quarter >= first &&
    quarter < first + CONTENT.act3Scenarios.s0.weeks.length
  ) {
    // Act III has no shared market: its prices exist only inside a scenario.
    if (!scenario)
      throw new RangeError(
        `Quarter ${quarter} is in Act III, whose market is read only through a scenario (none given)`,
      )
    return CONTENT.act3Scenarios[act3ScenarioOfKey(scenario)].weeks[quarter - first]
  }
  return CONTENT.market[quarter]
}

/**
 * The market key a state's reads use: its scenario in Act III; in Act IV (M27.3) its Act III scenario and its future,
 * "s2.f3" (the seam glide starts from that scenario); none (the shared market) before Act III.
 */
export function scenarioOf(
  state: Pick<GameState, 'act' | 'scenarioId' | 'futureId'>,
): MarketKey | undefined {
  if (inActIV(state) && state.scenarioId && state.futureId)
    return `${state.scenarioId}.${state.futureId}`
  return inActIII(state) ? state.scenarioId : undefined
}

/** Market data for a week of a quarter (week 0–12). Throws past the end of the data, so a
 * wrong index fails loudly instead of reading undefined. Pass `scenarioOf(state)` as `scenario`
 * to read an Act III scenario's market; leave it out for the shared Act I/II market. */
export function marketWeek(
  quarter: number,
  week: number,
  scenario?: MarketKey | null,
): MarketWeek {
  const w = quarterWeeks(quarter, scenario)?.[week]
  if (!w)
    throw new RangeError(
      `No market data for quarter ${quarter}, week ${week} (the market has ${CONTENT.market.length} quarters of ${CONTENT.market[0].length} weeks)`,
    )
  return w
}

/** The week before, crossing into the previous quarter if needed. undefined for the very first week. */
export function previousMarketWeek(
  quarter: number,
  week: number,
  scenario?: MarketKey | null,
): MarketWeek | undefined {
  if (week > 0) return quarterWeeks(quarter, scenario)![week - 1]
  // Act I's first week has no week before it, as before the prologue existed (its 2016 weeks sit
  // at negative indices): a 2017 start stays exactly as it was.
  if (quarter === 0) return undefined
  // A scenario's first quarter follows Act II's last: quarterWeeks falls back to the shared market there.
  return quarterWeeks(quarter - 1, scenario)?.at(-1)
}

export function coinPrice(w: MarketWeek, coin: Coin): number {
  return coin === 'BTC' ? w.btc_usd : w.eth_usd
}

/** Dollars one healthy unit mines per day this week, before power. */
export function revenuePerUnitDay(model: Machine, w: MarketWeek): number {
  return model.coin === 'ETH'
    ? model.hashrate * w.eth_rev_usd_mh_day
    : model.hashrate * w.btc_hashprice_usd_th_day
}

/**
 * Act II prices for machines with an `act2_price` (owner decision B7): the quarter's $/TH tier
 * (its first week, the Plan-phase price) × the machine's TH/s is the new price; used = new ×
 * the used/new ratio of the model and quarter named in `used_ratio_from`. undefined outside
 * Act II or for machines without Act II pricing (GPU rigs keep their held 2022Q3 prices).
 */
export function act2Prices(
  model: Machine,
  quarter: number,
  scenario?: MarketKey | null,
): { newUsd: number; usedUsd: number } | undefined {
  const price = model.act2_price
  // Act II, and Act III on its scenario's weekly $/TH tiers (M11.5a, same tier mapping per model).
  if (!price || !isAct2RulesQuarter(quarter)) return undefined
  const perTh = marketWeek(quarter, 0, scenario)[`asic_price_usd_th_${price.tier}`]
  if (perTh === null) return undefined
  const from = getModel(price.used_ratio_from.model)!
  const q = price.used_ratio_from.quarter
  const newUsd = perTh * model.hashrate
  return {
    newUsd,
    usedUsd: newUsd * (from.price_used[q]! / from.price_new[q]!),
  }
}

/**
 * Purchase price this quarter, or undefined if it can't be bought (not out yet, or retail ended).
 * Act I prices come from machines.json. From 2022Q4 on, ASICs follow the $/TH tiers (act2Prices;
 * an ASIC whose retail ended stays used-only; the S21's used market opens at act2_used_from);
 * other machines keep their 2022Q3 prices.
 */
export function buyPrice(
  model: Machine,
  quarter: number,
  condition: Condition,
  scenario?: MarketKey | null,
): number | undefined {
  const label = CONTENT.quarters[quarter]
  if (isPrologueModel(model)) {
    if (label < model.available_from) return undefined
    return prologuePrice(
      condition === 'new' ? model.price_new : model.price_used,
      label,
      true,
    )
  }
  const act2 = act2Prices(model, quarter, scenario)
  if (act2) {
    if (label < model.available_from) return undefined
    if (condition === 'new')
      return model.retail_new_ends && label > model.retail_new_ends
        ? undefined
        : act2.newUsd
    return model.act2_used_from && label < model.act2_used_from
      ? undefined
      : act2.usedUsd
  }
  const q = act1ValueQuarter(quarter)
  if (q < model.available_from) return undefined
  if (condition === 'new') return model.price_new[q]
  // The 2020Q4–2022Q1 GPU shortage: used rigs cost at least the new price (machines.json gpu_cap).
  const cap = CONTENT.gpuCap
  const used = model.price_used[q]
  const newPrice = model.price_new[q]
  if (
    model.coin === 'ETH' &&
    q >= cap.window[0] &&
    q <= cap.window[1] &&
    used !== undefined &&
    newPrice !== undefined
  )
    return Math.max(used, newPrice * cap.usedPriceMinNewMult)
  return used
}

/**
 * What one working unit sells for: the market's used price. In Act II, ASICs sell at their
 * tier-based used price (even before a used market opens for buyers); others at 2022Q3's.
 */
export function sellPrice(
  model: Machine,
  quarter: number,
  scenario?: MarketKey | null,
): number {
  if (isPrologueModel(model))
    return (
      prologuePrice(model.price_used, CONTENT.quarters[quarter], false) ?? 0
    )
  const act2 = act2Prices(model, quarter, scenario)
  if (act2) return act2.usedUsd
  const held = model.price_used[act1ValueQuarter(quarter)] ?? 0
  // Act II GPU rigs (parked or not) lose value on the Act II GPU resale curve from 2022Q4
  // (owner, 28 Sep 2026: hold_and_wait's "resale keeps decaying on the normal curve").
  if (model.coin === 'ETH' && isAct2RulesQuarter(quarter)) {
    const r = BALANCE.projects.gpuResidual
    const years = (quarter - CONTENT.acts[1].firstQuarter) / 4
    return held * Math.max(r.floor, 1 - r.declinePerYear * years)
  }
  return held
}

/** Quarters from order to delivery. Used machines are delivered at once. */
export function leadTimeQuarters(
  model: Machine,
  quarter: number,
  condition: Condition,
): number {
  if (condition === 'used') return 0
  return (
    model.lead_time_quarters[act1ValueQuarter(quarter)] ??
    model.lead_time_quarters.default
  )
}
