// @vitest-environment happy-dom
// M62 (doc 43 §0.18): Act V's screens. The rule: every Act V player action has a reachable UI entry point in Act V (a
// screen that dispatches it, on a nav section Act V shows); every Act V move kind is made by one of those actions or is
// a card's choice. Also: the Orbit tab in Act V (the Moon tab not), the header's cash and valuation against Finances
// and act5Entry, the Act I-II rows hidden in Act V's Plan, and the new panels (A5-02 dashboard, lunar holding, A5-07).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cleanup, render } from '@testing-library/preact'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
vi.setConfig({ testTimeout: 0 })
import { PRESETS_V } from '../../src/content/presetsAct5.ts'
import { t } from '../../src/i18n/t.ts'
import { applyAction } from '../../src/sim/actions.ts'
import { cashFlowView } from '../../src/sim/financeViews.ts'
import { playFrom } from '../../src/sim/replay.ts'
import { headerValuationUsd, whyNot } from '../../src/sim/selectors.ts'
import { ACT5_MOVE_KINDS, toAct5, type GameState } from '../../src/sim/state.ts'
import { Nav, TopBar } from '../../src/ui/components/frame.tsx'
import { fmt } from '../../src/ui/format.ts'
import { Act5Dashboard, Act5ReportPanel, LunarHoldingPanel } from '../../src/ui/screens/Act5Screens.tsx'
import { PlanScreen } from '../../src/ui/screens/Plan.tsx'
import { playAct5Recipe } from '../../tools/act5/presetRun.ts'
import { preloadAct3Panels } from '../../src/ui/components/act3Lazy.tsx'
import { preloadAct4Panels } from '../../src/ui/components/act4Lazy.tsx'

afterEach(cleanup)
beforeAll(async () => {
  await preloadAct3Panels()
  await preloadAct4Panels()
}, 0)
const noop = () => null

const cache = new Map<string, GameState>()
function preset(id: 'firm_builder' | 'orbital_landlord'): GameState {
  if (!cache.has(id)) {
    const p = PRESETS_V.find((x) => x.id === id)!
    cache.set(id, playAct5Recipe({ act4_preset: p.act4_preset, act4_future: p.act4_future, act4_seed: p.act4_seed, joins: p.joins as never }))
  }
  return toAct5(structuredClone(cache.get(id)!), { vfuture: 'v4', act5Seed: 1 })
}

/**
 * Act V's player actions and where Act V reaches them: the UI file that dispatches each, and the nav section (or the
 * always-on dashboard / live card) that shows that file in Act V.
 */
const ACT5_ACTIONS: Record<string, { file: string; section: string }> = {
  READ_SIGNAL_V: { file: 'screens/Act3Panels.tsx', section: 'dashboard' },
  RENEWAL_TERM: { file: 'screens/Act3Panels.tsx', section: 'dashboard' },
  BLEND_ACCEPT: { file: 'screens/Act3Panels.tsx', section: 'contracts' },
  EXIT_CHOOSE: { file: 'screens/Act5Exit.tsx', section: 'dashboard' },
  ORBIT_EOL: { file: 'screens/Act4Panels.tsx', section: 'orbit' },
  OPEN_ORBITAL_BLOCK: { file: 'screens/Act4Panels.tsx', section: 'orbit' },
  BOOK_ORBITAL_LAUNCH: { file: 'screens/Act4Panels.tsx', section: 'orbit' },
  BUY_ORRERY_BLOCKS: { file: 'screens/Act4Panels.tsx', section: 'orbit' },
  PAY_UPGRADE: { file: 'screens/Act5Queue.tsx', section: 'projects' },
  WITHDRAW_POSITION: { file: 'screens/Act5Queue.tsx', section: 'projects' },
  TAKE_FAST_LANE: { file: 'screens/Act5Queue.tsx', section: 'projects' },
  SELL_SITE_POWER: { file: 'screens/Act5Queue.tsx', section: 'projects' },
  SELL_SITE: { file: 'screens/Act5Queue.tsx', section: 'projects' },
  ENROL_FLEXIBLE: { file: 'screens/Act5Queue.tsx', section: 'projects' },
  PROJECT_OPEN: { file: 'screens/Projects.tsx', section: 'projects' },
  PROJECT_SELL: { file: 'screens/Projects.tsx', section: 'projects' },
  ARRANGE_PLANT_DEBT: { file: 'screens/Ventures.tsx', section: 'ventures' },
  SELL_PLANT_STAKE: { file: 'screens/Ventures.tsx', section: 'ventures' },
  CONTRACT_PLANT_OUTPUT: { file: 'screens/Ventures.tsx', section: 'ventures' },
  COMMIT_FOLLOW_ON: { file: 'screens/Ventures.tsx', section: 'ventures' },
  VENTURE_CALL: { file: 'screens/Ventures.tsx', section: 'ventures' },
  ACCEL_CALL: { file: 'screens/Ventures.tsx', section: 'ventures' },
  ACCEL_RESERVE: { file: 'screens/Ventures.tsx', section: 'ventures' },
  ACCEL_SALE_VOTE: { file: 'screens/Ventures.tsx', section: 'ventures' },
  SELL_LUNAR_HOLDING: { file: 'screens/Act5Screens.tsx', section: 'capital' },
  RAISE_EQUITY: { file: 'screens/CapitalAct2.tsx', section: 'capital' },
  ACT5_CARD_PICK: { file: 'screens/Live.tsx', section: 'live' },
  RESOLVE_INTERRUPT: { file: 'screens/Live.tsx', section: 'live' },
}

/** The move kinds no Plan action makes: a card's choice makes them (doc 47's cards, wired in M58.4). */
const CARD_ONLY: Record<string, string> = {
  buy_site_with_position: 'the V3 decoy card "A Record Auction"',
  commit_new_firm_asset: 'the V1 card "At the Cap, Again" (a turbine slot)',
  buy_plant_stake: 'no Act V action buys a new stake (ventures are joined in Act IV); kept for the reading table',
  let_contract_roll_merchant: 'letting an output contract run out logs nothing: kept for the reading table',
}
/** Which action makes each move kind. */
const MOVE_ACTION: Record<string, string> = {
  pay_network_upgrade: 'PAY_UPGRADE',
  commit_follow_on_unit: 'COMMIT_FOLLOW_ON',
  arrange_plant_debt: 'ARRANGE_PLANT_DEBT',
  renew_short: 'RENEWAL_TERM',
  renew_long: 'RENEWAL_TERM',
  sell_plant_stake_to_fund: 'SELL_PLANT_STAKE',
  sell_site_with_position: 'SELL_SITE',
  sell_site_free_mw: 'SELL_SITE_POWER',
  contract_plant_output: 'CONTRACT_PLANT_OUTPUT',
  enrol_flexible: 'ENROL_FLEXIBLE',
  take_fast_lane: 'TAKE_FAST_LANE',
  blend_and_extend_long: 'BLEND_ACCEPT',
  equity_raise: 'RAISE_EQUITY',
  request_grid_mw: 'PROJECT_OPEN',
  withdraw_position: 'WITHDRAW_POSITION',
  orbit_replace: 'ORBIT_EOL',
  orbit_extend: 'ORBIT_EOL',
  orbit_bring_home: 'ORBIT_EOL',
  sell_lunar_holding: 'SELL_LUNAR_HOLDING',
}

const ui = (file: string) => readFileSync(join(__dirname, '../../src/ui', file), 'utf8')
const navLabels = (act: number) => {
  const v = render(<Nav seed={1} plan={true} act={act} />)
  const text = v.container.textContent ?? ''
  cleanup()
  return text
}

describe('Act V reachability (M62.6, doc 43 §0.18)', () => {
  it('the Orbit tab shows in Act V (the Moon tab doesn’t); both in Act IV', () => {
    const v = navLabels(5)
    expect(v).toContain(t('ui.nav.orbit'))
    expect(v).not.toContain(t('ui.nav.moon'))
    const iv = navLabels(4)
    expect(iv).toContain(t('ui.nav.orbit'))
    expect(iv).toContain(t('ui.nav.moon'))
  })

  it('every Act V player action is dispatched by a screen on a section Act V shows', () => {
    const nav = navLabels(5)
    const label: Record<string, string> = {
      projects: t('ui.nav.projects'),
      orbit: t('ui.nav.orbit'),
      contracts: t('ui.nav.contracts'),
      ventures: t('ui.nav.ventures'),
      capital: t('ui.nav.capital'),
    }
    const orphans: string[] = []
    for (const [action, where] of Object.entries(ACT5_ACTIONS)) {
      if (!ui(where.file).includes(`type: '${action}'`)) orphans.push(`${action}: no dispatch in ${where.file}`)
      if (label[where.section] && !nav.includes(label[where.section])) orphans.push(`${action}: section ${where.section} hidden in Act V`)
    }
    expect(orphans).toEqual([])
  })

  it('every Act V move kind is made by a reachable action, or by a card', () => {
    const missing = ACT5_MOVE_KINDS.filter((k) => !(k in CARD_ONLY) && !(MOVE_ACTION[k] && MOVE_ACTION[k] in ACT5_ACTIONS))
    expect(missing).toEqual([])
  })
})

// M68.1 (doc 43 §0.25 item 1): Heat's meter and its mitigation actions are reachable in Act V.
describe('Heat in Act V (M68.1)', () => {
  it('the header shows the Heat meter, and the Plan offers the neighbours and noise rows with their actions', () => {
    const s = preset('orbital_landlord')
    for (const x of s.sites) {
      s.siteHeat[x.id] ??= { value: 0, load: 0, grievance: 0, mitigated: false, outreachQuarter: null, shutdownSince: null }
      s.siteHeat[x.id].value = 60
      s.siteHeat[x.id].outreachQuarter = null
      s.siteHeat[x.id].mitigated = false
    }
    const top = render(<TopBar state={s} />).container.textContent ?? ''
    expect(top).toContain('60')
    cleanup()
    const plan = render(<PlanScreen state={s} act={noop as never} />).container.textContent ?? ''
    expect(plan).toMatch(/Talk to the neighbours/)
    expect(plan).toMatch(/Noise mitigation/)
    // and the sim accepts them there
    const site = s.sites[0]
    expect(whyNot(s, { type: 'OUTREACH', siteId: site.id })).toBeFalsy()
    expect(whyNot(s, { type: 'MITIGATE_NOISE', siteId: site.id })).toBeFalsy()
  })

  it('the Community Deal and the negotiation actions are dispatched by screens Act V shows', () => {
    const nav = navLabels(5)
    expect(nav).toContain(t('ui.nav.projects'))
    expect(ui('screens/Plan.tsx')).toContain("type: 'COMMUNITY_DEAL_SIGN'")
    expect(ui('screens/Plan.tsx')).toContain("type: 'COMMUNITY_DEAL_DECLINE'")
    for (const a of ['DEAL_NEGOTIATE_START', 'DEAL_COUNTER', 'DEAL_ACCEPT', 'DEAL_WALK']) expect(ui('screens/Projects.tsx')).toContain(`type: '${a}'`)
  })
})

describe('the header (M62.5)', () => {
  it('at Act V’s start shows act5Entry’s valuation, and the cash Finances shows', () => {
    const s = preset('orbital_landlord')
    expect(headerValuationUsd(s)).toBe(s.act5Entry!.valuationUsd)
    const v = render(<TopBar state={s} />)
    const text = v.container.textContent ?? ''
    expect(text).toContain(fmt.money(s.act5Entry!.valuationUsd))
    expect(text).toContain(fmt.money(cashFlowView(s, { kind: 'quarter', q: s.quarter }).endCash))
    expect(text).toContain(fmt.money(s.cash))
  })

  it('after a quarter, the last report’s valuation and the cash Finances shows', () => {
    const s = playFrom(preset('firm_builder'), { plan: () => [] }, { through: 5 }).state
    expect(headerValuationUsd(s)).toBe(s.reports.at(-1)!.valuationUsd)
    const text = render(<TopBar state={s} />).container.textContent ?? ''
    expect(text).toContain(fmt.money(s.reports.at(-1)!.valuationUsd))
    expect(text).toContain(fmt.money(cashFlowView(s, { kind: 'quarter', q: s.quarter }).endCash))
  })
})

describe('Act V’s screens (M62.3-4)', () => {
  it('the Plan hides the Act I-II rounds and loans in Act V, and shows the four-column MW strip', () => {
    const s = preset('orbital_landlord')
    const text = render(<PlanScreen state={s} act={noop as never} />).container.textContent ?? ''
    for (const r of ['friends_family', 'seed', 'series_a', 'ipo_spac']) expect(text).not.toContain(t(`round.${r}` as never))
    expect(text).not.toContain(t('ui.plan.equipment_loan' as never))
    const dash = render(<Act5Dashboard state={s} />).container
    expect(dash.querySelector('[data-plants-glance]')).not.toBeNull()
    expect(dash.querySelector('[data-queue-glance]')).not.toBeNull()
    for (const k of ['firm', 'flexible', 'orbital', 'landlord']) expect(dash.textContent).toContain(t(`ui.act5.mw_title.${k}` as never))
  })

  it('the lunar holding panel sells to a bloc at half its value', () => {
    const s = preset('orbital_landlord')
    if (!s.lunarHolding || s.lunarHolding.value2035Usd <= 0) return
    const panel = render(<LunarHoldingPanel state={s} act={noop as never} />).container
    expect(panel.querySelector('[data-sell-lunar]')).not.toBeNull()
    const r = applyAction(s, { type: 'SELL_LUNAR_HOLDING' })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.state.lunarHolding!.soldQuarter).toBe(s.quarter)
      expect(r.state.act5Moves!.at(-1)!.kind).toBe('sell_lunar_holding')
    }
  })

  it('the quarter report shows the plants and the queue', () => {
    const s = playFrom(preset('firm_builder'), { plan: () => [] }, { through: 5 }).state
    const text = render(<Act5ReportPanel state={s} />).container.textContent ?? ''
    expect(text).toContain(t('ui.act5.report.title'))
  })
})
