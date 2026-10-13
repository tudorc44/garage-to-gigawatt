// M67.4 (doc 43 §0.24 item 3, §3.2): Act II's business rules run in Act V as they do in Acts III and IV. isAct2RulesQuarter
// covers Act V's quarters, and with it the power reservation, regional Anger and Heat, staff salaries, equipment-loan terms
// and the depreciation audit run in Act V (they ran on Act I-era formulas or not at all). Loans stay hidden from Act V's
// Plan UI (M62); the rating is reviewed (M66.2).
import { describe, expect, it, vi } from 'vitest'
vi.setConfig({ testTimeout: 0 })
import { BALANCE, CONTENT, actFirstQuarter, actLastQuarter, isAct2RulesQuarter } from '../../src/content/index.ts'
import { playFrom } from '../../src/sim/replay.ts'
import { toAct5, type GameState } from '../../src/sim/state.ts'
import { regionAnger } from '../../src/sim/systems/anger.ts'
import { allHires, salaryUsdQ } from '../../src/sim/systems/hires.ts'
import { equipmentTerms } from '../../src/sim/systems/loans.ts'
import { payReservationWeek, siteMwByUse } from '../../src/sim/systems/mwUse.ts'
import { regionOf } from '../../src/sim/systems/sites.ts'
import { act4Company } from './act4Helpers.ts'

let end4: GameState | null = null
function act5(): GameState {
  end4 ??= playFrom(act4Company('s0', 'f1'), { plan: () => [] }, { through: 4 }).state
  return toAct5(structuredClone(end4), { vfuture: 'v1' })
}

describe('isAct2RulesQuarter covers Act V (M67.4)', () => {
  it('true for every Act V quarter, as for Acts II-IV; false before Act I ends', () => {
    for (let q = actFirstQuarter(5); q <= actLastQuarter(5); q++) expect(isAct2RulesQuarter(q), CONTENT.quarters[q]).toBe(true)
    expect(isAct2RulesQuarter(actFirstQuarter(4))).toBe(true)
    expect(isAct2RulesQuarter(actFirstQuarter(2) - 1)).toBe(false)
  })
})

describe('the rules that now run in Act V (M67.4)', () => {
  it('power reservation: idle and building MW pay a share of full-load power each week', () => {
    const s = act5()
    const idleOrBuilding = s.sites.reduce((kw, site) => {
      const u = siteMwByUse(s, site, s.quarter)
      return kw + u.idle + u.building
    }, 0)
    expect(idleOrBuilding).toBeGreaterThan(0)
    const cash0 = s.cash
    const paid = payReservationWeek(s)
    expect(paid).toBeGreaterThan(0)
    expect(s.cash).toBeLessThan(cash0)
    expect(BALANCE.powerReservation.share).toBeGreaterThan(0)
  })

  it('regional Anger reads the region\'s energized MW in Act V', () => {
    const s = act5()
    const regions = [...new Set(s.sites.map((x) => regionOf(x)).filter((r): r is NonNullable<typeof r> => !!r))]
    expect(regions.length).toBeGreaterThan(0)
    expect(regions.some((r) => regionAnger(s, r) > 0)).toBe(true)
  })

  it('staff salaries hold Act IV\'s level in Act V (the Act II series\' last value), not Act I\'s formula', () => {
    const ids = Object.keys(CONTENT.hiresAct2.salaryYr)
    expect(ids.length).toBeGreaterThan(0)
    const hire = allHires().find((h) => ids.includes(h.id))!
    expect(salaryUsdQ(hire, actFirstQuarter(5))).toBe(salaryUsdQ(hire, actLastQuarter(4)))
    expect(salaryUsdQ(hire, actLastQuarter(5))).toBe(salaryUsdQ(hire, actLastQuarter(4)))
  })

  it('equipment-loan terms price on the credit rating band (Act II-IV rules), not Act I\'s era terms', () => {
    const s = act5()
    const terms = equipmentTerms(s)
    expect(terms).toBeDefined()
    expect(terms!.ltv).toBeGreaterThan(0)
    // Act I's era terms would give the 2036 quarter no loan at all (capital.json's window ends in 2022)
    const rated = structuredClone(s)
    rated.creditRating = 'CCC-'
    expect(equipmentTerms(rated)!.apr).toBeGreaterThan(terms!.apr - 1e-9)
  })
})
