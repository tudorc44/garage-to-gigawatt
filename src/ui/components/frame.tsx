// The persistent frame of every in-game screen: top bar and left navigation.
import type { ComponentChildren } from 'preact'
import { useState } from 'preact/hooks'
import { SaveDialog, SettingsDialog } from './saves.tsx'
import { createContext } from 'preact'
import { useContext } from 'preact/hooks'
import type { Action } from '../../sim/actions.ts'
import type { Message } from '../../i18n/t.ts'
import { SectionView, type Section } from '../screens/Sections.tsx'

/** The left-nav section on show (Plan phase only) and the app's action function. */
export const NavContext = createContext<{
  section: Section
  setSection: (s: Section) => void
  act: (a: Action) => Message | null
} | null>(null)
import { t } from '../../i18n/t.ts'
import {
  actTurn,
  bandwidthTotal,
  currentMarket,
  lastReport,
  priceChanges,
  quarterName,
  treasuryValue,
  topHeat,
} from '../../sim/selectors.ts'
import type { GameState } from '../../sim/state.ts'
import { fmt } from '../format.ts'
import { tierName } from '../names.ts'
import { Icon, Pips } from './basics.tsx'
import type { IconName } from '../icons.ts'

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
  const heat = topHeat(s)
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
            ...actTurn(s),
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
        <span class="label">
          {t('ui.top.heat', { tier: tierName(heat.tier).toLowerCase() })}
        </span>
        <span class="num">
          <Icon name="heat" size={16} />
          {Math.round(heat.heat)}
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
      <SettingsButton />
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

const NAV: { id: Section; icon: IconName; key: Parameters<typeof t>[0] }[] = [
  { id: 'dashboard', icon: 'dashboard', key: 'ui.nav.dashboard' },
  { id: 'fleet', icon: 'fleet', key: 'ui.nav.fleet' },
  { id: 'capital', icon: 'capital', key: 'ui.nav.capital' },
  { id: 'people', icon: 'people', key: 'ui.nav.people' },
  { id: 'league', icon: 'league', key: 'ui.nav.league' },
  { id: 'log', icon: 'log', key: 'ui.nav.log' },
]

/**
 * Left navigation. The sections open in the Plan phase; during the live quarter and the report
 * only the dashboard shows. Save / load sits at the foot.
 */
export function Nav(props: { seed: number; plan: boolean }) {
  const [saving, setSaving] = useState(false)
  const nav = useContext(NavContext)
  const current = props.plan ? (nav?.section ?? 'dashboard') : 'dashboard'
  return (
    <nav class="nav" aria-label={t('ui.nav.label')}>
      {NAV.map((item) => (
        <button
          key={item.key}
          type="button"
          class="nav-item"
          aria-current={current === item.id ? 'page' : undefined}
          disabled={!props.plan && item.id !== 'dashboard'}
          title={
            !props.plan && item.id !== 'dashboard'
              ? t('ui.nav.plan_only')
              : undefined
          }
          onClick={() => nav?.setSection(item.id)}
        >
          <Icon name={item.icon} />
          {t(item.key)}
        </button>
      ))}
      <button
        type="button"
        class="nav-item"
        style={{ marginTop: 'auto' }}
        onClick={() => setSaving(true)}
      >
        <Icon name="log" />
        {t('ui.nav.save')}
      </button>
      <div class="nav-foot num-s muted">
        {t('ui.nav.seed', { seed: String(props.seed) })}
      </div>
      {saving && <SaveDialog onClose={() => setSaving(false)} />}
    </nav>
  )
}

export function Shell(props: {
  state: GameState
  paused?: boolean
  children: ComponentChildren
}) {
  const nav = useContext(NavContext)
  const plan = props.state.phase === 'plan'
  const section = plan ? (nav?.section ?? 'dashboard') : 'dashboard'
  return (
    <>
      <TopBar state={props.state} paused={props.paused} />
      <div class="body">
        <Nav seed={props.state.seed} plan={plan} />
        {section === 'dashboard' || !nav ? (
          props.children
        ) : (
          <main class="main">
            <SectionView state={props.state} act={nav.act} section={section} />
          </main>
        )}
      </div>
    </>
  )
}

export { Delta }

/** The top bar's Settings button (wireframes: persistent layout). */
function SettingsButton() {
  const [open, setOpen] = useState(false)
  return (
    <div class="stat settings-stat">
      <button
        type="button"
        class="btn"
        aria-label={t('ui.settings.title')}
        title={t('ui.settings.title')}
        onClick={() => setOpen(true)}
      >
        <Icon name="settings" size={16} />
      </button>
      {open && <SettingsDialog onClose={() => setOpen(false)} />}
    </div>
  )
}
