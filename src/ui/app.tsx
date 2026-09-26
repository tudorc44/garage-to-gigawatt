// The game shell: holds the GameState, sends actions to the sim, and picks the screen
// from the phase (plan → live → report → next plan … → Merge → chapter report). No game rules here.
import { useCallback, useRef, useState } from 'preact/hooks'
import type { Message } from '../i18n/t.ts'
import { applyAction, type Action } from '../sim/actions.ts'
import { advance } from '../sim/advance.ts'
import { seedFromString } from '../sim/rng.ts'
import { quarterName } from '../sim/selectors.ts'
import { newGame, type GameState } from '../sim/state.ts'
import { LiveScreen } from './screens/Live.tsx'
import { PlanScreen } from './screens/Plan.tsx'
import { ReportScreen } from './screens/Report.tsx'
import { ChapterScreen, MergeScreen } from './screens/End.tsx'
import { TitleScreen } from './screens/Start.tsx'

/** Numbers are used as-is; any other text is hashed; empty picks a random seed. */
function toSeed(text: string): number {
  if (text === '') return Math.floor(Math.random() * 1e9)
  return /^\d+$/.test(text) ? Number(text) : seedFromString(text)
}

/** Era theme (design system): garage until 2019, industrial from 2020Q1. */
const themeOf = (s: GameState | null) =>
  s && quarterName(s.quarter) >= '2020Q1' ? 'industrial' : 'garage'

export function App() {
  const [game, setGame] = useState<GameState | null>(null)
  const [showEnd, setShowEnd] = useState(false)
  // The latest state, so actions and timer ticks never work on a stale copy.
  const ref = useRef<GameState | null>(null)
  const commit = (s: GameState | null) => {
    ref.current = s
    setGame(s)
  }

  // Testing helpers for the browser console, in `npm run dev` and the staging build only
  // (Vite's mode is 'production' for `npm run build`, which leaves this out):
  //   g2g.setCash(500000)   g2g.state()   g2g.load(savedState)
  if (import.meta.env.MODE !== 'production') {
    window.g2g = {
      state: () => ref.current,
      setCash: (usd: number) => {
        if (ref.current) commit({ ...ref.current, cash: usd })
        return ref.current?.cash
      },
      load: (state: GameState) => commit(structuredClone(state)),
    }
  }

  const act = useCallback((a: Action): Message | null => {
    if (!ref.current) return null
    const r = applyAction(ref.current, a)
    if (!r.ok) return r.error
    commit(r.state)
    return null
  }, [])

  /** One week of the live quarter. */
  const tick = useCallback(() => {
    const s = ref.current
    if (s && s.phase === 'live' && !s.interrupt) commit(advance(s))
  }, [])

  /** Skip ahead to the report, stopping at the next interrupt (they always pause). */
  const skip = useCallback(() => {
    let s = ref.current
    while (s && s.phase === 'live' && !s.interrupt) s = advance(s)
    commit(s)
  }, [])

  const start = (seed: number) => {
    setShowEnd(false)
    commit(newGame(seed))
  }

  let screen
  if (!game) {
    screen = <TitleScreen onStart={(text) => start(toSeed(text))} />
  } else if (game.phase === 'ended' || (game.phase === 'gameover' && showEnd)) {
    screen = (
      <ChapterScreen
        state={game}
        onReplay={() => start(game.seed)}
        onNew={() => {
          setShowEnd(false)
          commit(null)
        }}
      />
    )
  } else if (game.phase === 'merge') {
    screen = <MergeScreen state={game} act={act} />
  } else if (game.phase === 'plan') {
    screen = <PlanScreen state={game} act={act} />
  } else if (game.phase === 'live') {
    screen = <LiveScreen state={game} act={act} tick={tick} skip={skip} />
  } else {
    screen = (
      <ReportScreen
        state={game}
        act={act}
        onGameOver={() => setShowEnd(true)}
      />
    )
  }

  return <div data-theme={themeOf(game)}>{screen}</div>
}
