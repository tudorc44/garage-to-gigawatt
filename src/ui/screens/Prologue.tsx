// The prologue's screens (Alpha 0.3 §2.13; Act 0): the intro, the Plan phase, the live quarter
// (auto-played quarters run by themselves), the quarter report or its one-card summary, and the
// prologue's chapter report before Act I. Functional first (P1); the full screens follow in P3.
import { useEffect } from 'preact/hooks'
import { hasText, t, tDynamic } from '../../i18n/t.ts'
import type { Action } from '../../sim/actions.ts'
import { prologueCard } from '../../sim/prologue/events.ts'
import { prologueNews, prologueView } from '../../sim/prologue/views.ts'
import type { GameState } from '../../sim/state.ts'
import { fmt } from '../format.ts'
import { say } from '../names.ts'

export interface PrologueProps {
  state: GameState
  act: (a: Action) => unknown
  tick: () => void
  skip: () => void
  onNew: () => void
}

export function PrologueScreen(props: PrologueProps) {
  const { state } = props
  if (state.phase === 'intro') return <Intro {...props} />
  if (state.phase === 'live') return <Live {...props} />
  if (state.phase === 'report' || state.phase === 'gameover')
    return <QuarterCard {...props} />
  if (state.phase === 'chapter') return <Chapter {...props} />
  return <PlanP0 {...props} />
}

function Page(props: { children: preact.ComponentChildren }) {
  return (
    <div class="screen" data-theme="bedroom">
      <div class="center-page">
        <div class="panel end-card chapter-card">{props.children}</div>
      </div>
    </div>
  )
}

function Intro({ act }: PrologueProps) {
  return (
    <Page>
      <div class="label">{t('ui.p0.intro_label')}</div>
      <h1 class="screen-title">{t('ui.p0.intro_title')}</h1>
      <p class="pitch">{tDynamic('p0.intro', '')}</p>
      <div>
        <button
          type="button"
          class="btn btn-primary"
          onClick={() => act({ type: 'START_PROLOGUE' })}
        >
          {t('ui.p0.begin')}
        </button>
      </div>
    </Page>
  )
}

/** The company at a glance: the quarter, cash, coins and where they are, the price. */
function Header({ state }: { state: GameState }) {
  const v = prologueView(state)
  return (
    <div class="row-between">
      <span class="num-s">
        {t('ui.p0.header', {
          quarter: fmt.quarter(v.quarter),
          turn: v.turn,
          turns: v.turns,
        })}
      </span>
      <span class="num-s">
        {t('ui.p0.money', {
          cash: fmt.money(v.cash),
          btc: v.treasury.BTC.toLocaleString('en-US', {
            maximumFractionDigits: 2,
          }),
          price: fmt.money(v.btcUsd),
        })}
      </span>
    </div>
  )
}

function News({ state }: { state: GameState }) {
  const news = prologueNews(state).filter((k) => hasText(k))
  if (news.length === 0) return null
  return (
    <div class="log">
      {news.map((k) => (
        <div key={k}>{tDynamic(k, '')}</div>
      ))}
    </div>
  )
}

function PlanP0({ state, act }: PrologueProps) {
  const v = prologueView(state)
  return (
    <Page>
      <Header state={state} />
      <h1 class="screen-title">{fmt.quarter(v.quarter)}</h1>
      <News state={state} />
      <p class="num-s">{say(v.solo.words)}</p>
      <div>
        <button
          type="button"
          class="btn btn-primary"
          onClick={() => act({ type: 'END_PLAN' })}
        >
          {t('ui.plan.start_quarter')}
        </button>
      </div>
    </Page>
  )
}

/** A card (Act I's shape): title, story, one button per answer. */
function Card(props: {
  id: string
  choices: string[]
  onChoose: (choice: string) => void
}) {
  const k = `p0.event.${props.id}`
  return (
    <div class="panel">
      <h2 class="screen-title">{tDynamic(`${k}.title`, props.id)}</h2>
      <p class="pitch">{tDynamic(`${k}.body`, '')}</p>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {props.choices.map((c) => (
          <button
            key={c}
            type="button"
            class="btn"
            onClick={() => props.onChoose(c)}
          >
            {tDynamic(`${k}.choice.${c}`, c)}
          </button>
        ))}
      </div>
    </div>
  )
}

function Live({ state, act, skip, tick }: PrologueProps) {
  const v = prologueView(state)
  const card = state.interrupt?.event
    ? prologueCard(state.interrupt.event)
    : null
  // An auto-played quarter runs by itself to its end (a card stops it).
  useEffect(() => {
    if (v.autoPlay && !state.interrupt) skip()
  }, [state.quarter, state.week, state.interrupt, v.autoPlay])
  if (card)
    return (
      <Page>
        <Header state={state} />
        <Card
          id={card.id}
          choices={card.choices.map((c) => c.id)}
          onChoose={(choice) => act({ type: 'RESOLVE_INTERRUPT', choice })}
        />
      </Page>
    )
  return (
    <Page>
      <Header state={state} />
      <p class="num-s">
        {t('ui.p0.week', { week: state.week, quarter: fmt.quarter(v.quarter) })}
      </p>
      {!v.autoPlay && (
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" class="btn" onClick={tick}>
            {t('ui.p0.play_week')}
          </button>
          <button type="button" class="btn btn-primary" onClick={skip}>
            {t('ui.p0.skip')}
          </button>
        </div>
      )}
    </Page>
  )
}

/** The quarter's report: a one-card summary when it auto-played, with "Stop here". */
function QuarterCard({ state, act, onNew }: PrologueProps) {
  const r = prologueView(state).lastReport
  if (!r) return null
  const over = state.phase === 'gameover'
  return (
    <Page>
      <div class="label">
        {t(r.auto ? 'ui.p0.auto_label' : 'ui.p0.report_label')}
      </div>
      <h1 class="screen-title">
        {t('ui.p0.summary', {
          quarter: fmt.quarter(r.quarter),
          btc: r.coinsMined.BTC.toLocaleString('en-US', {
            maximumFractionDigits: 2,
          }),
          price: fmt.money(r.btcUsd),
          difficulty: fmt.pct(r.difficultyChangePct),
        })}
      </h1>
      <p class="num-s">
        {t('ui.p0.summary_money', {
          cash: fmt.money(r.cash),
          worth: fmt.money(r.netWorthUsd),
        })}
      </p>
      <div style={{ display: 'flex', gap: '10px' }}>
        {over ? (
          <button type="button" class="btn btn-primary" onClick={onNew}>
            {t('ui.end.new')}
          </button>
        ) : (
          <>
            <button
              type="button"
              class="btn btn-primary"
              onClick={() => act({ type: 'NEXT_QUARTER' })}
            >
              {t('ui.p0.continue')}
            </button>
            <button
              type="button"
              class="btn"
              title={t('ui.p0.stop_here_note')}
              onClick={() => act({ type: 'NEXT_QUARTER', stopHere: true })}
            >
              {t('ui.p0.stop_here')}
            </button>
          </>
        )}
      </div>
    </Page>
  )
}

function Chapter({ state, act }: PrologueProps) {
  const v = prologueView(state)
  return (
    <Page>
      <div class="label">{t('ui.p0.chapter_label')}</div>
      <h1 class="screen-title">{fmt.money(v.netWorthUsd)}</h1>
      <div>
        <button
          type="button"
          class="btn btn-primary"
          onClick={() => act({ type: 'CONTINUE_TO_ACT_1' })}
        >
          {t('ui.p0.to_act1')}
        </button>
      </div>
    </Page>
  )
}
