// The left-nav sections (wireframes §3–4, People, League, Log): full-width views of the Plan
// phase. They reuse the dashboard's selectors and dialogs; no game rules here.
import { useState } from 'preact/hooks'
import { t, tDynamic } from '../../i18n/t.ts'
import {
  chapterReport,
  cryptoLoanView,
  equipmentLoanView,
  fundingRound,
  lotViews,
  machineMarket,
  quarterName,
  regionsView,
  siteLadder,
  upcomingRivalsView,
  valuationBreakdown,
} from '../../sim/selectors.ts'
import { inAct2Rules, inAct3Rules, type GameState } from '../../sim/state.ts'
import { Icon, Tip } from '../components/basics.tsx'
import { SiteName } from '../components/siteName.tsx'
import { fmt } from '../format.ts'
import {
  machineIcon,
  machineName,
  rivalName,
  say,
  tierIcon,
  tierName,
} from '../names.ts'
import {
  BuyDialog,
  CryptoLoanDialog,
  FleetDialog,
  HiresTable,
  LoanDialog,
  OffersDialog,
} from './dialogs.tsx'
import { FleetPanel, type ScreenProps } from './Plan.tsx'
import { CapitalAct2 } from './CapitalAct2.tsx'
import { ProjectsSection } from './Projects.tsx'
import { Act3Panel } from '../components/act3Lazy.tsx'
import { Act4Panel } from '../components/act4Lazy.tsx'
import { League } from './Report.tsx'

export type Section =
  | 'dashboard'
  | 'projects'
  | 'orbit'
  | 'moon'
  | 'contracts'
  | 'government'
  | 'fleet'
  | 'capital'
  | 'people'
  | 'league'
  | 'log'

export function SectionView(props: ScreenProps & { section: Section }) {
  switch (props.section) {
    case 'projects':
      return <ProjectsSection {...props} />
    case 'orbit':
      return <Act4Panel name="OrbitSection" {...props} />
    case 'moon':
      return <Act4Panel name="MoonSection" {...props} />
    case 'contracts':
      return <Act3Panel name="ContractsSection" {...props} />
    case 'government':
      return <Act3Panel name="GovernmentSection" {...props} />
    case 'fleet':
      return <FleetSection {...props} />
    case 'capital':
      return inAct2Rules(props.state) ? (
        <CapitalAct2 {...props} />
      ) : (
        <CapitalSection {...props} />
      )
    case 'people':
      return <PeopleSection {...props} />
    case 'league':
      return <LeagueSection state={props.state} />
    case 'log':
      return <LogSection state={props.state} />
    default:
      return null
  }
}

// ---------- Fleet & Sites ----------

type FleetOpen = 'buy' | 'fleet' | 'offers' | null

function FleetSection({ state, act }: ScreenProps) {
  const [open, setOpen] = useState<FleetOpen>(null)
  const lots = lotViews(state)
  const close = () => setOpen(null)
  return (
    <div class="section">
      {/* Act III (M16.5, A3-07): halls and rack density, across the section */}
      {inAct3Rules(state) && <Act3Panel name="RacksPanel" state={state} act={act} />}
      <div class="col">
        <FleetPanel state={state} breakdown />
        {inAct3Rules(state) && (
          <Act3Panel name="IdleRigsPanel" state={state} act={act} />
        )}
        {inAct2Rules(state) && state.phase === 'plan' && (
          <RegionPanel state={state} />
        )}
        <div class="panel p">
          <h2 class="panel-title">{t('ui.section.ladder')}</h2>
          <div class="ladder">
            {siteLadder(state).map((r) => (
              <div class={`rung ${r.status}`} key={r.tier}>
                <Icon name={tierIcon(r.tier)} />
                <strong>{tierName(r.tier)}</strong>
                <span class="num-s">{fmt.power(r.capacityKw)}</span>
                <span class="num-s muted">
                  {tDynamic(`ui.section.rung.${r.status}`, r.status, {
                    capex: fmt.money(r.capexUsd),
                    quarters: r.buildQuarters,
                    opens: r.opensIn ? fmt.quarter(r.opensIn) : '',
                    needs: r.needsTier ? tierName(r.needsTier) : '',
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div class="col">
        <div class="panel p">
          <div class="row-between">
            <h2 class="panel-title">{t('ui.section.machines')}</h2>
            <span style={{ display: 'inline-flex', gap: '8px' }}>
              <button
                type="button"
                class="btn"
                onClick={() => setOpen('fleet')}
              >
                {t('ui.section.repair_sell')}
              </button>
              {state.siteOffers.length > 0 && (
                <button
                  type="button"
                  class="btn"
                  onClick={() => setOpen('offers')}
                >
                  {t('ui.section.offers', { n: state.siteOffers.length })}
                </button>
              )}
              <button
                type="button"
                class="btn btn-primary"
                onClick={() => setOpen('buy')}
              >
                {t('ui.section.buy')}
              </button>
            </span>
          </div>
          {lots.length === 0 ? (
            <p class="num-s muted">{t('ui.section.no_machines')}</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>{t('ui.section.col.model')}</th>
                  <th>{t('ui.section.col.site')}</th>
                  <th class="r">{t('ui.section.col.units')}</th>
                  <th class="r">{t('ui.section.col.hash')}</th>
                  <th class="r">{t('ui.section.col.power')}</th>
                  <th class="r">{t('ui.section.col.profit')}</th>
                  <th>{t('ui.section.col.status')}</th>
                </tr>
              </thead>
              <tbody>
                {lots.map((v) => {
                  const site = state.sites.find((s) => s.id === v.lot.siteId)!
                  return (
                    <tr key={v.lot.id}>
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            gap: '6px',
                            alignItems: 'center',
                          }}
                        >
                          <Icon name={machineIcon(v.coin)} size={16} />
                          {machineName(v.lot.model)}
                        </span>
                        <span class="num-s muted">
                          {' '}
                          {tDynamic(
                            `condition.${v.lot.condition}`,
                            v.lot.condition,
                          )}
                        </span>
                      </td>
                      <td>
                        <SiteName state={state} site={site} />
                      </td>
                      <td class="num r">
                        {v.lot.failed > 0
                          ? t('ui.section.units_broken', {
                              n: v.lot.count,
                              broken: v.lot.failed,
                            })
                          : v.lot.count}
                      </td>
                      <td class="num r">
                        {fmt.hash(
                          v.hashrateEach,
                          v.coin === 'ETH' ? 'MH' : 'TH',
                        )}
                      </td>
                      <td class="num r">{fmt.power(v.powerKwEach)}</td>
                      <td
                        class={`num r ${v.dailyProfitEachUsd < 0 ? 'loss' : ''}`}
                      >
                        {t('ui.section.per_day', {
                          value: fmt.signed(v.dailyProfitEachUsd),
                        })}
                      </td>
                      <td class="num-s">
                        {tDynamic(`ui.section.status.${v.status}`, v.status, {
                          quarter: fmt.quarter(v.earnsFrom),
                        })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
        <div class="panel p">
          <h2 class="panel-title">{t('ui.section.market')}</h2>
          <table>
            <thead>
              <tr>
                <th>{t('ui.section.col.model')}</th>
                <th class="r">{t('ui.section.col.new')}</th>
                <th class="r">{t('ui.section.col.used')}</th>
                <th class="r">{t('ui.section.col.profit')}</th>
              </tr>
            </thead>
            <tbody>
              {machineMarket(state).map((m) => (
                <tr key={m.id}>
                  <td>{machineName(m.id)}</td>
                  <td class="num r">
                    {m.newPriceUsd === undefined
                      ? '—'
                      : `${fmt.money(m.newPriceUsd)} · ${fmt.quarter(m.earnsFromNew ?? '')}`}
                  </td>
                  <td class="num r">
                    {m.usedPriceUsd === undefined
                      ? '—'
                      : `${fmt.money(m.usedPriceUsd)} · ${fmt.quarter(m.earnsFromUsed ?? '')}`}
                  </td>
                  <td class={`num r ${m.dailyProfitUsd < 0 ? 'loss' : ''}`}>
                    {m.isOut
                      ? t('ui.section.per_day', {
                          value: fmt.signed(m.dailyProfitUsd),
                        })
                      : t('ui.section.not_out', {
                          quarter: fmt.quarter(m.availableFrom),
                        })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p class="num-s muted" style={{ margin: 0 }}>
            {t('ui.section.market_note')}
          </p>
        </div>
      </div>
      {open === 'buy' && <BuyDialog state={state} act={act} onClose={close} />}
      {open === 'fleet' && (
        <FleetDialog state={state} act={act} onClose={close} />
      )}
      {open === 'offers' && (
        <OffersDialog state={state} act={act} onClose={close} />
      )}
    </div>
  )
}

/** The region panel (A2-06): one region at a time, your biggest site's first. */
function RegionPanel({ state }: { state: GameState }) {
  const v = regionsView(state)
  const [pick, setPick] = useState<string>(v.home)
  const r = v.regions.find((x) => x.id === pick) ?? v.regions[0]
  const regionName = (id: string) => tDynamic(`ui.region.${id}`, id)
  const policyLine = (p: (typeof r.policies)[number]) => (
    <li key={p.id} class={p.active ? '' : 'muted'}>
      <span class="num-s">{fmt.quarter(p.quarter)}</span>{' '}
      {tDynamic(`policy.${p.id}`, p.id)}
      {!p.hasEffect && (
        <span class="num-s muted"> · {t('ui.regions.news_only')}</span>
      )}
    </li>
  )
  return (
    <div class="panel p">
      <div class="row-between">
        <h2 class="panel-title">{t('ui.regions.title')}</h2>
        <select
          value={r.id}
          aria-label={t('ui.regions.title')}
          onChange={(e) => setPick((e.target as HTMLSelectElement).value)}
        >
          {v.regions.map((x) => (
            <option key={x.id} value={x.id}>
              {regionName(x.id)}
              {x.siteCount > 0 ? ` · ${fmt.power(x.energizedKw)}` : ''}
            </option>
          ))}
        </select>
      </div>
      <Tip id="regions" />
      <table>
        <tbody>
          <tr>
            <td>{t('ui.regions.power')}</td>
            <td class="num r">
              {t('ui.regions.power_value', {
                now: fmt.cents(r.powerUsdKwh),
                next: fmt.cents(r.powerNextYearUsdKwh),
              })}
            </td>
          </tr>
          <tr>
            <td>{t('ui.regions.queue')}</td>
            <td class="num r">
              {t('ui.regions.queue_value', {
                from: r.queueMonths[0],
                to: r.queueMonths[1],
              })}
              {r.extraQueueQuarters > 0 &&
                ` · ${t('ui.regions.queue_extra', { n: r.extraQueueQuarters })}`}
            </td>
          </tr>
          <tr>
            <td>{t('ui.regions.heat')}</td>
            <td class="num r">×{r.heatMult}</td>
          </tr>
          <tr>
            <td>{t('ui.regions.anger_level')}</td>
            <td class={`num r${r.anger >= r.angerMoratoriumAt ? ' loss' : ''}`}>
              {t('ui.regions.anger_value', {
                anger: r.anger,
                heat: r.angerHeat,
                at: r.angerMoratoriumAt,
              })}
            </td>
          </tr>
          <tr>
            <td>{t('ui.regions.anger')}</td>
            <td class="num r">×{r.angerMult}</td>
          </tr>
          <tr>
            <td>{t('ui.regions.your_sites')}</td>
            <td class="num r">
              {r.siteCount === 0
                ? t('ui.regions.none')
                : t('ui.regions.sites_value', {
                    n: r.siteCount,
                    power: fmt.power(r.energizedKw),
                  })}
            </td>
          </tr>
        </tbody>
      </table>
      {r.gridUpgradesHalted && (
        <p class="num-s loss" style={{ margin: 0 }}>
          {t('ui.regions.halted')}
        </p>
      )}
      {r.moratorium && (
        <p class="num-s loss" style={{ margin: 0 }}>
          {t('ui.regions.moratorium')}
        </p>
      )}
      <div class="label">{t('ui.regions.policies')}</div>
      <ul class="num-s" style={{ margin: 0, paddingLeft: '18px' }}>
        {r.policies.map(policyLine)}
      </ul>
      <div class="label">{t('ui.regions.national')}</div>
      <ul class="num-s" style={{ margin: 0, paddingLeft: '18px' }}>
        {v.national.map(policyLine)}
      </ul>
    </div>
  )
}

// ---------- Capital ----------

const ROUNDS = ['friends_family', 'seed', 'series_a', 'ipo_spac'] as const

/** A gauge from 0 to 100% with marks (the crypto loan's LTV). */
function Gauge(props: {
  value: number
  marks: { at: number; danger?: boolean }[]
}) {
  const pct = Math.min(1, Math.max(0, props.value))
  return (
    <div class="meter gauge" role="img" aria-label={fmt.pct(props.value)}>
      <div
        class={`meter-fill ${props.value >= props.marks.at(-2)!.at ? 'g-heat-5' : props.value >= props.marks[0].at ? 'g-heat-3' : 'g-heat-1'}`}
        style={{ width: `${pct * 100}%` }}
      />
      {props.marks.map((m) => (
        <span
          key={m.at}
          class={`meter-mark${m.danger ? ' danger' : ''}`}
          style={{ left: `${m.at * 100}%` }}
        />
      ))}
    </div>
  )
}

function CapitalSection({ state, act }: ScreenProps) {
  const [open, setOpen] = useState<'loan' | 'cloan' | null>(null)
  const eq = equipmentLoanView(state)
  const cl = cryptoLoanView(state)
  const v = valuationBreakdown(state)
  const close = () => setOpen(null)
  return (
    <div class="section">
      <div class="col">
        <div class="panel p">
          <h2 class="panel-title">{t('ui.section.ladder_funding')}</h2>
          <div class="ladder">
            <div class="rung owned">
              <Icon name="cash" />
              <strong>{tDynamic('round.savings', 'savings')}</strong>
              <span class="num-s muted">{t('ui.section.round.done')}</span>
            </div>
            {ROUNDS.map((id) => {
              const r = fundingRound(state, id)
              return (
                <div
                  class={`rung ${r.status === 'done' ? 'owned' : r.status === 'open' ? 'build' : 'locked'}`}
                  key={id}
                >
                  <Icon name={id === 'ipo_spac' ? 'ipo' : 'pitch'} />
                  <strong>{tDynamic(`round.${id}`, id)}</strong>
                  <span class="num-s">
                    {t('ui.section.round.terms', {
                      amount: fmt.money(r.amountUsd),
                      share: fmt.pct(r.dilution),
                    })}
                  </span>
                  <span class="num-s muted">
                    {tDynamic(`ui.section.round.${r.status}`, r.status, {
                      from: fmt.quarter(r.from),
                      to: fmt.quarter(r.to),
                      reopens: r.reopens ? fmt.quarter(r.reopens) : '',
                    })}
                  </span>
                  {r.requirement && (
                    <span class="num-s warn">{say(r.requirement)}</span>
                  )}
                </div>
              )
            })}
          </div>
          <p class="num-s muted" style={{ margin: 0 }}>
            {t('ui.section.raise_where')}
          </p>
        </div>
        <div class="panel p">
          <h2 class="panel-title">{t('ui.section.cap_table')}</h2>
          <div
            class="stake-bar"
            role="img"
            aria-label={fmt.pct(state.founderStake, 1)}
          >
            <div
              class="stake-you"
              style={{ width: `${state.founderStake * 100}%` }}
            >
              {t('ui.section.you_pct', { pct: fmt.pct(state.founderStake, 1) })}
            </div>
            <div class="stake-investors">
              {t('ui.section.investors_pct', {
                pct: fmt.pct(1 - state.founderStake, 1),
              })}
            </div>
          </div>
        </div>
        <div class="panel p">
          <h2 class="panel-title">{t('ui.section.valuation')}</h2>
          {v ? (
            <table>
              <tbody>
                <tr>
                  <td>
                    {t('ui.section.val.enterprise', {
                      ebitda: fmt.money(v.ebitdaUsd),
                      multiple: v.multiple,
                    })}
                  </td>
                  <td class="num r">{fmt.money(v.enterpriseUsd)}</td>
                </tr>
                <tr>
                  <td>{t('ui.section.val.cash')}</td>
                  <td class="num r">{fmt.money(v.cashUsd)}</td>
                </tr>
                <tr>
                  <td>{t('ui.section.val.treasury')}</td>
                  <td class="num r">{fmt.money(v.treasuryUsd)}</td>
                </tr>
                <tr>
                  <td>{t('ui.section.val.debt')}</td>
                  <td class="num r">{fmt.money(-v.debtUsd)}</td>
                </tr>
                <tr>
                  <td>
                    <strong>
                      {t('ui.section.val.total', {
                        quarter: fmt.quarter(v.quarter),
                      })}
                    </strong>
                  </td>
                  <td class="num r">
                    <strong>{fmt.money(v.valuationUsd)}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          ) : (
            <p class="num-s muted">{t('ui.section.val.none')}</p>
          )}
        </div>
      </div>
      <div class="col">
        <div class="panel p">
          <div class="row-between">
            <h2 class="panel-title">{t('ui.section.equipment_loan')}</h2>
            <button type="button" class="btn" onClick={() => setOpen('loan')}>
              {t('ui.section.manage')}
            </button>
          </div>
          {eq.loan ? (
            <p class="num-s" style={{ margin: 0 }}>
              {t('ui.section.eq_loan', {
                left: fmt.money(eq.loan.balanceUsd),
                apr: fmt.pct(eq.loan.apr, 1),
                weeks: eq.loan.weeksLeft,
              })}
            </p>
          ) : (
            <p class="num-s muted" style={{ margin: 0 }}>
              {eq.terms
                ? t('ui.section.eq_offer', {
                    max: fmt.money(eq.maxUsd),
                    ltv: fmt.pct(eq.terms.ltv),
                    apr: fmt.pct(eq.terms.apr),
                  })
                : t('ui.locked.no_lenders', {
                    quarter: fmt.quarter(eq.offeredUntil),
                  })}
            </p>
          )}
        </div>
        <div class="panel p">
          <div class="row-between">
            <h2 class="panel-title">{t('ui.section.crypto_loan')}</h2>
            <button type="button" class="btn" onClick={() => setOpen('cloan')}>
              {t('ui.section.manage')}
            </button>
          </div>
          {cl.loan ? (
            <>
              <p class="num-s" style={{ margin: 0 }}>
                {t('ui.section.cl_loan', {
                  balance: fmt.money(cl.loan.balanceUsd),
                  collateral: fmt.crypto(cl.loan.collateral, cl.loan.coin),
                  ltv: fmt.pct(cl.ltvNow),
                })}
              </p>
            </>
          ) : (
            <p class="num-s muted" style={{ margin: 0 }}>
              {t('ui.section.cl_none', { max: fmt.pct(cl.terms.ltvMax) })}
            </p>
          )}
          <Gauge
            value={cl.loan ? cl.ltvNow : 0}
            marks={[
              { at: cl.terms.ltvMax },
              { at: cl.terms.marginCallLtv, danger: true },
              { at: cl.terms.liquidationLtv, danger: true },
            ]}
          />
          <p class="num-s muted" style={{ margin: 0 }}>
            {t('ui.section.gauge_note', {
              max: fmt.pct(cl.terms.ltvMax),
              call: fmt.pct(cl.terms.marginCallLtv),
              liquidation: fmt.pct(cl.terms.liquidationLtv),
            })}
          </p>
        </div>
      </div>
      {open === 'loan' && (
        <LoanDialog state={state} act={act} onClose={close} />
      )}
      {open === 'cloan' && (
        <CryptoLoanDialog state={state} act={act} onClose={close} />
      )}
    </div>
  )
}

// ---------- People ----------

function PeopleSection({ state, act }: ScreenProps) {
  return (
    <div class="section single">
      <div class="panel p">
        <h2 class="panel-title">{t('ui.hires.title')}</h2>
        <HiresTable state={state} act={act} />
      </div>
    </div>
  )
}

// ---------- League ----------

function LeagueSection({ state }: { state: GameState }) {
  const last = state.reports.at(-1)
  const coming = upcomingRivalsView(state)
  return (
    <div class="section single">
      {last ? (
        <League state={state} r={last} />
      ) : (
        <div class="panel p">
          <p class="num-s muted">{t('ui.section.league_none')}</p>
        </div>
      )}
      {coming.length > 0 && (
        <div class="panel p">
          <h2 class="panel-title">{t('ui.section.coming')}</h2>
          {coming.map((r) => (
            <div key={r.id} class="num-s">
              {t('ui.section.joins', {
                rival: rivalName(r.id),
                quarter: fmt.quarter(r.quarter),
              })}
            </div>
          ))}
        </div>
      )}
      {last && (
        <p class="num-s muted" style={{ margin: 0 }}>
          {t('ui.section.peak_so_far', {
            value: fmt.money(chapterReport(state).peak?.valuationUsd ?? 0),
          })}
        </p>
      )}
    </div>
  )
}

// ---------- Log ----------

function LogSection({ state }: { state: GameState }) {
  const quarters = [...new Set(state.log.map((e) => e.quarter))].sort(
    (a, b) => b - a,
  )
  return (
    <div class="section single">
      <div class="panel p">
        <h2 class="panel-title">{t('ui.nav.log')}</h2>
        {quarters.length === 0 && (
          <p class="num-s muted">{t('ui.section.log_none')}</p>
        )}
        {quarters.map((q) => (
          <div key={q} class="log">
            <span class="label">{fmt.quarter(quarterName(q))}</span>
            {state.log
              .filter((e) => e.quarter === q)
              .map((e, i) => (
                <div key={i}>
                  {e.week ? (
                    <span class="num-s muted">
                      {t('ui.section.week', { week: e.week })}{' '}
                    </span>
                  ) : null}
                  {say(e)}
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  )
}
