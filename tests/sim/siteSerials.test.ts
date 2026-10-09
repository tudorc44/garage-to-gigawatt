// M33.1 (design thread, doc 35): telling sites apart. Each site gets a number among the sites of its type when it's
// acquired, never reused; old saves are numbered on load; logs and messages name a site by its short name.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { t } from '../../src/i18n/t.ts'
import { applyAction } from '../../src/sim/actions.ts'
import { restoreSave } from '../../src/sim/save.ts'
import { newGame, type GameState, type Site } from '../../src/sim/state.ts'
import {
  addSite,
  numberUnnumbered,
  siteParams,
} from '../../src/sim/systems/siteSerials.ts'
import { siteName } from '../../src/ui/names.ts'

function site(s: GameState, tier: string, category?: string): Site {
  return {
    id: `site-${s.nextId++}`,
    tier,
    readyQuarter: 0,
    rentUsdQ: 0,
    powerPriceMult: 1,
    flaw: null,
    ...(category ? { category, kw: 20_000, region: 'georgia' } : {}),
  }
}

describe('site numbers', () => {
  it('a new game numbers its garage; each type counts on its own', () => {
    const s = newGame(1)
    expect(s.sites[0].serial).toBe(1)
    const a = site(s, 'own_site')
    const b = site(s, 'own_site')
    const w = site(s, 'warehouse')
    const p = site(s, 'own_site', 'energized_land_powered_shell')
    for (const x of [a, b, w, p]) addSite(s, x)
    expect([a.serial, b.serial, w.serial, p.serial]).toEqual([1, 2, 1, 1])
    expect(s.siteSerials).toEqual({
      garage: 1,
      own_site: 2,
      warehouse: 1,
      energized_land_powered_shell: 1,
    })
  })

  it("a left site's number is retired, never reused", () => {
    let s = newGame(1)
    s.cash = 1_000_000
    const one = site(s, 'small_unit')
    const two = site(s, 'small_unit')
    addSite(s, one)
    addSite(s, two)
    const r = applyAction(s, { type: 'LEAVE_SITE', siteId: two.id })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    s = r.state
    expect(s.sites.some((x) => x.id === two.id)).toBe(false)
    const three = site(s, 'small_unit')
    addSite(s, three)
    expect(three.serial).toBe(3)
    // The log line names the site that left by its number.
    const left = s.log.find((e) => e.key === 'log.site_left')!
    expect(t(left.key, left.params)).toContain('Small unit 2')
  })
})

describe('saves from before site numbers', () => {
  it('number their sites per type in acquisition order, the counter at the highest', () => {
    const g = newGame(7)
    for (const tier of ['own_site', 'warehouse', 'own_site', 'own_site'])
      g.sites.push(site(g, tier))
    const old = JSON.parse(JSON.stringify(g)) as Record<string, unknown>
    for (const x of old.sites as Record<string, unknown>[]) delete x.serial
    delete old.siteSerials
    const r = restoreSave(old)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const own = r.state.sites.filter((x) => x.tier === 'own_site')
    expect(own.map((x) => x.serial)).toEqual([1, 2, 3])
    expect(r.state.siteSerials).toEqual({ garage: 1, own_site: 3, warehouse: 1 })
  })

  it('M34.2 (3b): a site is dated when acquired; a site from an older save is dated null, never "unknown"', () => {
    const s = newGame(1)
    s.quarter = 5
    const x = site(s, 'own_site')
    addSite(s, x)
    expect(x.acquiredQuarter).toBe(5)
    expect(s.sites[0].acquiredQuarter).toBe(0) // the garage, from the start
    const old = JSON.parse(JSON.stringify(s)) as Record<string, unknown>
    for (const y of old.sites as Record<string, unknown>[]) delete y.acquiredQuarter
    const r = restoreSave(old)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.state.sites.every((y) => y.acquiredQuarter === null)).toBe(true)
  })

  it('a real version-1 save loads with every site numbered', () => {
    const raw = JSON.parse(
      readFileSync(
        join(import.meta.dirname, '../fixtures/saves/v1-plan-2021Q2.json'),
        'utf8',
      ),
    ) as unknown
    const r = restoreSave(raw)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.state.sites.every((x) => x.serial === 1)).toBe(true)
  })

  it('keep the numbers they have and number the rest after them', () => {
    const s = newGame(1)
    const kept = site(s, 'own_site')
    kept.serial = 4
    const fresh = site(s, 'own_site')
    s.sites.push(kept, fresh)
    s.siteSerials = { garage: 1, own_site: 5 }
    numberUnnumbered(s)
    expect(fresh.serial).toBe(6)
  })
})

describe('short names', () => {
  it('are unique on a 20-site company', () => {
    const s = newGame(1)
    const types: [string, string?][] = [
      ['small_unit'],
      ['warehouse'],
      ['own_site'],
      ['texas_site'],
      ['own_site', 'distressed_miner_site'],
      ['own_site', 'energized_land_powered_shell'],
      ['own_site', 'greenfield_new_site'],
    ]
    for (let i = 0; i < 19; i++) {
      const [tier, category] = types[i % types.length]
      addSite(s, site(s, tier, category))
    }
    expect(s.sites).toHaveLength(20)
    const names = s.sites.map(siteName)
    expect(new Set(names).size).toBe(20)
    expect(names).toContain('Garage')
    expect(names).toContain('Own site 3')
    expect(names).toContain('Powered shell 2')
    expect(names).toContain('Distressed miner 3')
  })

  it('log lines name the site; one from before M33 keeps its type', () => {
    const s = newGame(1)
    const x = site(s, 'own_site')
    addSite(s, x)
    addSite(s, site(s, 'own_site'))
    const y = s.sites[2]
    expect(t('log.site_ready', siteParams(y))).toContain('Own site 2')
    expect(t('log.site_ready', { tier: 'own_site' })).toContain('Own site')
    expect(t('log.site_ready', { tier: 'own_site' })).not.toContain('Own site 1')
  })
})
