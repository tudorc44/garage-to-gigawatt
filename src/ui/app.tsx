// The game shell: holds the GameState, sends actions to the sim, and picks the screen
// from the phase (plan → live → report → next plan … → Merge → chapter report). No game rules here.
import type { ComponentType } from 'preact'
import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import { t, type Message } from '../i18n/t.ts'
import { applyAction, type Action } from '../sim/actions.ts'
import { advance } from '../sim/advance.ts'
import { seedFromString } from '../sim/rng.ts'
import { bandwidthMax, quarterName } from '../sim/selectors.ts'
import {
  inActII,
  inActIII,
  newGame,
  toAct3,
  type GameState,
} from '../sim/state.ts'
import {
  ACT3_PREVIEW,
  forcedScenario,
  guardTestBuildSave,
} from '../platform/preview.ts'
import { presetGame } from '../sim/preset.ts'
import { newPrologueGame } from '../sim/prologue/setup.ts'
import type { PrologueProps } from './screens/Prologue.tsx'
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

/**
 * The prologue's screens are a separate file the browser fetches only when a prologue game is on
 * screen (most of that UI code is used by nobody else); it stays loaded for the rest of the session.
 */
function LazyPrologue(props: PrologueProps) {
  const [Screen, setScreen] = useState<ComponentType<PrologueProps> | null>(
    null,
  )
  useEffect(() => {
    let live = true
    void import('./screens/Prologue.tsx').then((m) => {
      if (live) setScreen(() => m.PrologueScreen)
    })
    return () => {
      live = false
    }
  }, [])
  return Screen ? (
    <Screen {...props} />
  ) : (
    <p class="num-s muted" role="status">
      {t('ui.loading')}
    </p>
  )
}

type PreviewModule = typeof import('./screens/Act3Preview.tsx')

/**
 * The Act III preview module (M13), loaded only in a test build: in production ACT3_PREVIEW is the
 * constant false, so this import (and the whole file) is dropped from the bundle.
 */
function useAct3Preview(): PreviewModule | null {
  const [m, setM] = useState<PreviewModule | null>(null)
  useEffect(() => {
    // (The gate is written out here, not read from ACT3_PREVIEW: only an inline constant lets the
    // bundler drop the branch before it makes chunks, so no orphan preview chunk is left in dist/.)
    if (import.meta.env.MODE !== 'production')
      void import('./screens/Act3Preview.tsx').then(setM)
  }, [])
  return m
}

/** Numbers are used as-is; any other text is hashed; empty picks a random seed. */
function toSeed(text: string): number {
  if (text === '') return Math.floor(Math.random() * 1e9)
  return /^\d+$/.test(text) ? Number(text) : seedFromString(text)
}

/**
 * Era theme (design system): bedroom in the prologue, garage until 2019, industrial from 2020Q1,
 * campus in Act II.
 */
const themeOf = (s: GameState | null) =>
  s?.act === 0
    ? 'bedroom'
    : inActIII(s)
      ? 'grid'
      : inActII(s)
        ? 'campus'
        : s && quarterName(s.quarter) >= '2020Q1'
          ? 'industrial'
          : 'garage'

export function App() {
  const [game, setGame] = useState<GameState | null>(null)
  const [showEnd, setShowEnd] = useState(false)
  // Test builds (M13): the Act III preview module, and the Act III intro before 2027Q1's Plan phase.
  const preview = useAct3Preview()
  const [act3Intro, setAct3Intro] = useState(false)
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
    // (The prologue's intro is act 0's: not this slot.)
    if (s?.phase === 'intro' && inActII(s) && before?.phase !== 'intro')
      writeSlot('act2', s)
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
        // Through the save loader, so older or hand-edited states get any missing fields (and an
        // Act III state only loads in a test build).
        const r = guardTestBuildSave(restoreSave(state))
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

  /**
   * Test builds: an end-of-Act II company enters Act III (the drawn scenario, or the tester's
   * ?scenario), and the Act III intro shows first.
   */
  const enterAct3 = (end: GameState) => {
    if (!ACT3_PREVIEW) return
    const forced = forcedScenario(window.location.search)
    setShowEnd(false)
    commit(
      toAct3(end, forced ? { scenario: forced, forced: true } : undefined),
    )
    setAct3Intro(true)
  }

  let screen
  if (preview && game && inActIII(game) && act3Intro) {
    screen = (
      <preview.Act3Intro state={game} onEnter={() => setAct3Intro(false)} />
    )
  } else if (
    preview &&
    game &&
    inActIII(game) &&
    (game.phase === 'chapter' || (game.phase === 'gameover' && showEnd))
  ) {
    screen = (
      <preview.Act3Chapter
        state={game}
        onNew={() => {
          setShowEnd(false)
          commit(null)
        }}
      />
    )
  } else if (!game) {
    screen = (
      <TitleScreen
        onStart={(text) => start(toSeed(text))}
        onStartAct2={(text) => {
          setShowEnd(false)
          commit(presetGame(toSeed(text)))
        }}
        onStartPrologue={(text) => {
          setShowEnd(false)
          commit(newPrologueGame(toSeed(text)))
        }}
        saves={{
          autosave: readSlot('autosave'),
          manual: readSlot('manual'),
          act2: readSlot('act2'),
        }}
        onLoad={saves.load}
        preview={preview && <preview.QuickStart onReady={enterAct3} />}
      />
    )
  } else if (game.act === 0) {
    // The prologue (Alpha 0.3) has its own screens for every phase.
    screen = (
      <LazyPrologue
        state={game}
        act={act}
        tick={tick}
        skip={skip}
        onNew={() => {
          setShowEnd(false)
          commit(null)
        }}
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
        extra={
          preview && game.phase === 'chapter' && inActII(game) ? (
            <preview.ContinueToAct3 onClick={() => enterAct3(game)} />
          ) : undefined
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
