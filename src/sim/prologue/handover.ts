// The handover to Act I (Alpha 0.3 §2.12; P0-1, P0-9): after the prologue's chapter report, Act I
// starts in 2017Q1 with everything the prologue ended with: cash, BTC and ETH (their custody kept for
// display), machines and sites. A player still at home moves into the garage (the deposit paid if
// affordable, else waived); the income stops. The household sites go: their machines move to the
// garage, and what doesn't fit is sold at the used price (Prologue choice). antminer_s9_early
// becomes Act I's s9; other prologue machines carry as themselves and run under Act I's rules.
import { BALANCE } from '../../content/index.ts'
import { emptyEventState } from '../systems/eventEffects.ts'
import {
  emptyQuarterStats,
  logEntry,
  type GameState,
} from '../state.ts'
import { prologueNetWorth } from './engine.ts'
import { book, roundCash } from '../ledger.ts'
import { buyPrice, getModel } from '../systems/market.ts'
import { moveIntoGarage } from './life.ts'
import { boxedPreorders, vendor } from './preorders.ts'
import { P, depositUsd } from './setup.ts'

export function handOverToAct1(s: GameState): void {
  const p = s.prologue!
  // Still at home: into the garage (the deposit if you can pay it). Machines at household sites
  // move in; what doesn't fit is sold.
  if (p.livingAtHome) {
    const deposit = depositUsd(s.quarter)
    if (s.cash >= deposit) {
      book(s, 'one_offs', -deposit)
      roundCash(s)
    }
  }
  moveIntoGarage(s, 0)
  // Pre-ordered units still in their box are sold at the used price.
  for (const o of boxedPreorders(s)) {
    const model = getModel(vendor(o.vendor)!.model)!
    book(s, 'asset_sales', buyPrice(model, s.quarter, 'used') ?? 0)
    o.delivered = true
  }
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
  roundCash(s)
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
