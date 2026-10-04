// Act III's panels (screens/Act3Panels.tsx) load on demand (M13.2), in every build since the Act III public
// release (M20.2): their own chunk, so the main bundle stays small.
import type { ComponentType } from 'preact'
import { useEffect, useState } from 'preact/hooks'

type Panels = typeof import('../screens/Act3Panels.tsx')

let loaded: Panels | null = null

/** The Act III panels module once loaded (null until then). */
function useAct3Panels(): Panels | null {
  const [m, setM] = useState<Panels | null>(loaded)
  useEffect(() => {
    if (loaded) return
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
