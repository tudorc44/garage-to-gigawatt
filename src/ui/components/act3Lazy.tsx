// Act III's panels (screens/Act3Panels.tsx) load on demand, only in a test build (M13.2): Act III is
// reachable only there (the ACT3_PREVIEW gate), so the production build doesn't carry them. The gate is
// written inline so the bundler drops the import before it makes chunks (see app.tsx's preview module).
import type { ComponentType } from 'preact'
import { useEffect, useState } from 'preact/hooks'

type Panels = typeof import('../screens/Act3Panels.tsx')

let loaded: Panels | null = null

/** The Act III panels module once loaded (null until then, and always in production). */
function useAct3Panels(): Panels | null {
  const [m, setM] = useState<Panels | null>(loaded)
  useEffect(() => {
    if (loaded || import.meta.env.MODE === 'production') return
    let live = true
    void import('../screens/Act3Panels.tsx').then((x) => {
      loaded = x
      if (live) setM(x)
    })
    return () => {
      live = false
    }
  }, [])
  return m
}

/** Renders one Act III panel by name once its module is loaded; nothing before that. */
export function Act3Panel<K extends keyof Panels>(
  props: { name: K } & Parameters<Panels[K]>[0],
) {
  const m = useAct3Panels()
  if (!m) return null
  const { name, ...rest } = props
  // (Each panel's props are checked at the call site through the name; here any panel takes them.)
  const Panel = m[name] as unknown as ComponentType<typeof rest>
  return <Panel {...rest} />
}
