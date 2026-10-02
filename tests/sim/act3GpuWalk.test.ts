// M18.10 (DT): in Act III, an AI-lab or neocloud GPU contract in distress for 2 full quarters walks at the end of the
// second; its GPUs go to spot and any DDTL keeps its schedule. Hyperscaler GPU contracts and shell leases keep the old
// distress rule (half payment until renewal).
import { describe, expect, it } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import { toAct3, type GameState, type Project } from '../../src/sim/state.ts'
import { endQuarterProjects } from '../../src/sim/systems/projects.ts'
import { act2Company } from './act2Helpers.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)
const cardOf = (type: string) => CONTENT.projects.tenantCards.find((c) => c.type === type)!.id

function cloud(type: string, distressedQuarter: number | undefined, gpu = true): { s: GameState; p: Project } {
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
      ...(gpu ? { gpu: { gpus: 3000, priceUsdHr: 3, termQuarters: 12 } } : {}),
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
  it('an AI lab distressed since last quarter walks at this quarter’s end: GPUs to spot, logged', () => {
    const { s, p } = cloud('ai_lab', q('2028Q2'))
    endQuarterProjects(s)
    expect(p.tenant).toBeNull()
    expect(p.spot).toBe(true)
    expect(s.log.at(-1)).toMatchObject({ key: 'log.gpu_contract_walked', params: { n: 1, ddtl: 0 } })
  })

  it('a neocloud too; with a DDTL the walk is flagged and the loan stays', () => {
    const { s, p } = cloud('neocloud_sub_tenant', q('2028Q2'))
    s.facilities = [
      {
        id: 'facility-1',
        kind: 'ddtl',
        projectId: p.id,
        amountUsd: 1e7,
        balanceUsd: 1e7,
        apr: 0.1,
        tenorQuarters: 12,
        drawnQuarter: q('2027Q1'),
        missedQuarters: 0,
        rating: 'BBB',
      },
    ]
    endQuarterProjects(s)
    expect(p.tenant).toBeNull()
    expect(s.log.at(-1)!.params).toMatchObject({ ddtl: 1 })
    expect(s.facilities).toHaveLength(1)
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
