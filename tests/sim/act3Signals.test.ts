// M11.2: Act III's Read the market (Signals), its Bandwidth rule, and the guards around the hidden
// authoring fields. Signals are authored, never derived from the market files.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BALANCE, CONTENT, SIGNAL_IDS } from '../../src/content/index.ts'
import { signalsHidden } from '../../src/content/signalsHidden.ts'
import { applyAction } from '../../src/sim/actions.ts'
import { advance } from '../../src/sim/advance.ts'
import { signalsPanel } from '../../src/sim/selectors.ts'
import {
  drawScenario,
  newGame,
  toAct3,
  type GameState,
  type Site,
} from '../../src/sim/state.ts'
import { bandwidthForQuarter } from '../../src/sim/systems/bandwidth.ts'
import { defaultChoice } from '../../src/sim/systems/interrupts.ts'
import { act2Company, ok } from './act2Helpers.ts'
import { act3WithoutScenario } from './act3Helpers.ts'

const SCENARIOS = ['s0', 's1', 's2', 's3'] as const

/** An Act III state on a real scenario, in the Plan phase of 2027Q1 with Bandwidth to spend. */
function act3(seed = 1): GameState {
  const s = toAct3(act2Company('2026Q4', seed))
  s.bandwidth = 5
  return s
}

const blockedKey = (s: GameState, a: Parameters<typeof applyAction>[1]) => {
  const r = applyAction(s, a)
  return r.ok ? null : r.error.key
}

describe('READ_SIGNAL (Act III Read the market)', () => {
  it('costs 1 Bandwidth, logs the read, and reveals that indicator’s sharp range for this quarter only', () => {
    const s = act3()
    expect(s.act3SignalReads).toEqual([])
    const after = ok(s, { type: 'READ_SIGNAL', indicator: 'lender_spreads' })
    expect(after.bandwidth).toBe(s.bandwidth - 1)
    expect(after.act3SignalReads).toEqual([
      { quarter: '2027Q1', indicator: 'lender_spreads' },
    ])
    const panel = signalsPanel(after)!
    const ind = (id: string) => panel.indicators.find((i) => i.id === id)!
    const truth = CONTENT.signals[after.scenarioId!]
      .find((i) => i.id === 'lender_spreads')!
      .series.find((p) => p.quarter === '2027Q1')!
    expect(ind('lender_spreads').reads).toEqual([
      { quarter: '2027Q1', ...truth.sharp },
    ])
    // The other five stay unread.
    for (const id of SIGNAL_IDS.filter((x) => x !== 'lender_spreads'))
      expect(ind(id).reads).toEqual([])
  })

  it('a second read in the same quarter is blocked, even of another indicator', () => {
    const once = ok(act3(), { type: 'READ_SIGNAL', indicator: 'revenue_gap' })
    expect(
      blockedKey(once, { type: 'READ_SIGNAL', indicator: 'revenue_gap' }),
    ).toBe('error.signal_read_done')
    expect(
      blockedKey(once, { type: 'READ_SIGNAL', indicator: 'chip_lead_times' }),
    ).toBe('error.signal_read_done')
  })

  it('a read in 2027Q1 shows nothing sharp in 2027Q2, and can be made again there', () => {
    let s = ok(act3(), { type: 'READ_SIGNAL', indicator: 'revenue_gap' })
    s = ok(s, { type: 'END_PLAN' })
    while (s.phase === 'live')
      s = s.interrupt
        ? ok(s, { type: 'RESOLVE_INTERRUPT', choice: defaultChoice(s) })
        : advance(s)
    s = ok(s, { type: 'NEXT_QUARTER' })
    expect(CONTENT.quarters[s.quarter]).toBe('2027Q2')
    const panel = signalsPanel(s)!
    expect(panel.readThisQuarter).toBeNull()
    // The 2027Q1 sharp range stays visible (it was read); 2027Q2's is not.
    const rg = panel.indicators.find((i) => i.id === 'revenue_gap')!
    expect(rg.reads.map((r) => r.quarter)).toEqual(['2027Q1'])
    expect(rg.history.map((h) => h.quarter)).toEqual(['2027Q1'])
    const again = ok(s, { type: 'READ_SIGNAL', indicator: 'revenue_gap' })
    expect(
      signalsPanel(again)!.indicators.find((i) => i.id === 'revenue_gap')!.reads
        .length,
    ).toBe(2)
  })

  it('is blocked without Bandwidth, outside the Plan phase, in Act II, and in a stub state with no scenario', () => {
    const broke = { ...act3(), bandwidth: 0 }
    expect(
      blockedKey(broke, { type: 'READ_SIGNAL', indicator: 'revenue_gap' }),
    ).toBe('error.no_bandwidth')
    const live = ok(act3(), { type: 'END_PLAN' })
    expect(
      blockedKey(live, { type: 'READ_SIGNAL', indicator: 'revenue_gap' }),
    ).toBe('error.wrong_phase')
    const a2 = { ...act2Company('2024Q1'), bandwidth: 5 }
    expect(
      blockedKey(a2, { type: 'READ_SIGNAL', indicator: 'revenue_gap' }),
    ).toBe('error.signal_unavailable')
    const stub = { ...act3WithoutScenario(), bandwidth: 5 }
    expect(
      blockedKey(stub, { type: 'READ_SIGNAL', indicator: 'revenue_gap' }),
    ).toBe('error.signal_unavailable')
    const a1 = newGame(1)
    expect(
      blockedKey(a1, { type: 'READ_SIGNAL', indicator: 'revenue_gap' }),
    ).toBe('error.signal_unavailable')
  })

  it('does not change the scenario draw or the main RNG', () => {
    const s = act3(7)
    expect(s.scenarioId).toBe(drawScenario(7))
    const after = ok(s, { type: 'READ_SIGNAL', indicator: 'efficiency_index' })
    expect(after.rng).toBe(s.rng)
    expect(after.scenarioId).toBe(s.scenarioId)
  })
})

describe('Act I’s READ_MARKET in Act III', () => {
  it('is blocked with its own message', () => {
    expect(blockedKey(act3(), { type: 'READ_MARKET' })).toBe(
      'error.market_read_act3',
    )
    const stub = { ...act3WithoutScenario(), bandwidth: 5 }
    expect(blockedKey(stub, { type: 'READ_MARKET' })).toBe(
      'error.market_read_act3',
    )
  })

  it('behaves exactly as before in Act I and Act II', () => {
    const a1 = ok(newGame(1), { type: 'READ_MARKET' })
    expect(a1.marketRead?.quarter).toBe(0)
    const a2 = { ...act2Company('2024Q1'), bandwidth: 5 }
    expect(ok(a2, { type: 'READ_MARKET' }).marketRead).not.toBeNull()
    expect(blockedKey(a1, { type: 'READ_MARKET' })).toBe(
      'error.market_read_done',
    )
  })
})

describe('signalsPanel', () => {
  it('is null outside Act III and without a scenario', () => {
    expect(signalsPanel(newGame(1))).toBeNull()
    expect(signalsPanel(act2Company('2024Q1'))).toBeNull()
    expect(signalsPanel(act3WithoutScenario())).toBeNull()
  })

  it('lists the six indicators in file order with their current value, and never a future quarter or a hidden field', () => {
    for (const id of SCENARIOS) {
      const s = { ...act3(), scenarioId: id }
      const panel = signalsPanel(s)!
      expect(panel.indicators.map((i) => i.id)).toEqual([...SIGNAL_IDS])
      for (const ind of panel.indicators) {
        expect(ind.current).not.toBeNull()
        expect(ind.history).toEqual([]) // 2027Q1: no past Act III quarter yet
        expect(ind.reads).toEqual([])
        expect(Object.keys(ind).sort()).toEqual(
          ['current', 'higherMeans', 'history', 'id', 'label', 'reads'].sort(),
        )
      }
      // The whole panel, serialised, holds no authored field name and no later quarter.
      const text = JSON.stringify(panel)
      for (const bad of [
        'authoring_latent',
        'role_tag',
        'role_in_scenario',
        'decoy',
        '2027Q2',
        '2030Q4',
      ])
        expect(text).not.toContain(bad)
    }
  })
})

describe('Bandwidth in Act III (STUB point 1)', () => {
  const site = (kw: number): Site => ({
    id: `site-${kw}`,
    tier: 'own_site',
    readyQuarter: 0,
    rentUsdQ: 0,
    powerPriceMult: 1,
    flaw: null,
    region: 'ercot',
    category: 'distressed_miner_site',
    kw,
  })

  it('uses Act II’s rule: base 4, +1 per MW step, the Act II hires, capped at 8', () => {
    const base = act3()
    expect(bandwidthForQuarter(base)).toBe(
      bandwidthForQuarter({ ...base, act: 2 }),
    )
    expect(bandwidthForQuarter(base)).toBeGreaterThanOrEqual(
      BALANCE.act2Bandwidth.base,
    )

    const big = act3()
    big.sites.push(site(250_000)) // past both MW steps
    big.staff = { chief_of_staff: 0, head_of_development: 0 }
    expect(bandwidthForQuarter(big)).toBe(BALANCE.act2Bandwidth.max)
    expect(bandwidthForQuarter(big)).toBe(
      bandwidthForQuarter({ ...big, act: 2 }),
    )
    // Act I's rule would have given far less for the same company.
    expect(bandwidthForQuarter({ ...big, act: 1 })).toBeLessThan(
      BALANCE.act2Bandwidth.max,
    )
  })

  it('a new Act III quarter refills Bandwidth by that rule', () => {
    let s = act3()
    s = ok(s, { type: 'END_PLAN' })
    while (s.phase === 'live')
      s = s.interrupt
        ? ok(s, { type: 'RESOLVE_INTERRUPT', choice: defaultChoice(s) })
        : advance(s)
    s = ok(s, { type: 'NEXT_QUARTER' })
    expect(s.bandwidth).toBe(bandwidthForQuarter(s))
  })
})

describe('the hidden signals fields never reach src/', () => {
  function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const p = join(dir, name)
      if (statSync(p).isDirectory()) return sourceFiles(p)
      return /\.(ts|tsx)$/.test(name) ? [p] : []
    })
  }
  const src = sourceFiles(new URL('../../src', import.meta.url).pathname)
  const hiddenModule = /(signals|rivals)Hidden\.ts$/
  // The one function allowed to read the hidden view: the end-of-act scenario reveal (M11.3).
  const revealModule = /systems[\\/]act3End\.ts$/
  const code = (file: string) =>
    // Code only: a comment may explain the rule by naming the fields.
    readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
  const fields = [
    'authoring_latent',
    'role_in_scenario',
    'role_tag',
    'DO_NOT_EXPOSE',
    'd15_review',
  ]

  it('nothing but tests/ and tools/ imports the hidden view or names an authoring field, except the one reveal function', () => {
    for (const file of src.filter((f) => !hiddenModule.test(f))) {
      const text = code(file)
      for (const bad of fields)
        expect(text, `${file} mentions ${bad}`).not.toContain(bad)
      if (!revealModule.test(file))
        for (const view of ['signalsHidden', 'rivalsHidden'])
          expect(text, `${file} imports ${view}`).not.toContain(view)
    }
    // ...and the reveal file exists and is the only importer (of both hidden views, M11.5b).
    for (const view of ['signalsHidden', 'rivalsHidden']) {
      const importers = src.filter(
        (f) => !hiddenModule.test(f) && code(f).includes(view),
      )
      expect(importers.map((f) => f.split('/').slice(-3).join('/'))).toEqual([
        'sim/systems/act3End.ts',
      ])
    }
  })

  it('M14.1: reading_score.json is imported only by readingScore.ts, and readingScore.ts only by act3End.ts (and tests/, tools/)', () => {
    const importers = (pattern: RegExp) =>
      src
        .filter((f) => pattern.test(code(f)))
        .map((f) => f.split('/').slice(-3).join('/'))
    for (const f of importers(/reading_score\.json/))
      expect(f).toBe('sim/systems/readingScore.ts')
    for (const f of importers(/readingScore\.ts/))
      expect(f).toBe('sim/systems/act3End.ts')
  })

  it('M14.1: the player-like bots import no hidden view and no reading score', () => {
    const bots = code(
      new URL('../../tools/bots.ts', import.meta.url).pathname,
    )
    for (const bad of [
      'signalsHidden',
      'rivalsHidden',
      'readingScore',
      'reading_score',
      'act3End',
    ])
      expect(bots, bad).not.toContain(bad)
  })

  it('nothing in src/ calls toAct3 but its own definition and the test-build entry (Act III stays unreachable from play)', () => {
    for (const file of src) {
      if (/sim[\\/]state\.ts$/.test(file)) continue
      // M13.1: the app enters Act III in one place, behind the ACT3_PREVIEW gate (test builds only).
      if (/ui[\\/]app\.tsx$/.test(file)) {
        const text = code(file)
        const calls = text.match(/\btoAct3\(/g) ?? []
        expect(calls).toHaveLength(1)
        expect(text).toMatch(
          /const enterAct3 = \(end: GameState\) => \{\s*if \(!ACT3_PREVIEW\) return[^}]*?\btoAct3\(/,
        )
        continue
      }
      expect(code(file), `${file} uses toAct3`).not.toMatch(/\btoAct3\b/)
    }
  })

  it('CONTENT.signals holds runtime fields only', () => {
    for (const id of SCENARIOS)
      for (const ind of CONTENT.signals[id]) {
        expect(Object.keys(ind).sort()).toEqual(
          ['higher_means', 'id', 'label', 'series'].sort(),
        )
        for (const p of ind.series)
          expect(Object.keys(p).sort()).toEqual(
            ['arrow', 'displayed', 'quarter', 'sharp'].sort(),
          )
      }
  })

  it('the Signals system does not import the market readers or content that reads the market files', () => {
    const text = readFileSync(
      new URL('../../src/sim/systems/signals.ts', import.meta.url),
      'utf8',
    )
    const imports = text.match(/^import[^;]*?from\s+'[^']+'/gms)!.join('\n')
    expect(imports).not.toMatch(/market/i)
    expect(text).not.toMatch(
      /act3Scenarios|marketWeek|quarterWeeks|CONTENT\.market/,
    )
    // The panel selector reads only CONTENT.signals too.
    const sel = readFileSync(
      new URL('../../src/sim/selectors.ts', import.meta.url),
      'utf8',
    )
    const panel = sel.slice(
      sel.indexOf('export function signalsPanel'),
      sel.indexOf('function energizedKw'),
    )
    expect(panel).not.toMatch(
      /act3Scenarios|marketWeek|quarterWeeks|CONTENT\.market/,
    )
  })
})

describe('the delivered signals data (doc 27 §5, D3)', () => {
  const quarters = Array.from({ length: 16 }, (_, i) => {
    const y = 2027 + Math.floor(i / 4)
    return `${y}Q${(i % 4) + 1}`
  })
  const events = JSON.parse(
    readFileSync(
      new URL('../../docs/act3-content/events_act3.json', import.meta.url),
      'utf8',
    ),
  ).event_cards as { id: string; scenario: string; role: string }[]
  const firstPhase = (id: (typeof SCENARIOS)[number], phase: string) =>
    CONTENT.act3Scenarios[id].quarterly.find((r) => r.phase === phase)!.quarter
  const gap = (a: string, b: string) =>
    quarters.indexOf(b) - quarters.indexOf(a)

  it('every file has the 6 indicators in the same order, with identical label and higher_means', () => {
    const base = CONTENT.signals.s0
    expect(base.map((i) => i.id)).toEqual([...SIGNAL_IDS])
    for (const id of SCENARIOS)
      CONTENT.signals[id].forEach((ind, k) => {
        expect(ind.id).toBe(base[k].id)
        expect(ind.label, `${id} ${ind.id} label`).toBe(base[k].label)
        expect(ind.higher_means, `${id} ${ind.id} higher_means`).toBe(
          base[k].higher_means,
        )
      })
  })

  it('every series is 2027Q1…2030Q4, matching the market files, with valid values', () => {
    for (const id of SCENARIOS)
      for (const ind of CONTENT.signals[id]) {
        expect(ind.series.map((p) => p.quarter)).toEqual(quarters)
        expect(ind.series.map((p) => p.quarter)).toEqual(
          CONTENT.act3Scenarios[id].quarterly.map((r) => r.quarter),
        )
        for (const p of ind.series) {
          expect(Number.isInteger(p.displayed)).toBe(true)
          expect(p.displayed).toBeGreaterThanOrEqual(0)
          expect(p.displayed).toBeLessThanOrEqual(100)
          expect(['up', 'down', 'flat']).toContain(p.arrow)
          expect(p.sharp.low).toBeGreaterThanOrEqual(0)
          expect(p.sharp.high).toBeLessThanOrEqual(100)
          expect(p.sharp.low).toBeLessThanOrEqual(p.sharp.high)
        }
      }
  })

  it('the trigger is in 2027Q3–2028Q4, on the market file’s first trigger quarter, with signals 2–4 quarters earlier', () => {
    const expected = { s0: '2028Q2', s1: '2028Q1', s2: '2028Q3', s3: '2027Q4' }
    for (const id of SCENARIOS) {
      const h = signalsHidden(id)
      expect(h.trigger.quarter).toBe(expected[id])
      expect(
        h.trigger.quarter >= '2027Q3' && h.trigger.quarter <= '2028Q4',
      ).toBe(true)
      expect(h.trigger.quarter).toBe(firstPhase(id, 'trigger'))
      const lead = gap(firstPhase(id, 'signal_window'), h.trigger.quarter)
      expect(lead, `${id} signal window lead`).toBeGreaterThanOrEqual(2)
      expect(lead).toBeLessThanOrEqual(4)
    }
  })

  it('the trigger card exists in events_act3.json, has role trigger, and is the same scenario’s', () => {
    for (const id of SCENARIOS) {
      const card = events.find(
        (c) => c.id === signalsHidden(id).trigger.card_id,
      )
      expect(card, `${id} trigger card`).toBeDefined()
      expect(card!.role).toBe('trigger')
      expect(card!.scenario).toBe(id)
    }
  })

  it('the decoy is one of the 6 indicators, inside 2027Q1–2030Q4, and peaks in one of its quarters', () => {
    for (const id of SCENARIOS) {
      const d = signalsHidden(id).decoy
      expect(SIGNAL_IDS).toContain(d.indicator)
      for (const q of d.quarters) expect(quarters).toContain(q)
      expect(d.quarters).toContain(d.peak_quarter)
    }
  })
})
