// The campaign finale's view (M32.3; doc 33 §15.2, A4-12): the last screen of the game, built only from records the game
// already keeps: each act's last quarter report (valuation and founder stake), the act entries (act3Entry, act4Entry:
// energized MW and net worth), act3End's titles and Act IV's end record. No Act I-III state, rule or golden changes.
// Where an earlier act's title or MW isn't stored (Act I's MW, the prologue's title), its row shows without it. The
// epilogue is 3-5 lines chosen from authored pools by the end state and the revealed future: text ids only, deterministic.
import { BALANCE, CONTENT } from '../content/index.ts'
import type { GameState } from './state.ts'
import { act4Outcome } from './systems/act4End.ts'
import { lunarKwe } from './systems/moonOps.ts'
import { getTier, poweredKw } from './systems/sites.ts'

const netWorthAt = (state: GameState, label: string): number | null => {
  const r = state.reports.find((x) => x.quarter === label)
  return r ? Math.max(0, r.founderStake * r.valuationUsd) : null
}
const act2Title = (valuationUsd: number) => BALANCE.act2Chapter.titleBands.find((b) => valuationUsd >= b.min)!.id

/** How this career began: the bedroom (the prologue), the garage (Act I), or a preset start. */
function startOf(state: GameState): { kind: 'bedroom' | 'garage' | 'preset'; wealthUsd: number; kw: number; year: number } {
  if (state.prologueCarry || state.prologue) {
    const bedroom = CONTENT.prologue.rules.site_tiers.find((s) => s.id === 'bedroom')
    return { kind: 'bedroom', wealthUsd: CONTENT.prologue.rules.start.cash_usd, kw: bedroom?.capacity_kw ?? 0, year: 2009 }
  }
  if (state.preset || state.act4Preset)
    // A preset start: the company the preset handed you is where the career begins.
    return state.act4Preset && state.act4Entry
      ? { kind: 'preset', wealthUsd: state.act4Entry.founderNetWorthUsd, kw: state.act4Entry.energizedMw * 1000, year: 2031 }
      : { kind: 'preset', wealthUsd: CONTENT.preset.cashUsd, kw: 0, year: 2022 }
  return { kind: 'garage', wealthUsd: BALANCE.startCash, kw: getTier('garage')?.capacity_kw ?? 0, year: 2017 }
}

export function finaleView(state: GameState) {
  const o = act4Outcome(state)
  const e = o.end
  const start = startOf(state)
  const groundMw = state.sites.reduce((kw, s) => kw + poweredKw(s, state.quarter), 0) / 1000
  const orbitMw = (state.act4Orbit?.blocks ?? []).filter((b) => b.stage === 'live').reduce((mw, b) => mw + b.mw * b.capacity, 0)
  const moonKwe = lunarKwe(state)
  const claims = state.act4Moon?.claims ?? []
  const rows: {
    act: 'prologue' | 'act1' | 'act2' | 'act3' | 'act4'
    year: number
    netWorthUsd: number | null
    mw: number | null
    title: string | null
  }[] = []
  if (start.kind === 'bedroom') rows.push({ act: 'prologue', year: 2016, netWorthUsd: state.prologueCarry?.startNetWorthUsd ?? null, mw: null, title: null })
  if (!state.preset && !state.act4Preset)
    rows.push({ act: 'act1', year: 2022, netWorthUsd: netWorthAt(state, '2022Q3'), mw: null, title: null })
  // (Act II's end is the company as it entered Act III: act3Entry)
  const act2End = state.act3Entry
  if (act2End && !state.act4Preset)
    rows.push({
      act: 'act2',
      year: 2026,
      netWorthUsd: act2End.founderNetWorthUsd,
      mw: act2End.energizedMw,
      title: `ui.chapter2.title.${act2Title(act2End.valuationUsd)}`,
    })
  if (state.act4Entry && !state.act4Preset)
    rows.push({
      act: 'act3',
      year: 2030,
      netWorthUsd: state.act4Entry.founderNetWorthUsd,
      mw: state.act4Entry.energizedMw,
      title: state.act3End ? `ui.chapter2.title.${state.act3End.careerTitleId}` : null,
    })
  rows.push({ act: 'act4', year: 2035, netWorthUsd: o.netWorthUsd, mw: groundMw + orbitMw, title: e.careerTitleId ? `ui.chapter2.title.${e.careerTitleId}` : null })

  // The epilogue (doc 33 §15.2): 3-5 lines from the pools, by end state and the revealed future.
  const lines: string[] = []
  const pilotRan = claims.some((c) => (c.pilot?.processedT ?? 0) > 0)
  if (pilotRan) lines.push(start.kind === 'bedroom' ? 'finale.epilogue.moon_bedroom' : 'finale.epilogue.moon')
  else if (orbitMw > 0) lines.push('finale.epilogue.orbit')
  else lines.push('finale.epilogue.ground')
  lines.push(`finale.epilogue.future.${e.futureId}`)
  if (claims.some((c) => c.status === 'held')) lines.push(`finale.epilogue.grade.${e.lunar?.grade ?? 'patchy'}`)
  if (claims.some((c) => c.production)) lines.push('finale.epilogue.production')
  else if (claims.some((c) => c.status === 'held')) lines.push('finale.epilogue.ice_after')
  else if (orbitMw > 0) lines.push('finale.epilogue.orbit_after')
  if (!o.survived) lines.unshift('finale.epilogue.bust')
  const known = state.scenarioMode === true || state.scenarioForced === true || state.futureForced === true || state.act4ScenarioMode === true
  return {
    start,
    rows,
    netWorthUsd: o.netWorthUsd,
    careerMultiple: start.wealthUsd > 0 ? o.netWorthUsd / start.wealthUsd : null,
    megawatts: { startKw: start.kw, groundMw, orbitMw, moonKwe },
    frontierTitleId: e.frontierTitleId ?? 'earthbound',
    epilogue: lines.slice(0, 5),
    scenarioKnown: known,
    survived: o.survived,
  }
}
export type FinaleView = ReturnType<typeof finaleView>
