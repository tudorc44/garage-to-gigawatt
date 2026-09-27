// The Merge head starts (M5.1; scope 0.2 §2.10, doc 18 §2.3): what each Merge choice does as the
// company enters Act II.
import { describe, expect, it } from 'vitest'
import {
  BALANCE,
  CONTENT,
  act2Quarter,
  actLastQuarter,
} from '../../src/content/index.ts'
import { newGame, type GameState } from '../../src/sim/state.ts'
import { miningPowerMult } from '../../src/sim/systems/headStarts.ts'
import { saleValueUsd } from '../../src/sim/systems/machines.ts'
import {
  knowHow,
  projectBuildQuarters,
  projectCapex,
} from '../../src/sim/systems/projects.ts'
import { powerPriceUsdKwh } from '../../src/sim/systems/sites.ts'
import { ok, playQuarter } from './act2Helpers.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)
const RIGS = 1000 // gpu_gen2, 0.85 kW each: 850 kW of GPU halls at the own site

/** A company at the Act I chapter report with S19s and GPU rigs at its own site, `choice` made. */
function chapter(choice: string): GameState {
  const s: GameState = {
    ...newGame(1),
    quarter: actLastQuarter(1),
    phase: 'chapter',
    mergeChoice: choice,
    cash: 50_000_000,
    bandwidth: 6,
    nextId: 3, // site-2 below
  }
  s.sites.push({
    id: 'site-2',
    tier: 'own_site',
    readyQuarter: 0,
    rentUsdQ: 0,
    powerPriceMult: 1,
    flaw: null,
  })
  s.machines.push(
    {
      id: 'lot-gpu',
      model: 'gpu_gen2',
      siteId: 'site-2',
      condition: 'used',
      count: RIGS,
      failed: 0,
      earnsFromQuarter: 0,
    },
    {
      id: 'lot-s19',
      model: 's19pro',
      siteId: 'site-2',
      condition: 'new',
      count: 2000,
      failed: 0,
      earnsFromQuarter: 0,
    },
  )
  return s
}

/** Through the act boundary to the 2022Q4 Plan phase. */
const enter = (choice: string) =>
  ok(ok(chapter(choice), { type: 'CONTINUE_TO_ACT_2' }), {
    type: 'START_ACT_2',
  })

/** Plays quarters until the Plan phase of `label`. */
function until(s: GameState, label: string): GameState {
  while (CONTENT.quarters[s.quarter] < label) s = playQuarter(s)
  return s
}

const shell = (s: GameState) =>
  ok(s, { type: 'PROJECT_OPEN', siteId: 'site-2', kw: 5000, kind: 'shell' })

describe('sell_gpus_keep_btc', () => {
  it('sells the GPU rigs at the used price, at the act boundary', () => {
    const before = chapter('sell_gpus_keep_btc')
    const value = saleValueUsd(before.machines[0], RIGS, before.quarter)
    const s = ok(before, { type: 'CONTINUE_TO_ACT_2' })
    expect(s.machines.some((l) => l.model === 'gpu_gen2')).toBe(false)
    expect(s.cash).toBeCloseTo(before.cash + value, 2)
    expect(s.act2Entry).toMatchObject({
      headStart: 'sell_gpus_keep_btc',
      gpuRigsSold: RIGS,
    })
  })

  it('lean ops: mining power × 0.9 for 4 quarters from 2022Q4', () => {
    const s = enter('sell_gpus_keep_btc')
    for (const [label, mult] of [
      ['2022Q4', 0.9],
      ['2023Q3', 0.9],
      ['2023Q4', 1],
    ] as const)
      expect(miningPowerMult({ ...s, quarter: q(label) })).toBe(mult)
    const r = playQuarter(s).reports.at(-1)!
    const hold = playQuarter(enter('hold_and_wait')).reports.at(-1)!
    // Same S19s, same site: the power bill is 10% lower (the hold company's rigs mine nothing).
    // A few units break during the quarter, so each bill is up to ~3% under the full load.
    const full =
      2000 * 3.25 * 24 * 7 * 13 * powerPriceUsdKwh(s.sites[1], s.quarter)
    const lean = r.powerCostUsd - r.reservationUsd
    const normal = hold.powerCostUsd - hold.reservationUsd
    expect(lean).toBeLessThanOrEqual(full * 0.9 + 1)
    expect(lean).toBeGreaterThan(full * 0.9 * 0.97)
    expect(normal).toBeLessThanOrEqual(full + 1)
    expect(normal).toBeGreaterThan(full * 0.97)
  })

  it('the first AI project builds a quarter longer; the next ones don’t', () => {
    let s = shell(until(enter('sell_gpus_keep_btc'), '2023Q3'))
    const p = s.projects[0]
    expect(projectBuildQuarters(s, p)).toBe(4)
    s = ok(s, {
      type: 'PROJECT_SIGN_TENANT',
      projectId: p.id,
      offerId: p.offers[0].id,
    })
    s = ok(s, { type: 'PROJECT_FUND_CASH', projectId: p.id })
    s = ok(s, { type: 'PROJECT_START', projectId: p.id })
    expect(s.projects[0].readyQuarter).toBe(s.quarter + 4)
    s = shell(s)
    expect(projectBuildQuarters(s, s.projects[1])).toBe(3)
  })
})

describe('gpu_cloud', () => {
  it('keeps the rigs as a legacy cloud: $0.15/GPU-hr at 40%, less their power, in AI EBITDA', () => {
    const s = enter('gpu_cloud')
    expect(s.machines.find((l) => l.model === 'gpu_gen2')!.legacyCloud).toBe(
      true,
    )
    const r = playQuarter(s).reports.at(-1)!
    const c = BALANCE.headStarts.legacyCloud
    const hours = 24 * 7 * 13
    // Per working rig (a few break during the quarter): revenue and power in the same proportion.
    const rev = RIGS * c.gpusPerRig * c.usdPerGpuHr * c.utilisation * hours
    const power = RIGS * 0.85 * hours * powerPriceUsdKwh(s.sites[1], s.quarter)
    expect(r.aiRevenueUsd).toBeLessThanOrEqual(rev + 1)
    expect(r.aiRevenueUsd).toBeGreaterThan(rev * 0.97)
    expect(r.aiCostUsd / r.aiRevenueUsd).toBeCloseTo(power / rev, 6)
    expect(r.coinsMined.ETH).toBe(0)
  })

  it('GPU know-how 1 from the start, and tenant cards from 2023Q1', () => {
    const s = until(enter('gpu_cloud'), '2023Q1')
    expect(knowHow(s)).toBe(1)
    expect(shell(s).projects[0].offers.length).toBeGreaterThan(0)
    const hold = until(enter('hold_and_wait'), '2023Q1')
    expect(knowHow(hold)).toBe(0)
    expect(shell(hold).projects[0].offers).toEqual([])
  })

  it('the first cluster builds a quarter faster', () => {
    const s = ok(until(enter('gpu_cloud'), '2023Q3'), {
      type: 'PROJECT_OPEN',
      siteId: 'site-2',
      kw: 2000,
      kind: 'cloud',
      gpu: 'h100',
    })
    expect(projectBuildQuarters(s, s.projects[0])).toBe(3) // 4 normally
  })
})

describe('hosting', () => {
  it('turns the GPU halls into hosting at $0.075/kWh from 2022Q4, at the GPU-hall conversion cost', () => {
    const before = chapter('hosting')
    const sale = saleValueUsd(before.machines[0], RIGS, before.quarter)
    const s = ok(before, { type: 'CONTINUE_TO_ACT_2' })
    const cost =
      850 * (act2Quarter(q('2022Q4'))!.capexUsdMw.gpuHallToHosting / 1000)
    expect(s.machines.some((l) => l.model === 'gpu_gen2')).toBe(false)
    expect(s.hosting).toEqual([
      expect.objectContaining({
        siteId: 'site-2',
        kw: 850,
        readyQuarter: q('2022Q4'),
        rateUsdKwh: 0.075,
        termEndQuarter: q('2023Q3'),
      }),
    ])
    expect(s.cash).toBeCloseTo(before.cash + sale - cost, 0)
    expect(s.act2Entry!.shellReadySites).toEqual(['site-2'])
    const r = playQuarter(ok(s, { type: 'START_ACT_2' })).reports.at(-1)!
    expect(r.hostingFeesUsd).toBeCloseTo(850 * 24 * 7 * 13 * 0.075, 0)
  })

  it('its sites are shell-ready: a shell there costs 25% less to retrofit and builds a quarter faster', () => {
    const s = shell(until(enter('hosting'), '2023Q3'))
    const hold = shell(until(enter('hold_and_wait'), '2023Q3'))
    expect(projectCapex(s, s.projects[0]).retrofitUsd).toBeCloseTo(
      projectCapex(hold, hold.projects[0]).retrofitUsd * 0.75,
      2,
    )
    expect(projectBuildQuarters(s, s.projects[0])).toBe(2)
    expect(projectBuildQuarters(hold, hold.projects[0])).toBe(3)
  })
})

describe('hold_and_wait (the bots’ choice)', () => {
  it('changes nothing: the rigs stay, switched off', () => {
    const before = chapter('hold_and_wait')
    const s = ok(before, { type: 'CONTINUE_TO_ACT_2' })
    expect(s.machines).toEqual(before.machines)
    expect(s.cash).toBe(before.cash)
    expect(s.act2Entry!.headStart).toBe('hold_and_wait')
    expect(miningPowerMult(s)).toBe(1)
  })
})
