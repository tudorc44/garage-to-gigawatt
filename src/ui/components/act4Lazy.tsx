// Act IV's orbit screens (screens/Act4Panels.tsx) load on demand (M29.5), as Act III's do (act3Lazy.tsx): their own
// chunk, so the main bundle stays small.
import type { ComponentType } from 'preact'
import { useEffect, useState } from 'preact/hooks'

type Panels = typeof import('../screens/Act4Panels.tsx')

let loaded: Panels | null = null

/** Loads the panels module now (the tests use it so what they check never depends on a lazy import's timing). */
export async function preloadAct4Panels(): Promise<void> {
  loaded ??= await import('../screens/Act4Panels.tsx')
}

function useAct4Panels(): Panels | null {
  const [m, setM] = useState<Panels | null>(loaded)
  useEffect(() => {
    if (loaded) return
    let live = true
    void import('../screens/Act4Panels.tsx').then((x) => {
      loaded = x
      if (live) setM(x)
    })
    return () => {
      live = false
    }
  }, [])
  return m
}

/** Renders one Act IV panel by name once its module is loaded; nothing before that. */
export function Act4Panel<K extends keyof Panels>(props: { name: K } & Parameters<Panels[K]>[0]) {
  const m = useAct4Panels()
  if (!m) return null
  const { name, ...rest } = props
  const Panel = m[name] as unknown as ComponentType<typeof rest>
  return <Panel {...rest} />
}
