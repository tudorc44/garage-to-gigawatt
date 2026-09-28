// The prologue's screens (Alpha 0.3 §2.13; Act 0, the bedroom era): the intro; the Plan screen
// (Dashboard, Rig, Wallet, Life, Log) with its top bar; the live quarter (auto-played quarters run
// by themselves; a card stops them); the quarter report or, for an auto-played quarter, its
// one-card summary with "Stop here"; the prologue's chapter report, then Act I. Built with the
// design system's components (no wireframes yet: the wireframe pass will be a restyle).
import { useEffect, useState } from 'preact/hooks'
import { hasText, t, tDynamic, type Message } from '../../i18n/t.ts'
import type { Action } from '../../sim/actions.ts'
import { prologueCard } from '../../sim/prologue/events.ts'
import { prologueBandwidth } from '../../sim/prologue/setup.ts'
import {
  preorderMenuView,
  prologueBuyView,
  prologueChapterView,
  prologueLifeView,
  prologueNews,
  prologueView,
  prologueWalletView,
} from '../../sim/prologue/views.ts'
import { quarterName } from '../../sim/selectors.ts'
import type { Coin, GameState } from '../../sim/state.ts'
import { getModel } from '../../sim/systems/market.ts'
import {
  ActionRow,
  Icon,
  MachineCard,
  Pips,
} from '../components/basics.tsx'
import { SaveDialog } from '../components/saves.tsx'
import { fmt } from '../format.ts'
import type { IconName } from '../icons.ts'
import { PROLOGUE_DRAWINGS } from '../machineDrawings.ts'
import { machineName, say, tierName } from '../names.ts'

export interface PrologueProps {
  state: GameState
  act: (a: Action) => Message | null
  tick: () => void
  skip: () => void
  onNew: () => void
}

type Section = 'dashboard' | 'rig' | 'wallet' | 'life' | 'log'

const NAV: { id: Section; icon: IconName }[] = [
  { id: 'dashboard', icon: 'dashboard' },
  { id: 'rig', icon: 'pc-tower' },
  { id: 'wallet', icon: 'wallet' },
  { id: 'life', icon: 'household' },
  { id: 'log', icon: 'log' },
]

// ---------- small formatting helpers (early prices and tiny machines) ----------

/** A coin price: $0.0033 in 2010, $5.28 in 2011, $1,150 in 2013; "no price" before a market. */
const price = (usd: number) =>
  usd <= 0
    ? t('ui.p0.no_price')
    : usd < 1
      ? `$${usd.toPrecision(2)}`
      : fmt.money(usd, usd < 10 ? { exact: true, dp: 2 } : {})
/** 90 W, 350 W, 1.5 kW. */
const watts = (kw: number) =>
  kw < 1 ? `${Math.round(kw * 1000)} W` : fmt.power(kw)
/** A BTC machine's hashrate (TH/s in content) as MH/s … TH/s; ETH machines are in MH/s. */
const hashOf = (model: string) => {
  const m = getModel(model)!
  return m.coin === 'BTC'
    ? fmt.hash(m.hashrate * 1e6, 'MH')
    : fmt.hash(m.hashrate, 'MH')
}
const coins = (n: number, coin: Coin) =>
  n === 0 ? `0 ${coin}` : fmt.crypto(n, coin)
const drawing = (model: string) => PROLOGUE_DRAWINGS[model] ?? 'asic-box-2016'
const era = (model: string) => getModel(model)?.available_from?.slice(0, 4)

// ---------- the screens ----------

export function PrologueScreen(props: PrologueProps) {
  const { state } = props
  if (state.phase === 'intro') return <Intro {...props} />
  if (state.phase === 'chapter') return <Chapter {...props} />
  if (state.phase === 'report' || state.phase === 'gameover')
    return <QuarterReport {...props} />
  return <PlanOrLive {...props} />
}

function CenterCard(props: { children: preact.ComponentChildren }) {
  return (
    <div class="screen g-paper">
      <div class="center-page">
        <div class="panel end-card chapter-card">{props.children}</div>
      </div>
    </div>
  )
}

function Intro({ act }: PrologueProps) {
  return (
    <CenterCard>
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
    </CenterCard>
  )
}

/** The top bar: date, cash, coins and where they sit, Bandwidth, the household (or rent), BTC. */
function TopBar({ state }: { state: GameState }) {
  const v = prologueView(state)
  const w = prologueWalletView(state)
  const btc = w.coins[0]
  const total = prologueBandwidth(state)
  const onEx = btc.total > 0 ? btc.exchange / btc.total : 0
  const [saving, setSaving] = useState(false)
  return (
    <div class="topbar">
      <div class="brand">{t('ui.brand')}</div>
      <div class="stat">
        <span class="label">{t('ui.top.date')}</span>
        <span class="num">
          {t('ui.p0.top_date', {
            quarter: fmt.quarter(v.quarter),
            week: state.phase === 'live' ? Math.max(1, state.week) : 1,
          })}
        </span>
      </div>
      <div class="stat">
        <span class="label">{t('ui.top.cash')}</span>
        <span class="num" style={{ fontWeight: 500 }}>
          <Icon name="cash" size={16} />
          {fmt.money(state.cash)}
        </span>
      </div>
      <div class="stat">
        <span class="label">{t('ui.p0.top_coins')}</span>
        <span class="num">
          <Icon name="btc" size={16} />
          {btc.total > 0
            ? t('ui.p0.top_coins_value', {
                btc: coins(btc.total, 'BTC'),
                exchange: fmt.pct(onEx),
              })
            : t('ui.top.empty')}
        </span>
      </div>
      <div class="stat">
        <span class="label">{t('ui.top.bandwidth')}</span>
        <span class="num">
          <Pips
            total={total}
            filled={state.bandwidth}
            label={t('ui.top.bandwidth_left', { n: state.bandwidth, total })}
          />
        </span>
      </div>
      <div class="stat">
        <span class="label">
          {v.livingAtHome ? t('ui.p0.top_patience') : t('ui.p0.top_rent')}
        </span>
        <span class="num">
          <Icon name={v.livingAtHome ? 'household' : 'move-out'} size={16} />
          {v.livingAtHome
            ? `${Math.round(v.patience ?? 0)}/100`
            : t('ui.p0.per_quarter', {
                value: fmt.money(prologueLifeView(state).moveOut.rentUsdQ),
              })}
        </span>
      </div>
      <div class="stat">
        <span class="label">BTC</span>
        <span class="num">{price(v.btcUsd)}</span>
      </div>
      {v.ethUsd > 0 && (
        <div class="stat">
          <span class="label">ETH</span>
          <span class="num">{price(v.ethUsd)}</span>
        </div>
      )}
      <div class="stat settings-stat">
        <button type="button" class="btn" onClick={() => setSaving(true)}>
          <Icon name="save" size={16} />
          {t('ui.nav.save')}
        </button>
      </div>
      {saving && <SaveDialog onClose={() => setSaving(false)} />}
    </div>
  )
}

/** The panel a card asked for opens first (a buy menu, pre-orders, the wallet, the offers). */
function firstSection(state: GameState): Section {
  const panel = state.prologue!.openPanel ?? ''
  if (panel.startsWith('buy')) return 'rig'
  if (panel === 'wallet' || panel === 'offers') return 'wallet'
  if (panel === 'preorders') return 'life'
  return 'dashboard'
}

function PlanOrLive(props: PrologueProps) {
  const { state } = props
  const plan = state.phase === 'plan'
  const [section, setSection] = useState<Section>(firstSection(state))
  useEffect(() => {
    setSection(firstSection(state))
  }, [state.quarter, state.phase])
  const shown = plan ? section : 'dashboard'
  return (
    <div class="screen g-paper">
      <TopBar state={state} />
      <div class="body">
        <nav class="nav" aria-label={t('ui.nav.label')}>
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              class="nav-item"
              aria-current={shown === item.id ? 'page' : undefined}
              disabled={!plan && item.id !== 'dashboard'}
              title={
                !plan && item.id !== 'dashboard'
                  ? t('ui.nav.plan_only')
                  : undefined
              }
              onClick={() => setSection(item.id)}
            >
              <Icon name={item.icon} />
              {t(`ui.p0.nav.${item.id}`)}
            </button>
          ))}
          <div class="nav-foot num-s muted">
            {t('ui.nav.seed', { seed: String(state.seed) })}
          </div>
        </nav>
        <main class="main">
          {state.phase === 'live' ? (
            <Live {...props} />
          ) : shown === 'rig' ? (
            <Rig {...props} />
          ) : shown === 'wallet' ? (
            <Wallet {...props} />
          ) : shown === 'life' ? (
            <Life {...props} />
          ) : shown === 'log' ? (
            <Log state={state} />
          ) : (
            <Dashboard {...props} />
          )}
          {plan && (
            <div class="foot">
              <News state={state} />
              <button
                type="button"
                class="btn btn-primary"
                onClick={() => props.act({ type: 'END_PLAN' })}
              >
                {t('ui.plan.start_quarter')}
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function News({ state }: { state: GameState }) {
  const news = prologueNews(state).filter((k) => hasText(k))
  return (
    <div class="panel news">
      <Icon name="news" />
      <span class="news-mast">{t('ui.news.masthead')}</span>
      <span class="news-text">
        {news.length ? tDynamic(news[news.length - 1], '') : ''}
      </span>
    </div>
  )
}

function Tile(props: {
  label: string
  value: string
  sub?: string
  warn?: boolean
  icon?: IconName
}) {
  return (
    <div class="panel tile">
      <div class="label">
        {props.icon && <Icon name={props.icon} size={16} />} {props.label}
      </div>
      <div class="num-kpi">{props.value}</div>
      {props.sub && (
        <div class={`num-s ${props.warn ? 'warn' : 'muted'}`}>{props.sub}</div>
      )}
    </div>
  )
}

/** Refusals are shown under the panel that caused them. */
function useError(act: PrologueProps['act']) {
  const [error, setError] = useState<Message | null>(null)
  return {
    error,
    run: (a: Action) => setError(act(a)),
    view: error ? <p class="num-s loss">{say(error)}</p> : null,
  }
}

function Dashboard({ state, act }: PrologueProps) {
  const v = prologueView(state)
  const w = prologueWalletView(state)
  const life = prologueLifeView(state)
  const btc = w.coins[0]
  let btcTh = 0
  for (const s of v.sites)
    for (const { lot } of s.lots) {
      const m = getModel(lot.model)!
      if (m.coin === 'BTC') btcTh += (lot.count - lot.failed) * m.hashrate
    }
  const onEx = btc.total > 0 ? btc.exchange / btc.total : 0
  const e = useError(act)
  const panel = state.prologue!.openPanel
  return (
    <>
      {panel && (
        <div class="panel tape">
          <span class="num-s">
            {tDynamic(`ui.p0.opened.${panel.split(':')[0]}`, '')}
          </span>
        </div>
      )}
      <div class="tiles">
        <Tile
          icon="hashrate"
          label={t('ui.p0.kpi.hashrate')}
          value={fmt.hash(btcTh * 1e6, 'MH')}
        />
        <Tile
          icon={v.pool ? 'pool' : 'solo'}
          label={t('ui.p0.kpi.mining')}
          value={t(v.pool ? 'ui.p0.pool' : 'ui.p0.solo')}
          sub={say(v.solo.words)}
        />
        <Tile
          icon="cash"
          label={t('ui.p0.kpi.income')}
          value={
            v.livingAtHome
              ? t('ui.p0.per_quarter', { value: fmt.money(1200) })
              : t('ui.p0.per_quarter', {
                  value: fmt.money(-life.moveOut.rentUsdQ),
                })
          }
          sub={t(v.livingAtHome ? 'ui.p0.kpi.part_time' : 'ui.p0.kpi.rent')}
        />
        <Tile
          icon="power"
          label={t('ui.p0.kpi.power')}
          value={v.livingAtHome ? '$0' : t('ui.p0.kpi.paid')}
          sub={t(v.livingAtHome ? 'ui.p0.kpi.parents_pay' : 'ui.p0.kpi.own_bill')}
        />
        <Tile
          icon="backup"
          label={t('ui.p0.kpi.backup')}
          value={t(v.backup ? 'ui.p0.yes' : 'ui.p0.no')}
          sub={t(v.backup ? 'ui.p0.kpi.backed_up' : 'ui.p0.kpi.one_copy')}
          warn={!v.backup}
        />
        <Tile
          icon="exchange"
          label={t('ui.p0.kpi.on_exchange')}
          value={fmt.pct(onEx)}
          sub={t('ui.p0.kpi.exposed')}
          warn={onEx > 0}
        />
      </div>
      <div class="dash p0-dash">
        <div class="col">
          <div class="panel">
            <div class="panel-title">{t('ui.p0.this_quarter')}</div>
            <ul class="num-s">
              {prologueNews(state)
                .filter((k) => hasText(k))
                .map((k) => (
                  <li key={k}>{tDynamic(k, '')}</li>
                ))}
            </ul>
            {v.livingAtHome && (
              <p class="num-s muted">
                {t('ui.p0.patience_line', {
                  patience: Math.round(v.patience ?? 0),
                })}
              </p>
            )}
          </div>
        </div>
        <div class="col">
          <OffersTray state={state} run={e.run} />
          <PreorderCards state={state} run={e.run} />
          {e.view}
        </div>
      </div>
    </>
  )
}

/** The Rig: your sites and machines; buy, sell, repair; solo or pool. */
function Rig({ state, act }: PrologueProps) {
  const v = prologueView(state)
  const life = prologueLifeView(state)
  const e = useError(act)
  const ready = v.sites.filter((s) => s.site.readyQuarter <= state.quarter)
  const [siteId, setSiteId] = useState(ready.at(-1)?.site.id ?? '')
  const site = ready.find((s) => s.site.id === siteId) ?? ready.at(-1)
  const buy = site ? prologueBuyView(state, site.site.id) : []
  return (
    <div class="dash p0-dash">
      <div class="col">
        <div class="panel">
          <div class="row-between">
            <span class="panel-title">{t('ui.p0.mining_title')}</span>
            <span class="seg">
              <button
                type="button"
                class="btn"
                aria-pressed={!v.pool}
                onClick={() => e.run({ type: 'P0_SET_POOL', pool: false })}
              >
                <Icon name="solo" size={16} />
                {t('ui.p0.solo')}
              </button>
              <button
                type="button"
                class="btn"
                aria-pressed={v.pool}
                disabled={!v.poolsOpen}
                title={v.poolsOpen ? undefined : t('ui.p0.pools_from')}
                onClick={() => e.run({ type: 'P0_SET_POOL', pool: true })}
              >
                <Icon name="pool" size={16} />
                {t('ui.p0.pool')}
              </button>
            </span>
          </div>
          <p class="num-s">{say(v.solo.words)}</p>
          <p class="num-s muted">
            {v.pool
              ? t('ui.p0.pool_note', { fee: fmt.pct(v.poolFeePct, 1) })
              : t('ui.p0.solo_note')}
          </p>
        </div>
        {v.sites.map((s) => (
          <div class="panel" key={s.site.id}>
            <div class="row-between">
              <span class="panel-title">{tierName(s.site.tier)}</span>
              <span class="num-s">
                {t('ui.p0.site_load', {
                  load: watts(s.loadKw),
                  capacity: watts(s.capacityKw),
                })}
                {s.thresholdKw !== null &&
                  ` · ${t('ui.p0.site_threshold', { kw: watts(s.thresholdKw) })}`}
              </span>
            </div>
            {s.site.readyQuarter > state.quarter && (
              <p class="num-s muted">
                {t('ui.p0.site_building', {
                  quarter: fmt.quarter(quarterName(s.site.readyQuarter)),
                })}
              </p>
            )}
            {s.lots.length === 0 && (
              <p class="num-s muted">{t('ui.p0.site_empty')}</p>
            )}
            {s.lots.map(({ lot, sellUsd }) => (
              <div class="fleet-row" key={lot.id}>
                <MachineCard
                  drawing={drawing(lot.model)}
                  caption={machineName(lot.model)}
                  compact
                />
                <span>
                  <strong>{machineName(lot.model)}</strong>
                  <br />
                  <span class="num-s muted">
                    {t('ui.p0.lot_line', {
                      count: lot.count,
                      hash: hashOf(lot.model),
                      broken: lot.failed,
                    })}
                    {lot.earnsFromQuarter > state.quarter &&
                      ` · ${t('ui.p0.lot_from_next')}`}
                  </span>
                </span>
                <span class="row-between" style={{ gap: '6px' }}>
                  {lot.failed > 0 && (
                    <button
                      type="button"
                      class="btn"
                      onClick={() =>
                        e.run({ type: 'REPAIR_MACHINES', lotId: lot.id })
                      }
                    >
                      {t('ui.p0.repair')}
                    </button>
                  )}
                  <button
                    type="button"
                    class="btn"
                    title={t('ui.p0.sell_for', { value: fmt.money(sellUsd) })}
                    onClick={() =>
                      e.run({
                        type: 'SELL_MACHINES',
                        lotId: lot.id,
                        count: lot.count,
                      })
                    }
                  >
                    {t('ui.p0.sell_all', { value: fmt.money(sellUsd) })}
                  </button>
                </span>
              </div>
            ))}
          </div>
        ))}
        {v.livingAtHome && !life.homeRig.built && (
          <div class="panel">
            <ActionRow
              icon="pc-tower"
              name={t('ui.p0.build_home_rig')}
              bandwidth={life.buildBandwidth}
              bandwidthLeft={state.bandwidth}
              price={fmt.money(life.homeRig.costUsd)}
              onClick={() => e.run({ type: 'P0_BUILD_HOME_RIG' })}
            />
            <p class="num-s muted">{t('ui.p0.home_rig_note')}</p>
          </div>
        )}
        {e.view}
      </div>
      <div class="col">
        <div class="panel">
          <div class="row-between">
            <span class="panel-title">{t('ui.p0.buy_title')}</span>
            {ready.length > 1 && (
              <span class="seg">
                {ready.map((s) => (
                  <button
                    key={s.site.id}
                    type="button"
                    class="btn"
                    aria-pressed={site?.site.id === s.site.id}
                    onClick={() => setSiteId(s.site.id)}
                  >
                    {tierName(s.site.tier)}
                  </button>
                ))}
              </span>
            )}
          </div>
          {buy.length === 0 && (
            <p class="num-s muted">{t('ui.p0.nothing_for_sale')}</p>
          )}
          <div class="p0-machines">
            {buy.map((b) => (
              <div key={`${b.model.id}:${b.condition}`}>
                <MachineCard
                  drawing={drawing(b.model.id)}
                  caption={machineName(b.model.id)}
                  era={era(b.model.id)}
                />
                <div class="num-s">
                  {t('ui.p0.buy_line', {
                    condition: t(`condition.${b.condition}`),
                    price: fmt.money(b.unitUsd!),
                    hash: hashOf(b.model.id),
                    power: watts(b.model.power_kw),
                  })}
                </div>
                <button
                  type="button"
                  class="btn"
                  disabled={!!b.blocker}
                  title={b.blocker ? say(b.blocker) : undefined}
                  onClick={() =>
                    e.run({
                      type: 'P0_BUY',
                      model: b.model.id,
                      condition: b.condition,
                      count: 1,
                      siteId: site!.site.id,
                    })
                  }
                >
                  <Icon name="buy" size={16} />
                  {t('ui.p0.buy_one')}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/** The Wallet: wallet vs exchange, moves, selling, the keep/sell %, the backup, the offers. */
function Wallet({ state, act }: PrologueProps) {
  const w = prologueWalletView(state)
  const e = useError(act)
  const [amount, setAmount] = useState('')
  const n = Number(amount)
  const exchange = tDynamic(`ui.p0.exchange_name.${w.exchangeName}`, '')
  return (
    <div class="dash p0-dash">
      <div class="col">
        {w.coins
          .filter((c) => c.coin === 'BTC' || c.total > 0)
          .map((c) => (
            <div class="panel" key={c.coin}>
              <div class="row-between">
                <span class="panel-title">
                  <Icon name={c.coin === 'BTC' ? 'btc' : 'eth'} />{' '}
                  {coins(c.total, c.coin)}
                </span>
                <span class="num-s muted">
                  {t('ui.p0.cap_line', { cap: fmt.money(w.capUsdWeek) })}
                </span>
              </div>
              <table class="num-s" style={{ width: '100%' }}>
                <tbody>
                  <tr>
                    <td>
                      <Icon name="wallet" size={16} /> {t('ui.p0.in_wallet')}
                    </td>
                    <td class="g-right">{coins(c.wallet, c.coin)}</td>
                  </tr>
                  <tr>
                    <td>
                      <Icon name="exchange" size={16} />{' '}
                      {t('ui.p0.on_exchange', { exchange })}
                    </td>
                    <td class="g-right">{coins(c.exchange, c.coin)}</td>
                  </tr>
                  {(c.toExchange > 0 || c.toWallet > 0) && (
                    <tr>
                      <td>
                        <Icon name="in-transit" size={16} />{' '}
                        {t('ui.p0.moving')}
                      </td>
                      <td class="g-right">
                        {coins(c.toExchange + c.toWallet, c.coin)}
                      </td>
                    </tr>
                  )}
                  {c.selling > 0 && (
                    <tr>
                      <td>
                        <Icon name="sell" size={16} /> {t('ui.p0.for_sale')}
                      </td>
                      <td class="g-right">{coins(c.selling, c.coin)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div class="form-row">
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={amount}
                  aria-label={t('ui.p0.amount')}
                  placeholder={t('ui.p0.amount')}
                  onInput={(ev) =>
                    setAmount((ev.target as HTMLInputElement).value)
                  }
                />
                <button
                  type="button"
                  class="btn"
                  disabled={!(n > 0)}
                  onClick={() =>
                    e.run({
                      type: 'P0_MOVE_COINS',
                      coin: c.coin,
                      amount: n,
                      to: 'exchange',
                    })
                  }
                >
                  {t('ui.p0.to_exchange')}
                </button>
                <button
                  type="button"
                  class="btn"
                  disabled={!(n > 0)}
                  onClick={() =>
                    e.run({
                      type: 'P0_MOVE_COINS',
                      coin: c.coin,
                      amount: n,
                      to: 'wallet',
                    })
                  }
                >
                  {t('ui.p0.to_wallet')}
                </button>
                <button
                  type="button"
                  class="btn"
                  disabled={!(n > 0)}
                  title={t('ui.p0.sell_note', { n: w.sellBandwidth })}
                  onClick={() =>
                    e.run({ type: 'P0_SELL', coin: c.coin, amount: n })
                  }
                >
                  {t('ui.p0.sell')}
                </button>
                {c.selling > 0 && (
                  <button
                    type="button"
                    class="btn btn-ghost"
                    onClick={() =>
                      e.run({ type: 'P0_CANCEL_SALE', coin: c.coin })
                    }
                  >
                    {t('ui.p0.cancel_sale')}
                  </button>
                )}
              </div>
              <label class="field">
                <span class="row-between">
                  <span class="label">{t('ui.p0.sell_mined')}</span>
                  <span class="num-kpi">{fmt.pct(1 - c.keepPct)}</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={10}
                  value={Math.round((1 - c.keepPct) * 100)}
                  onChange={(ev) =>
                    e.run({
                      type: 'SET_HODL',
                      coin: c.coin,
                      pct:
                        1 - Number((ev.target as HTMLInputElement).value) / 100,
                    })
                  }
                />
              </label>
            </div>
          ))}
        {e.view}
      </div>
      <div class="col">
        <div class="panel">
          <div class="panel-title">{t('ui.p0.mined_to')}</div>
          <span class="seg">
            <button
              type="button"
              class="btn"
              aria-pressed={w.minedTo === 'wallet'}
              onClick={() => e.run({ type: 'P0_MINED_TO', to: 'wallet' })}
            >
              {t('ui.p0.in_wallet')}
            </button>
            <button
              type="button"
              class="btn"
              aria-pressed={w.minedTo === 'exchange'}
              onClick={() => e.run({ type: 'P0_MINED_TO', to: 'exchange' })}
            >
              {t('ui.p0.on_exchange', { exchange })}
            </button>
          </span>
          <p class="num-s muted">{tDynamic('p0.tooltip.custody', '')}</p>
        </div>
        <div class="panel">
          <ActionRow
            icon="backup"
            name={t(w.backup ? 'ui.p0.backed_up' : 'ui.p0.back_up')}
            bandwidth={w.backup ? 0 : w.backupBandwidth}
            bandwidthLeft={state.bandwidth}
            disabledReason={w.backup ? t('ui.p0.backed_up') : undefined}
            onClick={() => e.run({ type: 'P0_BACKUP' })}
          />
          <p class="num-s muted">{tDynamic('p0.tooltip.backup', '')}</p>
        </div>
        <OffersTray state={state} run={e.run} />
      </div>
    </div>
  )
}

function OffersTray({
  state,
  run,
}: {
  state: GameState
  run: (a: Action) => void
}) {
  const offers = prologueWalletView(state).offers
  if (offers.length === 0) return null
  return (
    <div class="panel">
      <div class="panel-title">{t('ui.p0.offers_title')}</div>
      {offers.map((o) => (
        <div class="row-between" key={o.id}>
          <span class="num-s">
            {t('ui.p0.offer_line', {
              btc: o.btc.toLocaleString('en-US'),
              cash: fmt.money(o.usd),
            })}
          </span>
          <span style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              class="btn"
              onClick={() => run({ type: 'P0_OFFER', id: o.id, accept: true })}
            >
              {t('ui.p0.accept')}
            </button>
            <button
              type="button"
              class="btn btn-ghost"
              onClick={() => run({ type: 'P0_OFFER', id: o.id, accept: false })}
            >
              {t('ui.p0.ignore')}
            </button>
          </span>
        </div>
      ))}
    </div>
  )
}

/** Pre-order cards (scope §2.13 screen 5): vendor, price, on-time delivery, the odds. */
function PreorderCards({
  state,
  run,
}: {
  state: GameState
  run: (a: Action) => void
}) {
  const v = preorderMenuView(state)
  if (v.vendors.length === 0 && v.orders.length === 0) return null
  return (
    <div class="panel">
      <div class="panel-title">
        <Icon name="pre-order" /> {t('ui.p0.preorders_title')}
      </div>
      {v.vendors.map((o) => (
        <div class="offer" key={o.id}>
          <MachineCard
            drawing={drawing(o.model)}
            caption={tDynamic(`p0.vendor.${o.id}`, o.id)}
            era={fmt.money(o.priceUsd)}
          />
          <div class="num-s">
            {t('ui.p0.preorder_line', {
              quarter: fmt.quarter(o.shipsQuarter),
              share: o.unitShare < 1 ? t('ui.p0.half_unit') : '',
            })}
          </div>
          <div class="num-s muted">
            {t('ui.p0.preorder_odds', {
              onTime: fmt.pct(o.odds.on_time),
              late: fmt.pct(o.odds.moderate),
              veryLate: fmt.pct(o.odds.severe),
              never: fmt.pct(o.odds.never),
              refund: fmt.pct(o.refundShare),
            })}
          </div>
          <button
            type="button"
            class="btn"
            disabled={!!o.blocker}
            title={o.blocker ? say(o.blocker) : undefined}
            onClick={() => run({ type: 'P0_PREORDER', vendor: o.id })}
          >
            {t('ui.p0.preorder_pay', { price: fmt.money(o.priceUsd) })}
          </button>
        </div>
      ))}
      {v.orders.map((o) => {
        // What the player can know: waiting, late (past the ship date), arrived, or refunded.
        const status = o.delivered
          ? o.outcome === 'never'
            ? 'refunded'
            : 'arrived'
          : quarterName(state.quarter) > v.shipsQuarter
            ? 'late'
            : 'waiting'
        return (
          <p class="num-s" key={o.id}>
            {t(`ui.p0.order_${status}`, {
              vendor: tDynamic(`p0.vendor.${o.vendor}`, o.vendor),
              cash: fmt.money(o.paidUsd),
            })}
          </p>
        )
      })}
    </div>
  )
}

/** Life: the household, moving out, the small unit, conferences, vanity, pre-orders. */
function Life({ state, act }: PrologueProps) {
  const v = prologueLifeView(state)
  const e = useError(act)
  const blockerText = (m: Message | null) => (m ? say(m) : undefined)
  return (
    <div class="dash p0-dash">
      <div class="col">
        <div class="panel">
          <div class="panel-title">
            <Icon name="household" /> {t('ui.p0.household_title')}
          </div>
          {v.livingAtHome ? (
            <>
              <div class="meter">
                <div
                  class="meter-fill"
                  style={{ width: `${(v.patience / v.patienceMax) * 100}%` }}
                />
              </div>
              <p class="num-s">
                {t('ui.p0.patience_detail', {
                  patience: Math.round(v.patience),
                  drain: v.drainPerQuarter,
                })}
              </p>
              {v.cutBack && <p class="num-s warn">{t('ui.p0.cut_back')}</p>}
              <ActionRow
                icon="move-out"
                name={t('ui.p0.move_out', {
                  deposit: fmt.money(v.moveOut.depositUsd),
                  rent: fmt.money(v.moveOut.rentUsdQ),
                })}
                bandwidth={v.buildBandwidth}
                bandwidthLeft={state.bandwidth}
                disabledReason={blockerText(v.moveOut.blocker)}
                onClick={() => e.run({ type: 'P0_MOVE_OUT' })}
              />
              <p class="num-s muted">{t('ui.p0.move_out_note')}</p>
            </>
          ) : (
            <>
              <p class="num-s">
                {t('ui.p0.moved_out', { rent: fmt.money(v.moveOut.rentUsdQ) })}
              </p>
              <ActionRow
                icon="household"
                name={t('ui.p0.move_back')}
                bandwidth={v.moveBack.bandwidth}
                bandwidthLeft={state.bandwidth}
                disabledReason={blockerText(v.moveBack.blocker)}
                onClick={() => e.run({ type: 'P0_MOVE_BACK' })}
              />
              <p class="num-s muted">{t('ui.p0.move_back_note')}</p>
            </>
          )}
          {!v.livingAtHome && !v.smallUnit.built && (
            <ActionRow
              icon="small-unit"
              name={t('ui.p0.small_unit', {
                capex: fmt.money(v.smallUnit.capexUsd),
                rent: fmt.money(v.smallUnit.rentUsdQ),
              })}
              bandwidth={v.buildBandwidth}
              bandwidthLeft={state.bandwidth}
              disabledReason={blockerText(v.smallUnit.blocker)}
              onClick={() => e.run({ type: 'P0_BUILD_SMALL_UNIT' })}
            />
          )}
        </div>
        <div class="panel">
          <div class="panel-title">
            <Icon name="conference" /> {t('ui.p0.conference_title')}
          </div>
          {v.conference ? (
            <ActionRow
              icon="conference"
              name={t('ui.p0.conference_go')}
              price={fmt.money(v.conference.costUsd)}
              disabledReason={blockerText(v.conference.blocker)}
              onClick={() =>
                e.run({ type: 'P0_CONFERENCE', id: v.conference!.id })
              }
            />
          ) : (
            <p class="num-s muted">{t('ui.p0.conference_none')}</p>
          )}
          {v.usedOffer && (
            <ActionRow
              icon="buy"
              name={t('ui.p0.used_offer', {
                model: machineName(v.usedOffer.model),
              })}
              price={fmt.money(v.usedOffer.priceUsd)}
              onClick={() =>
                e.run({
                  type: 'P0_USED_OFFER',
                  siteId: state.sites.at(-1)!.id,
                })
              }
            />
          )}
        </div>
        {e.view}
      </div>
      <div class="col">
        <PreorderCards state={state} run={e.run} />
        <div class="panel">
          <div class="panel-title">
            <Icon name="vanity" /> {t('ui.p0.vanity_title')}
          </div>
          {v.vanity.map((item) => (
            <ActionRow
              key={item.id}
              icon="vanity"
              name={tDynamic(`p0.vanity.${item.id}`, item.id)}
              price={fmt.money(item.costUsd)}
              disabledReason={item.owned ? t('ui.p0.owned') : undefined}
              onClick={() => e.run({ type: 'P0_VANITY', id: item.id })}
            />
          ))}
          <p class="num-s muted">{t('ui.p0.vanity_note')}</p>
        </div>
      </div>
    </div>
  )
}

function Log({ state }: { state: GameState }) {
  const entries = state.log.slice(-80).reverse()
  return (
    <div class="panel log">
      <div class="panel-title">{t('ui.p0.nav.log')}</div>
      {entries.map((e, i) => (
        <div class="num-s" key={i}>
          <span class="muted">
            {fmt.quarter(quarterName(e.quarter))}
            {e.week !== null && ` · ${t('ui.p0.week_short', { week: e.week })}`}
          </span>{' '}
          {say({ key: e.key, params: e.params })}
        </div>
      ))}
    </div>
  )
}

/** The live quarter: an auto-played quarter runs by itself; a card stops it. */
function Live({ state, act, skip, tick }: PrologueProps) {
  const v = prologueView(state)
  const card = state.interrupt?.event
    ? prologueCard(state.interrupt.event)
    : null
  useEffect(() => {
    if (v.autoPlay && !state.interrupt) skip()
  }, [state.quarter, state.week, state.interrupt, v.autoPlay])
  return (
    <>
      <div class="panel">
        <div class="row-between">
          <span class="panel-title">
            {t('ui.p0.week', { week: state.week, quarter: fmt.quarter(v.quarter) })}
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
      {card && (
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
            <p class="event-body">
              {tDynamic(`p0.event.${card.id}.body`, '')}
            </p>
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
      )}
    </>
  )
}

/** A quarter's report: the one-card summary for an auto-played quarter, else the full report. */
function QuarterReport({ state, act, onNew }: PrologueProps) {
  const r = prologueView(state).lastReport
  if (!r) return null
  const over = state.phase === 'gameover'
  const summary = t('ui.p0.summary', {
    quarter: fmt.quarter(r.quarter),
    btc: coins(r.coinsMined.BTC, 'BTC'),
    price: price(r.btcUsd),
    difficulty: fmt.delta(r.difficultyChangePct, 'pct'),
  })
  return (
    <CenterCard>
      <div class="label">
        <Icon name={r.auto ? 'auto-play' : 'news'} size={16} />{' '}
        {t(r.auto ? 'ui.p0.auto_label' : 'ui.p0.report_label')}
      </div>
      <h1 class="screen-title">{summary}</h1>
      {!r.auto && (
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
      )}
      {r.auto && (
        <p class="num-s">
          {t('ui.p0.summary_money', {
            cash: fmt.money(r.cash),
            worth: fmt.money(r.netWorthUsd),
          })}
        </p>
      )}
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

/** The prologue's chapter report, then Act I. */
function Chapter({ state, act }: PrologueProps) {
  const v = prologueChapterView(state)
  return (
    <CenterCard>
      <div class="label">{t('ui.p0.chapter_label')}</div>
      <h1 class="screen-title">
        {tDynamic(`p0.chapter_title.${v.title}`, v.title)}
      </h1>
      <div class="end-tiles">
        <Tile label={t('ui.p0.c.net_worth')} value={fmt.money(v.netWorthUsd)} />
        <Tile
          label={t('ui.p0.c.mined')}
          value={coins(v.mined.BTC, 'BTC')}
          sub={
            v.mined.ETH > 0 ? coins(v.mined.ETH, 'ETH') : t('ui.p0.c.blocks', { n: v.blocksFound })
          }
        />
        <Tile
          icon="exchange"
          label={t('ui.p0.c.lost_exchange')}
          value={coins(v.lost.exchange.BTC, 'BTC')}
          warn={v.lost.exchange.BTC > 0}
        />
        <Tile
          icon="lost-key"
          label={t('ui.p0.c.lost_keys')}
          value={coins(v.lost.wallet.BTC, 'BTC')}
          warn={v.lost.wallet.BTC > 0}
        />
      </div>
      <p class="num-s">
        {t('ui.p0.c.coins_2010', {
          btc: coins(v.mined2010, 'BTC'),
          peak: fmt.money(v.peak2021Usd),
          worth: fmt.money(v.worth2021Usd),
        })}
      </p>
      <p class="num-s">
        {t('ui.p0.c.carry', {
          cash: fmt.money(v.cash),
          btc: coins(v.treasury.BTC, 'BTC'),
        })}
      </p>
      {v.vanity.length > 0 && (
        <p class="num-s muted">
          {t('ui.p0.c.vanity', {
            items: v.vanity
              .map((id) => tDynamic(`p0.vanity.${id}`, id))
              .join(', '),
          })}
        </p>
      )}
      {v.preorders.map((o, i) => (
        <p class="num-s muted" key={i}>
          {t(`ui.p0.c.preorder_${o.outcome}`, {
            vendor: tDynamic(`p0.vendor.${o.vendor}`, o.vendor),
          })}
        </p>
      ))}
      <div>
        <button
          type="button"
          class="btn btn-primary"
          onClick={() => act({ type: 'CONTINUE_TO_ACT_1' })}
        >
          {t('ui.p0.to_act1')}
        </button>
      </div>
    </CenterCard>
  )
}
