// M18.10 (DT): in Act III, an AI-lab or neocloud GPU contract in distress for 2 full quarters walks at the end of the
// second; its GPUs go to spot and any DDTL keeps its schedule. Hyperscaler GPU contracts and shell leases keep the old
// distress rule (half payment until renewal).
import { describe, expect, it } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import { toAct3, type GameState, type Project } from '../../src/sim/state.ts'
import { applyAction } from '../../src/sim/actions.ts'
import { settleLenderCures } from '../../src/sim/systems/facilities.ts'
import { endQuarterProjects, neocloudUsdHr } from '../../src/sim/systems/projects.ts'
import { act2Company } from './act2Helpers.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)
const cardOf = (type: string) => CONTENT.projects.tenantCards.find((c) => c.type === type)!.id

/**
 * B200 spot in S1 at 2028Q3. A contract at 4× it pays 2× spot in distress: spot is cheaper, the tenant walks; at 1.5×
 * it pays 0.75× spot: staying is cheaper, it stays.
 */
const spot = () => neocloudUsdHr('b200', q('2028Q3'), 's1')!
const WALKS = () => 4 * spot()
const STAYS = () => 1.5 * spot()

function cloud(
  type: string,
  distressedQuarter: number | undefined,
  gpu = true,
  priceUsdHr = WALKS(),
): { s: GameState; p: Project } {
  const s = toAct3(act2Company('2026Q4'), { scenario: 's1' })
  s.quarter = q('2028Q3')
  s.act3Renewals = []
  const p: Project = {
    id: 'project-1',
    n: 1,
    siteId: 'site-2',
    kw: 5000,
    kind: gpu ? 'cloud' : 'shell',
    gpu: gpu ? 'b200' : null,
    tier: 'mid',
    openedQuarter: q('2027Q1'),
    stage: 'live',
    offers: [],
    tenant: {
      card: cardOf(type),
      signedQuarter: q('2027Q1'),
      readyByQuarter: q('2027Q2'),
      lateQuarters: 0,
      walkRolled: true,
      prepaymentLeftUsd: 0,
      servedQuarters: 4,
      termQuarters: 40,
      ...(gpu ? { gpu: { gpus: 3000, priceUsdHr, termQuarters: 12 } } : {}),
      ...(distressedQuarter !== undefined ? { distressedQuarter } : {}),
    },
    spot: false,
    capital: 'cash',
    capexUsd: 0,
    gpuCapexUsd: 0,
    gpuCount: gpu ? 3000 : 0,
    startQuarter: q('2027Q1'),
    readyQuarter: q('2027Q2'),
    soldQuarter: null,
  }
  s.projects = [p]
  return { s, p }
}

describe('a distressed GPU contract walks after 2 full quarters', () => {
  it('an AI lab distressed since last quarter walks at this quarter’s end when spot is below its half pay: GPUs to spot, logged', () => {
    const { s, p } = cloud('ai_lab', q('2028Q2'))
    endQuarterProjects(s)
    expect(p.tenant).toBeNull()
    expect(p.spot).toBe(true)
    expect(s.log.at(-1)).toMatchObject({
      key: 'log.gpu_contract_walked',
      params: { n: 1, ddtl: 0, carried: 0 },
    })
  })

  it('M18.11 (c): spot above its half pay: it stays distressed (re-checked each quarter end)', () => {
    const { s, p } = cloud('ai_lab', q('2028Q1'), true, STAYS())
    endQuarterProjects(s)
    expect(p.tenant).not.toBeNull()
    expect(p.tenant!.distressedQuarter).toBe(q('2028Q1'))
  })

  it('a neocloud too; with a DDTL the walk is flagged, the loan stays, and a lender cure opens', () => {
    const { s, p } = withDdtl(cloud('neocloud_sub_tenant', q('2028Q2')))
    endQuarterProjects(s)
    expect(p.tenant).toBeNull()
    expect(s.log.at(-2)!.params).toMatchObject({ ddtl: 1 })
    expect(s.facilities).toHaveLength(1)
    expect(p.lenderCure).toEqual({ untilQuarter: q('2028Q3') + 2 })
    expect(s.log.at(-1)).toMatchObject({ key: 'log.lender_cure_started', params: { n: 1, quarter: '2029Q1' } })
  })

  it('not after only 1 quarter in distress; never a hyperscaler, a shell lease, or in Act II', () => {
    const one = cloud('ai_lab', q('2028Q3'))
    endQuarterProjects(one.s)
    expect(one.p.tenant).not.toBeNull()
    const hyper = cloud('hyperscaler', q('2028Q1'))
    endQuarterProjects(hyper.s)
    expect(hyper.p.tenant).not.toBeNull()
    const shell = cloud('ai_lab', q('2028Q1'), false)
    endQuarterProjects(shell.s)
    expect(shell.p.tenant).not.toBeNull()
    const act2 = cloud('ai_lab', q('2028Q1'))
    act2.s.act = 2
    endQuarterProjects(act2.s)
    expect(act2.p.tenant).not.toBeNull()
  })
})

/** Puts a $10M DDTL on the cloud. */
function withDdtl(x: { s: GameState; p: Project }) {
  x.s.facilities = [
    {
      id: 'facility-1',
      kind: 'ddtl',
      projectId: x.p.id,
      amountUsd: 1e7,
      balanceUsd: 1e7,
      apr: 0.1,
      tenorQuarters: 12,
      drawnQuarter: q('2027Q1'),
      missedQuarters: 0,
      rating: 'BBB',
    },
  ]
  return x
}

describe('M18.11 (a): the lender cure after a walk on a DDTL project', () => {
  /** A cloud whose contract has just walked, with its cure open until 2029Q1. */
  function walked() {
    const x = withDdtl(cloud('ai_lab', q('2028Q2')))
    endQuarterProjects(x.s)
    return x
  }

  it('not cured by the end of the 2nd quarter after the walk: the lender forecloses', () => {
    const { s, p } = walked()
    s.quarter = q('2028Q4')
    settleLenderCures(s)
    expect(p.lenderCure).toBeDefined() // still in its cure period
    s.quarter = q('2029Q1')
    settleLenderCures(s)
    expect(p.stage).toBe('foreclosed')
    expect(s.facilities).toEqual([])
    expect(s.log.some((e) => e.key === 'log.lender_cure_foreclosed')).toBe(true)
  })

  it('a new GPU contract on the project cures it', () => {
    const { s, p } = walked()
    p.tenant = { ...structuredClone(cloud('ai_lab', undefined).p.tenant!) }
    s.quarter = q('2028Q4')
    settleLenderCures(s)
    expect(p.lenderCure).toBeUndefined()
    expect(p.stage).toBe('live')
    expect(s.log.at(-1)!.key).toBe('log.lender_cure_done')
  })

  it('repaying the DDTL in full cures it (0 BW, logs debt_repay); greyed without the cash', () => {
    const { s, p } = walked()
    s.quarter = q('2028Q4')
    s.phase = 'plan'
    s.cash = 5e6
    const poor = applyAction(s, { type: 'REPAY_CURE_DDTL', projectId: p.id })
    expect(poor.ok).toBe(false)
    s.cash = 5e7
    const r = applyAction(s, { type: 'REPAY_CURE_DDTL', projectId: p.id })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.state.facilities).toEqual([])
    expect(r.state.act3Moves!.at(-1)!.kind).toBe('debt_repay')
    settleLenderCures(r.state)
    expect(r.state.projects[0].lenderCure).toBeUndefined()
  })
})
