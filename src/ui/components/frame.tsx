// The persistent frame of every in-game screen: top bar and left navigation.
import type { ComponentChildren } from 'preact'
import { t } from '../../i18n/t.ts'
import {
  bandwidthTotal,
  currentMarket,
  lastReport,
  priceChanges,
  quarterName,
  treasuryValue,
} from '../../sim/selectors.ts'
import type { GameState } from '../../sim/state.ts'
import { fmt } from '../format.ts'
import { Icon, Pips } from './basics.tsx'
import type { IconName } from '../icons.ts'

const TURNS = 23

function Delta(props: { value: number; dp?: number }) {
  const tone = props.value > 0 ? 'gain' : props.value < 0 ? 'loss' : 'muted'
  return (
    <span class={tone}>
      {fmt.delta(props.value, 'pct', { dp: props.dp ?? 1 })}
    </span>
  )
}

export function TopBar(props: { state: GameState; paused?: boolean }) {
  const s = props.state
  const w = currentMarket(s)
  const change = priceChanges(s)
  const since = change.since
    ? t('ui.top.vs', { date: fmt.date(change.since, false) })
    : ''
  const week = s.phase === 'plan' ? 1 : Math.max(1, s.week)
  const coins = [
    s.treasury.BTC > 0 ? fmt.crypto(s.treasury.BTC, 'BTC') : null,
    s.treasury.ETH > 0 ? fmt.crypto(s.treasury.ETH, 'ETH') : null,
  ].filter(Boolean)
  const valuation = lastReport(s)?.valuationUsd
  const total = bandwidthTotal(s)
  return (
    <div class="topbar">
      <div class="brand">{t('ui.brand')}</div>
      <div class="stat">
        <span class="label">{t('ui.top.date')}</span>
        <span class="num">
          {t('ui.top.date_value', {
            quarter: fmt.quarter(quarterName(s.quarter)),
            week,
            turn: s.quarter + 1,
            turns: TURNS,
          })}
        </span>
      </div>
      <div class="stat">
        <span class="label">{t('ui.top.cash')}</span>
        <span class="num" style={{ fontWeight: 500 }}>
          <Icon name="cash" size={16} />
          {fmt.money(s.cash)}
        </span>
      </div>
      <div class="stat">
        <span class="label">{t('ui.top.treasury')}</span>
        <span class="num">
          <Icon name="treasury" size={16} />
          {coins.length
            ? `${coins.join(' + ')} · ${fmt.money(treasuryValue(s))}`
            : t('ui.top.empty')}
        </span>
      </div>
      <div class="stat">
        <span class="label">{t('ui.top.bandwidth')}</span>
        <span class="num">
          <Pips
            total={total}
            filled={s.bandwidth}
            label={t('ui.top.bandwidth_left', { n: s.bandwidth, total })}
          />
        </span>
      </div>
      <div class="stat">
        <span class="label">{t('ui.top.valuation')}</span>
        <span class="num">
          {valuation === undefined ? t('ui.top.empty') : fmt.money(valuation)}
        </span>
      </div>
      <div class="stat">
        <span class="label">BTC</span>
        <span class="num">
          {fmt.money(w.btc_usd)} {change.since && <Delta value={change.btc} />}
        </span>
        <span class="stat-note">{since}</span>
      </div>
      <div class="stat">
        <span class="label">ETH</span>
        <span class="num">
          {fmt.money(w.eth_usd)} {change.since && <Delta value={change.eth} />}
        </span>
        <span class="stat-note">{since}</span>
      </div>
      {props.paused && (
        <div class="stat">
          <span class="paused">
            <Icon name="pause" size={16} />
            {t('ui.live.paused')}
          </span>
        </div>
      )}
    </div>
  )
}

const NAV: { icon: IconName; key: Parameters<typeof t>[0] }[] = [
  { icon: 'dashboard', key: 'ui.nav.dashboard' },
  { icon: 'fleet', key: 'ui.nav.fleet' },
  { icon: 'capital', key: 'ui.nav.capital' },
  { icon: 'people', key: 'ui.nav.people' },
  { icon: 'league', key: 'ui.nav.league' },
  { icon: 'log', key: 'ui.nav.log' },
]

/** Left navigation. Only the dashboard exists so far; the rest say so. */
export function Nav(props: { seed: number }) {
  return (
    <nav class="nav" aria-label={t('ui.nav.label')}>
      {NAV.map((item, i) => (
        <button
          key={item.key}
          type="button"
          class="nav-item"
          aria-current={i === 0 ? 'page' : undefined}
          disabled={i !== 0}
          title={i !== 0 ? t('ui.locked.not_built') : undefined}
        >
          <Icon name={item.icon} />
          {t(item.key)}
        </button>
      ))}
      <div class="nav-foot num-s muted">
        {t('ui.nav.seed', { seed: String(props.seed) })}
      </div>
    </nav>
  )
}

export function Shell(props: {
  state: GameState
  paused?: boolean
  children: ComponentChildren
}) {
  return (
    <>
      <TopBar state={props.state} paused={props.paused} />
      <div class="body">
        <Nav seed={props.state.seed} />
        {props.children}
      </div>
    </>
  )
}

export { Delta }
