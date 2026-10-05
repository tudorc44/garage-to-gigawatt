// M31.1 (doc 33 §11, §12, §14.3; B14): Act IV's money and rivals content. The capital rules, the four hires and the five
// rivals parse; every rival's value and orbital MW are the same in every future through 2032Q2 (the league can't tell
// the futures apart early); Orrery fails in two futures and is gone from then on; the paths follow doc 33's roles.
import { describe, expect, it } from 'vitest'
import { FUTURE_IDS } from '../../src/content/index.ts'
import { ACT4_HIRE_IDS, ACT4_RIVAL_IDS, MONEY } from '../../src/content/moneyContent.ts'

const at = (id: string, f: (typeof FUTURE_IDS)[number]) => MONEY.rivals.find((r) => r.id === id)!.futures[f]
const Q = (label: string) => (Number(label.slice(0, 4)) - 2031) * 4 + Number(label.slice(5)) - 1

describe('the money and rivals content (M31.1)', () => {
  it('capital rules, four hires, five rivals with 20 quarters each', () => {
    expect(MONEY.capital.project_debt.spread_bps.sovereign).toBe(450)
    expect(MONEY.hires.map((h) => h.id)).toEqual([...ACT4_HIRE_IDS])
    expect(MONEY.rivals.map((r) => r.id)).toEqual([...ACT4_RIVAL_IDS])
    for (const r of MONEY.rivals) for (const f of FUTURE_IDS) expect(r.futures[f].value).toHaveLength(20)
  })

  it('every rival is the same in every future through 2032Q2', () => {
    for (const id of ACT4_RIVAL_IDS)
      for (const f of FUTURE_IDS) {
        expect(at(id, f).value.slice(0, Q('2032Q2') + 1), `${id} ${f}`).toEqual(at(id, 'f1').value.slice(0, Q('2032Q2') + 1))
        expect(at(id, f).orbitMw.slice(0, Q('2032Q2') + 1)).toEqual(at(id, 'f1').orbitMw.slice(0, Q('2032Q2') + 1))
      }
  })

  it('Orrery fails in F2 (2033Q3) and F4 (2034Q2) and is gone from then on; the giant leads in F1 and stalls in F2', () => {
    expect(at('orrery_compute', 'f2').failsAt).toBe(Q('2033Q3'))
    expect(at('orrery_compute', 'f2').value[Q('2033Q3')]).toBeNull()
    expect(at('orrery_compute', 'f2').value[Q('2033Q2')]).not.toBeNull()
    expect(at('orrery_compute', 'f4').failsAt).toBe(Q('2034Q2'))
    expect(at('orrery_compute', 'f1').failsAt).toBeNull()
    expect(at('pallas_compute', 'f1').value[19]!).toBeGreaterThan(at('pallas_compute', 'f2').value[19]!)
  })
})
