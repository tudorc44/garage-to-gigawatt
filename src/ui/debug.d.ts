// Console testing helpers (see app.tsx). Only in `npm run dev` and the staging build, never in `npm run build`.
import type { GameState } from '../sim/state.ts'

declare global {
  interface Window {
    g2g?: {
      state: () => GameState | null
      setCash: (usd: number) => number | undefined
    }
  }
}
