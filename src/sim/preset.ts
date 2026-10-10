// The standalone preset (scope 0.2 §2.10, doc 18 §2.4; wireframe A2-01 "Start at Act II"): Act II
// without Act I. "Q4 2022: a mid-size miner" is built at the start of 2022Q3, plays that quarter
// (so it has a quarter report to value, rate and price it by), and then stands at the Merge
// decision: the player picks a Merge choice, and the game goes straight to the Act II intro.
import { BALANCE, CONTENT, actLastQuarter } from '../content/index.ts'
import { applyAction } from './actions.ts'
import { advance } from './advance.ts'
import { newGame, roundCents, type GameState, type Site } from './state.ts'
import { signContract } from './systems/contracts.ts'
import { addSite } from './systems/siteSerials.ts'
import { recalcHeat } from './systems/heat.ts'
import { defaultChoice } from './systems/interrupts.ts'
import { getModel } from './systems/market.ts'
import {
  baseCapexUsd,
  capacityKw,
  getTier,
  normalPriceUsdKwh,
} from './systems/sites.ts'

function act(state: GameState, action: Parameters<typeof applyAction>[1]) {
  const r = applyAction(state, action)
  if (!r.ok) throw new Error(`preset: ${action.type} failed: ${r.error.key}`)
  return r.state
}

/** The preset company at the Merge decision (end of 2022Q3), from `seed`. */
export function presetGame(seed: number): GameState {
  const p = BALANCE.preset
  const c = CONTENT.preset
  let s: GameState = {
    ...newGame(seed),
    quarter: actLastQuarter(1),
    preset: true,
    founderStake: c.founderStake,
    raisesDone: [...p.raisesDone],
  }
  const model = getModel(p.fleet.model)!
  for (const spec of p.sites) {
    const tier = getTier(spec.tier)!
    const site: Site = {
      id: `site-${s.nextId++}`,
      tier: tier.id,
      readyQuarter: 0,
      rentUsdQ: tier.rent_usd_q,
      powerPriceMult: 1,
      flaw: null,
    }
    if (spec.phases > 0 && tier.phases) {
      site.phases = Array<number>(spec.phases).fill(0)
      site.phaseCapexUsd = Math.round(
        baseCapexUsd(tier) * tier.phases.cost_share,
      )
    }
    addSite(s, site)
    const type = BALANCE.sites.defaultPowerOption
    signContract(
      s,
      site,
      type,
      normalPriceUsdKwh(site, s.quarter, type),
      CONTENT.negotiation.terms[0],
    )
    s.machines.push({
      id: `lot-${s.nextId++}`,
      model: model.id,
      siteId: site.id,
      condition: p.fleet.condition as 'used',
      count: Math.floor(
        (capacityKw(site) * p.fleet.shareOfCapacity) / model.power_kw,
      ),
      failed: 0,
      earnsFromQuarter: 0,
    })
    recalcHeat(s, site)
  }
  // The equipment debt: one loan at the last Act I era's terms, taken now.
  const era = CONTENT.equipmentLoans.reduce((a, b) =>
    b.toYear > a.toYear ? b : a,
  )
  const weeks = era.tenorQuarters * BALANCE.weeksPerQuarter
  s.equipmentLoan = {
    amountUsd: c.equipmentDebtUsd,
    balanceUsd: c.equipmentDebtUsd,
    apr: era.apr,
    weeklyPrincipalUsd: roundCents(c.equipmentDebtUsd / weeks),
    weeksLeft: weeks,
    takenQuarter: s.quarter,
  }
  s.cash = c.cashUsd
  s.log = []
  // Play 2022Q3 with the default answers, for a real quarter report.
  s = act(s, { type: 'END_PLAN' })
  while (s.phase === 'live')
    s = s.interrupt
      ? act(s, { type: 'RESOLVE_INTERRUPT', choice: defaultChoice(s) })
      : advance(s)
  // The preset's balance sheet at the start of Act II: its cash and equipment debt (doc 18 §2.4).
  const report = s.reports.at(-1)!
  const cashShift = c.cashUsd - s.cash
  const debtShift = c.equipmentDebtUsd - (s.equipmentLoan?.balanceUsd ?? 0)
  s.cash = c.cashUsd
  if (s.equipmentLoan) s.equipmentLoan.balanceUsd = c.equipmentDebtUsd
  report.cash = s.cash
  report.debtUsd += debtShift
  report.valuationUsd += cashShift - debtShift
  return act(s, { type: 'NEXT_QUARTER' }) // → the Merge decision
}
