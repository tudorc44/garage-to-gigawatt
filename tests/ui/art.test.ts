// M43.A: the art manifest. Test art shows in dev and staging builds only: with the production flag (no test art) a
// test slot is hidden; real art (test: false) would show everywhere. Every slot's alt and credit are real text keys.
import { describe, expect, it } from 'vitest'
import { ART, artFor, type ArtSlotId } from '../../src/ui/art.ts'
import { t } from '../../src/i18n/t.ts'

describe('the art manifest (M43.A)', () => {
  it('hides test art when the production flag is set, and shows it in dev and staging', () => {
    expect(ART.orbit_first_block.test).toBe(true)
    expect(artFor('orbit_first_block', false)).toBeNull()
    expect(artFor('orbit_first_block', true)?.files.map((f) => f.width)).toEqual([640, 1152])
  })

  it('gives every slot its files, alt text and credit line', () => {
    for (const id of Object.keys(ART) as ArtSlotId[]) {
      const a = ART[id]
      expect(a.files.length).toBeGreaterThan(0)
      expect(t(a.alt)).not.toBe(a.alt)
      expect(t(a.credit)).not.toBe(a.credit)
    }
    expect(t(ART.orbit_first_block.alt)).toBe('Six satellites of an orbital AI data centre flying in a line above Earth at sunrise')
  })
})
