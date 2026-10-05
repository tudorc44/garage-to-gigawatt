// M13.2: the Act III panels. There's no DOM in the test setup (adding one is a dependency: STOPPED in
// dev-notes), so the smoke test drives the same actions the panels' buttons send, from the same views
// the panels render; a source check ties each button to its action; and a grep keeps the scenario out of
// src/ui (the chapter report's reveal is the one file allowed to read the hidden views).
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { CONTENT, actFirstQuarter } from '../../src/content/index.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { advance } from '../../src/sim/advance.ts'
import {
  act3ReportLines,
  blendOffers,
  contractCalendar,
  contractsDueSoon,
  idleRigsView,
  renewalsDue,
  signalsPanel,
} from '../../src/sim/selectors.ts'
import { toAct3, type GameState } from '../../src/sim/state.ts'
import { defaultChoice } from '../../src/sim/systems/interrupts.ts'
import { openBlendOffers } from '../../src/sim/systems/blendExtend.ts'
import { contractQuarters } from '../../src/sim/systems/projects.ts'
import { quickStartCompany } from '../../src/ui/act3QuickStart.ts'

function ok(s: GameState, a: Action): GameState {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(`${a.type}: ${r.error.key}`)
  return r.state
}

/** Start quarter → the live weeks (defaults to any alert) → the report. */
function toReport(s: GameState): GameState {
  s = ok(s, { type: 'END_PLAN' })
  while (s.phase === 'live')
    s = s.interrupt
      ? ok(s, { type: 'RESOLVE_INTERRUPT', choice: defaultChoice(s) })
      : advance(s)
  return s
}
const next = (s: GameState) => ok(toReport(s), { type: 'NEXT_QUARTER' })

let gpuEnd: GameState
let shellEnd: GameState
beforeAll(async () => {
  gpuEnd = await quickStartCompany('gpu')
  shellEnd = await quickStartCompany('shell')
}, 120_000)

describe('the smoke test (the actions the Plan screen’s buttons send)', () => {
  it('GPU-heavy → Act III → read one signal → accept a renewal → end the quarter → the report lists it', () => {
    let s = toAct3(gpuEnd, { scenario: 's0' })
    // Plan, 2027Q1: the Signals panel and its Read the market (1 BW).
    const panel = signalsPanel(s)!
    expect(panel.indicators).toHaveLength(6)
    expect(panel.blocked).toBeNull()
    s = ok(s, { type: 'READ_SIGNAL', indicator: panel.indicators[1].id })
    const read = signalsPanel(s)!
    expect(read.readThisQuarter).toBe(panel.indicators[1].id)
    expect(read.indicators[1].reads).toHaveLength(1)
    expect(contractsDueSoon(s)).toBeGreaterThan(0)
    // On to the first quarter with a renewal open.
    while (renewalsDue(s).length === 0) s = next(s)
    const r = renewalsDue(s)[0]
    expect(r.choice).toBe('accept') // the default
    expect(r.blocked.accept).toBeNull()
    s = ok(s, { type: 'RENEWAL_ACCEPT', projectId: r.projectId })
    s = toReport(s)
    const lines = act3ReportLines(s)!.map((e) => e.key)
    expect(lines).toContain('log.renewal_signed')
  }, 60_000)
})

describe('each button’s action works from what its panel shows', () => {
  it('Counter (renewal: true), Re-let and Let it go to spot', () => {
    let s = toAct3(gpuEnd, { scenario: 's1' })
    while (renewalsDue(s).length === 0) s = next(s)
    const r = renewalsDue(s)[0]
    expect(r.blocked.counter).toBeNull()
    const c = ok(s, {
      type: 'DEAL_NEGOTIATE_START',
      projectId: r.projectId,
      renewal: true,
    })
    expect(c.dealNegotiation?.side).toBe('renewal')
    expect(r.blocked.relet).toBeNull()
    const g = ok(s, { type: 'RENEWAL_RELET', projectId: r.projectId })
    expect(renewalsDue(g)[0].choice).toBe('relet')
  }, 60_000)

  it('Keep the MW empty (RENEWAL_KEEP_EMPTY): a walked shell leaves at quarter end with no re-let RFP; offers come back', () => {
    let s = toAct3(shellEnd, { scenario: 's0' })
    const lease = contractCalendar(s).find((e) => e.kind === 'shell')!
    const p = s.projects.find((x) => x.id === lease.id)!
    p.tenant!.servedQuarters = contractQuarters(p) - 1
    s.act3Renewals = [
      {
        projectId: p.id,
        kind: 'shell',
        openedQuarter: s.quarter,
        walked: true,
        offer: null,
        choice: null,
      },
    ]
    const r = renewalsDue(s)[0]
    expect(r.choice).toBe('walk') // the automatic re-let is the default
    expect(r.blocked.keepEmpty).toBeNull()
    expect(r.cost.keepEmpty).toBe(0)
    const bw = s.bandwidth
    s = ok(s, { type: 'RENEWAL_KEEP_EMPTY', projectId: p.id })
    expect(s.bandwidth).toBe(bw)
    expect(renewalsDue(s)[0].choice).toBe('keep_empty')
    expect(
      applyAction(s, { type: 'RENEWAL_KEEP_EMPTY', projectId: p.id }).ok,
    ).toBe(false)
    s = next(s)
    const after = s.projects.find((x) => x.id === p.id)!
    expect(after.tenant).toBeNull()
    expect(after.pendingRelet).toBeUndefined()
    expect(after.offers.length).toBeGreaterThan(0) // the Deal builder can let them
  }, 60_000)

  it('Keep empty is only for a walked shell: not an offer, not a GPU contract', () => {
    let s = toAct3(gpuEnd, { scenario: 's1' })
    while (renewalsDue(s).length === 0) s = next(s)
    const r = renewalsDue(s)[0]
    expect(r.blocked.keepEmpty?.key).toBe('error.not_walked')
    s.act3Renewals![0].walked = true
    expect(renewalsDue(s)[0].blocked.keepEmpty?.key).toBe('error.not_walked')
  }, 60_000)

  it('Reopen in the Contracts row (fee shown), and Accept on a blend-and-extend offer', () => {
    const s = toAct3(shellEnd, { scenario: 's2' })
    s.quarter = CONTENT.quarters.indexOf('2029Q1')
    s.act3Renewals = []
    const lease = contractCalendar(s).find((e) => e.kind === 'shell')!
    const p = s.projects.find((x) => x.id === lease.id)!
    p.tenant!.signedQuarter = actFirstQuarter(3)
    p.tenant!.servedQuarters = 8
    p.tenant!.termQuarters = 40
    const row = contractCalendar(s).find((e) => e.id === p.id)!
    expect(row.reopenerEligible).toBe(true)
    expect(row.reopenFeeUsd).toBeGreaterThan(0)
    expect(row.reopenBlocked).toBeNull()
    const t = ok(s, { type: 'REOPEN_LEASE', projectId: p.id })
    expect(renewalsDue(t)[0]).toMatchObject({ cause: 'reopener', by: 'player' })
    // blend-and-extend (the lease's anniversary quarter, more than 8 quarters left)
    const b = structuredClone(s)
    openBlendOffers(b)
    const offer = blendOffers(b).find((x) => x.projectId === p.id)!
    expect(offer.blocked).toBeNull()
    ok(b, { type: 'BLEND_ACCEPT', projectId: p.id })
  })

  it('Turn back on (RESUME_IDLE_MACHINES) under Sites & Fleet', () => {
    const s = toAct3(gpuEnd, { scenario: 's0' })
    expect(idleRigsView(s)).toBeNull()
    s.machines.push({
      id: 'lot-s9',
      model: 's9',
      siteId: s.sites[1].id,
      condition: 'used',
      count: 10,
      failed: 0,
      earnsFromQuarter: 0,
      idle: true,
    })
    const v = idleRigsView(s)!
    expect(v.mw).toBeCloseTo(0.0132, 10)
    expect(v.blocked).toBeNull()
    const t = ok(s, { type: 'RESUME_IDLE_MACHINES' })
    expect(idleRigsView(t)).toBeNull()
  })

  it('each panel button sends its action (Act3Panels.tsx)', () => {
    const src = readFileSync(
      new URL('../../src/ui/screens/Act3Panels.tsx', import.meta.url),
      'utf8',
    )
    for (const type of [
      'RENEWAL_ACCEPT',
      'DEAL_NEGOTIATE_START',
      'RENEWAL_RELET',
      'RENEWAL_KEEP_EMPTY',
      'REOPEN_LEASE',
      'BLEND_ACCEPT',
      'READ_SIGNAL',
      'RESUME_IDLE_MACHINES',
    ])
      expect(src, type).toMatch(new RegExp(`type: '${type}'`))
    expect(src).toMatch(/renewal: true/)
  })
})

describe('the scenario stays off the screen', () => {
  /** The chapter reports' reveals (M13.3; Act IV's, M32.2) are the UI files allowed to read the hidden views. */
  const REVEAL = /screens[\\/]Act[34]Reveal\.tsx$/
  function files(dir: string): string[] {
    return readdirSync(dir).flatMap((n) => {
      const p = join(dir, n)
      return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(n) ? [p] : []
    })
  }
  const code = (f: string) =>
    readFileSync(f, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')

  it('no file in src/ui reads the scenario id or name, a hidden view, a phase, a role or a decoy (except the reveal)', () => {
    const ui = files(new URL('../../src/ui', import.meta.url).pathname)
    expect(ui.length).toBeGreaterThan(20)
    for (const f of ui) {
      if (REVEAL.test(f)) continue
      const t = code(f)
      expect(t, f).not.toMatch(/\bscenarioId\b/)
      // M27.6 (doc 33 §6.8): nor Act IV's hidden future (M32.2: Act4Reveal.tsx is the one exception, like Act3Reveal.tsx)
      expect(t, f).not.toMatch(/\bfutureId\b/)
      expect(t, f).not.toMatch(/scenario_name|scenarioName/)
      expect(t, f).not.toMatch(/signalsHidden|rivalsHidden|act3End\b/)
      expect(t, f).not.toMatch(/\.role\b|role_tag|roleTag|\bdecoy\b/i)
      expect(t, f).not.toMatch(/baseline|signal_window|aftermath/)
    }
  })

  it('the Signals the Plan screen shows: this quarter’s value and the past; ranges only for quarters read', () => {
    const s = toAct3(gpuEnd, { scenario: 's3' })
    const v = signalsPanel(s)!
    for (const i of v.indicators) {
      expect(i.history.every((h) => h.quarter < v.quarter)).toBe(true)
      expect(i.reads).toEqual([])
    }
  })
})
