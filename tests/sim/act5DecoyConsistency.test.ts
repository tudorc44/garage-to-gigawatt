// M64.1 (doc 43 §0.20 item 3): for each of Act V's four futures, the Signals file's decoy, the reading file's decoy and the
// decoy card all name the same indicator and quarters (V4's Signals decoy named firm_buildout while the card and the reading
// file named a capacity squeeze). Tests may read the hidden files (a grep test keeps src/ out of them).
import { describe, expect, it } from 'vitest'
import { V_FUTURE_IDS } from '../../src/content/index.ts'
import { signalsHiddenV } from '../../src/content/signalsHiddenV.ts'
import eventsRaw from '../../src/content/events_v.json' with { type: 'json' }
import readingRaw from '../../src/content/reading_score_v.json' with { type: 'json' }

interface Card {
  id: string
  future: string
  window: [string, string]
  role: string
  choices: { label: string }[]
  reading_sign?: Record<string, number | string>
}
const CARDS = (eventsRaw as unknown as { event_cards: Card[] }).event_cards
const READING = readingRaw as unknown as {
  futures: Record<string, { decoy: { indicator: string; quarters: string[]; wrong_stance: number } }>
}

describe.each(V_FUTURE_IDS)('the decoy of %s: one story in three files', (f) => {
  const sig = signalsHiddenV(f).decoy
  const rd = READING.futures[f].decoy
  const card = CARDS.find((c) => c.future === f && c.role === 'decoy')!

  it('the Signals file and the reading file name the same indicator and quarters', () => {
    expect(sig.indicator).toBe(rd.indicator)
    expect(sig.quarters).toEqual(rd.quarters)
    expect(sig.quarters).toContain(sig.peak_quarter)
  })

  it('the decoy card plays inside those quarters, and its tempting choice carries the reading file\'s wrong stance', () => {
    expect(card).toBeTruthy()
    expect(sig.quarters).toContain(card.window[0])
    expect(sig.quarters).toContain(card.window[1])
    const signs = Object.values(card.reading_sign ?? {}).filter((x) => typeof x === 'number') as number[]
    expect(signs).toContain(rd.wrong_stance)
  })

  it('the named indicator really spikes in the decoy window, and is tagged there', () => {
    const ind = signalsHiddenV(f).indicators.find((i) => i.id === sig.indicator)!
    const at = (q: string) => ind.series.findIndex((s) => s.quarter === q)
    const peak = at(sig.peak_quarter)
    // the authoring latent rises by at least 3 into the window (the generator's "a move needs a headline" threshold)
    expect(ind.authoring_latent[peak] - ind.authoring_latent[at(sig.quarters[0]) - 1]).toBeGreaterThanOrEqual(3)
    for (const q of sig.quarters) expect(ind.series[at(q)].role_tag).toBe('decoy')
  })
})
