// Life in the prologue (Alpha 0.3 §2.3, §2.4, §2.7, §2.11; prologue.json): the household (its
// patience card), moving out into the garage, the small unit, the wallet backup, conferences and
// their used-machine offer, and vanity purchases. Plan-phase rules; the reducer calls these.
import { CONTENT } from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import { logEntry, roundCents, type GameState, type Site } from '../state.ts'
import { addMachines, removeMachines } from '../systems/machines.ts'
import { buyPrice, getModel } from '../systems/market.ts'
import {
  P,
  depositUsd,
  householdTier,
  siteCapacityKw,
  siteLoadKw,
} from './setup.ts'

const label = (q: number) => CONTENT.quarters[q] ?? ''
const fail = (key: Message['key'], params?: Message['params']): Message => ({
  key,
  ...(params ? { params } : {}),
})
const tier = (id: string) => CONTENT.siteTiers.find((t) => t.id === id)!

/** Bandwidth left for an action that costs `cost`, or the refusal. */
function needBandwidth(s: GameState, cost: number): Message | undefined {
  return s.bandwidth < cost
    ? fail('error.no_bandwidth', { needed: cost, have: s.bandwidth })
    : undefined
}

/**
 * Into the garage (moving out, or the handover): a garage site; the household sites' machines move
 * in, and what doesn't fit is sold at the used price; the household sites go.
 */
export function moveIntoGarage(s: GameState, readyQuarter: number): Site {
  const garageTier = tier('garage')
  let garage = s.sites.find((x) => x.tier === garageTier.id)
  if (!garage) {
    garage = {
      id: `site-${s.nextId++}`,
      tier: garageTier.id,
      readyQuarter,
      rentUsdQ: garageTier.rent_usd_q,
      powerPriceMult: 1,
      flaw: null,
    }
    s.sites.push(garage)
  }
  const home = s.sites.filter((x) => householdTier(x.tier))
  let room = siteCapacityKw(garage) - siteLoadKw(s, garage.id)
  for (const lot of s.machines.filter((l) =>
    home.some((h) => h.id === l.siteId),
  )) {
    const kw = getModel(lot.model)!.power_kw
    const fit = Math.max(0, Math.min(lot.count, Math.floor((room + 1e-9) / kw)))
    if (fit < lot.count) s.cash += removeMachines(s, lot, lot.count - fit)
    if (fit > 0) {
      lot.siteId = garage.id
      room -= fit * kw
    }
  }
  s.sites = s.sites.filter((x) => !householdTier(x.tier))
  s.cash = roundCents(s.cash)
  return garage
}

export function moveOutBlocker(s: GameState): Message | undefined {
  const p = s.prologue!
  if (!p.livingAtHome) return fail('error.p0_moved_out')
  const deposit = depositUsd(s.quarter)
  if (s.cash < deposit)
    return fail('error.no_cash', { costUsd: deposit, cashUsd: s.cash })
  return needBandwidth(s, P().bandwidth_costs.build)
}

/**
 * Moving out (§2.11): the deposit now and rent every week after; household power, patience and the
 * income end; the garage opens (your machines move in); +1 Bandwidth from next quarter; the
 * wallet backup lapses (a new place, a new setup).
 */
export function moveOut(s: GameState): Message | undefined {
  const blocked = moveOutBlocker(s)
  if (blocked) return blocked
  const p = s.prologue!
  const deposit = depositUsd(s.quarter)
  s.cash = roundCents(s.cash - deposit)
  s.bandwidth -= P().bandwidth_costs.build
  p.livingAtHome = false
  p.householdCard = false
  p.cutLoadUntil = null
  p.backup = false
  p.flags.push('moved_out')
  moveIntoGarage(s, s.quarter)
  logEntry(s, 'log.p0_moved_out', { costUsd: deposit })
  return undefined
}

/**
 * The household's card (patience at 0, shown in week 1): move out now, or cut the load to the
 * threshold for the rest of this quarter.
 */
export function answerHousehold(
  s: GameState,
  choice: 'move_out' | 'cut_load',
): Message | undefined {
  const p = s.prologue!
  if (!p.householdCard) return fail('error.bad_choice')
  if (choice === 'move_out') {
    // The card's move-out needs no Bandwidth (it's the household's call).
    const deposit = depositUsd(s.quarter)
    if (s.cash < deposit)
      return fail('error.no_cash', { costUsd: deposit, cashUsd: s.cash })
    s.bandwidth += P().bandwidth_costs.build
    const refused = moveOut(s)
    if (refused) s.bandwidth -= P().bandwidth_costs.build
    return refused
  }
  p.householdCard = false
  p.cutLoadUntil = s.quarter
  p.patience = P().household.patience_after_cut
  logEntry(s, 'log.p0_household_cut')
  return undefined
}

/** The home rig (a desk and a power strip in your room): $300, 1 Bandwidth. */
export function buildHomeRig(s: GameState): Message | undefined {
  const p = s.prologue!
  const t = householdTier('home_rig')!
  if (!p.livingAtHome) return fail('error.p0_moved_out')
  if (s.sites.some((x) => x.tier === t.id)) return fail('error.p0_have_site')
  if (s.cash < t.capex_usd)
    return fail('error.no_cash', { costUsd: t.capex_usd, cashUsd: s.cash })
  const bw = needBandwidth(s, P().bandwidth_costs.build)
  if (bw) return bw
  s.cash -= t.capex_usd
  s.bandwidth -= P().bandwidth_costs.build
  s.sites.push({
    id: `site-${s.nextId++}`,
    tier: t.id,
    readyQuarter: s.quarter,
    rentUsdQ: 0,
    powerPriceMult: 1,
    flaw: null,
  })
  logEntry(s, 'log.p0_home_rig', { costUsd: t.capex_usd })
  return undefined
}

export function smallUnitBlocker(s: GameState): Message | undefined {
  const rule = P().act1_tiers.small_unit
  const t = tier('small_unit')
  if (s.prologue!.livingAtHome) return fail('error.p0_at_home')
  if (rule?.from && label(s.quarter) < rule.from)
    return fail('error.p0_not_yet', { quarter: rule.from })
  if (s.sites.some((x) => x.tier === t.id)) return fail('error.p0_have_site')
  const capex = typeof t.capex_usd === 'number' ? t.capex_usd : 0
  if (s.cash < capex)
    return fail('error.no_cash', { costUsd: capex, cashUsd: s.cash })
  return needBandwidth(s, P().bandwidth_costs.build)
}

/** Act I's small unit (from 2014Q1, once you've moved out): Act I's cost, rent and build time. */
export function buildSmallUnit(s: GameState): Message | undefined {
  const blocked = smallUnitBlocker(s)
  if (blocked) return blocked
  const t = tier('small_unit')
  const capex = typeof t.capex_usd === 'number' ? t.capex_usd : 0
  s.cash = roundCents(s.cash - capex)
  s.bandwidth -= P().bandwidth_costs.build
  s.sites.push({
    id: `site-${s.nextId++}`,
    tier: t.id,
    readyQuarter: s.quarter + t.build_quarters,
    rentUsdQ: typeof t.rent_usd_q === 'number' ? t.rent_usd_q : 0,
    powerPriceMult: 1,
    flaw: null,
  })
  logEntry(s, 'log.p0_small_unit', { costUsd: capex })
  return undefined
}

/** Back up your wallet (§2.7): 1 Bandwidth, $0. */
export function backUpWallet(s: GameState): Message | undefined {
  const p = s.prologue!
  const rule = P().wallet_loss
  if (p.backup) return fail('error.p0_backed_up')
  const bw = needBandwidth(s, rule.backup_bandwidth)
  if (bw) return bw
  if (s.cash < rule.backup_cash_usd)
    return fail('error.no_cash', {
      costUsd: rule.backup_cash_usd,
      cashUsd: s.cash,
    })
  s.bandwidth -= rule.backup_bandwidth
  s.cash -= rule.backup_cash_usd
  p.backup = true
  logEntry(s, 'log.p0_backup')
  return undefined
}

/** A new PC-class machine means a new setup: the backup lapses. */
export function onMachineBought(s: GameState, model: string): void {
  const p = s.prologue!
  if (p.backup && P().wallet_loss.pc_class.includes(model)) {
    p.backup = false
    logEntry(s, 'log.p0_backup_lapsed')
  }
}

/** The conference open this quarter (not yet attended), if any. */
export function conferenceNow(s: GameState) {
  const p = s.prologue!
  return P().conferences.find(
    (c) => c.quarter === label(s.quarter) && !p.conferences.includes(c.id),
  )
}

/** The machine a conference contact offers: the newest model sold used this quarter. */
export function conferenceOfferModel(s: GameState): string | undefined {
  const models = CONTENT.prologue.machines.filter(
    (m) =>
      !P().not_for_sale.includes(m.id) &&
      buyPrice(m, s.quarter, 'used') !== undefined,
  )
  return models.at(-1)?.id
}

/** Go to a conference (§2.11): the travel cost; a contact (+10 pp on-time pre-orders) and a used offer. */
export function attendConference(
  s: GameState,
  id: string,
): Message | undefined {
  const p = s.prologue!
  const c = conferenceNow(s)
  if (!c || c.id !== id) return fail('error.p0_no_conference')
  if (s.cash < c.cost_usd)
    return fail('error.no_cash', { costUsd: c.cost_usd, cashUsd: s.cash })
  s.cash = roundCents(s.cash - c.cost_usd)
  p.conferences.push(c.id)
  const model = conferenceOfferModel(s)
  if (model)
    p.usedOffer = {
      model,
      quarter: s.quarter,
      discount: P().conference_effect.used_offer_discount,
    }
  logEntry(s, 'log.p0_conference', { costUsd: c.cost_usd })
  return undefined
}

/** The contact's offer: one used machine at a discount, this quarter only. */
export function usedOfferPrice(s: GameState): number | undefined {
  const o = s.prologue!.usedOffer
  if (!o || o.quarter !== s.quarter) return undefined
  const unit = buyPrice(getModel(o.model)!, s.quarter, 'used')
  return unit === undefined ? undefined : roundCents(unit * (1 - o.discount))
}

export function takeUsedOffer(
  s: GameState,
  siteId: string,
): Message | undefined {
  const p = s.prologue!
  const cost = usedOfferPrice(s)
  if (cost === undefined || !p.usedOffer) return fail('error.p0_no_offer')
  const model = getModel(p.usedOffer.model)!
  const site = s.sites.find((x) => x.id === siteId)
  if (!site) return fail('error.unknown_site')
  const freeKw = siteCapacityKw(site) - siteLoadKw(s, site.id)
  if (model.power_kw > freeKw + 1e-9)
    return fail('error.no_capacity', {
      tier: site.tier,
      freeKw,
      neededKw: model.power_kw,
    })
  if (s.cash < cost) return fail('error.no_cash', { costUsd: cost, cashUsd: s.cash })
  s.cash = roundCents(s.cash - cost)
  addMachines(s, model.id, 'used', 1, siteId)
  onMachineBought(s, model.id)
  p.usedOffer = null
  logEntry(s, 'log.bought', {
    count: 1,
    model: model.id,
    condition: 'used',
    costUsd: cost,
  })
  return undefined
}

/** A vanity purchase (§2.11): cash for a chapter-report line and a news mention. Once each. */
export function buyVanity(s: GameState, id: string): Message | undefined {
  const p = s.prologue!
  const item = P().vanity.find((v) => v.id === id)
  if (!item) return fail('error.bad_choice')
  if (p.vanity.includes(id)) return fail('error.p0_have_vanity')
  if (s.cash < item.cost_usd)
    return fail('error.no_cash', { costUsd: item.cost_usd, cashUsd: s.cash })
  s.cash = roundCents(s.cash - item.cost_usd)
  p.vanity.push(id)
  logEntry(s, 'log.p0_vanity', { item: id, costUsd: item.cost_usd })
  return undefined
}
