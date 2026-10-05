// The prologue's Plan screen (wireframe P0-03) and its frame: the top bar (date, Prologue tag, cash, coins
// by place, BTC, difficulty, Bandwidth), the menu (Dashboard · Machines & Rooms · Coins · Log), and the
// dashboard in three columns: your rig, the household and the mining mode; the market, your coins and
// the keep / sell slider; this quarter's actions (money sinks included) and the offers. The live
// quarter plays inside the same frame.
import { useEffect, useState } from 'preact/hooks'
import { quarterLabel } from '../../../content/index.ts'
import { hasText, t, tDynamic } from '../../../i18n/t.ts'
import { prologueBandwidth } from '../../../sim/prologue/setup.ts'
import {
  poolWeekBtc,
  preorderMenuView,
  prologueLifeView,
  prologueMarketView,
  prologueNews,
  prologueView,
  prologueWalletView,
} from '../../../sim/prologue/views.ts'
import type { GameState } from '../../../sim/state.ts'
import { getModel } from '../../../sim/systems/market.ts'
import {
  ActionRow,
  Dialog,
  Icon,
  Pips,
  Sparkline,
  Tip,
} from '../../components/basics.tsx'
import { SaveDialog } from '../../components/saves.tsx'
import { Term } from '../../components/term.tsx'
import { fmt } from '../../format.ts'
import type { IconName } from '../../icons.ts'
import { machineName, say } from '../../names.ts'
import { Coins, SellingLimit } from './Coins.tsx'
import {
  Bar,
  Change,
  coins,
  hashOf,
  price,
  useError,
  watts,
  type PrologueProps,
} from './common.tsx'
import { LiveQuarter, type Speed } from './Live.tsx'
import { Machines } from './Machines.tsx'
import { PreorderDialog } from './Preorders.tsx'

type Section = 'dashboard' | 'machines' | 'coins' | 'log'

const NAV: { id: Section; icon: IconName }[] = [
  { id: 'dashboard', icon: 'dashboard' },
  { id: 'machines', icon: 'pc-tower' },
  { id: 'coins', icon: 'wallet' },
  { id: 'log', icon: 'log' },
]

/** The panel a card asked for opens first (a buy menu, pre-orders, the wallet, the offers). */
function firstSection(state: GameState): Section {
  const panel = state.prologue!.openPanel ?? ''
  if (panel.startsWith('buy')) return 'machines'
  if (panel === 'wallet') return 'coins'
  return 'dashboard'
}

/** The top bar (P0-03): date, the Prologue tag, cash, coins by place, BTC, difficulty, Bandwidth. */
function TopBar({ state }: { state: GameState }) {
  const v = prologueView(state)
  const m = prologueMarketView(state)
  const btc = prologueWalletView(state).coins[0]
  const total = prologueBandwidth(state)
  const [saving, setSaving] = useState(false)
  return (
    <div class="topbar">
      <div class="brand">{t('ui.brand')}</div>
      <div class="stat">
        <span class="label">{t('ui.top.date')}</span>
        <span class="num">
          {state.phase === 'live'
            ? t('ui.p0.top_date', {
                quarter: fmt.quarter(v.quarter),
                week: Math.max(1, state.week),
              })
            : t('ui.p0.top_date_plan', { quarter: fmt.quarter(v.quarter) })}
        </span>
      </div>
      <span class="tag">{t('ui.title.tag_prologue')}</span>
      <div class="stat">
        <span class="label">{t('ui.top.cash')}</span>
        <span class="num" style={{ fontWeight: 500 }}>
          {fmt.money(state.cash)}
        </span>
      </div>
      <div class="stat">
        <span class="label">{t('ui.p0.top_coins')}</span>
        <span class="num">
          {t('ui.p0.top_coins_places', {
            wallet: coins(btc.wallet, 'BTC'),
            exchange: coins(btc.exchange, 'BTC'),
          })}
        </span>
      </div>
      <div class="stat">
        <span class="label">BTC</span>
        <span class="num">
          {price(m.btcUsd)} <Change value={m.btcChange} />
        </span>
      </div>
      <div class="stat">
        <span class="label">
          <Term id="difficulty" act={0}>{t('ui.p0.difficulty')}</Term>
        </span>
        <span class="num">
          {m.difficulty.toLocaleString('en-US', { maximumFractionDigits: 0 })}
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

/** The Plan screen and the live quarter, in one frame. */
export function PlanOrLive(
  props: PrologueProps & { speed: Speed; setSpeed: (s: Speed) => void },
) {
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
            <LiveQuarter {...props} />
          ) : shown === 'machines' ? (
            <Machines {...props} />
          ) : shown === 'coins' ? (
            <Coins {...props} />
          ) : shown === 'log' ? (
            <Log state={state} />
          ) : (
            <Dashboard {...props} goTo={setSection} />
          )}
          {plan && (
            <div class="foot">
              <News state={state} />
              <button
                type="button"
                class="btn btn-primary"
                onClick={() => props.act({ type: 'END_PLAN' })}
              >
                {t('ui.p0.end_quarter')}
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function News({ state }: { state: GameState }) {
  const news = prologueNews(state)
    .filter((k) => hasText(k))
    .map((k) => tDynamic(k, ''))
  return (
    <div class="panel news">
      <Icon name="news" />
      <span class="news-mast">{t('ui.news.masthead')}</span>
      <span class="news-text">{news.join(' · ')}</span>
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
            {fmt.quarter(quarterLabel(e.quarter))}
            {e.week !== null && ` · ${t('ui.p0.week_short', { week: e.week })}`}
          </span>{' '}
          {say({ key: e.key, params: e.params })}
        </div>
      ))}
    </div>
  )
}

// ---------- the dashboard ----------

function Dashboard(
  props: PrologueProps & { goTo: (s: Section) => void },
) {
  const { state, act } = props
  const e = useError(act)
  const [dialog, setDialog] = useState<'preorders' | 'vanity' | null>(
    state.prologue!.openPanel === 'preorders' ? 'preorders' : null,
  )
  const panel = state.prologue!.openPanel
  return (
    <>
      {panel && panel !== 'preorders' && (
        <div class="panel tape">
          <span class="num-s">
            {tDynamic(`ui.p0.opened.${panel.split(':')[0]}`, '')}
          </span>
        </div>
      )}
      <div class="p0-plan">
        <div class="col">
          <RigPanel state={state} />
          <RoomPanel state={state} />
          <MiningMode state={state} run={e.run} />
        </div>
        <div class="col">
          <MarketPanel state={state} />
          <CoinsPanel state={state} run={e.run} goTo={props.goTo} />
          <KeepSell state={state} run={e.run} />
        </div>
        <div class="col">
          <ThisQuarter
            state={state}
            run={e.run}
            goTo={props.goTo}
            open={setDialog}
          />
          <OffersPanel state={state} run={e.run} />
          {e.view}
        </div>
      </div>
      {dialog === 'preorders' && (
        <PreorderDialog
          state={state}
          act={act}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'vanity' && (
        <VanityDialog state={state} act={act} onClose={() => setDialog(null)} />
      )}
    </>
  )
}

/** Your rig: each batch's hashrate and power, the total, and your share of the network. */
function RigPanel({ state }: { state: GameState }) {
  const v = prologueView(state)
  const lots = v.sites.flatMap((s) => s.lots.map((l) => l.lot))
  const net = prologueMarketView(state)
  let th = 0
  let kw = 0
  for (const lot of lots) {
    const m = getModel(lot.model)!
    if (m.coin === 'BTC') th += lot.count * m.hashrate
    kw += lot.count * m.power_kw
  }
  const netTh = net.networkTh
  return (
    <section class="panel">
      <Tip id="rig" act={0} />
      <div class="row-between">
        <span class="panel-title">{t('ui.p0.rig_title')}</span>
        <span class="num-s muted">
          {t('ui.p0.rig_share', {
            hash: fmt.hash(th * 1e6, 'MH'),
            share:
              th > 0 && th / (th + netTh || 1) < 0.0001
                ? '<0.01%'
                : fmt.pct(th / (th + netTh || 1), 2),
            net: fmt.hash(netTh * 1e6, 'MH'),
          })}
        </span>
      </div>
      <table class="num-s p0-table">
        <thead>
          <tr>
            <th>{t('ui.p0.col_machine')}</th>
            <th class="g-right">{t('ui.p0.col_hashrate')}</th>
            <th class="g-right">{t('ui.p0.col_power')}</th>
          </tr>
        </thead>
        <tbody>
          {lots.map((lot) => (
            <tr key={lot.id}>
              <td>
                {lot.count > 1
                  ? t('ui.p0.times', {
                      name: machineName(lot.model),
                      n: lot.count,
                    })
                  : machineName(lot.model)}
              </td>
              <td class="g-right num">{hashOf(lot.model, lot.count)}</td>
              <td class="g-right num">
                {watts(getModel(lot.model)!.power_kw * lot.count)}
              </td>
            </tr>
          ))}
          <tr>
            <td>
              <strong>{t('ui.p0.total')}</strong>
            </td>
            <td class="g-right num">{fmt.hash(th * 1e6, 'MH')}</td>
            <td class="g-right num">{watts(kw)}</td>
          </tr>
        </tbody>
      </table>
    </section>
  )
}

/** Your room: living at home (the household's load and patience), or your own place and its rent. */
function RoomPanel({ state }: { state: GameState }) {
  const v = prologueView(state)
  const life = prologueLifeView(state)
  if (!v.livingAtHome)
    return (
      <section class="panel">
        <div class="row-between">
          <span class="panel-title">{t('ui.p0.room_own')}</span>
          <span class="num-s muted">
            {t('ui.p0.per_quarter', {
              value: fmt.money(life.moveOut.rentUsdQ),
            })}
          </span>
        </div>
        <span class="num-s muted">{t('ui.p0.room_own_note')}</span>
      </section>
    )
  const home = v.sites.filter((s) => s.household)
  const load = home.reduce((n, s) => n + s.loadKw, 0)
  const cap = home.reduce((n, s) => n + s.capacityKw, 0)
  const over = home.some(
    (s) => s.thresholdKw !== null && s.loadKw > s.thresholdKw,
  )
  const threshold = Math.min(
    ...home.map((s) => s.thresholdKw ?? Infinity),
  )
  return (
    <section class="panel">
      <Tip id="household" act={0} />
      <div class="row-between">
        <span class="panel-title">{t('ui.p0.room_home')}</span>
        <span class="num-s muted">{t('ui.p0.kpi.parents_pay')}</span>
      </div>
      <div class="row-between num-s">
        <span class="label">{t('ui.p0.household_load')}</span>
        <span class="num">
          {t('ui.p0.load_of', { load: watts(load), cap: watts(cap) })}
        </span>
      </div>
      <Bar
        share={cap > 0 ? load / cap : 0}
        danger={over}
        label={t('ui.p0.load_of', { load: watts(load), cap: watts(cap) })}
      />
      <div class="row-between num-s">
        <span class="label">
          <Term id="patience" act={0}>{t('ui.p0.patience_label')}</Term>
        </span>
        <span class="num">{fmt.pct(life.patience / life.patienceMax)}</span>
      </div>
      <Bar
        share={life.patience / life.patienceMax}
        danger={life.patience <= 30}
        label={fmt.pct(life.patience / life.patienceMax)}
      />
      <span class="num-s muted">
        {t('ui.p0.room_note', {
          threshold: watts(threshold === Infinity ? 0 : threshold),
          drain: life.drainPerQuarter,
        })}
      </span>
      {life.cutBack && <span class="num-s warn">{t('ui.p0.cut_back')}</span>}
    </section>
  )
}

/** Solo or pool, with both sets of odds in plain words (component sheet: the solo / pool toggle). */
function MiningMode({
  state,
  run,
}: {
  state: GameState
  run: ReturnType<typeof useError>['run']
}) {
  const v = prologueView(state)
  const pool = poolWeekBtc(state)
  return (
    <section class="panel">
      <Tip id="mining" act={0} />
      <div class="row-between">
        <span class="panel-title">
          <Term id="solo_pool" act={0}>{t('ui.p0.mining_title')}</Term>
        </span>
        <span class="seg" role="group" aria-label={t('ui.p0.mining_title')}>
          <button
            type="button"
            class="btn"
            aria-pressed={!v.pool}
            onClick={() => run({ type: 'P0_SET_POOL', pool: false })}
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
            onClick={() => run({ type: 'P0_SET_POOL', pool: true })}
          >
            <Icon name="pool" size={16} />
            {t('ui.p0.pool')}
          </button>
        </span>
      </div>
      <div class="p0-two">
        <div class={v.pool ? 'muted' : ''}>
          <span class="label">
            {t(v.pool ? 'ui.p0.solo' : 'ui.p0.solo_selected')}
          </span>
          <div class="num-s">{say(v.solo.words)}</div>
          <div class="num-s muted">
            {t('ui.p0.solo_block', {
              btc: coins(pool.perBlock, 'BTC'),
            })}
          </div>
        </div>
        <div class={v.pool ? '' : 'muted'}>
          <span class="label">
            {t(v.pool ? 'ui.p0.pool_selected' : 'ui.p0.pool')}
          </span>
          {v.poolsOpen ? (
            <>
              <div class="num-s">
                {t('ui.p0.pool_week', { btc: coins(pool.btc, 'BTC') })}
              </div>
              <div class="num-s muted">
                {t('ui.p0.pool_fee', { fee: fmt.pct(v.poolFeePct, 1) })}
              </div>
            </>
          ) : (
            <div class="num-s muted">{t('ui.p0.pools_from')}</div>
          )}
        </div>
      </div>
    </section>
  )
}

/** The market over the last 4 quarters: BTC's price and the difficulty (a rise is neither good nor bad). */
function MarketPanel({ state }: { state: GameState }) {
  const m = prologueMarketView(state)
  return (
    <section class="panel">
      <div class="row-between">
        <span class="panel-title">{t('ui.p0.market')}</span>
        <span class="num-s muted">{t('ui.p0.last_4')}</span>
      </div>
      <div class="p0-two">
        <div>
          <span class="label">{t('ui.p0.btc_price')}</span>
          <Sparkline
            series="btc"
            label={t('ui.p0.btc_price')}
            points={m.points.map((p) => p.btcUsd)}
          />
          <span class="num-s">
            {price(m.btcUsd)} <Change value={m.btcChange} />
          </span>
        </div>
        <div>
          <span class="label">
          <Term id="difficulty" act={0}>{t('ui.p0.difficulty')}</Term>
        </span>
          <Sparkline
            series="hash"
            label={t('ui.p0.difficulty')}
            points={m.points.map((p) => p.difficulty)}
          />
          <span class="num-s">
            {m.difficulty.toLocaleString('en-US', {
              maximumFractionDigits: 0,
            })}{' '}
            <Change value={m.difficultyChange} neutral />
          </span>
        </div>
      </div>
    </section>
  )
}

/** Your coins: wallet and exchange tiles, the backup on the wallet tile, one risk line each. */
function CoinsPanel({
  state,
  run,
  goTo,
}: {
  state: GameState
  run: ReturnType<typeof useError>['run']
  goTo: (s: Section) => void
}) {
  const w = prologueWalletView(state)
  const btc = w.coins[0]
  const px = prologueMarketView(state).btcUsd
  const exchange = tDynamic(`ui.p0.exchange_name.${w.exchangeName}`, '')
  return (
    <section class="panel">
      <div class="row-between">
        <span class="panel-title">{t('ui.p0.coins_title')}</span>
        <button type="button" class="btn" onClick={() => goTo('coins')}>
          {t('ui.p0.move_more')}
        </button>
      </div>
      <div class="p0-two">
        <div class="panel p0-tile">
          <span class="label">
            <Icon name="wallet" size={16} /> {t('ui.p0.in_wallet')}
          </span>
          <span class="num">{coins(btc.wallet, 'BTC')}</span>
          <span class="num-s muted">{fmt.money(btc.wallet * px)}</span>
          {w.backup ? (
            <span class="num-s gain">{t('ui.p0.backup_ok')}</span>
          ) : (
            <button
              type="button"
              class="btn"
              onClick={() => run({ type: 'P0_BACKUP' })}
            >
              {t('ui.p0.backup_action', { n: w.backupBandwidth })}
            </button>
          )}
        </div>
        <div class="panel p0-tile">
          <span class="label">
            <Icon name="exchange" size={16} /> {exchange}
          </span>
          <span class="num">{coins(btc.exchange, 'BTC')}</span>
          <span class="num-s muted">{fmt.money(btc.exchange * px)}</span>
          <span class="num-s">{t('ui.p0.ready_to_sell')}</span>
        </div>
      </div>
      <span class="num-s">
        <strong>{t('ui.p0.risk_exchange_label')}</strong>{' '}
        {t('ui.p0.risk_exchange_short')}
      </span>
      <span class="num-s">
        <strong>{t('ui.p0.risk_wallet_label')}</strong>{' '}
        {t('ui.p0.risk_wallet_short')}
      </span>
    </section>
  )
}

/** Keep / sell mined BTC, with what it means this quarter and the selling limit. */
function KeepSell({
  state,
  run,
}: {
  state: GameState
  run: ReturnType<typeof useError>['run']
}) {
  const btc = prologueWalletView(state).coins[0]
  const v = prologueView(state)
  const pool = poolWeekBtc(state)
  const px = prologueMarketView(state).btcUsd
  const sell = 1 - btc.keepPct
  const mined = (v.pool ? pool.btc : v.solo.blocksPerWeek * pool.perBlock) * 13
  return (
    <section class="panel">
      <div class="row-between">
        <label class="panel-title" for="p0-keep">
          {t('ui.p0.keep_sell_title')}
        </label>
        <span class="num">{t('ui.p0.sell_pct', { pct: fmt.pct(sell) })}</span>
      </div>
      <input
        id="p0-keep"
        type="range"
        min={0}
        max={100}
        step={10}
        value={Math.round(sell * 100)}
        onChange={(ev) =>
          run({
            type: 'SET_HODL',
            coin: 'BTC',
            pct: 1 - Number((ev.target as HTMLInputElement).value) / 100,
          })
        }
      />
      <div class="row-between num-s muted">
        <span>{t('ui.p0.keep_all')}</span>
        <span class="num">
          {t('ui.p0.sell_estimate', {
            sold: coins(mined * sell, 'BTC'),
            mined: coins(mined, 'BTC'),
            usd: fmt.money(mined * sell * px),
          })}
        </span>
        <span>{t('ui.p0.sell_all_label')}</span>
      </div>
      <SellingLimit state={state} />
      {!v.ethUsd && <span class="num-s muted">{t('ui.p0.eth_later')}</span>}
    </section>
  )
}

/** This quarter's actions (P0-03): buying, the backup, the home rig, moving, the sinks. */
function ThisQuarter({
  state,
  run,
  goTo,
  open,
}: {
  state: GameState
  run: ReturnType<typeof useError>['run']
  goTo: (s: Section) => void
  open: (d: 'preorders' | 'vanity') => void
}) {
  const life = prologueLifeView(state)
  const pre = preorderMenuView(state)
  const bw = state.bandwidth
  const why = (m: Parameters<typeof say>[0] | null) => (m ? say(m) : undefined)
  return (
    <section class="panel">
      <div class="row-between">
        <span class="panel-title">{t('ui.p0.this_quarter')}</span>
        <span class="num-s muted">
          {t('ui.p0.bw_of', { n: bw, total: prologueBandwidth(state) })}
        </span>
      </div>
      <ActionRow
        icon="buy"
        name={t('ui.p0.act_buy')}
        onClick={() => goTo('machines')}
      />
      {life.livingAtHome && !life.homeRig.built && (
        <ActionRow
          icon="pc-tower"
          name={t('ui.p0.build_home_rig')}
          bandwidth={life.buildBandwidth}
          bandwidthLeft={bw}
          price={fmt.money(life.homeRig.costUsd)}
          onClick={() => run({ type: 'P0_BUILD_HOME_RIG' })}
        />
      )}
      <ActionRow
        icon="backup"
        name={t(life.backup ? 'ui.p0.backed_up' : 'ui.p0.back_up')}
        bandwidth={life.backup ? 0 : 1}
        bandwidthLeft={bw}
        disabledReason={life.backup ? t('ui.p0.backup_ok') : undefined}
        onClick={() => run({ type: 'P0_BACKUP' })}
      />
      {life.livingAtHome ? (
        <ActionRow
          icon="move-out"
          name={t('ui.p0.act_move_out')}
          bandwidth={life.buildBandwidth}
          bandwidthLeft={bw}
          price={t('ui.p0.deposit_rent', {
            deposit: fmt.money(life.moveOut.depositUsd),
            rent: fmt.money(life.moveOut.rentUsdQ),
          })}
          disabledReason={why(life.moveOut.blocker)}
          onClick={() => run({ type: 'P0_MOVE_OUT' })}
        />
      ) : (
        <ActionRow
          icon="household"
          name={t('ui.p0.move_back')}
          bandwidth={life.moveBack.bandwidth}
          bandwidthLeft={bw}
          disabledReason={why(life.moveBack.blocker)}
          onClick={() => run({ type: 'P0_MOVE_BACK' })}
        />
      )}
      {!life.livingAtHome && !life.smallUnit.built && (
        <ActionRow
          icon="small-unit"
          name={t('ui.p0.act_small_unit')}
          bandwidth={life.buildBandwidth}
          bandwidthLeft={bw}
          price={fmt.money(life.smallUnit.capexUsd)}
          disabledReason={why(life.smallUnit.blocker)}
          onClick={() => run({ type: 'P0_BUILD_SMALL_UNIT' })}
        />
      )}
      {life.conference ? (
        <ActionRow
          icon="conference"
          name={t('ui.p0.conference_go')}
          price={fmt.money(life.conference.costUsd)}
          disabledReason={why(life.conference.blocker)}
          onClick={() =>
            run({ type: 'P0_CONFERENCE', id: life.conference!.id })
          }
        />
      ) : (
        <ActionRow
          icon="conference"
          name={t('ui.p0.conference_go')}
          locked={t('ui.p0.conference_when')}
        />
      )}
      {life.usedOffer && (
        <ActionRow
          icon="buy"
          name={t('ui.p0.used_offer', {
            model: machineName(life.usedOffer.model),
          })}
          price={fmt.money(life.usedOffer.priceUsd)}
          onClick={() =>
            run({ type: 'P0_USED_OFFER', siteId: state.sites.at(-1)!.id })
          }
        />
      )}
      {pre.vendors.length > 0 || pre.orders.length > 0 ? (
        <ActionRow
          icon="pre-order"
          name={t('ui.p0.act_preorders')}
          onClick={() => open('preorders')}
        />
      ) : (
        <ActionRow
          icon="pre-order"
          name={t('ui.p0.act_preorders')}
          locked={t('ui.p0.preorders_when')}
        />
      )}
      <ActionRow
        icon="vanity"
        name={t('ui.p0.act_vanity')}
        onClick={() => open('vanity')}
      />
    </section>
  )
}

/** The offers waiting (at most 2 shown, wireframe P0-03). */
function OffersPanel({
  state,
  run,
}: {
  state: GameState
  run: ReturnType<typeof useError>['run']
}) {
  const offers = prologueWalletView(state).offers
  const px = prologueMarketView(state).btcUsd
  return (
    <section class="panel">
      <div class="row-between">
        <span class="panel-title">{t('ui.p0.offers_title')}</span>
        <span class="num-s muted">
          {t('ui.p0.waiting', { n: offers.length })}
        </span>
      </div>
      {offers.length === 0 && (
        <span class="num-s muted">{t('ui.p0.no_offers')}</span>
      )}
      {offers.slice(0, 2).map((o) => (
        <div class="offer" key={o.id}>
          <span class="label">{t('ui.p0.offer_from')}</span>
          <span>
            {t('ui.p0.offer_line2', {
              per: price(o.usd / o.btc),
              btc: o.btc.toLocaleString('en-US'),
            })}
          </span>
          <span class="num-s muted">
            {px > 0
              ? t('ui.p0.offer_vs_market', {
                  cash: fmt.money(o.usd),
                  pct: fmt.pct(Math.abs(o.usd / o.btc / px - 1)),
                })
              : t('ui.p0.offer_no_market', { cash: fmt.money(o.usd) })}
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
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
              {t('ui.p0.decline')}
            </button>
          </div>
        </div>
      ))}
    </section>
  )
}

/** Treat yourself (a money sink with no game effect but a line in the chapter report). */
function VanityDialog({
  state,
  act,
  onClose,
}: {
  state: GameState
  act: PrologueProps['act']
  onClose: () => void
}) {
  const life = prologueLifeView(state)
  const e = useError(act)
  return (
    <Dialog title={t('ui.p0.vanity_title')} onClose={onClose}>
      {life.vanity.map((item) => (
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
      {e.view}
    </Dialog>
  )
}
