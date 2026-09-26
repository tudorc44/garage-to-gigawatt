// Scripted strategies for the sim-runner. A bot looks at the Plan-phase state and
// returns actions, exactly like a player would, so it can't break any game rule.
import { BALANCE, CONTENT } from '../src/content/index.ts'
import type { Action } from '../src/sim/actions.ts'
import type { Strategy } from '../src/sim/replay.ts'
import type { Condition, GameState } from '../src/sim/state.ts'
import { repairCostPerUnit } from '../src/sim/systems/machines.ts'
import {
  buyPrice,
  marketWeek,
  revenuePerUnitDay,
} from '../src/sim/systems/market.ts'
import {
  baseCapexUsd,
  capacityKw,
  isReady,
  powerPriceUsdKwh,
  topTierIndex,
  usedKw,
} from '../src/sim/systems/sites.ts'

interface BotSettings {
  /** Share of mined coins to keep (0–1), set in the first quarter. */
  hodlPct: number
  /** Cash the bot won't spend, given its current cash. */
  reserveUsd: (cash: number) => number
  /** Only buy machines that pay back within this many quarters at today's prices. */
  maxPaybackQuarters: number
  /** Price-alert answer: sell on drops, or always hold. */
  sellOnDrops: boolean
}

function makeBot(settings: BotSettings): Strategy {
  return {
    plan(s: GameState): Action[] {
      const actions: Action[] = []
      let cash = s.cash
      const bandwidth = s.bandwidth
      const spendable = () => cash - settings.reserveUsd(s.cash)

      if (s.quarter === 0) {
        actions.push({ type: 'SET_HODL', pct: settings.hodlPct })
      }

      // 1. Repair broken machines.
      for (const lot of s.machines) {
        const cost = lot.failed * repairCostPerUnit(lot.model)
        if (lot.failed > 0 && cost <= spendable()) {
          actions.push({ type: 'REPAIR_MACHINES', lotId: lot.id })
          cash -= cost
        }
      }

      // 2. Climb the site ladder once the current top site is running and full-ish.
      const top = topTierIndex(s)
      const topSite = s.sites.find(
        (x) => CONTENT.siteTiers.findIndex((t) => t.id === x.tier) === top,
      )!
      const next = CONTENT.siteTiers[top + 1]
      const topIsFull =
        isReady(topSite, s.quarter) &&
        usedKw(s, topSite.id) >= capacityKw(topSite) * 0.8
      const nextOpen =
        next &&
        !(
          next.available_from &&
          CONTENT.quarters[s.quarter] < next.available_from
        )
      if (next && nextOpen && topIsFull && bandwidth >= 1) {
        const direct = (
          BALANCE.sites.noScoutingNeeded as readonly string[]
        ).includes(next.id)
        const offers = s.siteOffers
          .filter((o) => o.tier === next.id)
          .sort((a, b) => a.capexUsd - b.capexUsd)
        if (direct && baseCapexUsd(next) <= spendable()) {
          actions.push({ type: 'BUILD_SITE', tier: next.id })
          cash -= baseCapexUsd(next)
        } else if (!direct && offers[0] && offers[0].capexUsd <= spendable()) {
          actions.push({ type: 'BUILD_SITE', offerId: offers[0].id })
          cash -= offers[0].capexUsd
        } else if (
          !direct &&
          offers.length === 0 &&
          baseCapexUsd(next) * 0.85 <= spendable()
        ) {
          actions.push({ type: 'SCOUT_SITES', tier: next.id })
        }
      }

      // 3. Fill free space with the best machine per dollar, cheapest power first.
      const w = marketWeek(s.quarter, 0)
      const ready = s.sites
        .filter((x) => isReady(x, s.quarter))
        .sort(
          (a, b) =>
            powerPriceUsdKwh(a, s.quarter) - powerPriceUsdKwh(b, s.quarter),
        )
      for (const site of ready) {
        const power = powerPriceUsdKwh(site, s.quarter)
        const options = CONTENT.machines.flatMap((m) =>
          (['new', 'used'] as Condition[]).map((condition) => {
            const price = buyPrice(m, s.quarter, condition)
            const dailyProfit =
              revenuePerUnitDay(m, w) - m.power_kw * 24 * power
            const payback = price ? price / (dailyProfit * 91) : Infinity
            return { m, condition, price, dailyProfit, payback }
          }),
        )
        const best = options
          .filter(
            (o) =>
              o.price !== undefined &&
              o.dailyProfit > 0 &&
              o.payback <= settings.maxPaybackQuarters,
          )
          .sort((a, b) => a.payback - b.payback)[0]
        if (!best) continue
        const count = Math.min(
          Math.floor((capacityKw(site) - usedKw(s, site.id)) / best.m.power_kw),
          Math.floor(spendable() / best.price!),
        )
        if (count < 1) continue
        actions.push({
          type: 'BUY_MACHINES',
          model: best.m.id,
          condition: best.condition,
          count,
          siteId: site.id,
        })
        cash -= best.price! * count
      }
      return actions
    },
    answer: (s) =>
      settings.sellOnDrops && s.interrupt!.changePct < 0 ? 'sell' : 'hold',
  }
}

export const BOTS: Record<string, Strategy> = {
  /** Keeps half its cash, only buys machines that pay back within 3 quarters, holds 20%. */
  cautious: makeBot({
    hodlPct: 0.2,
    reserveUsd: (cash) => Math.max(5_000, cash * 0.5),
    maxPaybackQuarters: 3,
    sellOnDrops: true,
  }),
  /** Spends every dollar on machines and sites whenever they make money; sells all coins. */
  reinvest: makeBot({
    hodlPct: 0,
    reserveUsd: () => 0,
    maxPaybackQuarters: Infinity,
    sellOnDrops: false,
  }),
  /** Keeps every coin it mines; spends only its cash; never sells in alerts. */
  hodl: makeBot({
    hodlPct: 1,
    reserveUsd: () => 1_000,
    maxPaybackQuarters: Infinity,
    sellOnDrops: false,
  }),
  /** Raises friends & family in 2017Q1, builds the small unit, fills every site with GPU Gen 1 rigs. */
  'ff-climb': ffClimb(),
}

/**
 * Probes: not strategies, just measurements. garage-max buys 5 GPU Gen 1 rigs on day one
 * (a full garage), sells every coin and never spends again: the best case for garage-only cash.
 */
export const PROBES: Record<string, Strategy> = {
  'garage-max': {
    plan: (s) =>
      s.quarter === 0
        ? [
            {
              type: 'BUY_MACHINES',
              model: 'gpu_gen1',
              condition: 'new',
              count: 5,
              siteId: 'site-1',
            },
          ]
        : s.machines
            .filter(
              (l) =>
                l.failed > 0 && l.failed * repairCostPerUnit(l.model) <= s.cash,
            )
            .map((l) => ({ type: 'REPAIR_MACHINES', lotId: l.id }) as Action),
  },
}

/**
 * ff-climb (design brief): raise F&F in 2017Q1, build the small unit as soon as it can
 * pay for it, fill free capacity with GPU Gen 1 rigs, sell 100% of mined coins.
 * It keeps one quarter's rent in reserve: rent starts when a site is signed, but
 * machines only earn from the next quarter, so spending every dollar means a forced sale.
 */
function ffClimb(): Strategy {
  const rig = 'gpu_gen1'
  const smallUnit = CONTENT.siteTiers.find((t) => t.id === 'small_unit')!
  return {
    plan(s: GameState): Action[] {
      const actions: Action[] = []
      let cash = s.cash
      let bandwidth = s.bandwidth
      const ff = CONTENT.ladder.friends_family
      const q = CONTENT.quarters[s.quarter]
      if (
        !s.raisesDone.includes(ff.id) &&
        q >= ff.window[0] &&
        q <= ff.window[1] &&
        bandwidth >= 2
      ) {
        actions.push({ type: 'RAISE', round: ff.id })
        cash += ff.amount_usd
        bandwidth -= 2
      }
      // One quarter of rent, plus a $1,000 cushion for power and cent rounding.
      let rentReserve = 1_000 + s.sites.reduce((sum, x) => sum + x.rentUsdQ, 0)

      for (const lot of s.machines) {
        const cost = lot.failed * repairCostPerUnit(lot.model)
        if (lot.failed > 0 && cash - cost >= rentReserve) {
          actions.push({ type: 'REPAIR_MACHINES', lotId: lot.id })
          cash -= cost
        }
      }

      // The small unit needs no scouting (BALANCE.sites.noScoutingNeeded): build it directly.
      const capex = baseCapexUsd(smallUnit)
      const sites = [...s.sites]
      if (
        !s.sites.some((x) => x.tier === smallUnit.id) &&
        bandwidth >= 1 &&
        cash - capex >= rentReserve + smallUnit.rent_usd_q
      ) {
        actions.push({ type: 'BUILD_SITE', tier: smallUnit.id })
        cash -= capex
        rentReserve += smallUnit.rent_usd_q
        // BUILD_SITE takes the next id; RAISE and REPAIR don't use ids.
        sites.push({
          id: `site-${s.nextId}`,
          tier: smallUnit.id,
          readyQuarter: s.quarter + smallUnit.build_quarters,
          rentUsdQ: smallUnit.rent_usd_q,
          powerPriceMult: 1,
          flaw: null,
        })
      }

      // Fill every site (built or still being built) with the cheaper of new/used GPU Gen 1.
      const model = CONTENT.machines.find((m) => m.id === rig)!
      const prices = (['used', 'new'] as Condition[])
        .map((c) => ({ c, p: buyPrice(model, s.quarter, c) }))
        .filter((x): x is { c: Condition; p: number } => x.p !== undefined)
        .sort((a, b) => a.p - b.p)
      const cheapest = prices[0]
      if (!cheapest) return actions
      for (const site of sites) {
        const free = capacityKw(site) - usedKw(s, site.id)
        const count = Math.min(
          Math.floor(free / model.power_kw + 1e-9),
          Math.floor((cash - rentReserve) / cheapest.p),
        )
        if (count < 1) continue
        actions.push({
          type: 'BUY_MACHINES',
          model: rig,
          condition: cheapest.c,
          count,
          siteId: site.id,
        })
        cash -= cheapest.p * count
      }
      return actions
    },
  }
}
