// Console testing helpers (see app.tsx). Only in `npm run dev` and the staging build, never in `npm run build`.
import type { GameState } from '../sim/state.ts'

declare global {
  interface Window {
    g2g?: {
      state: () => GameState | null
      setCash: (usd: number) => number | undefined
      /** Jump to any game state, e.g. one copied from g2g.state() or built by a bot. */
      load: (state: GameState) => void
    }
  }
}
