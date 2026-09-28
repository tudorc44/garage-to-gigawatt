// The prologue's live quarter and its report: an auto-played quarter runs by itself (a card stops
// it); a card opens as the Act I event dialog; a decision quarter ends on its full report.
import { useEffect } from 'preact/hooks'
import { t, tDynamic } from '../../../i18n/t.ts'
import { prologueCard } from '../../../sim/prologue/events.ts'
import { prologueView } from '../../../sim/prologue/views.ts'
import type { GameState } from '../../../sim/state.ts'
import { Icon } from '../../components/basics.tsx'
import { fmt } from '../../format.ts'
import {
  CenterCard,
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

/** The live quarter: an auto-played quarter runs by itself; a card stops it. */
export function LiveQuarter({ state, act, skip, tick }: PrologueProps) {
  const v = prologueView(state)
  const card = state.interrupt?.event
  useEffect(() => {
    if (v.autoPlay && !state.interrupt) skip()
  }, [state.quarter, state.week, state.interrupt, v.autoPlay])
  return (
    <>
      <div class="panel">
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
