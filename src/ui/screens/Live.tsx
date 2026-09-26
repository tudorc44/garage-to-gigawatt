// Live quarter: 13 weeks tick by (~1.5 s each at 1×). Pause, 1×/2×/4×, skip.
// Interrupts open as a modal and pause time. The sim does the work in advance().
import { useEffect, useState } from 'preact/hooks'
import { t, tDynamic, type MessageKey } from '../../i18n/t.ts'
import { choicePreview } from '../../sim/systems/interrupts.ts'
import {
  MAX_INTERRUPTS,
  PRICE_ALERT_THRESHOLD,
  complaintView,
  KEEP_MINING_GRIEVANCE,
  URI_STORM_PRICE,
  eventCardView,
  interruptChoices,
  lotViews,
  marginCallView,
  quarterName,
  treasuryValue,
} from '../../sim/selectors.ts'
import type { GameState, WeekSummary } from '../../sim/state.ts'
import { Icon, WeekStrip } from '../components/basics.tsx'
import { Shell } from '../components/frame.tsx'
import { fmt } from '../format.ts'
import { machineName, tierName } from '../names.ts'
import type { ScreenProps } from './Plan.tsx'
import { MarketReadText } from './Plan.tsx'

const WEEK_MS = 1500
const SPEEDS = [1, 2, 4] as const

/** Short labels under the week strip, by log key. */
const NOTE_KEYS: Partial<Record<MessageKey, MessageKey>> = {
  'log.alert_sold': 'ui.live.note.alert',
  'log.alert_held': 'ui.live.note.alert',
  'log.failures': 'ui.live.note.failure',
  'log.switched_off': 'ui.live.note.switch_off',
  'log.eth_mining_ends': 'ui.live.note.merge',
  'log.margin_posted': 'ui.live.note.margin',
  'log.complaint_paid': 'ui.live.note.complaint',
  'log.complaint_ignored': 'ui.live.note.complaint',
  'log.mitigated': 'ui.live.note.complaint',
  'log.margin_paid': 'ui.live.note.margin',
  'log.margin_sold_machines': 'ui.live.note.margin',
  'log.margin_default': 'ui.live.note.margin',
  'log.liquidated': 'ui.live.note.margin',
  'log.curtail_agreed': 'ui.live.note.grid',
  'log.curtail_declined': 'ui.live.note.grid',
  'log.curtailed': 'ui.live.note.curtailed',
  'log.event_choice': 'ui.live.note.event',
  'log.event_choice_cash': 'ui.live.note.event',
}

export function LiveScreen(
  props: ScreenProps & { tick: () => void; skip: () => void },
) {
  const { state, act, tick, skip } = props
  const [paused, setPaused] = useState(false)
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1)
  const waiting = !!state.interrupt

  useEffect(() => {
    if (paused || waiting || state.phase !== 'live') return
    const id = setTimeout(tick, WEEK_MS / speed)
    return () => clearTimeout(id)
  }, [state, paused, speed, waiting, tick])

  const st = state.quarterStats
  const weeks = st.weeks
  const notes: Record<number, string> = {}
  for (const e of state.log) {
    const k =
      e.quarter === state.quarter && e.week ? NOTE_KEYS[e.key] : undefined
    if (k && e.week && !notes[e.week]) notes[e.week] = t(k)
  }
  const flags = weeks.filter((w) => w.priceAlert).map((w) => w.week)
  const current = Math.max(1, state.week)

  return (
    <div class="screen">
      <Shell state={state} paused={paused || waiting}>
        <div class="live-main">
          <WeekStrip current={current} flags={flags} notes={notes} />
          <div class="live-grid">
            <Totals state={state} />
            <PriceChart weeks={weeks} current={current} />
          </div>
          {state.marketRead?.quarter === state.quarter && (
            <p class="num-s" style={{ margin: 0 }}>
              <Icon name="read-market" size={16} />{' '}
              <MarketReadText state={state} />
            </p>
          )}
          <div class="controls">
            <div class="seg" role="group" aria-label={t('ui.live.play_pause')}>
              <button
                type="button"
                aria-pressed={paused}
                onClick={() => setPaused(true)}
              >
                <Icon name="pause" size={16} />
                {t('ui.live.pause')}
              </button>
              <button
                type="button"
                aria-pressed={!paused}
                onClick={() => setPaused(false)}
              >
                <Icon name="play" size={16} />
                {t('ui.live.play')}
              </button>
            </div>
            <div class="seg" role="group" aria-label={t('ui.live.speed')}>
              {SPEEDS.map((x) => (
                <button
                  key={x}
                  type="button"
                  aria-pressed={speed === x}
                  onClick={() => setSpeed(x)}
                >
                  {`${x}×`}
                </button>
              ))}
            </div>
            <span class="counter">
              {t('ui.live.interrupts', {
                n: state.interruptsThisQuarter,
                max: MAX_INTERRUPTS,
              })}
            </span>
            <span style={{ flex: 1 }} />
            <button type="button" class="btn" disabled={waiting} onClick={skip}>
              <Icon name="skip" size={16} />
              {t('ui.live.skip')}
            </button>
          </div>
        </div>
      </Shell>
      {state.interrupt?.id === 'price_alert' && (
        <PriceAlertCard state={state} act={act} />
      )}
      {state.interrupt?.id === 'margin_call' && (
        <MarginCallCard state={state} act={act} />
      )}
      {(state.interrupt?.id === 'curtailment' ||
        state.interrupt?.id === 'uri') && (
        <CurtailmentCard state={state} act={act} />
      )}
      {state.interrupt?.id === 'event' && <EventCard state={state} act={act} />}
      {state.interrupt?.id === 'margin_warning' && (
        <MarginWarningCard state={state} act={act} />
      )}
      {state.interrupt?.id === 'neighbour_complaint' && (
        <ComplaintCard state={state} act={act} />
      )}
    </div>
  )
}

function Totals({ state }: { state: GameState }) {
  const st = state.quarterStats
  const played = Math.max(1, st.weeks.length)
  const mined = (['ETH', 'BTC'] as const).filter((c) => st.coinsMined[c] > 0)
  const costs = st.powerCostUsd + st.rentUsd
  const cashChange = state.cash - st.startCash
  const perModel = new Map<string, number>()
  for (const v of lotViews(state)) {
    if (v.status !== 'arriving' && !perModel.has(v.lot.model))
      perModel.set(v.lot.model, v.dailyProfitEachUsd)
  }
  return (
    <div class="totals">
      <div class="panel tile">
        <span class="label">{t('ui.live.mined')}</span>
        <span class="num-xl">
          {mined.length
            ? mined.map((c) => fmt.crypto(st.coinsMined[c], c)).join(' + ')
            : '0'}
        </span>
        <span class="num-s muted">
          {t('ui.live.weeks_so_far', { n: st.weeks.length })}
        </span>
      </div>
      <div class="panel tile">
        <span class="label">{t('ui.live.revenue')}</span>
        <span class="num-xl">{fmt.money(st.revenueUsd)}</span>
        <span class="num-s muted">{t('ui.live.value_when_mined')}</span>
      </div>
      <div class="panel tile">
        <span class="label">{t('ui.live.costs')}</span>
        <span class="num-xl">{fmt.money(costs)}</span>
        <span class="num-s muted">
          {t('ui.live.per_week', { value: fmt.money(costs / played) })}
        </span>
      </div>
      <div class="panel tile">
        <span class="label">{t('ui.live.cash')}</span>
        <span class="num-xl">{fmt.money(state.cash)}</span>
        <span class={`num-s ${cashChange >= 0 ? 'gain' : 'loss'}`}>
          {t('ui.live.vs_start', { value: fmt.delta(cashChange, 'money') })}
        </span>
      </div>
      <div class="panel tile wide">
        <span class="label">{t('ui.live.each_now')}</span>
        {perModel.size === 0 && (
          <span class="num-s muted">{t('ui.live.nothing_running')}</span>
        )}
        {[...perModel].map(([model, profit]) => (
          <div class="row-between" key={model}>
            <span>{machineName(model)}</span>
            <span class={`num-kpi ${profit >= 0 ? 'gain' : 'loss'}`}>
              {t('ui.fleet.per_day_each', { value: fmt.signed(profit) })}
            </span>
          </div>
        ))}
        <span class="num-s muted">
          {t('ui.live.hodl_note', {
            btc: fmt.pct(1 - state.hodlPct.BTC),
            eth: fmt.pct(1 - state.hodlPct.ETH),
          })}
        </span>
      </div>
    </div>
  )
}

/** BTC and ETH, % change vs week 1, drawn like the mockup's live chart. */
function PriceChart({
  weeks,
  current,
}: {
  weeks: WeekSummary[]
  current: number
}) {
  const W = 620
  const x = (week: number) => 50 + ((week - 1) * 550) / 12
  const base = weeks[0]
  const btc = weeks.map((w) => (base ? w.btcUsd / base.btcUsd - 1 : 0))
  const eth = weeks.map((w) => (base ? w.ethUsd / base.ethUsd - 1 : 0))
  const lo = Math.min(0, ...btc, ...eth)
  const hi = Math.max(0.05, ...btc, ...eth)
  const y = (p: number) => 170 - ((p - lo) / (hi - lo || 1)) * 146
  const grid = [lo, lo + (hi - lo) / 3, lo + ((hi - lo) * 2) / 3, hi]
  const line = (ps: number[]) =>
    ps.map((p, i) => `${x(i + 1).toFixed(1)},${y(p).toFixed(1)}`).join(' ')
  const last = weeks.length - 1
  const label = (p: number) => fmt.delta(p, 'pct', { dp: 1 })
  return (
    <div class="panel p chart">
      <div class="row-between">
        <h2 class="panel-title">{t('ui.live.chart_title')}</h2>
        <span class="num-s muted">
          {base
            ? t('ui.live.chart_vs', { date: fmt.date(base.date, false) })
            : ''}
        </span>
      </div>
      <svg
        class="live-svg"
        viewBox={`0 0 ${W} 196`}
        role="img"
        aria-label={t('ui.live.chart_title')}
      >
        {grid.map((g, i) => (
          <g key={i}>
            <line class="c-grid" x1={50} y1={y(g)} x2={600} y2={y(g)} />
            <text class="c-tick" x={44} y={y(g) + 3} text-anchor="end">
              {fmt.pct(g)}
            </text>
          </g>
        ))}
        <line class="c-axis" x1={50} y1={y(0)} x2={600} y2={y(0)} />
        {weeks.length > 0 && (
          <line
            class="c-now"
            x1={x(current)}
            y1={24}
            x2={x(current)}
            y2={170}
          />
        )}
        {weeks.length > 1 && <polyline class="c-btc-line" points={line(btc)} />}
        {weeks.length > 1 && <polyline class="c-eth-line" points={line(eth)} />}
        {last >= 0 && (
          <>
            <circle class="c-btc" cx={x(last + 1)} cy={y(btc[last])} r={4} />
            <circle class="c-eth" cx={x(last + 1)} cy={y(eth[last])} r={4} />
            <text
              class="c-val"
              x={x(last + 1) - 6}
              y={y(btc[last]) - 8}
              text-anchor="end"
            >
              {`BTC ${label(btc[last])}`}
            </text>
            <text
              class="c-val"
              x={x(last + 1) - 6}
              y={y(eth[last]) + 16}
              text-anchor="end"
            >
              {`ETH ${label(eth[last])}`}
            </text>
          </>
        )}
        {[1, 3, 5, 7, 9, 11, 13].map((n) => (
          <text key={n} class="c-tick" x={x(n)} y={186} text-anchor="middle">
            {n}
          </text>
        ))}
      </svg>
      {base && (
        <div class="legend">
          <span>
            <svg width="16" height="12" aria-hidden="true">
              <line class="c-btc-line" x1={0} y1={6} x2={16} y2={6} />
            </svg>
            {`BTC ${fmt.money(base.btcUsd)} → ${fmt.money(weeks[last].btcUsd)}`}
          </span>
          <span>
            <svg width="16" height="12" aria-hidden="true">
              <line class="c-eth-line" x1={0} y1={6} x2={16} y2={6} />
            </svg>
            {`ETH ${fmt.money(base.ethUsd)} → ${fmt.money(weeks[last].ethUsd)}`}
          </span>
        </div>
      )}
    </div>
  )
}

/** The price-alert event card (Reigns-style), as a modal that pauses time. */
function PriceAlertCard({ state, act }: ScreenProps) {
  const alert = state.interrupt!
  const up = alert.changePct > 0
  const week = state.quarterStats.weeks.find((w) => w.week === alert.week + 1)
  const change = fmt.delta(alert.changePct, 'pct', { dp: 1 })
  const holdings = [
    state.treasury.BTC > 0 ? fmt.crypto(state.treasury.BTC, 'BTC') : null,
    state.treasury.ETH > 0 ? fmt.crypto(state.treasury.ETH, 'ETH') : null,
  ]
    .filter(Boolean)
    .join(' + ')
  const choices = interruptChoices(state)
  return (
    <div class="scrim">
      <article
        class="event"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ev-title"
      >
        <div class="row-between">
          <span class="label">
            {t('ui.alert.eyebrow', {
              quarter: fmt.quarter(quarterName(state.quarter)),
              week: alert.week + 1,
            })}
          </span>
          <span class="label">
            {t('ui.alert.count', {
              n: state.interruptsThisQuarter,
              max: MAX_INTERRUPTS,
            })}
          </span>
        </div>
        <div class="event-art">
          <Icon name="price-alert" />
          <span
            class={`num-xl ${up ? 'gain' : 'loss'}`}
          >{`${alert.coin} ${change}`}</span>
          <span class="num-s">
            {week ? t('ui.alert.in_week', { date: fmt.date(week.date) }) : ''}
          </span>
        </div>
        <h2 class="event-title" id="ev-title">
          {t(up ? 'ui.alert.title_up' : 'ui.alert.title_down', {
            coin: alert.coin,
          })}
        </h2>
        <p class="event-body">
          {t('ui.alert.body', {
            holdings,
            value: fmt.money(treasuryValue(state)),
          })}
        </p>
        {choices.map((c) => {
          const preview = choicePreview(state, c.id)
          const sold = [
            preview.coins.BTC > 0 ? fmt.crypto(preview.coins.BTC, 'BTC') : null,
            preview.coins.ETH > 0 ? fmt.crypto(preview.coins.ETH, 'ETH') : null,
          ]
            .filter(Boolean)
            .join(' + ')
          return (
            <button
              key={c.id}
              type="button"
              class={`choice${c.isDefault ? ' default' : ''}`}
              autoFocus={c.isDefault}
              onClick={() => act({ type: 'RESOLVE_INTERRUPT', choice: c.id })}
            >
              <span class="row-between">
                <span class="choice-label">
                  {tDynamic(`interrupt.${alert.id}.${c.id}`, c.id)}
                </span>
                {c.isDefault && (
                  <span class="default-tag">{t('ui.alert.default')}</span>
                )}
              </span>
              <span class="num-s">
                {preview.cashUsd > 0
                  ? t('ui.alert.effect_sell', {
                      cash: fmt.signed(preview.cashUsd),
                      coins: sold,
                    })
                  : t('ui.alert.effect_hold', {
                      holdings,
                      value: fmt.money(treasuryValue(state)),
                    })}
              </span>
            </button>
          )
        })}
        <span class="num-s muted" style={{ fontStyle: 'italic' }}>
          {t('ui.alert.source', {
            threshold: fmt.pct(PRICE_ALERT_THRESHOLD),
            max: MAX_INTERRUPTS,
          })}
        </span>
      </article>
    </div>
  )
}

/** The margin call card: a modal that pauses time until you post, pay, sell or default. */
function MarginCallCard({ state, act }: ScreenProps) {
  const alert = state.interrupt!
  const v = marginCallView(state)
  if (!v) return null
  const o = v.options
  const effect = (id: string) => {
    switch (id) {
      case 'post':
        return t('ui.margin.effect_post', {
          coins: fmt.crypto(o.post!.coins, v.coin),
        })
      case 'pay_cash':
        return t('ui.margin.effect_pay', {
          cash: fmt.signed(-o.gapUsd),
          left: fmt.money(v.balanceUsd - o.gapUsd),
        })
      case 'sell_machines':
        return t('ui.margin.effect_sell', { value: fmt.money(o.gapUsd) })
      default:
        return t('ui.margin.effect_default', {
          coins: fmt.crypto(o.default.coins, v.coin),
          value: fmt.money(o.default.valueUsd),
          balance: fmt.money(o.default.balanceUsd),
          quarters: v.lockQuarters,
        })
    }
  }
  return (
    <div class="scrim">
      <article
        class="event"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mc-title"
      >
        <span class="label">
          {t('ui.margin.eyebrow', {
            quarter: fmt.quarter(quarterName(state.quarter)),
            week: alert.week + 1,
          })}
        </span>
        <div class="event-art">
          <Icon name="warning" />
          <span class="num-xl loss">
            {t('ui.margin.ltv', { ltv: fmt.pct(v.ltv) })}
          </span>
        </div>
        <h2 class="event-title" id="mc-title">
          {t('ui.margin.title')}
        </h2>
        <p class="event-body">
          {t('ui.margin.body', {
            coin: v.coin,
            balance: fmt.money(v.balanceUsd),
            ltv: fmt.pct(v.ltv),
            target: fmt.pct(v.target),
            liquidation: fmt.pct(v.liquidationLtv),
          })}
        </p>
        {interruptChoices(state).map((c) => (
          <button
            key={c.id}
            type="button"
            class={`choice${c.isDefault ? ' default' : ''}`}
            autoFocus={c.isDefault}
            onClick={() => act({ type: 'RESOLVE_INTERRUPT', choice: c.id })}
          >
            <span class="row-between">
              <span class="choice-label">
                {tDynamic(`interrupt.margin_call.${c.id}`, c.id)}
              </span>
              {c.isDefault && (
                <span class="default-tag">{t('ui.alert.default')}</span>
              )}
            </span>
            <span class="num-s">{effect(c.id)}</span>
          </button>
        ))}
      </article>
    </div>
  )
}

/** The grid emergency card: curtail the Texas site next week for credits, or keep mining. */
/** The grid's ask: a summer curtailment, or Winter Storm Uri (same choices, storm wording). */
function CurtailmentCard({ state, act }: ScreenProps) {
  const alert = state.interrupt!
  const offer = alert.curtail!
  const uri = alert.id === 'uri'
  const effect = (id: string) =>
    id === 'curtail'
      ? t('ui.grid.effect_curtail', {
          credit: fmt.signed(offer.creditUsd),
          forgone: fmt.money(offer.forgoneUsd),
        })
      : uri
        ? t('ui.uri.effect_mine', {
            charge: fmt.signed(-(offer.stormUsd ?? 0)),
            forgone: fmt.money(offer.forgoneUsd),
            grievance: fmt.signedInt(KEEP_MINING_GRIEVANCE),
          })
        : t('ui.grid.effect_mine', {
            forgone: fmt.money(offer.forgoneUsd),
            grievance: fmt.signedInt(KEEP_MINING_GRIEVANCE),
          })
  return (
    <div class="scrim">
      <article
        class="event"
        role="dialog"
        aria-modal="true"
        aria-labelledby="grid-title"
      >
        <div class="row-between">
          <span class="label">
            {t(uri ? 'ui.uri.eyebrow' : 'ui.grid.eyebrow', {
              quarter: fmt.quarter(quarterName(state.quarter)),
              week: alert.week + 1,
            })}
          </span>
          {!uri && (
            <span class="label">
              {t('ui.alert.count', {
                n: state.interruptsThisQuarter,
                max: MAX_INTERRUPTS,
              })}
            </span>
          )}
        </div>
        <div class="event-art">
          <Icon name="texas-site" />
          <span class="num-xl gain">{fmt.signed(offer.creditUsd)}</span>
          <span class="num-s">
            {t('ui.grid.mw', { mw: fmt.power(offer.mw * 1000) })}
          </span>
        </div>
        <h2 class="event-title" id="grid-title">
          {uri
            ? tDynamic('event.uri_2021.title', t('ui.uri.title'))
            : t('ui.grid.title')}
        </h2>
        {uri && <p class="event-body">{tDynamic('event.uri_2021.body', '')}</p>}
        <p class={uri ? 'num-s' : 'event-body'}>
          {t(uri ? 'ui.uri.body' : 'ui.grid.body', {
            price: fmt.money(URI_STORM_PRICE * 1000),
            week: alert.week + 2,
            mw: fmt.power(offer.mw * 1000),
            credit: fmt.money(offer.creditUsd),
            forgone: fmt.money(offer.forgoneUsd),
          })}
        </p>
        {interruptChoices(state).map((c) => (
          <button
            key={c.id}
            type="button"
            class={`choice${c.isDefault ? ' default' : ''}`}
            autoFocus={c.isDefault}
            onClick={() => act({ type: 'RESOLVE_INTERRUPT', choice: c.id })}
          >
            <span class="row-between">
              <span class="choice-label">
                {tDynamic(`interrupt.${alert.id}.${c.id}`, c.id)}
              </span>
              {c.isDefault && (
                <span class="default-tag">{t('ui.alert.default')}</span>
              )}
            </span>
            <span class="num-s">{effect(c.id)}</span>
          </button>
        ))}
        <span class="num-s muted" style={{ fontStyle: 'italic' }}>
          {t(uri ? 'ui.uri.source' : 'ui.grid.source')}
        </span>
      </article>
    </div>
  )
}

/** The neighbour complaint card: pay, build sound walls, or ignore it (the default). */
function ComplaintCard({ state, act }: ScreenProps) {
  const alert = state.interrupt!
  const v = complaintView(state)
  if (!v) return null
  const tier = tierName(v.tier)
  const effect = (id: string) =>
    id === 'pay'
      ? t('ui.complaint.effect_pay', {
          cash: fmt.signed(-v.payUsd),
          grievance: fmt.signedInt(v.payGrievance),
        })
      : id === 'mitigate'
        ? t('ui.complaint.effect_walls', {
            cash: fmt.signed(-v.wallsUsd),
            base: fmt.signedInt(v.wallsBase),
          })
        : t('ui.complaint.effect_ignore', {
            grievance: fmt.signedInt(v.ignoreGrievance),
            heat: Math.round(v.heatAfterIgnore),
          })
  return (
    <div class="scrim">
      <article
        class="event"
        role="dialog"
        aria-modal="true"
        aria-labelledby="complaint-title"
      >
        <div class="row-between">
          <span class="label">
            {t('ui.complaint.eyebrow', {
              quarter: fmt.quarter(quarterName(state.quarter)),
              week: alert.week + 1,
            })}
          </span>
          <span class="label">
            {t('ui.alert.count', {
              n: state.interruptsThisQuarter,
              max: MAX_INTERRUPTS,
            })}
          </span>
        </div>
        <div class="event-art">
          <Icon name="outreach" />
          <span class="num-xl warn">
            {t('ui.fleet.heat', { heat: Math.round(v.heat) })}
          </span>
        </div>
        <h2 class="event-title" id="complaint-title">
          {t('ui.complaint.title', { tier })}
        </h2>
        <p class="event-body">
          {t('ui.complaint.body', { tier, heat: Math.round(v.heat) })}
        </p>
        {interruptChoices(state).map((c) => (
          <button
            key={c.id}
            type="button"
            class={`choice${c.isDefault ? ' default' : ''}`}
            autoFocus={c.isDefault}
            onClick={() => act({ type: 'RESOLVE_INTERRUPT', choice: c.id })}
          >
            <span class="row-between">
              <span class="choice-label">
                {tDynamic(`interrupt.neighbour_complaint.${c.id}`, c.id)}
              </span>
              {c.isDefault && (
                <span class="default-tag">{t('ui.alert.default')}</span>
              )}
            </span>
            <span class="num-s">{effect(c.id)}</span>
          </button>
        ))}
        <span class="num-s muted" style={{ fontStyle: 'italic' }}>
          {t('ui.complaint.source', { at: v.complaintAt })}
        </span>
      </article>
    </div>
  )
}

/** The Trader's early warning: the crypto loan's LTV reached the warning level (not counted). */
function MarginWarningCard({ state, act }: ScreenProps) {
  const alert = state.interrupt!
  const loan = state.cryptoLoan
  if (!loan) return null
  return (
    <div class="scrim">
      <article
        class="event"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mw-title"
      >
        <span class="label">
          {t('ui.margin.eyebrow', {
            quarter: fmt.quarter(quarterName(state.quarter)),
            week: alert.week + 1,
          })}
        </span>
        <div class="event-art">
          <Icon name="warning" />
          <span class="num-xl warn">
            {t('ui.margin.ltv', { ltv: fmt.pct(alert.ltv ?? 0) })}
          </span>
        </div>
        <h2 class="event-title" id="mw-title">
          {t('ui.margin_warning.title')}
        </h2>
        <p class="event-body">
          {t('ui.margin_warning.body', {
            coin: loan.coin,
            balance: fmt.money(loan.balanceUsd),
            ltv: fmt.pct(alert.ltv ?? 0),
          })}
        </p>
        {interruptChoices(state).map((c) => (
          <button
            key={c.id}
            type="button"
            class={`choice${c.isDefault ? ' default' : ''}`}
            autoFocus={c.isDefault}
            onClick={() => act({ type: 'RESOLVE_INTERRUPT', choice: c.id })}
          >
            <span class="row-between">
              <span class="choice-label">
                {tDynamic(`interrupt.margin_warning.${c.id}`, c.id)}
              </span>
              {c.isDefault && (
                <span class="default-tag">{t('ui.alert.default')}</span>
              )}
            </span>
            {c.id === 'repay' && (
              <span class="num-s">
                {t('ui.margin_warning.effect_repay', {
                  cash: fmt.signed(-loan.balanceUsd),
                  coins: fmt.crypto(loan.collateral, loan.coin),
                })}
              </span>
            )}
          </button>
        ))}
      </article>
    </div>
  )
}

/** An event card (events.json): a Reigns-style card with the story and 2–4 answers. */
function EventCard({ state, act }: ScreenProps) {
  const v = eventCardView(state)
  if (!v) return null
  const text = (key: string) => tDynamic(`event.${v.id}.${key}`, '')
  return (
    <div class="scrim">
      <article
        class="event"
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-title"
      >
        <div class="row-between">
          <span class="label">
            {t('ui.event.eyebrow', {
              quarter: fmt.quarter(quarterName(state.quarter)),
              week: v.week + 1,
            })}
            {v.siteTier ? ` · ${tierName(v.siteTier)}` : ''}
          </span>
          {v.type === 'random' && (
            <span class="label">
              {t('ui.alert.count', {
                n: state.interruptsThisQuarter,
                max: MAX_INTERRUPTS,
              })}
            </span>
          )}
        </div>
        <h2 class="event-title" id="card-title">
          {text('title')}
        </h2>
        <p class="event-body">{text('body')}</p>
        {v.choices.map((c) => (
          <button
            key={c.id}
            type="button"
            class={`choice${c.isDefault ? ' default' : ''}`}
            autoFocus={c.isDefault}
            onClick={() => act({ type: 'RESOLVE_INTERRUPT', choice: c.id })}
          >
            <span class="row-between">
              <span class="choice-label">{text(`choice.${c.id}`)}</span>
              {c.isDefault && (
                <span class="default-tag">{t('ui.alert.default')}</span>
              )}
            </span>
            <span class="num-s">
              {text(`hint.${c.id}`)}
              {c.cashDeltaUsd !== 0 &&
                ` ${t('ui.event.cash', { cash: fmt.signed(c.cashDeltaUsd) })}`}
              {c.unitsDelta !== 0 &&
                ` ${t('ui.event.units', { units: fmt.signedInt(c.unitsDelta) })}`}
            </span>
          </button>
        ))}
      </article>
    </div>
  )
}
