// The Finances section (screens/Finances.tsx, M37.3) loads on demand, as Act III's and Act IV's screens do: its own
// chunk, so the main bundle stays small.
import { useEffect, useState } from 'preact/hooks'
import type { GameState } from '../../sim/state.ts'

type Module = typeof import('../screens/Finances.tsx')

let loaded: Module | null = null

/** Loads the module now (the tests use it so what they check never depends on a lazy import's timing). */
export async function preloadFinances(): Promise<void> {
  loaded ??= await import('../screens/Finances.tsx')
}

/** The Finances section, once its module is loaded; nothing before that. */
export function Finances(props: { state: GameState }) {
  const [m, setM] = useState<Module | null>(loaded)
  useEffect(() => {
    if (loaded) return
    let live = true
    void import('../screens/Finances.tsx').then((x) => {
      loaded = x
      if (live) setM(x)
    })
    return () => {
      live = false
    }
  }, [])
  if (!m) return null
  return <m.FinancesSection state={props.state} />
}
