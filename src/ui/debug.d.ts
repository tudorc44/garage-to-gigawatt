// Console testing helpers (see app.tsx), in every build: dev, staging and production (GitHub Pages).
import type { GameState } from '../sim/state.ts'

declare global {
  interface Window {
    g2g?: {
      state: () => GameState | null
      setCash: (usd: number) => number | undefined
      /** Sets this quarter's Bandwidth to n, or to the full maximum (bandwidthForQuarter) without one. */
      bandwidth: (n?: number) => number | undefined
      /** Lists the helpers in the console. */
      help: () => string[]
      /** Jump to any game state, e.g. one copied from g2g.state() or built by a bot. */
      load: (state: GameState) => void
    }
  }
}
