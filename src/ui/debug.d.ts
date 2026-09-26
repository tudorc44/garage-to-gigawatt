// Dev-only console helpers (see app.tsx). Only exists while running `npm run dev`.
import type { GameState } from '../sim/state.ts'

declare global {
  interface Window {
    g2g?: {
      state: () => GameState | null
      setCash: (usd: number) => number | undefined
    }
  }
}
