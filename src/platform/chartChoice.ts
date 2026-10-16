// The Live chart's series choice (doc 61 §4, M75): kept in the browser next to the settings, for the game being played (its seed) and
// the act it was made in. UI state outside the game state, so no golden or save format moves. Storage can be missing or blocked:
// reads give nothing and writes fail softly.
export interface ChartChoice {
  seed: number
  act: number
  series: string
}

const KEY = 'g2g.chart'

/** The remembered series for this game and act, or null (another game, another act, nothing stored). */
export function readChartChoice(seed: number, act: number): string | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const c = JSON.parse(raw) as Partial<ChartChoice>
    return c.seed === seed && c.act === act && typeof c.series === 'string' ? c.series : null
  } catch {
    return null
  }
}

export function writeChartChoice(c: ChartChoice): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(c))
    return true
  } catch {
    return false
  }
}
