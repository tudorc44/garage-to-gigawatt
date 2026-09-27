// The handover to Act I (Alpha 0.3 §2.12; P0-1, P0-9): after the prologue's chapter report, Act I
// starts in 2017Q1 with everything the prologue ended with: cash, BTC and ETH (their custody kept for
// display), machines and sites. A player still at home moves into the garage (the deposit paid if
// affordable, else waived); the income stops. The household sites go: their machines move to the
// garage, and what doesn't fit is sold at the used price (Prologue choice). antminer_s9_early
// becomes Act I's s9; other prologue machines carry as themselves and run under Act I's rules.
import { BALANCE, CONTENT } from '../../content/index.ts'
import { emptyEventState } from '../systems/eventEffects.ts'
import { removeMachines } from '../systems/machines.ts'
import { getModel } from '../systems/market.ts'
import {
  emptyQuarterStats,
  logEntry,
  roundCents,
  type GameState,
  type Site,
} from '../state.ts'
import { prologueNetWorth } from './engine.ts'
import { P, depositUsd, householdTier, siteCapacityKw } from './setup.ts'

export function handOverToAct1(s: GameState): void {
  const p = s.prologue!
  const garageTier = CONTENT.siteTiers.find((t) => t.id === BALANCE.startSite)!
  // Still at home: into the garage (the deposit if you can pay it).
  let garage: Site | undefined = s.sites.find((x) => x.tier === garageTier.id)
  if (!garage) {
    const deposit = depositUsd(s.quarter)
    if (s.cash >= deposit) s.cash = roundCents(s.cash - deposit)
    garage = {
      id: `site-${s.nextId++}`,
      tier: garageTier.id,
      readyQuarter: 0,
      rentUsdQ: garageTier.rent_usd_q,
      powerPriceMult: 1,
      flaw: null,
    }
    s.sites.push(garage)
  }
  // Machines at household sites move into the garage; what doesn't fit is sold.
  const home = s.sites.filter((x) => householdTier(x.tier))
  let room =
    siteCapacityKw(garage) -
    s.machines
      .filter((l) => l.siteId === garage!.id)
      .reduce((kw, l) => kw + l.count * getModel(l.model)!.power_kw, 0)
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
  // Act I's own S9.
  for (const lot of s.machines) {
    const to = P().handover.model_map[lot.model]
    if (to) lot.model = to
    lot.earnsFromQuarter = Math.min(lot.earnsFromQuarter, 0)
  }
  for (const site of s.sites) site.readyQuarter = Math.min(site.readyQuarter, 0)
  s.prologueCarry = {
    startNetWorthUsd: prologueNetWorth(s),
    onExchange: { ...p.onExchange },
    lost: structuredClone(p.lost),
  }
  delete s.prologue
  s.act = 1
  s.quarter = 0
  s.week = 0
  s.phase = 'plan'
  s.cash = roundCents(s.cash)
  s.bandwidth = BALANCE.bandwidth.perQuarter
  s.reports = []
  s.events = emptyEventState()
  s.quarterStats = emptyQuarterStats()
  s.interrupt = null
  s.interruptsThisQuarter = 0
  logEntry(s, 'log.p0_handover', {
    valueUsd: s.prologueCarry.startNetWorthUsd,
  })
}
