// M11.5c: the 37 Act III scenario cards (events_act3.json) fire through Act II's card engine on their
// quarter in the drawn scenario, apply only the effects the engine already has, and defer the rest.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  CONTENT,
  SCENARIO_IDS,
  type ScenarioId,
} from '../../src/content/index.ts'
import {
  EFFECT_MAP,
  act3CardEngineId,
  translateEffects,
} from '../../src/content/act3Cards.ts'
import en from '../../src/i18n/en.json' with { type: 'json' }
import { applyAction } from '../../src/sim/actions.ts'
import { advance } from '../../src/sim/advance.ts'
import { eventCardView } from '../../src/sim/selectors.ts'
import { defaultChoice } from '../../src/sim/systems/interrupts.ts'
import { act3ScenarioCompany } from './act3Helpers.ts'

const file = JSON.parse(
  readFileSync(
    new URL('../../docs/act3-content/events_act3.json', import.meta.url),
    'utf8',
  ),
).event_cards as {
  id: string
  scenario: string
  quarter: string
  role: string
  title: string
  body: string
  default: string
  choices: { label: string; effect: Record<string, unknown> }[]
}[]
const authoredOf = new Map(file.map((c) => [act3CardEngineId(c.id), c]))

interface Fired {
  id: string
  quarter: string
  week: number
  choice: string
  interruptsBefore: number
}

/** Plays a whole Act III game on `id`, answering every alert with its default; records each card. */
function play(id: ScenarioId, seed = 1) {
  let s = act3ScenarioCompany(id, seed)
  const fired: Fired[] = []
  const views: unknown[] = []
  while (s.phase !== 'chapter' && s.phase !== 'gameover') {
    let r = applyAction(s, { type: 'END_PLAN' })
    if (!r.ok) throw new Error(r.error.key)
    s = r.state
    while (s.phase === 'live') {
      if (s.interrupt) {
        const choice = defaultChoice(s)
        if (s.interrupt.id === 'event') {
          views.push(eventCardView(s))
          fired.push({
            id: authoredOf.get(s.interrupt.event!)?.id ?? s.interrupt.event!,
            quarter: CONTENT.quarters[s.quarter],
            // the alert comes when week 2 has been played (the week index then reads 2)
            week: s.interrupt.week,
            choice,
            interruptsBefore: s.interruptsThisQuarter,
          })
        }
        r = applyAction(s, { type: 'RESOLVE_INTERRUPT', choice })
        if (!r.ok) throw new Error(r.error.key)
        s = r.state
      } else s = advance(s)
    }
    if (s.phase === 'gameover') break
    r = applyAction(s, { type: 'NEXT_QUARTER' })
    if (!r.ok) throw new Error(r.error.key)
    s = r.state
  }
  return { state: s, fired, views }
}

const runs = new Map(SCENARIO_IDS.map((id) => [id, play(id)]))

describe('the delivered cards', () => {
  it('each card has a machine-readable quarter: the first quarter written in its trigger', () => {
    for (const c of file) {
      expect(c.quarter).toMatch(/^\d{4}Q[1-4]$/)
      expect(c.quarter).toBe(
        (c as unknown as { trigger: string }).trigger.match(/\d{4}Q[1-4]/)![0],
      )
    }
  })

  it('8 per scenario and 5 shared, all in Act III’s deck with opaque ids', () => {
    const act3 = CONTENT.events.cards.filter((c) => c.act === 3)
    expect(act3).toHaveLength(37)
    for (const id of SCENARIO_IDS)
      expect(act3.filter((c) => c.scenario === id)).toHaveLength(8)
    expect(act3.filter((c) => c.scenario === 'all')).toHaveLength(5)
    for (const c of act3) {
      expect(c.id).toMatch(/^a3_[0-9a-f]{8}$/)
      expect(c.type).toBe('scripted')
      expect(c.weekIndex).toBe(1)
      expect(JSON.stringify(c)).not.toMatch(
        /"role"|signal|decoy|trigger|aftermath|winner/,
      )
    }
  })

  it('every card’s title, body and choices are in en.json, word for word', () => {
    const t = en as Record<string, string>
    for (const c of file) {
      const id = act3CardEngineId(c.id)
      expect(t[`event.${id}.title`], c.id).toBe(c.title)
      expect(t[`event.${id}.body`], c.id).toBe(c.body)
      c.choices.forEach((ch, i) =>
        expect(t[`event.${id}.choice.c${i + 1}`], c.id).toBe(ch.label),
      )
    }
  })
})

describe('the cards fire in their scenario', () => {
  it.each(SCENARIO_IDS)(
    '%s: exactly its 8 cards plus the 5 shared fire, each once, in its quarter, from week 2 on',
    (id) => {
      const { state, fired } = runs.get(id)!
      expect(state.phase).toBe('chapter')
      const want = file
        .filter((c) => c.scenario === id || c.scenario === 'all')
        .map((c) => `${c.id}@${c.quarter}`)
        .sort()
      expect(fired.map((f) => `${f.id}@${f.quarter}`).sort()).toEqual(want)
      // Scheduled for week 2; the engine shows one alert a week, so a second card in the same quarter
      // (or one behind another alert) comes a week or more later, still in its quarter.
      for (const f of fired) expect(f.week).toBeGreaterThanOrEqual(1)
    },
  )

  it('no s1 card fires in an s0 game (and no other scenario’s either)', () => {
    for (const id of SCENARIO_IDS)
      for (const f of runs.get(id)!.fired)
        expect(
          f.id.startsWith(id) || f.id.startsWith('sh_'),
          `${id}: ${f.id}`,
        ).toBe(true)
    expect(runs.get('s0')!.fired.some((f) => f.id.startsWith('s1_'))).toBe(
      false,
    )
  })

  it('two cards in one quarter both fire, in file order (s1_c5 then s1_c6 in 2028Q3)', () => {
    const q = runs
      .get('s1')!
      .fired.filter((f) => f.quarter === '2028Q3')
      .map((f) => f.id)
    expect(q).toEqual(['s1_c5', 's1_c6'])
  })

  it('scripted cards don’t count toward the interrupt cap of 3', () => {
    for (const id of SCENARIO_IDS) {
      const s = runs.get(id)!.state
      expect(s.events.fired).toEqual([]) // only random cards are remembered in `fired`
    }
  })

  it('the default taken is the card’s own default label', () => {
    for (const id of SCENARIO_IDS)
      for (const f of runs.get(id)!.fired) {
        const c = file.find((x) => x.id === f.id)!
        const idx = c.choices.findIndex((ch) => ch.label === c.default)
        expect(f.choice, f.id).toBe(`c${idx + 1}`)
      }
  })
})

describe('effects: mapped where the engine has the same effect, else deferred', () => {
  it('every effect key the cards use has a route', () => {
    const used = new Set(
      file.flatMap((c) => c.choices.flatMap((ch) => Object.keys(ch.effect))),
    )
    for (const k of used) expect(EFFECT_MAP[k], k).toBeDefined()
  })

  it('the mapped choices, exactly', () => {
    const mapped: string[] = []
    for (const c of file)
      c.choices.forEach((ch, i) => {
        const e = translateEffects(ch.effect)
        if (Object.keys(e).length > 0 && !('deferred' in e))
          mapped.push(`${c.id}.c${i + 1}=${JSON.stringify(e)}`)
      })
    expect(mapped).toEqual([
      's0_c1.c2={"delay_marginal_project":1,"cash":300000}',
      's0_c2.c1={"debt_spread_add":200}',
      's1_c4.c1={"debt_spread_add":250}',
      's1_c4.c3={"debt_spread_add":150,"credit_notch":{"notches":-1,"quarters":2}}',
      's2_c2.c1={"delay_marginal_project":1}',
    ])
  })

  it('a choice with any deferred effect is deferred whole: no free cash, no cost for nothing', () => {
    expect(translateEffects({ cash: '+10000000', debt: 10000000 })).toEqual({
      deferred: { keys: ['cash', 'debt'], steps: ['question'] },
    })
    expect(translateEffects({ cash: -2000000, ratepayer_anger: -8 })).toEqual({
      deferred: { keys: ['cash', 'ratepayer_anger'], steps: ['step 6'] },
    })
    expect(translateEffects({ cash: '+revenue_this_quarter*0.02' })).toEqual({
      deferred: { keys: ['cash'], steps: ['question'] },
    })
    expect(translateEffects({ delay_quarters: -1, capex_mult: 1.15 })).toEqual({
      deferred: { keys: ['delay_quarters', 'capex_mult'], steps: ['step 5'] },
    })
  })

  it('a deferred default logs its effects and changes nothing else; s1_c4’s default adds 250 bps', () => {
    const { state } = runs.get('s1')!
    const deferredLogs = state.log.filter(
      (e) => e.key === 'log.event_effects_deferred',
    )
    expect(deferredLogs.length).toBeGreaterThan(0)
    expect(state.events.spreadAddBps).toBe(250) // s1_c4 default: refinance at +250bp
    expect(runs.get('s0')!.state.events.spreadAddBps).toBe(0) // s0's defaults touch no spread
  })
})

describe('the hidden rule: nothing shows a card’s scenario or role', () => {
  it('opaque ids don’t cluster by scenario: no 3-hex run is shared by all of a scenario’s cards', () => {
    for (const id of SCENARIO_IDS) {
      const ids = file
        .filter((c) => c.scenario === id)
        .map((c) => act3CardEngineId(c.id).slice(3))
      const runs = new Set(
        ids[0]
          .split('')
          .flatMap((_, i) => (i <= 5 ? [ids[0].slice(i, i + 3)] : [])),
      )
      for (const run of runs)
        expect(
          ids.every((x) => x.includes(run)),
          `${id} share ${run}`,
        ).toBe(false)
    }
  })

  it('the card view gives an opaque id: no scenario prefix, no role', () => {
    for (const id of SCENARIO_IDS)
      for (const v of runs.get(id)!.views) {
        const text = JSON.stringify(v)
        expect(text).not.toMatch(/s[0-3]_c\d|sh_\d/)
        expect(text).not.toMatch(
          /signal|decoy|trigger|aftermath|winner|scenario/,
        )
      }
  })

  it('src/ui and the selectors never read a card’s scenario or role field', () => {
    function files(dir: string): string[] {
      return readdirSync(dir).flatMap((n) => {
        const p = join(dir, n)
        return statSync(p).isDirectory()
          ? files(p)
          : /\.tsx?$/.test(n)
            ? [p]
            : []
      })
    }
    const targets = [
      ...files(new URL('../../src/ui', import.meta.url).pathname),
      new URL('../../src/sim/selectors.ts', import.meta.url).pathname,
      new URL('../../src/sim/projectViews.ts', import.meta.url).pathname,
      new URL('../../src/sim/capitalViews.ts', import.meta.url).pathname,
    ]
    for (const f of targets) {
      const t = readFileSync(f, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '')
      expect(t, f).not.toMatch(/\.scenario\b(?!Id)/)
      expect(t, f).not.toMatch(/\.role\b/)
      expect(t, f).not.toMatch(/events_act3|act3Cards/)
    }
  })
})
