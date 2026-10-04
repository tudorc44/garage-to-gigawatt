// M19.3 (design thread, 4 Oct 2026): a golden-style run. An Act I bot (raise-climb, which climbs to big own sites)
// with the Community Relations Manager forced on from 2019Q1 (the first Plan phase she can be hired in) and every
// Community Deal signed, against the same bot without her: the median Heat of its sites (beyond the garage, at each
// Plan phase) per year, and neighbour complaints per quarter. Printed for the M19 report; the test checks she helps.
import { describe, expect, it } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { playGame, type Strategy } from '../../src/sim/replay.ts'
import type { GameState } from '../../src/sim/state.ts'
import { communityDealBlocker } from '../../src/sim/systems/communityDeal.ts'
import { hireBlocker } from '../../src/sim/systems/hires.ts'
import { BOTS } from '../../tools/bots.ts'

const FROM = CONTENT.quarters.indexOf('2019Q1')
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

interface Tally {
  /** Heat of every site beyond the garage at each Plan phase, by year. */
  heatByYear: Record<string, number[]>
  complaints: number
  quarters: number
  deals: number
}

/** The base bot, recording Heat and complaints; with `forced`, also hiring her and signing every deal. */
function wrap(base: Strategy, tally: Tally, forced: boolean): Strategy {
  return {
    ...base,
    plan(s) {
      const year = CONTENT.quarters[s.quarter].slice(0, 4)
      for (const site of s.sites)
        if (site.tier !== 'garage')
          (tally.heatByYear[year] ??= []).push(s.siteHeat[site.id]?.value ?? 0)
      tally.quarters++
      const actions = base.plan(s)
      if (!forced || s.quarter < FROM) return actions
      // the extras go after the bot's own actions, checked on the state those leave
      let after: GameState = s
      for (const a of actions) {
        const r = applyAction(after, a)
        if (r.ok) after = r.state
      }
      const extra: Action[] = []
      if (!after.staff.community_relations && !hireBlocker(after, 'community_relations')) {
        extra.push({ type: 'HIRE', hire: 'community_relations' })
        after = (applyAction(after, extra[0]) as { state: GameState }).state
      }
      if (after.communityDeal?.offer && !communityDealBlocker(after)) {
        extra.push({ type: 'COMMUNITY_DEAL_SIGN' })
        tally.deals++
      }
      return [...actions, ...extra]
    },
    answer(s) {
      if (s.interrupt?.id === 'neighbour_complaint') tally.complaints++
      return base.answer?.(s)
    },
  }
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length === 0 ? NaN : s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

function run(forced: boolean): Tally & { ends: string[] } {
  const tally: Tally = { heatByYear: {}, complaints: 0, quarters: 0, deals: 0 }
  const ends: string[] = []
  for (const seed of SEEDS) {
    const s = playGame(seed, wrap(BOTS['raise-climb'], tally, forced)).state
    if (s.phase === 'gameover')
      ends.push(`seed ${seed} game over ${CONTENT.quarters[s.quarter]}`)
  }
  return { ...tally, ends }
}

describe('the forced-hire run (M19.3)', () => {
  it('raise-climb × 10 seeds, with her from 2019Q1 and every deal signed vs without: Heat and complaints', () => {
    const before = run(false)
    const after = run(true)
    const years = Object.keys(before.heatByYear).sort()
    const rows = years.map((y) => ({
      year: y,
      before: median(before.heatByYear[y] ?? []),
      after: median(after.heatByYear[y] ?? []),
    }))
    console.log(
      'M19 forced-hire run (raise-climb, seeds 1–10): median Heat of sites beyond the garage, per year\n' +
        rows.map((r) => `  ${r.year}: ${r.before.toFixed(1)} → ${r.after.toFixed(1)}`).join('\n') +
        `\n  complaints per quarter: ${(before.complaints / before.quarters).toFixed(3)} → ${(after.complaints / after.quarters).toFixed(3)}` +
        ` (${before.complaints} → ${after.complaints} in ${before.quarters} / ${after.quarters} quarters); deals signed ${after.deals}` +
        `\n  game overs: without [${before.ends.join(', ')}], with [${after.ends.join(', ')}]`,
    )
    // she's on staff from 2019: every later year with sites is no hotter, and complaints don't rise
    for (const r of rows.filter((x) => x.year >= '2019' && !Number.isNaN(x.before)))
      expect(r.after).toBeLessThanOrEqual(r.before)
    expect(after.complaints).toBeLessThanOrEqual(before.complaints)
    expect(after.deals).toBeGreaterThan(0)
  }, 120_000)
})
