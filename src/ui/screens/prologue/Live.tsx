// The prologue's live quarter and its report: an auto-played quarter runs by itself (a card stops
// it); a card opens as the Act I event dialog; a decision quarter ends on its full report.
import { useEffect } from 'preact/hooks'
import { t, tDynamic } from '../../../i18n/t.ts'
import { prologueCard } from '../../../sim/prologue/events.ts'
import type { PrologueReport } from '../../../sim/prologue/types.ts'
import {
  prologueMarketView,
  prologueView,
} from '../../../sim/prologue/views.ts'
import type { GameState } from '../../../sim/state.ts'
import { quarterIndex } from '../../../content/index.ts'
import { quarterRevenue } from '../../../sim/financeViews.ts'
import { Icon, Tip } from '../../components/basics.tsx'
import { fmt } from '../../format.ts'
import {
  CenterCard,
  Change,
  coins,
  price,
  type PrologueProps,
} from './common.tsx'

/** A card on screen (the Act I event dialog's look). */
export function EventDialog({
  state,
  act,
}: {
  state: GameState
  act: PrologueProps['act']
}) {
  const card = state.interrupt?.event
    ? prologueCard(state.interrupt.event)
    : null
  if (!card) return null
  const v = prologueView(state)
  return (
    <div class="scrim">
      <article
        class="event"
        role="dialog"
        aria-modal="true"
        aria-labelledby="p0-card-title"
      >
        <span class="label">
          {t('ui.event.eyebrow', {
            quarter: fmt.quarter(v.quarter),
            week: (state.interrupt?.week ?? 0) + 1,
          })}
        </span>
        <h2 class="event-title" id="p0-card-title">
          {tDynamic(`p0.event.${card.id}.title`, card.id)}
        </h2>
        <p class="event-body">{tDynamic(`p0.event.${card.id}.body`, '')}</p>
        {card.choices.map((c) => (
          <button
            key={c.id}
            type="button"
            class={`choice${c.id === card.default ? ' default' : ''}`}
            autoFocus={c.id === card.default}
            onClick={() => act({ type: 'RESOLVE_INTERRUPT', choice: c.id })}
          >
            <span class="row-between">
              <span class="choice-label">
                {tDynamic(`p0.event.${card.id}.choice.${c.id}`, c.id)}
              </span>
              {c.id === card.default && (
                <span class="default-tag">{t('ui.alert.default')}</span>
              )}
            </span>
          </button>
        ))}
      </article>
    </div>
  )
}

// ---------- timed auto-play (wireframe P0-04) ----------

/** Auto-play speed: 1×, 2× or 4× (a card lasts 2 s at 1×). UI only: bots never see it. */
export type Speed = 1 | 2 | 4
const CARD_MS = 2000

/** One auto-played quarter's line: mined, BTC and its change (red / green), difficulty (neutral). */
function AutoCardBody({ r, prevBtc }: { r: PrologueReport; prevBtc: number | null }) {
  const change = prevBtc && prevBtc > 0 ? r.btcUsd / prevBtc - 1 : null
  return (
    <span class="num-s">
      {t('ui.p0.auto_mined', { btc: coins(r.coinsMined.BTC, 'BTC') })} · BTC{' '}
      {price(r.btcUsd)} <Change value={change} /> ·{' '}
      {t('ui.p0.auto_difficulty')}{' '}
      <Change value={r.difficultyChangePct} neutral />
    </span>
  )
}

/** The speed buttons and Pause here, on every auto-play card. */
function AutoControls(props: {
  speed: Speed
  setSpeed: (s: Speed) => void
  onPause?: () => void
}) {
  return (
    <div class="row-between">
      {props.onPause ? (
        <button type="button" class="btn" onClick={props.onPause}>
          <Icon name="pause" size={16} />
          {t('ui.p0.pause_here')}
        </button>
      ) : (
        <span />
      )}
      <span class="seg" role="group" aria-label={t('ui.p0.speed')}>
        {([1, 2, 4] as const).map((s) => (
          <button
            key={s}
            type="button"
            class="btn"
            aria-pressed={props.speed === s}
            onClick={() => props.setSpeed(s)}
          >
            {s}×
          </button>
        ))}
      </span>
    </div>
  )
}

/** The auto-played quarters so far in this run of them (the last 3), newest last. */
function recentAuto(state: GameState): PrologueReport[] {
  const reports = state.prologue!.reports
  const run: PrologueReport[] = []
  for (let i = reports.length - 1; i >= 0 && reports[i].auto; i--)
    run.unshift(reports[i])
  return run.slice(-3)
}

function prevBtcOf(state: GameState, r: PrologueReport): number | null {
  const reports = state.prologue!.reports
  const i = reports.indexOf(r)
  return i > 0 ? reports[i - 1].btcUsd : null
}

/**
 * An auto-played quarter's card (P0-04): older cards fade and stack above it; a timer bar runs for
 * 2 s (÷ the speed), then the next quarter plays. Pause here makes the next quarter a Plan phase.
 */
export function AutoPlay(
  props: PrologueProps & { speed: Speed; setSpeed: (s: Speed) => void },
) {
  const { state, act, speed } = props
  const stack = recentAuto(state)
  const now = stack.at(-1)!
  const ms = CARD_MS / speed
  useEffect(() => {
    const id = window.setTimeout(() => act({ type: 'NEXT_QUARTER' }), ms)
    return () => window.clearTimeout(id)
  }, [now.quarter, ms])
  return (
    <div class="screen g-paper">
      <div class="center-page">
        <div class="p0-autoplay">
          <span class="label">{t('ui.p0.auto_sequence')}</span>
          {stack.slice(0, -1).map((r, i) => (
            <div
              class="panel p0-autocard old"
              key={r.quarter}
              style={{ opacity: 0.35 + 0.2 * i }}
            >
              <div class="row-between">
                <strong>{fmt.quarter(r.quarter)}</strong>
                <span class="label">{t('ui.p0.auto_played')}</span>
              </div>
              <AutoCardBody r={r} prevBtc={prevBtcOf(state, r)} />
            </div>
          ))}
          <div class="panel p0-autocard" key={now.quarter}>
            <div class="row-between">
              <strong>{fmt.quarter(now.quarter)}</strong>
              <span class="label">
                <Icon name="auto-play" size={16} /> {t('ui.p0.auto_now')}
              </span>
            </div>
            <AutoCardBody r={now} prevBtc={prevBtcOf(state, now)} />
            {now.cards.length > 0 && (
              <span class="num-s muted">
                {now.cards
                  .map(
                    (c) =>
                      `${tDynamic(`p0.event.${c.id}.title`, c.id)}: ${tDynamic(`p0.event.${c.id}.choice.${c.choice}`, c.choice)}`,
                  )
                  .join(' · ')}
              </span>
            )}
            <div class="p0-timer">
              <i
                key={`${now.quarter}:${speed}`}
                style={{ animationDuration: `${ms}ms` }}
              />
            </div>
            <AutoControls
              speed={speed}
              setSpeed={props.setSpeed}
              onPause={() => act({ type: 'NEXT_QUARTER', stopHere: true })}
            />
          </div>
          <span class="num-s muted">{t('ui.p0.auto_note')}</span>
        </div>
      </div>
    </div>
  )
}

/** An event fired during auto-play (P0-04): the quarter's card shows "Paused · event", the card opens above. */
function AutoPaused(
  props: PrologueProps & { speed: Speed; setSpeed: (s: Speed) => void },
) {
  const { state, act } = props
  const v = prologueView(state)
  const w = prologueMarketView(state)
  return (
    <div class="p0-autoplay">
      <div class="panel p0-autocard">
        <div class="row-between">
          <strong>{fmt.quarter(v.quarter)}</strong>
          <span class="label">
            <Icon name="pause" size={16} /> {t('ui.p0.auto_paused')}
          </span>
        </div>
        <span class="num-s">
          BTC {price(w.btcUsd)} · {t('ui.p0.auto_resumes')}
        </span>
        <AutoControls speed={props.speed} setSpeed={props.setSpeed} />
      </div>
      <EventDialog state={state} act={act} />
    </div>
  )
}

/** The live quarter: an auto-played quarter runs by itself; a card stops it. */
export function LiveQuarter(
  props: PrologueProps & { speed: Speed; setSpeed: (s: Speed) => void },
) {
  const { state, act, skip, tick } = props
  const v = prologueView(state)
  const card = state.interrupt?.event
  useEffect(() => {
    if (v.autoPlay && !state.interrupt) skip()
  }, [state.quarter, state.week, state.interrupt, v.autoPlay])
  if (v.autoPlay && card) return <AutoPaused {...props} />
  return (
    <>
      <div class="panel">
        <Tip id="live" act={0} />
        <div class="row-between">
          <span class="panel-title">
            {t('ui.p0.week', {
              week: state.week,
              quarter: fmt.quarter(v.quarter),
            })}
          </span>
          {!v.autoPlay && !card && (
            <span style={{ display: 'flex', gap: '10px' }}>
              <button type="button" class="btn" onClick={tick}>
                <Icon name="play" size={16} />
                {t('ui.p0.play_week')}
              </button>
              <button type="button" class="btn btn-primary" onClick={skip}>
                <Icon name="skip" size={16} />
                {t('ui.p0.skip')}
              </button>
            </span>
          )}
        </div>
        <p class="num-s">
          {t('ui.p0.live_mined', {
            btc: coins(state.prologue!.quarter.coinsMined.BTC, 'BTC'),
            blocks: state.prologue!.quarter.blocksFound,
          })}
        </p>
      </div>
      <EventDialog state={state} act={act} />
    </>
  )
}

/** A decision quarter's full report (and the game over). */
export function QuarterReport({ state, act, onNew }: PrologueProps) {
  const r = prologueView(state).lastReport
  if (!r) return null
  const over = state.phase === 'gameover'
  // M37.7 (DT): the quarter's revenue as the P&L counts it (coins mined at their value, income at home)
  const q = quarterIndex(r.quarter)
  const revenue = q === undefined ? null : quarterRevenue(state, q)
  const revenueText = revenue
    ? fmt.money(revenue.total) +
      (revenue.mining > 0.005 && revenue.total - revenue.mining > 0.005
        ? ` (${t('ui.fin.of_which_mining', { usd: fmt.money(revenue.mining) })})`
        : '')
    : null
  return (
    <CenterCard>
      <div class="label">
        <Icon name="news" size={16} /> {t('ui.p0.report_label')}
      </div>
      <h1 class="screen-title">
        {t('ui.p0.summary', {
          quarter: fmt.quarter(r.quarter),
          btc: coins(r.coinsMined.BTC, 'BTC'),
          price: price(r.btcUsd),
          difficulty: fmt.delta(r.difficultyChangePct, 'pct'),
        })}
      </h1>
      <table class="num-s" style={{ width: '100%' }}>
        <tbody>
          {revenueText && (
            <tr>
              <td>{t('ui.p0.r.revenue')}</td>
              <td class="g-right">{revenueText}</td>
            </tr>
          )}
          {(
            [
              ['ui.p0.r.income', fmt.money(r.incomeUsd)],
              ['ui.p0.r.rent', fmt.money(-r.rentUsd)],
              ['ui.p0.r.power', fmt.money(-r.powerCostUsd)],
              ['ui.p0.r.sold', fmt.money(r.soldUsd)],
              ['ui.p0.r.blocks', String(r.blocksFound)],
              ['ui.p0.r.cash', fmt.money(r.cash)],
              ['ui.p0.r.coins', coins(r.treasury.BTC, 'BTC')],
              ['ui.p0.r.net_worth', fmt.money(r.netWorthUsd)],
            ] as const
          ).map(([k, value]) => (
            <tr key={k}>
              <td>{t(k)}</td>
              <td class="g-right">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {r.cards.length > 0 && (
        <ul class="num-s">
          {r.cards.map((c) => (
            <li key={c.id}>
              {tDynamic(`p0.event.${c.id}.title`, c.id)}:{' '}
              {tDynamic(`p0.event.${c.id}.choice.${c.choice}`, c.choice)}
            </li>
          ))}
        </ul>
      )}
      {over && <p class="loss">{t('ui.p0.game_over')}</p>}
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
    </CenterCard>
  )
}
