// M30.1 (doc 33 §9, §12; B11): Act IV's lunar content. The 8 sites and the chain's rules parse; the rivals' and blocs'
// scripted claims are the same in every future through 2032Q2 (the map never tells the futures apart early); a pilot at
// a good site at 100 kWe processes B11's band per grade; no production plant can produce inside the act.
import { describe, expect, it } from 'vitest'
import { CONTENT, FUTURE_IDS, actLastQuarter } from '../../src/content/index.ts'
import { LUNAR_SITE_IDS, MOON, lunarSite } from '../../src/content/moonContent.ts'
import truth from '../../src/content/lunar_truth.json' with { type: 'json' }

const Q = (label: string) => CONTENT.quarters.indexOf(label)

describe('the lunar content (M30.1)', () => {
  it('8 polar sites with their light, ice, room and bloc interest; claims name real sites, one claimant each', () => {
    expect(MOON.sites.map((s) => s.id)).toEqual([...LUNAR_SITE_IDS])
    for (const f of FUTURE_IDS) {
      const sites = MOON.claims[f].map((c) => c.site)
      expect(new Set(sites).size, f).toBe(sites.length)
      for (const c of MOON.claims[f]) expect(Q(c.lands), `${f} ${c.site}`).toBeGreaterThan(Q(c.claim))
    }
  })

  it('the scripted claims are identical in every future through 2032Q2', () => {
    const seen = (f: (typeof FUTURE_IDS)[number]) =>
      MOON.claims[f]
        .filter((c) => Q(c.claim) <= Q('2032Q2'))
        .map((c) => `${c.claimant}:${c.site}:${c.claim}:${Q(c.lands) <= Q('2032Q2') ? c.lands : 'later'}`)
    for (const f of FUTURE_IDS) expect(seen(f)).toEqual(seen('f1'))
  })

  it('B11 from the data: a 100 kWe pilot at the best-lit ridge processes Rich 15-60, Patchy 5-30, Dry 0-8 t a year', () => {
    const site = lunarSite('shackleton_ridge')
    const p = MOON.pilot
    const out = (factor: number) => p.t_water_per_kwe_yr * 100 * site.illumination * p.efficiency * factor * site.ice_access
    const rich = out(truth.grades.rich.pilot_grade_factor)
    const patchy = out(truth.grades.patchy.pilot_grade_factor)
    const dry = out(truth.grades.dry.pilot_grade_factor)
    expect(rich).toBeGreaterThanOrEqual(15)
    expect(rich).toBeLessThanOrEqual(60)
    expect(patchy).toBeGreaterThanOrEqual(5)
    expect(patchy).toBeLessThanOrEqual(30)
    expect(dry).toBeGreaterThanOrEqual(0)
    expect(dry).toBeLessThanOrEqual(8)
  })

  it('no production plant can produce inside the act: the fastest chain’s first output is after 2035Q4', () => {
    const first = Q('2031Q1')
    // claim and send a mission at once; it lands after the shortest lead; decide the pilot then; it runs two quarters
    const pilotDecided = first + MOON.mission.lead_quarters[0]
    const measured = pilotDecided + MOON.pilot.build_quarters + MOON.pilot.measured_after_quarters
    const decision = Math.max(measured, Q(MOON.power.megawatt_contract.from))
    expect(decision + MOON.production.first_output_quarters[0]).toBeGreaterThan(actLastQuarter(4))
  })
})
