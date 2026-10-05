// The persistent frame of every in-game screen: top bar and left navigation.
import type { ComponentChildren } from 'preact'
import { useState } from 'preact/hooks'
import { SaveDialog, SettingsDialog } from './saves.tsx'
import { createContext } from 'preact'
import { useContext } from 'preact/hooks'
import type { Action } from '../../sim/actions.ts'
import type { Message } from '../../i18n/t.ts'
import { SectionView, type Section } from '../screens/Sections.tsx'
import { Act3Panel } from './act3Lazy.tsx'

/** The left-nav section on show (Plan phase only) and the app's action function. */
export const NavContext = createContext<{
  section: Section
  setSection: (s: Section) => void
  act: (a: Action) => Message | null
} | null>(null)
import { t } from '../../i18n/t.ts'
import {
  act2MarketView,
  actTurn,
  bandwidthTotal,
  currentMarket,
  lastReport,
  priceChanges,
  quarterName,
  treasuryValue,
  ratingBacklogView,
  topHeat,
} from '../../sim/selectors.ts'
import { inAct2Rules, isActIII, type GameState } from '../../sim/state.ts'
import { fmt } from '../format.ts'
import { tierName } from '../names.ts'
import { Icon, Pips } from './basics.tsx'
import { Term } from './term.tsx'
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
  const act2 = act2MarketView(s)
  const rb = ratingBacklogView(s)
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
        <span class="label">
          <Term id="treasury" act={1}>{t('ui.top.treasury')}</Term>
        </span>
        <span class="num">
          <Icon name="treasury" size={16} />
          {coins.length
            ? `${coins.join(' + ')} · ${fmt.money(treasuryValue(s))}`
            : t('ui.top.empty')}
        </span>
      </div>
      <div class="stat">
        <span class="label">
          <Term id="bandwidth" act={1}>{t('ui.top.bandwidth')}</Term>
        </span>
        <span class="num">
          <Pips
            total={total}
            filled={s.bandwidth}
            label={t('ui.top.bandwidth_left', { n: s.bandwidth, total })}
          />
        </span>
      </div>
      {isActIII(s.act) && <Act3Panel name="PcStat" state={s} />}
      <div class="stat">
        <span class="label">
          <Term id="heat" act={1}>
            {t('ui.top.heat', { tier: tierName(heat.tier).toLowerCase() })}
          </Term>
        </span>
        <span class="num">
          <Icon name="heat" size={16} />
          {Math.round(heat.heat)}
        </span>
      </div>
      <div class="stat">
        <span class="label">
          <Term id="valuation" act={1}>{t('ui.top.valuation')}</Term>
        </span>
        <span class="num">
          {valuation === undefined ? t('ui.top.empty') : fmt.money(valuation)}
        </span>
      </div>
      {act2 && (
        <div
          class="stat"
          title={rb.rating ? undefined : t('ui.top.not_rated_title')}
        >
          <span class="label">
            <Term id="rating" act={2}>{t('ui.top.rating')}</Term>
          </span>
          <span class="num">
            <span class={`rating-badge${rb.rating ? '' : ' unrated'}`}>
              {rb.rating ?? t('ui.top.not_rated')}
            </span>
          </span>
        </div>
      )}
      {act2 && (
        <div class="stat">
          <span class="label">
            <Term id="backlog" act={2}>{t('ui.top.backlog')}</Term>
          </span>
          <span class="num">{fmt.money(rb.backlogUsd)}</span>
        </div>
      )}
      <div class="stat">
        <span class="label">BTC</span>
        <span class="num">
          {fmt.money(w.btc_usd)} {change.since && <Delta value={change.btc} />}
        </span>
        <span class="stat-note">{since}</span>
      </div>
      {act2 ? (
        <div class="stat">
          <span class="label">{t('ui.top.h100_spot')}</span>
          <span class="num">
            {act2.h100SpotUsdHr === null
              ? t('ui.top.empty')
              : t('ui.top.per_hour', {
                  value: fmt.money(act2.h100SpotUsdHr, { exact: true, dp: 2 }),
                })}{' '}
            {act2.h100SpotChange !== null && (
              <Delta value={act2.h100SpotChange} />
            )}
          </span>
          <span class="stat-note">{since}</span>
        </div>
      ) : (
        <div class="stat">
          <span class="label">ETH</span>
          <span class="num">
            {fmt.money(w.eth_usd)}{' '}
            {change.since && <Delta value={change.eth} />}
          </span>
          <span class="stat-note">{since}</span>
        </div>
      )}
      {isActIII(s.act) && <Act3Panel name="Act3TopStrip" state={s} />}
      {/* (M20.2: the forcing tag is test-build only; production refuses forced saves anyway) */}
      {import.meta.env.MODE !== 'production' && s.scenarioForced && (
        <div class="stat">
          <span class="tag">{t('ui.act3.forced_tag')}</span>
        </div>
      )}
      {s.scenarioMode && (
        // M18.4: a Scenario Mode run (A3-12)
        <div class="stat" data-scenario-mode-tag>
          <span class="tag">{t('ui.scenario_mode.tag')}</span>
        </div>
      )}
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

const NAV: {
  id: Section
  icon: IconName
  key: Parameters<typeof t>[0]
  /** Only under Act II's rules (Act II and Act III). */
  act2?: boolean
  /** Only in Act III. */
  act3?: boolean
}[] = [
  { id: 'dashboard', icon: 'dashboard', key: 'ui.nav.dashboard' },
  { id: 'projects', icon: 'power', key: 'ui.nav.projects', act2: true },
  // Act III (M13.2, A3-04): every tenant contract by end quarter.
  { id: 'contracts', icon: 'loan', key: 'ui.nav.contracts', act3: true },
  { id: 'fleet', icon: 'fleet', key: 'ui.nav.fleet' },
  { id: 'capital', icon: 'capital', key: 'ui.nav.capital' },
  // Act III (M17.6, A3-09): political capital, the Director, lobbying, the spend cards.
  {
    id: 'government',
    icon: 'political-capital',
    key: 'ui.nav.government',
    act3: true,
  },
  { id: 'people', icon: 'people', key: 'ui.nav.people' },
  { id: 'league', icon: 'league', key: 'ui.nav.league' },
  { id: 'log', icon: 'log', key: 'ui.nav.log' },
]

/**
 * Left navigation. The sections open in the Plan phase; during the live quarter and the report
 * only the dashboard shows. Save / load sits at the foot.
 */
export function Nav(props: { seed: number; plan: boolean; act: number }) {
  const [saving, setSaving] = useState(false)
  const nav = useContext(NavContext)
  const current = props.plan ? (nav?.section ?? 'dashboard') : 'dashboard'
  return (
    <nav class="nav" aria-label={t('ui.nav.label')}>
      {NAV.filter(
        (item) =>
          (!item.act2 || inAct2Rules({ act: props.act as GameState['act'] })) &&
          (!item.act3 || isActIII(props.act)),
      ).map((item) => (
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
        <Nav seed={props.state.seed} plan={plan} act={props.state.act} />
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
