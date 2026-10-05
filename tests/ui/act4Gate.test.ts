// M27.6 (act4-scope.md §3, "test builds only"): Act IV's ?future= forcing and its quick-start companies are test-build
// only; production refuses an Act IV save a test build made. (The production/staging build check is in act3Gate.test.ts.)
import { describe, expect, it } from 'vitest'
import { forcedFuture, guardTestBuildSave } from '../../src/platform/preview.ts'
import { toAct4 } from '../../src/sim/state.ts'
import { ACT4_QUICK_STARTS, act4QuickStartCompany } from '../../src/ui/act4QuickStart.ts'
import { act3Finished } from '../sim/act4Helpers.ts'

describe('Act IV test-build gate (M27.6)', () => {
  it('?future= forces f1–f4 only in a test build', () => {
    expect(forcedFuture('?future=f3', true)).toBe('f3')
    expect(forcedFuture('?future=f9', true)).toBeNull()
    expect(forcedFuture('?future=f3', false)).toBeNull()
    expect(forcedFuture('', true)).toBeNull()
  })

  it('production refuses an Act IV save with a forced future or a quick start; a plain one loads', () => {
    const end = act3Finished('s1')
    const plain = toAct4(end, { future: 'f2' })
    const forced = toAct4(end, { future: 'f2', forced: true })
    const quick = toAct4(end, { future: 'f2', quickStart: true })
    expect(guardTestBuildSave({ ok: true, state: plain }, false).ok).toBe(true)
    expect(guardTestBuildSave({ ok: true, state: forced }, false).ok).toBe(false)
    expect(guardTestBuildSave({ ok: true, state: quick }, false).ok).toBe(false)
    expect(guardTestBuildSave({ ok: true, state: forced }, true).ok).toBe(true)
  })

  it.each(ACT4_QUICK_STARTS.map((q) => q.id))(
    'the %s quick start survives Act III to its 2030Q4 chapter report and enters Act IV',
    async (id) => {
      const end = await act4QuickStartCompany(id)
      expect(end.act).toBe(3)
      expect(end.phase).toBe('chapter')
      const s = toAct4(end, { quickStart: true })
      expect(s.act).toBe(4)
      expect(s.act4QuickStart).toBe(true)
      expect(s.act4Entry!.valuationUsd).toBeGreaterThan(0)
    },
    0,
  )
})
