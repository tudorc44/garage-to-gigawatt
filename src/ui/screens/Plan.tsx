// Plan dashboard: market, fleet & sites, sell slider | the quarter's to-do list | signals.
// Reads the state through selectors and sends actions; no game rules here.
import { useContext, useState } from 'preact/hooks'
import { hasText, t, tDynamic, type Message } from '../../i18n/t.ts'
import type { Action } from '../../sim/actions.ts'
import {
  BANDWIDTH_COST,
  HEAT_MARKS,
  SELL_TREASURY_BANDWIDTH,
  act2MarketView,
  actTurn,
  fleetOfferView,
  repairAllView,
  projectsView,
  auctionView,
  communityView,
  cryptoLoanView,
  equipmentLoanView,
  constructionLoanView,
  transformerViews,
  knowHowView,
  phaseViews,
  fundingRound,
  hireViews,
  planOpensOnBuy,
  marketReadView,
  heatBand,
  hostingView,
  lotViews,
  machineMarket,
  mwByUse,
  siteMwByUse,
  nextRenewal,
  quarterName,
  recentMarket,
  renewalViews,
  siteLadder,
  siteViews,
  topHeat,
  treasuryValue,
  whyNot,
  type LotView,
} from '../../sim/selectors.ts'
// (Act II's panels show in Act III too, which runs the same systems: inAct2Rules, M13.1.)
import {
  inActII,
  inAct2Rules,
  inActIII,
  type Coin,
  type GameState,
} from '../../sim/state.ts'
import { Act3Panel } from '../components/act3Lazy.tsx'
import { ActionRow, Icon, Sparkline, Tip } from '../components/basics.tsx'
import { Delta, NavContext, Shell } from '../components/frame.tsx'
import { MwBar, MwLegend } from '../components/mwbar.tsx'
import { BridgePayment } from '../components/bridge.tsx'
import { Runway } from '../components/runway.tsx'
import { fmt } from '../format.ts'
import {
  flawName,
  headlines,
  machineIcon,
  machineName,
  say,
  siteName,
  tierIcon,
  tierName,
} from '../names.ts'
import {
  AuctionDialog,
  BuyDialog,
  CommunityDialog,
  CryptoLoanDialog,
  FleetDialog,
  HostingDialog,
  LeaveDialog,
  LoanDialog,
  OffersDialog,
  HiresDialog,
  PitchDialog,
  RenewalDialog,
  SellCoinsDialog,
} from './dialogs.tsx'

export interface ScreenProps {
  state: GameState
  act: (a: Action) => Message | null
}

/** Which dialog is open; `leave:<siteId>` confirms leaving that site. */
type Open =
  | 'buy'
  | 'fleet'
  | 'offers'
  | 'loan'
  | 'cloan'
  | 'sell_coins'
  | 'auction'
  | 'community'
  | 'hosting'
  | `leave:${string}`
  | `renew:${string}`
  | `pitch:${string}`
  | 'hires'
  | null

export function PlanScreen({ state, act }: ScreenProps) {
  // An event card last quarter may ask to start this Plan phase on the Buy dialog.
  const [open, setOpen] = useState<Open>(planOpensOnBuy(state) ? 'buy' : null)
  const q = quarterName(state.quarter)
  const news = headlines(q)
  return (
    <div class="screen">
      <Shell state={state}>
        <main class="main">
          {inAct2Rules(state) && <MwPanel state={state} />}
          {inActIII(state) && (
            <Act3Panel name="WildcardPanel" state={state} act={act} />
          )}
          {inActIII(state) && (
            <Act3Panel name="RenewalsDuePanel" state={state} act={act} />
          )}
          <div class="dash">
            <div class="col">
              <MarketPanel state={state} />
              <FleetPanel state={state} />
              <SellPanel state={state} act={act} />
            </div>
            <TodoPanel state={state} act={act} open={setOpen} />
            <aside class="col" aria-label={t('ui.signals.title')}>
              {inActIII(state) ? (
                <Act3Panel name="Act3SignalsPanel" state={state} act={act} />
              ) : (
                <SignalsPanel state={state} news={news} />
              )}
            </aside>
          </div>
          <div class="foot">
            <div class="panel news">
              <Icon name="news" />
              <span class="news-mast">{t('ui.news.masthead')}</span>
              <span class="news-text">{news[news.length - 1] ?? ''}</span>
            </div>
            <button
              type="button"
              class="btn btn-primary"
              onClick={() => act({ type: 'END_PLAN' })}
            >
              {t('ui.plan.start_quarter')}
            </button>
          </div>
        </main>
      </Shell>
      {open === 'buy' && (
        <BuyDialog state={state} act={act} onClose={() => setOpen(null)} />
      )}
      {open === 'fleet' && (
        <FleetDialog state={state} act={act} onClose={() => setOpen(null)} />
      )}
      {open === 'offers' && (
        <OffersDialog state={state} act={act} onClose={() => setOpen(null)} />
      )}
      {open === 'sell_coins' && (
        <SellCoinsDialog
          state={state}
          act={act}
          onClose={() => setOpen(null)}
        />
      )}
      {open === 'cloan' && (
        <CryptoLoanDialog
          state={state}
          act={act}
          onClose={() => setOpen(null)}
        />
      )}
      {open === 'auction' && (
        <AuctionDialog state={state} act={act} onClose={() => setOpen(null)} />
      )}
      {open?.startsWith('renew:') && (
        <RenewalDialog
          state={state}
          act={act}
          siteId={open.slice('renew:'.length)}
          onClose={() => setOpen(null)}
        />
      )}
      {open === 'hires' && (
        <HiresDialog state={state} act={act} onClose={() => setOpen(null)} />
      )}
      {open?.startsWith('pitch:') && (
        <PitchDialog
          state={state}
          act={act}
          round={open.slice('pitch:'.length)}
          onClose={() => setOpen(null)}
        />
      )}
      {open === 'community' && (
        <CommunityDialog
          state={state}
          act={act}
          onClose={() => setOpen(null)}
        />
      )}
      {open === 'loan' && (
        <LoanDialog state={state} act={act} onClose={() => setOpen(null)} />
      )}
      {open === 'hosting' && (
        <HostingDialog state={state} act={act} onClose={() => setOpen(null)} />
      )}
      {open?.startsWith('leave:') && (
        <LeaveDialog
          state={state}
          act={act}
          siteId={open.slice('leave:'.length)}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  )
}

/**
 * Act II: "GPU know-how N of 3" with a tooltip on how it rises and what each level does (M8.5).
 * Every number comes from knowHowView (the code and content), so the text can't disagree with the rules.
 */
function KnowHow({ state }: { state: GameState }) {
  const v = knowHowView(state)
  if (!v) return null
  const tip = [
    t('ui.knowhow.rise', { power: fmt.power(v.threeKw) }),
    ...v.levels.map((l) => {
      if (l.level === 0)
        return t('ui.knowhow.level0', {
          more: fmt.pct(l.costMult - 1, 0),
          quarters: l.extraWaitQuarters,
        })
      const parts = [
        l.utilisationBonus > 0 &&
          t('ui.knowhow.part_util', {
            points: Math.round(l.utilisationBonus * 100),
          }),
        l.overflowCards > 0 &&
          t('ui.knowhow.part_overflow', { count: l.overflowCards }),
      ].filter(Boolean)
      return t('ui.knowhow.level', {
        level: l.level,
        what: parts.length ? parts.join(', ') : t('ui.knowhow.part_none'),
      })
    }),
    t('ui.knowhow.base', { base: fmt.pct(v.utilisationBase, 0) }),
  ].join('\n')
  return (
    <div class="num-s muted know-how" title={tip}>
      <strong>{t('ui.knowhow.label', { level: v.level, max: v.max })}</strong>
      {' · '}
      {t('ui.knowhow.hint')}
    </div>
  )
}

/** Act II (A2-03): where the company's megawatts go, with the key and a hint when some sit idle. */
function MwPanel({ state }: { state: GameState }) {
  const use = mwByUse(state, state.quarter)
  const totalKw = Object.values(use).reduce((kw, x) => kw + x, 0)
  const nav = useContext(NavContext)
  const projects = projectsView(state)
  return (
    <div class="panel p mw-panel">
      <div class="row-between">
        <h2 class="panel-title">
          {t('ui.mw.title', { total: fmt.power(totalKw) })}
        </h2>
        <MwLegend use={use} />
      </div>
      <MwBar use={use} />
      <KnowHow state={state} />
      <Runway state={state} />
      <div class="row-between">
        <span class="num-s muted">
          {use.idle > 0 && t('ui.mw.idle_hint', { value: fmt.power(use.idle) })}
        </span>
        <button
          type="button"
          class="btn btn-ghost"
          onClick={() => nav?.setSection('projects')}
        >
          {t('ui.mw.projects', {
            building: projects.byColumn.building.length,
            live: projects.byColumn.live.length,
          })}
        </button>
      </div>
    </div>
  )
}

function MarketPanel({ state }: { state: GameState }) {
  const weeks = recentMarket(state)
  const act2 = act2MarketView(state)
  const first = weeks[0]
  const now = weeks[weeks.length - 1]
  const spark = (
    label: string,
    series: 'btc' | 'eth' | 'hash',
    pick: (w: (typeof weeks)[number]) => number,
    value: string,
  ) => (
    <div class="spark">
      <span class="label">{label}</span>
      <span class="num">
        {value}{' '}
        {weeks.length > 1 && <Delta value={pick(now) / pick(first) - 1} />}
      </span>
      <Sparkline
        points={weeks.map(pick)}
        series={series}
        label={t('ui.market.trend', { name: label })}
      />
    </div>
  )
  if (act2) {
    // Act II (A2-03): BTC, hashprice and the H100 spot price; ETH no longer mines.
    const gpuWeeks = weeks.filter((w) => w.gpu_h100_spot_usd_hr !== null)
    const gpuFirst = gpuWeeks[0]
    return (
      <div class="panel p">
        <div class="row-between">
          <h2 class="panel-title">{t('ui.market.title')}</h2>
        </div>
        <div class="mkt">
          {spark('BTC', 'btc', (w) => w.btc_usd, fmt.money(now.btc_usd))}
          {spark(
            t('ui.market.hashprice_label'),
            'hash',
            (w) => w.btc_hashprice_usd_ph_day,
            fmt.money(now.btc_hashprice_usd_ph_day),
          )}
          {act2.h100SpotUsdHr === null || gpuWeeks.length === 0 ? (
            <div class="spark">
              <span class="label">{t('ui.market.h100_spot')}</span>
              <span class="num-s muted">{t('ui.market.no_gpu_market')}</span>
            </div>
          ) : (
            <div class="spark">
              <span class="label">{t('ui.market.h100_spot')}</span>
              <span class="num">
                {fmt.money(act2.h100SpotUsdHr, { exact: true, dp: 2 })}{' '}
                {gpuWeeks.length > 1 && (
                  <Delta
                    value={
                      act2.h100SpotUsdHr / gpuFirst.gpu_h100_spot_usd_hr! - 1
                    }
                  />
                )}
              </span>
              <Sparkline
                points={gpuWeeks.map((w) => w.gpu_h100_spot_usd_hr!)}
                series="eth"
                label={t('ui.market.trend', {
                  name: t('ui.market.h100_spot'),
                })}
              />
            </div>
          )}
        </div>
        <div class="row-between num-s muted">
          <span>
            {t('ui.market.ai_demand', { value: act2.aiDemandIndex })}{' '}
            {act2.aiDemandPrev !== null && (
              <Delta value={act2.aiDemandIndex / act2.aiDemandPrev - 1} />
            )}
          </span>
          {act2.h100Contract1yUsdHr !== null && (
            <span>
              {t('ui.market.h100_contract', {
                contract: fmt.money(act2.h100Contract1yUsdHr, {
                  exact: true,
                  dp: 2,
                }),
                neocloud: fmt.money(act2.h100NeocloudUsdHr ?? 0, {
                  exact: true,
                  dp: 2,
                }),
              })}
            </span>
          )}
        </div>
      </div>
    )
  }
  return (
    <div class="panel p">
      <div class="row-between">
        <h2 class="panel-title">{t('ui.market.title')}</h2>
      </div>
      <div class="mkt">
        {spark('BTC', 'btc', (w) => w.btc_usd, fmt.money(now.btc_usd))}
        {spark('ETH', 'eth', (w) => w.eth_usd, fmt.money(now.eth_usd))}
        {spark(
          t('ui.market.eth_rev'),
          'hash',
          (w) => w.eth_rev_usd_mh_day,
          fmt.money(now.eth_rev_usd_mh_day, { exact: true, dp: 3 }),
        )}
      </div>
      <div class="row-between num-s muted">
        <span>
          {weeks.length > 1
            ? t('ui.market.since', { date: fmt.date(first.week) })
            : t('ui.market.first_week')}
        </span>
        <span>
          {t('ui.market.hashprice', {
            value: fmt.money(now.btc_hashprice_usd_ph_day),
          })}
        </span>
      </div>
    </div>
  )
}

function lotStatus(v: LotView) {
  if (v.status === 'arriving')
    return (
      <span class="tag">
        {t('ui.fleet.earns_from', { quarter: fmt.quarter(v.earnsFrom) })}
      </span>
    )
  if (v.status === 'broken')
    return <span class="tag danger">{t('ui.fleet.all_broken')}</span>
  if (v.status === 'switched_off')
    return <span class="tag warn">{t('ui.fleet.switched_off')}</span>
  return (
    <span class={`num ${v.dailyProfitEachUsd >= 0 ? 'gain' : 'loss'}`}>
      {t('ui.fleet.per_day_each', { value: fmt.signed(v.dailyProfitEachUsd) })}
    </span>
  )
}

export function FleetPanel({ state }: { state: GameState }) {
  const sites = siteViews(state)
  const lots = lotViews(state)
  const readySites = sites.filter((s) => s.ready)
  const used = readySites.reduce((a, s) => a + s.usedKw, 0)
  const cap = readySites.reduce((a, s) => a + s.capacityKw, 0)
  return (
    <div class="panel p">
      <div class="row-between">
        <h2 class="panel-title">{t('ui.fleet.title')}</h2>
        <span class="num-s muted">{`${fmt.power(used)} / ${fmt.power(cap)}`}</span>
      </div>
      {sites.map((sv) => {
        const siteLots = lots.filter((l) => l.lot.siteId === sv.site.id)
        return (
          <div key={sv.site.id}>
            <div class="fleet-row">
              <Icon name={tierIcon(sv.site.tier)} />
              <div>
                <div class="site-head">{siteName(sv.site)}</div>
                <div class="num-s muted">
                  {t('ui.fleet.site_sub', {
                    power: fmt.cents(sv.powerUsdKwh),
                    rent: fmt.money(sv.site.rentUsdQ),
                    used: fmt.power(sv.usedKw),
                    cap: fmt.power(sv.capacityKw),
                  })}
                </div>
                {Math.round(sv.capacityChargeUsdMwh) !== 0 && (
                  // Act III (M17.8): the PJM capacity charge in the price above, this quarter.
                  <div class="num-s muted" data-capacity-charge>
                    {t('ui.fleet.capacity_charge', {
                      usd: fmt.signedDollars(sv.capacityChargeUsdMwh),
                    })}
                  </div>
                )}
                {inAct2Rules(state) && (
                  <MwBar
                    use={siteMwByUse(state, sv.site, state.quarter)}
                    compact
                  />
                )}
                {sv.contract && (
                  <div class={`num-s ${sv.renewalDue ? 'warn' : 'muted'}`}>
                    {sv.renewalDue
                      ? t('ui.fleet.contract_due', {
                          contract: tDynamic(
                            `contract.${sv.contract.type}`,
                            '',
                          ),
                        })
                      : t('ui.fleet.contract', {
                          contract: tDynamic(
                            `contract.${sv.contract.type}`,
                            '',
                          ),
                          price: fmt.cents(sv.contract.price),
                          quarter: fmt.quarter(
                            quarterName(sv.contract.endQuarter) || '—',
                          ),
                        })}
                  </div>
                )}
                {sv.site.flaw && (
                  <div class="num-s warn">
                    {t('ui.fleet.flaw', { flaw: flawName(sv.site.flaw) })}
                  </div>
                )}
                {sv.phases && (
                  <div class="num-s muted">
                    {sv.phases.powered < sv.phases.started
                      ? t('ui.fleet.phases_building', {
                          powered: sv.phases.powered,
                          started: sv.phases.started,
                          of: sv.phases.of,
                          quarter: fmt.quarter(sv.phases.nextReady),
                        })
                      : t('ui.fleet.phases', {
                          powered: sv.phases.powered,
                          of: sv.phases.of,
                        })}
                  </div>
                )}
              </div>
              {sv.ready ? (
                <span class="tag">
                  {t('ui.fleet.tier', { n: sv.rung, total: 5 })}
                </span>
              ) : (
                <span class="tag warn">
                  {t('ui.fleet.ready_in', {
                    quarter: fmt.quarter(sv.readyQuarter),
                  })}
                </span>
              )}
            </div>
            <div class="cap" aria-hidden="true">
              <div
                style={{
                  width: `${Math.min(100, (sv.usedKw / sv.capacityKw) * 100)}%`,
                }}
              />
            </div>
            <HeatMeter tier={sv.site.tier} heat={sv.heat} />
            {(sv.rateHike || sv.moratorium || sv.shutDown) && (
              <div
                class="row-between"
                style={{ justifyContent: 'flex-start', gap: '6px' }}
              >
                {sv.shutDown && (
                  <span class="tag danger">{t('ui.fleet.shut_down')}</span>
                )}
                {sv.moratorium && !sv.shutDown && (
                  <span class="tag danger">{t('ui.fleet.moratorium')}</span>
                )}
                {sv.rateHike && (
                  <span class="tag warn">
                    {t('ui.fleet.rate_hike', {
                      pct: `+${fmt.pct(sv.rateHike - 1)}`,
                    })}
                  </span>
                )}
              </div>
            )}
            {siteLots.map((v) => (
              <div class="fleet-row" key={v.lot.id}>
                <Icon name={machineIcon(v.coin)} />
                <div>
                  <div>
                    {t('ui.fleet.batch', {
                      count: v.lot.count,
                      model: machineName(v.lot.model),
                      condition: tDynamic(
                        `condition.${v.lot.condition}`,
                        v.lot.condition,
                      ),
                    })}
                    {v.lot.failed > 0 && (
                      <span class="loss">{` · ${t('ui.fleet.broken', { n: v.lot.failed })}`}</span>
                    )}
                  </div>
                  <div class="num-s muted">
                    {t('ui.fleet.batch_sub', {
                      hashrate: hashOf(v, 1),
                      power: fmt.power(v.powerKwEach),
                      total: hashOf(v, v.working),
                    })}
                  </div>
                </div>
                {lotStatus(v)}
              </div>
            ))}
          </div>
        )
      })}
      {lots.length === 0 && (
        <div class="num-s muted">{t('ui.fleet.empty')}</div>
      )}
    </div>
  )
}

/** A site's Heat, 0–100, with marks at the thresholds (danger from the moratorium up). */
function HeatMeter({ tier, heat }: { tier: string; heat: number }) {
  const band = heatBand(heat)
  const next = HEAT_MARKS[band - 1]
  const shown = Math.round(heat)
  return (
    <div class="heat-meter">
      <div class="row-between" style={{ marginBottom: '4px' }}>
        <span class="label">{t('ui.fleet.heat', { heat: shown })}</span>
        <span class={`num-s ${band >= 4 ? 'loss' : 'muted'}`}>
          {tDynamic(`ui.fleet.heat_next.${band}`, '', { at: next ?? '' })}
        </span>
      </div>
      <div
        class="meter"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={shown}
        aria-label={t('ui.fleet.heat_label', {
          tier: tierName(tier),
          heat: shown,
        })}
      >
        <div
          class={`meter-fill g-heat-${band}`}
          style={{ width: `${Math.min(100, heat)}%` }}
        />
        {HEAT_MARKS.map((m, i) => (
          <span
            key={m}
            class={`meter-mark${i >= 2 ? ' danger' : ''}`}
            style={{ left: `${m}%` }}
          />
        ))}
      </div>
    </div>
  )
}

function hashOf(v: LotView, units: number) {
  return fmt.hash(v.hashrateEach * units, v.coin === 'ETH' ? 'MH' : 'TH')
}

function SellPanel({ state, act }: ScreenProps) {
  return (
    <div class="panel p">
      <SellSlider state={state} act={act} coin="BTC" />
      <SellSlider state={state} act={act} coin="ETH" />
      <div class="row-between num-s muted">
        <span>{t('ui.sell.hodl_all')}</span>
        <span>{t('ui.sell.sell_all')}</span>
      </div>
      <span class="num-s muted">{t('ui.sell.note')}</span>
    </div>
  )
}

/** How much of one coin's mining to sell as it comes in (the rest goes to the treasury). */
function SellSlider({ state, act, coin }: ScreenProps & { coin: Coin }) {
  const committed = Math.round((1 - state.hodlPct[coin]) * 100)
  const [value, setValue] = useState(committed)
  const id = `sell-${coin}`
  return (
    <div>
      <div class="row-between">
        <label class="label" for={id}>
          {t('ui.sell.coin', { coin })}
        </label>
        <span class="num-kpi">{fmt.pct(value / 100)}</span>
      </div>
      <input
        class="slider"
        id={id}
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onInput={(e) => setValue(Number((e.target as HTMLInputElement).value))}
        onChange={(e) => {
          const v = Number((e.target as HTMLInputElement).value)
          if (act({ type: 'SET_HODL', coin, pct: 1 - v / 100 }))
            setValue(committed)
        }}
      />
    </div>
  )
}

function TodoPanel({
  state,
  act,
  open,
}: ScreenProps & { open: (o: Open) => void }) {
  const left = state.bandwidth
  const market = machineMarket(state)
  const cheapest = Math.min(
    ...market
      .flatMap((m) => [m.newPriceUsd, m.usedPriceUsd])
      .filter((p): p is number => p !== undefined),
  )
  const broken = state.machines.reduce((n, l) => n + l.failed, 0)
  const reason = (a: Action) => {
    const why = whyNot(state, a)
    return why ? say(why) : undefined
  }
  const renewals = renewalViews(state)
  const next = nextRenewal(state)

  const ladderRows = []
  // Act II scouting (M5.5): distressed sites, greenfield and energized land, any region.
  if (inAct2Rules(state)) {
    const offers = state.siteOffers.filter((o) => o.category).length
    if (offers > 0)
      ladderRows.push(
        <ActionRow
          key="act2-offers"
          icon="scout"
          name={t('ui.plan.review_act2_offers', { n: offers })}
          onClick={() => open('offers')}
        />,
      )
    const a: Action = { type: 'SCOUT_SITES_ACT2' }
    ladderRows.push(
      <ActionRow
        key="act2-scout"
        icon="scout"
        name={t(offers > 0 ? 'ui.plan.scout_act2_again' : 'ui.plan.scout_act2')}
        bandwidth={BANDWIDTH_COST.scout}
        bandwidthLeft={left}
        disabledReason={reason(a)}
        onClick={() => act(a)}
      />,
    )
  }
  for (const r of siteLadder(state).slice(1)) {
    if (r.status === 'owned' || r.status === 'building') continue
    const name = { tier: tierName(r.tier), cap: fmt.power(r.capacityKw) }
    if (r.status === 'build') {
      const a: Action = { type: 'BUILD_SITE', tier: r.tier }
      ladderRows.push(
        <ActionRow
          key={r.tier}
          icon={tierIcon(r.tier)}
          name={t('ui.plan.build', name)}
          bandwidth={BANDWIDTH_COST.build}
          bandwidthLeft={left}
          price={fmt.money(r.capexUsd)}
          disabledReason={reason(a)}
          onClick={() => act(a)}
        />,
      )
    } else if (r.status === 'scout') {
      const offers = state.siteOffers.filter((o) => o.tier === r.tier).length
      if (offers > 0) {
        ladderRows.push(
          <ActionRow
            key={`${r.tier}-offers`}
            icon={tierIcon(r.tier)}
            name={t('ui.plan.review_offers', {
              n: offers,
              tier: tierName(r.tier),
            })}
            onClick={() => open('offers')}
          />,
        )
      }
      const a: Action = { type: 'SCOUT_SITES', tier: r.tier }
      ladderRows.push(
        <ActionRow
          key={r.tier}
          icon="scout"
          name={t(offers > 0 ? 'ui.plan.scout_again' : 'ui.plan.scout', name)}
          bandwidth={BANDWIDTH_COST.scout}
          bandwidthLeft={left}
          price={t('ui.plan.about', { value: fmt.money(r.capexUsd) })}
          disabledReason={reason(a)}
          onClick={() => act(a)}
        />,
      )
    } else {
      ladderRows.push(
        <ActionRow
          key={r.tier}
          icon={tierIcon(r.tier)}
          name={t('ui.plan.build', name)}
          locked={
            r.opensIn
              ? t('ui.locked.opens', { quarter: fmt.quarter(r.opensIn) })
              : t('ui.locked.needs', { tier: tierName(r.needsTier ?? '') })
          }
        />,
      )
      break // one locked rung is enough to show what's next
    }
  }

  return (
    <div class="panel p" style={{ gap: 0 }}>
      <div class="row-between">
        <h2 class="panel-title">{t('ui.plan.todo')}</h2>
        <span class="num-s muted">
          {t('ui.plan.bandwidth_left', { n: left })}
        </span>
      </div>

      <div class="label group">{t('ui.plan.group.operations')}</div>
      {state.auction && <AuctionRow state={state} act={act} open={open} />}
      <ActionRow
        icon="buy"
        name={t('ui.plan.buy_machines')}
        price={
          Number.isFinite(cheapest)
            ? t('ui.plan.from', { value: fmt.money(cheapest) })
            : ''
        }
        onClick={() => open('buy')}
      />
      <FixAllRow state={state} act={act} />
      {state.machines.length > 0 ? (
        <ActionRow
          icon={broken > 0 ? 'failure' : 'sell'}
          name={
            broken > 0
              ? t('ui.plan.fleet_broken', { n: broken })
              : t('ui.plan.fleet')
          }
          onClick={() => open('fleet')}
        />
      ) : (
        <ActionRow
          icon="sell"
          name={t('ui.plan.fleet')}
          locked={t('ui.locked.no_machines')}
        />
      )}

      {treasuryValue(state) > 0 ? (
        <ActionRow
          icon="treasury"
          name={t('ui.plan.sell_treasury')}
          bandwidth={SELL_TREASURY_BANDWIDTH}
          bandwidthLeft={left}
          price={t('ui.plan.worth', { value: fmt.money(treasuryValue(state)) })}
          disabledReason={
            left < SELL_TREASURY_BANDWIDTH
              ? say({
                  key: 'error.no_bandwidth',
                  params: { needed: SELL_TREASURY_BANDWIDTH, have: left },
                })
              : undefined
          }
          onClick={() => open('sell_coins')}
        />
      ) : (
        <ActionRow
          icon="treasury"
          name={t('ui.plan.sell_treasury')}
          locked={t('ui.locked.treasury_empty')}
        />
      )}

      <div class="label group">{t('ui.plan.group.sites')}</div>
      {ladderRows}
      {inAct2Rules(state) && <HostingRow state={state} open={open} />}
      {inAct2Rules(state) && <FleetRow state={state} act={act} />}
      {phaseViews(state).flatMap((p) => {
        if (!p.next) return []
        const plain: Action = { type: 'BUILD_PHASE', siteId: p.site.id }
        const loan: Action = {
          type: 'BUILD_PHASE',
          siteId: p.site.id,
          financed: true,
        }
        const name = t('ui.plan.phase', {
          tier: tierName(p.site.tier),
          n: p.next.n,
          of: p.next.of,
          kw: fmt.power(p.next.kw),
        })
        return [
          <ActionRow
            key={`phase-${p.site.id}`}
            icon="texas-site"
            name={name}
            bandwidth={1}
            bandwidthLeft={left}
            price={t('ui.plan.minus', { value: fmt.money(p.next.costUsd) })}
            disabledReason={reason(plain)}
            onClick={() => act(plain)}
          />,
          <ActionRow
            key={`phase-loan-${p.site.id}`}
            icon="loan"
            name={t('ui.plan.phase_loan', { name })}
            bandwidth={1}
            bandwidthLeft={left}
            price={t('ui.plan.minus', {
              value: fmt.money(p.next.costUsd - p.next.loanUsd),
            })}
            disabledReason={reason(loan)}
            onClick={() => act(loan)}
          />,
        ]
      })}
      {transformerViews(state).map((u) =>
        u.readyQuarter !== undefined ? (
          <ActionRow
            key={`transformer-${u.site.id}`}
            icon="power"
            name={t('ui.plan.transformer', { tier: tierName(u.site.tier) })}
            locked={t('ui.locked.transformer_underway', {
              quarter: fmt.quarter(quarterName(u.readyQuarter)),
            })}
          />
        ) : (
          <ActionRow
            key={`transformer-${u.site.id}`}
            icon="power"
            name={t('ui.plan.transformer', { tier: tierName(u.site.tier) })}
            bandwidth={u.bandwidth}
            bandwidthLeft={left}
            price={t('ui.plan.minus', { value: fmt.money(u.costUsd) })}
            disabledReason={reason({
              type: 'UPGRADE_TRANSFORMER',
              siteId: u.site.id,
            })}
            onClick={() =>
              act({ type: 'UPGRADE_TRANSFORMER', siteId: u.site.id })
            }
          />
        ),
      )}
      {siteViews(state).map(
        (sv) =>
          sv.leaving && (
            <ActionRow
              key={`leave-${sv.site.id}`}
              icon="close"
              name={t('ui.plan.leave', { tier: tierName(sv.site.tier) })}
              price={t('ui.plan.leave_price', {
                value: fmt.money(sv.leaving.penaltyUsd),
              })}
              disabledReason={reason({
                type: 'LEAVE_SITE',
                siteId: sv.site.id,
              })}
              onClick={() => open(`leave:${sv.site.id}`)}
            />
          ),
      )}
      {renewals.map((r) => (
        <ActionRow
          key={`renew-${r.site.id}`}
          icon="negotiate"
          name={t(
            state.negotiation?.siteId === r.site.id
              ? 'ui.plan.negotiating'
              : 'ui.plan.renewal',
            { tier: tierName(r.site.tier) },
          )}
          price={t('ui.plan.renewal_price', {
            price: fmt.cents(
              state.negotiation?.siteId === r.site.id
                ? state.negotiation.offerUsdKwh
                : r.options.find((o) => o.type === r.current.type)!
                    .openingUsdKwh,
            ),
          })}
          onClick={() => open(`renew:${r.site.id}`)}
        />
      ))}
      {renewals.length === 0 && (
        <ActionRow
          icon="negotiate"
          name={t('ui.plan.negotiate')}
          locked={
            next
              ? t('ui.locked.next_renewal', {
                  tier: tierName(next.tier),
                  quarter: fmt.quarter(next.quarter),
                })
              : t('ui.locked.no_contracts')
          }
        />
      )}

      <div class="label group">{t('ui.plan.group.capital')}</div>
      <BridgePayment state={state} />
      <Runway state={state} />
      <RaiseRow state={state} act={act} open={open} round="friends_family" />
      <EquipmentLoanRow state={state} act={act} open={open} />
      <ConstructionLoanRow state={state} act={act} />
      <CryptoLoanRow state={state} act={act} open={open} />
      <RaiseRow state={state} act={act} open={open} round="seed" />
      <RaiseRow state={state} act={act} open={open} round="series_a" />
      <RaiseRow state={state} act={act} open={open} round="ipo_spac" />

      <div class="label group">{t('ui.plan.group.people')}</div>
      <ActionRow
        icon="hire"
        name={t('ui.plan.hire_staff', {
          n: hireViews(state).filter((h) => h.hired).length,
          total: hireViews(state).length,
        })}
        bandwidth={hireViews(state)[0].bandwidth}
        bandwidthLeft={left}
        price={t('ui.plan.salaries', {
          value: fmt.money(
            hireViews(state)
              .filter((h) => h.hired)
              .reduce((sum, h) => sum + h.salaryUsdQ, 0),
          ),
        })}
        onClick={() => open('hires')}
      />
      <ActionRow
        icon="outreach"
        name={t('ui.plan.neighbours')}
        bandwidth={communityView(state).outreachBandwidth}
        bandwidthLeft={left}
        price={t('ui.plan.hottest', {
          tier: tierName(topHeat(state).tier),
          heat: Math.round(topHeat(state).heat),
        })}
        onClick={() => open('community')}
      />
      <ActionRow
        icon="outreach"
        name={t('ui.plan.mitigation')}
        price={t('ui.plan.from', {
          value: fmt.money(
            Math.min(...communityView(state).sites.map((x) => x.mitigationUsd)),
          ),
        })}
        onClick={() => open('community')}
      />

      <div class="label group">{t('ui.plan.group.intel')}</div>
      {/* Act III reads the market through Signals instead (M13.2). */}
      {!inActIII(state) && <ReadMarketRow state={state} act={act} />}
      {!state.auction && <AuctionRow state={state} act={act} open={open} />}
    </div>
  )
}

/** Read the market: 1 Bandwidth (0 with the Trader), once per quarter. */
/** Act II: rent free energized power to other miners (scope 0.2 §2.4). */
function HostingRow({
  state,
  open,
}: {
  state: GameState
  open: (o: Open) => void
}) {
  const v = hostingView(state)
  const free = v.sites.reduce((kw, x) => kw + x.freeKw, 0)
  const rate = v.sites[0]?.rateUsdKwh
  return (
    <ActionRow
      icon="power"
      name={t('ui.plan.hosting')}
      bandwidth={free > 0 ? v.bandwidth : undefined}
      bandwidthLeft={state.bandwidth}
      price={
        free > 0 && rate !== undefined
          ? t('ui.plan.hosting_price', {
              cost: fmt.money(v.sites[0].costPerMwUsd),
              rate: fmt.cents(rate),
            })
          : v.contracts.length > 0
            ? undefined
            : t('ui.plan.hosting_none')
      }
      onClick={() => open('hosting')}
    />
  )
}

/**
 * "Fix all (N machines · $X)" (M6.1, both acts): whenever a machine is broken. Short of cash, it
 * stays visible but disabled, with the reason as its subtitle (no partial repair).
 */
function FixAllRow({ state, act }: ScreenProps) {
  const v = repairAllView(state)
  if (!v) return null
  const short = v.costUsd > v.cashUsd
  return (
    <ActionRow
      icon="failure"
      name={t('ui.fleet.fix_all', {
        count: v.units,
        cost: fmt.money(v.costUsd),
      })}
      price={
        short
          ? t('ui.fleet.fix_all_short', {
              cost: fmt.money(v.costUsd),
              cash: fmt.money(v.cashUsd),
            })
          : undefined
      }
      disabledReason={v.blocker ? say(v.blocker) : undefined}
      onClick={() => act({ type: 'REPAIR_ALL' })}
    />
  )
}

/**
 * sell_gpus_keep_btc's one-off distressed fleet (2023Q1): buys into the site where the most of it
 * fits (mine). Hidden when it isn't on offer.
 */
function FleetRow({ state, act }: ScreenProps) {
  const v = fleetOfferView(state)
  if (!v) return null
  const best = [...v.sites].sort((a, b) => b.units - a.units)[0]
  if (!best) return null
  return (
    <ActionRow
      icon="asic"
      name={t('ui.plan.fleet', {
        count: best.units,
        model: machineName(v.model),
        tier: tierName(best.tier),
      })}
      bandwidth={v.bandwidth}
      bandwidthLeft={state.bandwidth}
      price={t('ui.plan.fleet_price', {
        cost: fmt.money(best.costUsd),
        pct: fmt.pct(v.unitUsd / v.newUnitUsd),
      })}
      disabledReason={best.blocker ? say(best.blocker) : undefined}
      onClick={() => act({ type: 'BUY_DISTRESSED_FLEET', siteId: best.siteId })}
    />
  )
}

function ReadMarketRow({ state, act }: ScreenProps) {
  const v = marketReadView(state)
  if (v.read) {
    return (
      <ActionRow
        icon="read-market"
        name={t('ui.plan.read_market')}
        locked={t('ui.locked.read_done')}
      />
    )
  }
  return (
    <ActionRow
      icon="read-market"
      name={t('ui.plan.read_market')}
      bandwidth={v.bandwidth}
      bandwidthLeft={state.bandwidth}
      price={t('ui.plan.read_market_price')}
      disabledReason={v.blocked ? say(v.blocked) : undefined}
      onClick={() => act({ type: 'READ_MARKET' })}
    />
  )
}

/** This quarter's read, or what reading the market would give. Shared with the Live screen. */
export function MarketReadText({ state }: { state: GameState }) {
  const v = marketReadView(state)
  if (!v.read) {
    return (
      <span class="muted">
        {t('ui.signals.read_market', {
          bw: v.bandwidth,
          up: fmt.pct(v.upThreshold),
        })}
      </span>
    )
  }
  const dir = (coin: 'BTC' | 'ETH') =>
    t('ui.read.coin', {
      coin,
      dir: tDynamic(`read.${v.read![coin]}`, v.read![coin]),
    })
  return (
    <span>
      {t('ui.read.result', {
        btc: dir('BTC'),
        eth: dir('ETH'),
        pct: fmt.pct(v.upThreshold),
      })}{' '}
      <span class="muted">
        {tDynamic(`read_flavour.${v.read.BTC}`, '')}{' '}
        {t('ui.read.accuracy', { pct: fmt.pct(v.accuracy) })}
      </span>
    </span>
  )
}

/** Distressed auction: a lot to bid on this quarter (opens a dialog), or when the next one can come. */
function AuctionRow({
  state,
  open,
}: ScreenProps & { open: (o: Open) => void }) {
  const v = auctionView(state)
  if (!v.lot) {
    return (
      <ActionRow
        icon="bid"
        name={t('ui.plan.auction')}
        locked={
          v.inWindow
            ? t('ui.locked.no_lot')
            : v.nextWindow
              ? t('ui.locked.next_auctions', {
                  quarter: fmt.quarter(v.nextWindow),
                })
              : t('ui.locked.no_more_auctions')
        }
      />
    )
  }
  // Open unless Bandwidth is short: the dialog explains space and cash problems.
  const why =
    state.bandwidth < v.bandwidth
      ? say({
          key: 'error.no_bandwidth',
          params: { needed: v.bandwidth, have: state.bandwidth },
        })
      : undefined
  return (
    <ActionRow
      icon="bid"
      name={t('ui.plan.auction_lot', {
        count: v.lot.count,
        model: machineName(v.lot.model),
      })}
      bandwidth={v.bandwidth}
      bandwidthLeft={state.bandwidth}
      price={t('ui.plan.min_bid', { value: fmt.money(v.lot.reserveUsd) })}
      disabledReason={why}
      onClick={() => open('auction')}
    />
  )
}

/** Texas construction loans: shown only while you owe on one (they're taken with Texas phases). */
function ConstructionLoanRow({ state, act }: ScreenProps) {
  const v = constructionLoanView(state)
  if (v.owedUsd <= 0) return null
  const a: Action = { type: 'REPAY_CONSTRUCTION_LOAN' }
  const why = whyNot(state, a)
  return (
    <ActionRow
      icon="loan"
      name={t('ui.plan.repay_construction', {
        left: fmt.money(v.owedUsd),
      })}
      price={t('ui.plan.minus', { value: fmt.money(v.owedUsd) })}
      disabledReason={why ? say(why) : undefined}
      onClick={() => act(a)}
    />
  )
}

/** Equipment loan: borrow (opens a dialog), or repay the one you have. */
function EquipmentLoanRow({
  state,
  act,
  open,
}: ScreenProps & { open: (o: Open) => void }) {
  const v = equipmentLoanView(state)
  if (v.loan) {
    const a: Action = { type: 'REPAY_LOAN' }
    const why = whyNot(state, a)
    return (
      <ActionRow
        icon="loan"
        name={t('ui.plan.repay_loan', { left: fmt.money(v.loan.balanceUsd) })}
        price={t('ui.plan.minus', { value: fmt.money(v.loan.balanceUsd) })}
        disabledReason={why ? say(why) : undefined}
        onClick={() => act(a)}
      />
    )
  }
  if (!v.terms) {
    return (
      <ActionRow
        icon="loan"
        name={t('ui.plan.equipment_loan')}
        locked={t('ui.locked.no_lenders', {
          quarter: fmt.quarter(v.offeredUntil),
        })}
      />
    )
  }
  const why = whyNot(state, {
    type: 'TAKE_LOAN',
    amountUsd: Math.max(1, v.maxUsd),
  })
  return (
    <ActionRow
      icon="loan"
      name={t('ui.plan.equipment_loan_offer', {
        ltv: fmt.pct(v.terms.ltv),
        apr: fmt.pct(v.terms.apr),
      })}
      bandwidth={v.bandwidth}
      bandwidthLeft={state.bandwidth}
      price={t('ui.plan.up_to', { value: fmt.money(v.maxUsd) })}
      disabledReason={why ? say(why) : undefined}
      onClick={() => open('loan')}
    />
  )
}

/** Crypto-backed loan: borrow against treasury coins (opens a dialog), or repay the one you have. */
function CryptoLoanRow({
  state,
  act,
  open,
}: ScreenProps & { open: (o: Open) => void }) {
  const v = cryptoLoanView(state)
  if (v.loan) {
    const a: Action = { type: 'REPAY_CRYPTO_LOAN' }
    const why = whyNot(state, a)
    return (
      <ActionRow
        icon="loan"
        name={t('ui.plan.repay_crypto_loan', {
          left: fmt.money(v.loan.balanceUsd),
          ltv: fmt.pct(v.ltvNow),
        })}
        price={t('ui.plan.minus', { value: fmt.money(v.loan.balanceUsd) })}
        disabledReason={why ? say(why) : undefined}
        onClick={() => act(a)}
      />
    )
  }
  const name = t('ui.plan.crypto_loan_offer', {
    ltv: fmt.pct(v.terms.ltvMax),
    apr: fmt.pct(v.terms.apr),
  })
  if (!v.offered) {
    const [from, to] = v.terms.available
    return (
      <ActionRow
        icon="loan"
        name={name}
        locked={t('ui.locked.crypto_window', {
          from: fmt.quarter(from),
          to: fmt.quarter(to),
        })}
      />
    )
  }
  const best = Math.max(v.maxUsd('BTC'), v.maxUsd('ETH'))
  if (best < 1) {
    return (
      <ActionRow icon="loan" name={name} locked={t('ui.locked.no_coins')} />
    )
  }
  return (
    <ActionRow
      icon="loan"
      name={name}
      bandwidth={v.bandwidth}
      bandwidthLeft={state.bandwidth}
      price={t('ui.plan.up_to', { value: fmt.money(best) })}
      disabledReason={
        state.bandwidth < v.bandwidth
          ? say({
              key: 'error.no_bandwidth',
              params: { needed: v.bandwidth, have: state.bandwidth },
            })
          : undefined
      }
      onClick={() => open('cloan')}
    />
  )
}

const RAISE_LABEL = {
  friends_family: 'ui.plan.raise_ff_offer',
  seed: 'ui.plan.raise_seed_offer',
  series_a: 'ui.plan.raise_series_a_offer',
  ipo_spac: 'ui.plan.raise_ipo_offer',
} as const

const RAISE_ICON = {
  friends_family: 'pitch',
  seed: 'pitch',
  series_a: 'pitch',
  ipo_spac: 'ipo',
} as const

/**
 * A funding round, once, inside its window. Seed and Series A open the pitch dialog (take the
 * offer or pitch for a higher valuation); the others are one-click fixed offers.
 */
function RaiseRow({
  state,
  act,
  open,
  round: id,
}: ScreenProps & {
  open: (o: Open) => void
  round: keyof typeof RAISE_LABEL
}) {
  const round = fundingRound(state, id)
  const name = t(RAISE_LABEL[id], {
    amount: fmt.money(round.amountUsd),
    share: fmt.pct(round.dilution),
  })
  if (round.pitching && state.pitch) {
    return (
      <ActionRow
        icon={RAISE_ICON[id]}
        name={t('ui.plan.pitching', {
          round: id,
          value: fmt.money(state.pitch.offerUsd),
        })}
        price={t('ui.plan.plus', { value: fmt.money(round.amountUsd) })}
        onClick={() => open(`pitch:${id}`)}
      />
    )
  }
  if (round.status === 'done') {
    return (
      <ActionRow
        icon={RAISE_ICON[id]}
        name={name}
        locked={t('ui.locked.raised')}
      />
    )
  }
  if (round.status !== 'open') {
    const when =
      round.status === 'closed'
        ? t('ui.locked.closed', { quarter: fmt.quarter(round.to) })
        : round.status === 'locked'
          ? t('ui.locked.pitch_reopens', {
              quarter: fmt.quarter(round.reopens),
            })
          : round.status === 'lost'
            ? t('ui.locked.pitch_lost')
            : t('ui.locked.opens', { quarter: fmt.quarter(round.from) })
    return <ActionRow icon={RAISE_ICON[id]} name={name} locked={when} />
  }
  const a: Action = { type: 'RAISE', round: round.id }
  const why = whyNot(state, a)
  const whyPitch = round.pitchable
    ? whyNot(state, { type: 'PITCH_START', round: round.id })
    : why
  // Pitchable rounds open the dialog if either choice is possible.
  const blocked = round.pitchable ? why && whyPitch : why
  return (
    <ActionRow
      icon={RAISE_ICON[id]}
      name={name}
      bandwidth={round.bandwidth}
      bandwidthLeft={state.bandwidth}
      price={t('ui.plan.plus', { value: fmt.money(round.amountUsd) })}
      disabledReason={blocked ? say(blocked) : undefined}
      onClick={() => (round.pitchable ? open(`pitch:${id}`) : act(a))}
    />
  )
}

const Q1_TIPS = ['welcome', 'buy_rig', 'bandwidth', 'hodl'] as const
/** The first-quarter tips written for a $10K start, hidden after a prologue (P5.0, P7). */
const PROLOGUE_HIDDEN_TIPS: readonly string[] = ['welcome', 'buy_rig']

function SignalsPanel({ state, news }: { state: GameState; news: string[] }) {
  const q = quarterName(state.quarter)
  return (
    <div class="panel p signals">
      <h2 class="panel-title">{t('ui.signals.title')}</h2>
      {news.map((text, i) => (
        <div class="signal" key={`n${i}`}>
          <Icon name="news" />
          <div>
            <span class="label">
              {t('ui.signals.headline', { quarter: fmt.quarter(q) })}
            </span>
            {text}
          </div>
        </div>
      ))}
      {/* A prologue start (P5.0, P7): its own welcome, with what it brought; no $10K-start tips. */}
      {state.quarter === 0 && state.prologueCarry && (
        <div class="signal">
          <Icon name="info" />
          <div>
            <span class="label">{t('ui.signals.tip')}</span>
            {t('ui.tip.q1_welcome_prologue', {
              cashUsd: state.cash,
              machines: state.machines.reduce((n, l) => n + l.count, 0),
              btc: fmt.crypto(state.treasury.BTC, 'BTC'),
            })}
          </div>
        </div>
      )}
      {state.quarter === 0 &&
        Q1_TIPS.filter(
          (k) =>
            hasText(`tooltip.q1.${k}`) &&
            !(state.prologueCarry && PROLOGUE_HIDDEN_TIPS.includes(k)),
        ).map((k) => (
          <div class="signal" key={k}>
            <Icon name="info" />
            <div>
              <span class="label">{t('ui.signals.tip')}</span>
              {tDynamic(`tooltip.q1.${k}`, '')}
            </div>
          </div>
        ))}
      {/* Act II's first two quarters (2022Q4–2023Q1): what a megawatt does now, and projects. */}
      {inActII(state) && actTurn(state).turn <= 2 && (
        <>
          <Tip id="mw_uses" />
          <Tip id="projects" />
        </>
      )}
      <div class="signal">
        <Icon name="read-market" />
        <div>
          <span class="label">{t('ui.signals.more')}</span>
          <MarketReadText state={state} />
        </div>
      </div>
    </div>
  )
}
