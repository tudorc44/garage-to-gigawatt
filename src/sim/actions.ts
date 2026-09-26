// Player decisions as plain action objects. applyAction checks an action against the
// rules and returns either the new state or an error message (the old state is untouched).
import { BALANCE, CONTENT } from '../content/index.ts'
import type { Message, MessageKey, MessageParams } from '../i18n/t.ts'
import { logEntry, type Condition, type GameState } from './state.ts'
import {
  addMachines,
  purchaseCostUsd,
  removeMachines,
  repairCostPerUnit,
} from './systems/machines.ts'
import { raiseBlocker, takeRaise } from './systems/capital.ts'
import { resolveInterrupt } from './systems/interrupts.ts'
import { getModel, marketWeek } from './systems/market.ts'
import { treasuryValueUsd } from './systems/treasury.ts'
import { endQuarter, startNextQuarter } from './systems/quarter.ts'
import {
  baseCapexUsd,
  capacityKw,
  flawEffect,
  getTier,
  leavingTerms,
  rollOffers,
  tierIndex,
  topTierIndex,
  usedKw,
} from './systems/sites.ts'

export type Action =
  | {
      type: 'BUY_MACHINES'
      model: string
      condition: Condition
      count: number
      siteId: string
    }
  | { type: 'SELL_MACHINES'; lotId: string; count: number }
  | { type: 'REPAIR_MACHINES'; lotId: string }
  | { type: 'SET_HODL'; pct: number }
  | { type: 'SCOUT_SITES'; tier: string }
  /** Build from a scouted offer, or (tiers that need no scouting) straight from the tier. */
  | { type: 'BUILD_SITE'; offerId: string }
  | { type: 'BUILD_SITE'; tier: string }
  /** Break the site's lease: its machines are sold, a penalty is paid, rent stops. */
  | { type: 'LEAVE_SITE'; siteId: string }
  /** Take a funding round from capital.json (fixed offer). */
  | { type: 'RAISE'; round: string }
  /** Plan phase done: start the live quarter. */
  | { type: 'END_PLAN' }
  /** Answer the alert that paused the live quarter. */
  | { type: 'RESOLVE_INTERRUPT'; choice: string }
  /** Close the quarter report and go to the next Plan phase. */
  | { type: 'NEXT_QUARTER' }

export type ActionResult =
  { ok: true; state: GameState } | { ok: false; error: Message }

export function applyAction(state: GameState, action: Action): ActionResult {
  const next = structuredClone(state)
  const error = run(next, action)
  return error ? { ok: false, error } : { ok: true, state: next }
}

function fail(key: MessageKey, params?: MessageParams): Message {
  return { key, params }
}

function run(s: GameState, a: Action): Message | undefined {
  switch (a.type) {
    case 'END_PLAN':
      if (s.phase !== 'plan') return fail('error.wrong_phase')
      s.phase = 'live'
      s.week = 0
      s.quarterStats.startCash = s.cash
      s.quarterStats.startTreasuryUsd = treasuryValueUsd(
        s,
        marketWeek(s.quarter, 0),
      )
      return

    case 'RESOLVE_INTERRUPT': {
      if (s.phase !== 'live') return fail('error.wrong_phase')
      const error = resolveInterrupt(s, a.choice)
      if (error) return error
      // An alert in the last week holds the quarter open until it's answered.
      if (s.week === BALANCE.weeksPerQuarter) endQuarter(s)
      return
    }

    case 'NEXT_QUARTER':
      if (s.phase !== 'report') return fail('error.wrong_phase')
      startNextQuarter(s)
      return
  }

  // Everything below is a Plan-phase decision.
  if (s.phase !== 'plan') return fail('error.wrong_phase')

  switch (a.type) {
    case 'BUY_MACHINES': {
      const model = getModel(a.model)
      if (!model) return fail('error.unknown_model', { model: a.model })
      if (!Number.isInteger(a.count) || a.count < 1)
        return fail('error.bad_count')
      const cost = purchaseCostUsd(a.model, a.condition, a.count, s.quarter)
      if (cost === undefined) {
        return fail('error.not_for_sale', {
          model: a.model,
          condition: a.condition,
        })
      }
      const site = s.sites.find((x) => x.id === a.siteId)
      if (!site) return fail('error.unknown_site')
      const freeKw = capacityKw(site) - usedKw(s, site.id)
      const neededKw = model.power_kw * a.count
      if (neededKw > freeKw + 1e-9) {
        return fail('error.no_capacity', { tier: site.tier, freeKw, neededKw })
      }
      if (cost > s.cash)
        return fail('error.no_cash', { costUsd: cost, cashUsd: s.cash })
      s.cash -= cost
      addMachines(s, a.model, a.condition, a.count, site.id)
      logEntry(s, 'log.bought', {
        count: a.count,
        model: a.model,
        condition: a.condition,
        costUsd: cost,
      })
      return
    }

    case 'SELL_MACHINES': {
      const lot = s.machines.find((l) => l.id === a.lotId)
      if (!lot) return fail('error.unknown_lot')
      if (!Number.isInteger(a.count) || a.count < 1)
        return fail('error.bad_count')
      if (a.count > lot.count)
        return fail('error.too_many_units', { have: lot.count })
      const valueUsd = removeMachines(s, lot, a.count)
      s.cash += valueUsd
      logEntry(s, 'log.sold', { count: a.count, model: lot.model, valueUsd })
      return
    }

    case 'REPAIR_MACHINES': {
      const lot = s.machines.find((l) => l.id === a.lotId)
      if (!lot) return fail('error.unknown_lot')
      if (lot.failed === 0) return fail('error.nothing_to_repair')
      const cost = lot.failed * repairCostPerUnit(lot.model)
      if (cost > s.cash)
        return fail('error.no_cash', { costUsd: cost, cashUsd: s.cash })
      s.cash -= cost
      logEntry(s, 'log.repaired', {
        count: lot.failed,
        model: lot.model,
        costUsd: cost,
      })
      lot.failed = 0
      return
    }

    case 'RAISE': {
      const blocked = raiseBlocker(s, a.round)
      if (blocked) return blocked
      takeRaise(s, a.round)
      return
    }

    case 'SET_HODL': {
      if (!(a.pct >= 0 && a.pct <= 1)) return fail('error.bad_pct')
      if (s.hodlPct !== a.pct) logEntry(s, 'log.hodl', { sellPct: 1 - a.pct })
      s.hodlPct = a.pct
      return
    }

    case 'SCOUT_SITES': {
      const tier = getTier(a.tier)
      if (
        !tier ||
        tierIndex(a.tier) === 0 ||
        tierIndex(a.tier) > topTierIndex(s) + 1
      ) {
        return fail('error.cannot_scout', { tier: a.tier })
      }
      if (
        (BALANCE.sites.noScoutingNeeded as readonly string[]).includes(tier.id)
      ) {
        return fail('error.no_scouting_needed', { tier: tier.id })
      }
      const notYet = tierNotAvailable(s, tier.id)
      if (notYet) return notYet
      const cost = BALANCE.bandwidth.scout
      if (s.bandwidth < cost)
        return fail('error.no_bandwidth', { needed: cost, have: s.bandwidth })
      s.bandwidth -= cost
      // New offers for a tier replace any old ones for that tier.
      const offers = rollOffers(s, tier)
      s.siteOffers = [
        ...s.siteOffers.filter((o) => o.tier !== tier.id),
        ...offers,
      ]
      logEntry(s, 'log.scouted', { count: offers.length, tier: tier.id })
      return
    }

    case 'BUILD_SITE': {
      let terms: {
        tier: string
        rentUsdQ: number
        capexUsd: number
        powerPriceMult: number
        flaw: string | null
      }
      if ('offerId' in a) {
        const offer = s.siteOffers.find((o) => o.id === a.offerId)
        if (!offer) return fail('error.unknown_offer')
        terms = offer
      } else {
        const tier = getTier(a.tier)
        if (
          !tier ||
          tierIndex(a.tier) === 0 ||
          tierIndex(a.tier) > topTierIndex(s) + 1
        ) {
          return fail('error.cannot_scout', { tier: a.tier })
        }
        if (
          !(BALANCE.sites.noScoutingNeeded as readonly string[]).includes(
            tier.id,
          )
        ) {
          return fail('error.needs_scouting', { tier: tier.id })
        }
        terms = {
          tier: tier.id,
          rentUsdQ: tier.rent_usd_q,
          capexUsd: baseCapexUsd(tier),
          powerPriceMult: 1,
          flaw: null,
        }
      }
      const notYet = tierNotAvailable(s, terms.tier)
      if (notYet) return notYet
      const cost = BALANCE.bandwidth.build
      if (s.bandwidth < cost)
        return fail('error.no_bandwidth', { needed: cost, have: s.bandwidth })
      if (terms.capexUsd > s.cash) {
        return fail('error.no_cash', {
          costUsd: terms.capexUsd,
          cashUsd: s.cash,
        })
      }
      s.bandwidth -= cost
      s.cash -= terms.capexUsd
      const site = {
        id: `site-${s.nextId++}`,
        tier: terms.tier,
        readyQuarter: s.quarter + getTier(terms.tier)!.build_quarters,
        rentUsdQ: terms.rentUsdQ,
        powerPriceMult: terms.powerPriceMult,
        flaw: terms.flaw,
      }
      // The hidden flaw is revealed now that it's bought: delays and one-off costs apply.
      site.readyQuarter += flawEffect(site, 'delay_quarters') ?? 0
      s.cash += flawEffect(site, 'cash') ?? 0
      s.sites.push(site)
      logEntry(s, 'log.site_built', {
        tier: site.tier,
        costUsd: terms.capexUsd,
        quarter: CONTENT.quarters[site.readyQuarter] ?? '—',
      })
      if (site.flaw)
        logEntry(s, 'log.site_flaw', { tier: site.tier, flaw: site.flaw })
      if ('offerId' in a)
        s.siteOffers = s.siteOffers.filter((o) => o.id !== a.offerId)
      return
    }

    case 'LEAVE_SITE': {
      const site = s.sites.find((x) => x.id === a.siteId)
      if (!site) return fail('error.unknown_site')
      if (tierIndex(site.tier) === 0) return fail('error.cannot_leave_garage')
      const { penaltyUsd, machinesUsd } = leavingTerms(s, site)
      if (penaltyUsd > s.cash + machinesUsd) {
        return fail('error.no_cash', {
          costUsd: penaltyUsd,
          cashUsd: s.cash + machinesUsd,
        })
      }
      for (const lot of s.machines.filter((l) => l.siteId === site.id)) {
        const count = lot.count
        const valueUsd = removeMachines(s, lot, count)
        s.cash += valueUsd
        logEntry(s, 'log.sold', { count, model: lot.model, valueUsd })
      }
      s.cash -= penaltyUsd
      s.sites = s.sites.filter((x) => x !== site)
      logEntry(s, 'log.site_left', { tier: site.tier, penaltyUsd })
      return
    }
  }
}

function tierNotAvailable(s: GameState, tierId: string): Message | undefined {
  const from = getTier(tierId)!.available_from
  if (from && CONTENT.quarters[s.quarter] < from) {
    return fail('error.tier_not_available', { tier: tierId, from })
  }
}
