// The end of Act IV (M27.5; M32.1 the reveal; doc 33 §15.1). Builds the record the Act IV chapter report and the campaign
// finale read, once, when 2035Q4 is done or the game is over in Act IV. At the end of the act the future is no longer a
// secret, so this is the one place in src/ (besides each hidden file's own system) that reads the hidden views: the
// future's signals file (its name, trigger and decoy), the reading score, the lunar truth and the fleet's true
// reliability. The record holds numbers and ids only; the chapter report takes its words from en.json.
import { BALANCE, CONTENT, actFirstQuarter } from '../../content/index.ts'
import { MONEY } from '../../content/moneyContent.ts'
import { lunarSite, type LunarSiteId } from '../../content/moonContent.ts'
import { signalsHiddenIv } from '../../content/signalsHiddenIv.ts'
import type { Act4End, GameState } from '../state.ts'
import { ACT4_MOVE_SIGN } from './act4Moves.ts'
import { trueReliability } from './fleetReliability.ts'
import { revealSiteTruthT } from './lunarGeology.ts'
import { estimateT, resourceCategory } from './moon.ts'
import { computeReadingIv, markMovesIv } from './readingScoreIv.ts'
import { poweredKw } from './sites.ts'

/** The career title: Act II's valuation bands on the last valuation; "bust" after a game over (as Act III). */
function careerTitleId(state: GameState, gameOver: boolean): string {
  if (gameOver) return 'bust'
  const valuationUsd = state.reports.at(-1)?.valuationUsd ?? 0
  return BALANCE.act2Chapter.titleBands.find((b) => valuationUsd >= b.min)!.id
}

/** The reading title (Act III's bands), or null with no score. */
function readingTitleId(score: number | null): string | null {
  if (score === null) return null
  return BALANCE.act3.readingTitles.find((b) => score >= b.min)!.id
}

/**
 * Where your megawatts ended up (doc 33 §15.1 ⚙, mine): Selenian if a pilot plant processed water on the Moon;
 * Cislunar with a held lunar site and orbital MW; Orbital with at least a tenth of your MW in orbit; else Earthbound.
 */
export function frontierTitleId(state: GameState): string {
  const groundMw = state.sites.reduce((kw, s) => kw + poweredKw(s, state.quarter), 0) / 1000
  const orbitMw = (state.act4Orbit?.blocks ?? []).filter((b) => b.stage === 'live').reduce((mw, b) => mw + b.mw * b.capacity, 0)
  const claims = state.act4Moon?.claims ?? []
  if (claims.some((c) => (c.pilot?.processedT ?? 0) > 0)) return 'selenian'
  if (claims.some((c) => c.status === 'held') && orbitMw > 0) return 'cislunar'
  if (orbitMw > 0 && orbitMw >= 0.1 * (groundMw + orbitMw)) return 'orbital'
  return 'earthbound'
}

export function buildAct4End(state: GameState, gameOver = false): Act4End {
  const future = state.futureId!
  const valuation = state.reports.at(-1)?.valuationUsd ?? state.cash
  const founderNetWorthUsd = Math.max(0, state.founderStake * valuation)
  const entry = state.act4Entry?.founderNetWorthUsd
  const first = actFirstQuarter(4)
  const lastQ = state.quarter - first
  const qOf = (label: string) => CONTENT.quarters.indexOf(label) - first
  const h = signalsHiddenIv(future)
  const moves = state.act4Moves ?? []
  const reading = computeReadingIv(moves, future, lastQ)
  const truth = trueReliability(future)
  const telemetry = (state.act4Orbit?.blocks ?? []).flatMap((b) => b.telemetry)
  const grade = state.lunarGrade ?? 'patchy'
  const seed = state.act4Seed ?? state.seed
  const fails = (id: string) => MONEY.rivals.find((r) => r.id === id)!.futures[future].failsAt
  return {
    futureId: future,
    endQuarter: CONTENT.quarters[state.quarter],
    gameOver,
    founderNetWorthUsd,
    growthMultiple: entry && entry > 0 ? founderNetWorthUsd / entry : null,
    futureName: h.future_name,
    triggerQuarter: h.trigger.quarter,
    triggerQ: qOf(h.trigger.quarter),
    decoy: {
      indicator: h.decoy.indicator,
      quarters: [...h.decoy.quarters],
      fromQ: qOf(h.decoy.quarters[0]),
      toQ: qOf(h.decoy.quarters.at(-1)!),
    },
    signalReads: (state.act4SignalReads ?? []).map((r) => ({ quarter: r.quarter, indicator: r.indicator })),
    lunar: {
      grade,
      sites: (state.act4Moon?.claims ?? []).map((c) => ({
        site: c.site,
        status: c.status,
        estimateT: c.reports.length > 0 ? estimateT(c) : null,
        category: resourceCategory(c),
        truthT: revealSiteTruthT(seed, grade, c.site, lunarSite(c.site as LunarSiteId).ice_access),
      })),
    },
    fleet: {
      failurePctYr: truth.failureShareYr * 100,
      lifeYears: truth.lifeYears,
      telemetryAvgPctYr: telemetry.length ? telemetry.reduce((s, x) => s + x.failurePctYr, 0) / telemetry.length : null,
    },
    reading: { score: reading.score, base: reading.base, penalty: reading.penalty, perQuarter: reading.perQuarter },
    moves: markMovesIv(moves, future).map((m) => ({ q: m.q, kind: m.kind, sign: ACT4_MOVE_SIGN[m.kind], mark: m.mark })),
    careerTitleId: careerTitleId(state, gameOver),
    readingTitleId: readingTitleId(reading.score),
    frontierTitleId: frontierTitleId(state),
    rivalFates: MONEY.rivals.map((r) => {
      const at = fails(r.id)
      const i = Math.min(lastQ, 19)
      return { rival: r.id, valueUsd: r.futures[future].value[i], failed: at !== null && at <= i }
    }),
  }
}

/** The wording line for a reading score (Act III's thresholds), or null. */
function wordingOf(score: number | null): 'high' | 'mid' | 'low' | null {
  if (score === null) return null
  const w = BALANCE.act3.readingWording
  return score >= w.high ? 'high' : score >= w.mid ? 'mid' : 'low'
}

/**
 * The chapter report's figures (A4-11): the reveal record (rebuilt when missing or built before M32), net worth now
 * and at the Act IV entry, the growth multiple, survival, the end quarter, the titles and the wording.
 */
export function act4Outcome(state: GameState) {
  const survived = state.phase === 'chapter'
  const end = state.act4End?.reading ? state.act4End : buildAct4End(state, !survived)
  const entry = state.act4Entry
  const valuationUsd = state.reports.at(-1)?.valuationUsd ?? 0
  const netWorthUsd = Math.max(0, state.founderStake * valuationUsd)
  return {
    end,
    netWorthUsd,
    entryNetWorthUsd: entry?.founderNetWorthUsd ?? 0,
    growth: entry && entry.founderNetWorthUsd > 0 ? netWorthUsd / entry.founderNetWorthUsd : null,
    valuationUsd,
    survived,
    endQuarter: CONTENT.quarters[state.quarter],
    endQ: state.quarter - actFirstQuarter(4),
    wording: wordingOf(end.reading?.score ?? null),
  }
}
