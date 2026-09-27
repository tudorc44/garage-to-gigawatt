// The game shell: holds the GameState, sends actions to the sim, and picks the screen
// from the phase (plan → live → report → next plan … → Merge → chapter report). No game rules here.
import { useCallback, useRef, useState } from 'preact/hooks'
import type { Message } from '../i18n/t.ts'
import { applyAction, type Action } from '../sim/actions.ts'
import { advance } from '../sim/advance.ts'
import { seedFromString } from '../sim/rng.ts'
import { bandwidthMax, quarterName } from '../sim/selectors.ts'
import { newGame, type GameState } from '../sim/state.ts'
import { presetGame } from '../sim/preset.ts'
import { restoreSave } from '../sim/save.ts'
import { LiveScreen } from './screens/Live.tsx'
import { PlanScreen } from './screens/Plan.tsx'
import { ReportScreen } from './screens/Report.tsx'
import { ChapterScreen, MergeScreen } from './screens/End.tsx'
import { ActIntroScreen } from './screens/ActIntro.tsx'
import { TitleScreen } from './screens/Start.tsx'
import { readSlot, writeSlot } from '../platform/saves.ts'
import { SaveContext, type SaveApi } from './components/saves.tsx'
import { NavContext } from './components/frame.tsx'
import type { Section } from './screens/Sections.tsx'
import { readSettings } from '../platform/settings.ts'
import { play, setSfxSettings } from './audio/sfx.ts'
import { soundsFor } from './audio/director.ts'

// Sound follows the player's setting from the start (Settings changes it live).
setSfxSettings({ enabled: readSettings().sound })

/** Numbers are used as-is; any other text is hashed; empty picks a random seed. */
function toSeed(text: string): number {
  if (text === '') return Math.floor(Math.random() * 1e9)
  return /^\d+$/.test(text) ? Number(text) : seedFromString(text)
}

/** Era theme (design system): garage until 2019, industrial from 2020Q1, campus in Act II. */
const themeOf = (s: GameState | null) =>
  s?.act === 2
    ? 'campus'
    : s && quarterName(s.quarter) >= '2020Q1'
      ? 'industrial'
      : 'garage'

export function App() {
  const [game, setGame] = useState<GameState | null>(null)
  const [showEnd, setShowEnd] = useState(false)
  const [section, setSection] = useState<Section>('dashboard')
  // The latest state, so actions and timer ticks never work on a stale copy.
  const ref = useRef<GameState | null>(null)
  const commit = (s: GameState | null) => {
    const before = ref.current
    if (before?.phase !== s?.phase) setSection('dashboard')
    ref.current = s
    setGame(s)
    for (const name of soundsFor(before, s)) play(name)
    // Autosave at the start of every quarter's Plan phase (scope §2.13).
    if (
      s?.phase === 'plan' &&
      (before?.phase !== 'plan' || before.quarter !== s.quarter)
    )
      writeSlot('autosave', s)
    // "Start of Act II": its own slot, saved when the game reaches the Act II intro (scope 0.2 §2.1).
    if (s?.phase === 'intro' && before?.phase !== 'intro') writeSlot('act2', s)
  }
  const saves: SaveApi = {
    current: () => ref.current,
    load: (s) => {
      setShowEnd(false)
      commit(structuredClone(s))
    },
  }

  // Testing helpers for the browser console, in every build (dev, staging and the GitHub Pages
  // production build, at the owner's request):
  //   g2g.setCash(500000)   g2g.state()   g2g.load(savedState)   g2g.bandwidth(8)   g2g.help()
  {
    window.g2g = {
      state: () => ref.current,
      setCash: (usd: number) => {
        if (ref.current) commit({ ...ref.current, cash: usd })
        return ref.current?.cash
      },
      bandwidth: (n?: number) => {
        const s = ref.current
        if (!s) return undefined
        commit({ ...s, bandwidth: n ?? bandwidthMax(s) })
        return ref.current?.bandwidth
      },
      help: () => {
        const lines = [
          'g2g.state()          the current game state',
          'g2g.setCash(usd)     set cash, e.g. g2g.setCash(500000)',
          "g2g.bandwidth(n?)    set this quarter's Bandwidth to n, or to the full maximum with no argument",
          'g2g.load(state)      load a state (through the save loader)',
          'g2g.help()           this list',
        ]
        console.log(lines.join('\n'))
        return lines
      },
      load: (state: GameState) => {
        // Through the save loader, so older or hand-edited states get any missing fields.
        const r = restoreSave(state)
        if (!r.ok) throw new Error(r.error.key)
        commit(r.state)
      },
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
    screen = (
      <TitleScreen
        onStart={(text) => start(toSeed(text))}
        onStartAct2={(text) => {
          setShowEnd(false)
          commit(presetGame(toSeed(text)))
        }}
        saves={{
          autosave: readSlot('autosave'),
          manual: readSlot('manual'),
        }}
        onLoad={saves.load}
      />
    )
  } else if (
    game.phase === 'chapter' ||
    (game.phase === 'gameover' && showEnd)
  ) {
    screen = (
      <ChapterScreen
        state={game}
        onReplay={() => start(game.seed)}
        onNew={() => {
          setShowEnd(false)
          commit(null)
        }}
        onContinue={
          game.phase === 'chapter' && game.act === 1
            ? () => act({ type: 'CONTINUE_TO_ACT_2' })
            : undefined
        }
      />
    )
  } else if (game.phase === 'intro') {
    screen = <ActIntroScreen state={game} act={act} />
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

  return (
    <SaveContext.Provider value={saves}>
      <NavContext.Provider value={{ section, setSection, act }}>
        <div data-theme={themeOf(game)}>{screen}</div>
      </NavContext.Provider>
    </SaveContext.Provider>
  )
}
