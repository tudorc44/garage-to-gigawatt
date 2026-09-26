// Quarter report: headline tiles, cost per coin vs price, league table, notes.
import { t, type MessageKey } from '../../i18n/t.ts'
import {
  averagePrice,
  quarterName,
  siteViews,
  upcomingRivals,
} from '../../sim/selectors.ts'
import {
  leagueTable,
  yourRank,
  type RivalSnapshot,
} from '../../sim/systems/rivals.ts'
import type { Coin, GameState, QuarterReport } from '../../sim/state.ts'
import { CONTENT } from '../../content/index.ts'
import { fmt } from '../format.ts'
import { rivalCode, rivalName, say, tierName } from '../names.ts'
import type { ScreenProps } from './Plan.tsx'

const TURNS = 23

/** The coin that earned more this quarter (for "cost per coin"). */
function mainCoin(r: QuarterReport): Coin | null {
  const qi = CONTENT.quarters.indexOf(r.quarter)
  const value = (c: Coin) => r.coinsMined[c] * averagePrice(qi, c)
  if (value('BTC') === 0 && value('ETH') === 0) return null
  return value('ETH') >= value('BTC') ? 'ETH' : 'BTC'
}

/** "= flat vs 9" or "▲6 vs 9" (Heat is a plain number, not money). */
function heatChange(now: number, before: number): string {
  const d = Math.round(now) - Math.round(before)
  const start = String(Math.round(before))
  return d === 0
    ? t('ui.report.heat_flat', { start })
    : t('ui.report.heat_change', {
        delta: `${d > 0 ? '▲' : '▼'}${Math.abs(d)}`,
        start,
      })
}

function Tile(props: {
  label: string
  value: string
  sub?: string
  tone?: 'gain' | 'loss' | 'muted'
}) {
  return (
    <div class="panel tile">
      <span class="label">{props.label}</span>
      <span class="num-xl">{props.value}</span>
      {props.sub && (
        <span class={`num-s ${props.tone ?? 'muted'}`}>{props.sub}</span>
      )}
    </div>
  )
}

const toneOf = (v: number, invert = false) =>
  v === 0 ? 'muted' : v > 0 !== invert ? 'gain' : 'loss'

export function ReportScreen(props: ScreenProps & { onGameOver: () => void }) {
  const { state, act } = props
  const r = state.reports.at(-1)!
  const prev = state.reports.at(-2)
  const weeks = state.quarterStats.weeks
  const first = weeks[0]
  const last = weeks[weeks.length - 1]
  const coin = mainCoin(r)
  const cost = coin ? r.costPerCoinUsd[coin] : null
  const prevCost = coin && prev ? prev.costPerCoinUsd[coin] : null
  const isLast = state.quarter === CONTENT.quarters.length - 1
  const turn = state.quarter + 1

  return (
    <div class="screen">
      <div class="report">
        <div class="report-head">
          <div>
            <div class="label">
              {t('ui.report.label', { turn, turns: TURNS })}
            </div>
            <h1 class="screen-title">{fmt.quarter(r.quarter)}</h1>
            {first && last && (
              <div class="num-s muted">
                {`BTC ${fmt.money(last.btcUsd)} `}
                <span class={toneOf(last.btcUsd - first.btcUsd)}>
                  {fmt.delta(last.btcUsd / first.btcUsd - 1, 'pct', { dp: 1 })}
                </span>
                {` · ETH ${fmt.money(last.ethUsd)} `}
                <span class={toneOf(last.ethUsd - first.ethUsd)}>
                  {fmt.delta(last.ethUsd / first.ethUsd - 1, 'pct', { dp: 1 })}
                </span>
                {` · ${t('ui.top.vs', { date: fmt.date(first.date, false) })}`}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end' }}>
            {r.forcedSale && (
              <span class="tape">{t('ui.report.tape_forced')}</span>
            )}
            <div class="stat">
              <span class="label">{t('ui.report.stake')}</span>
              <span class="num-kpi">
                {t('ui.report.stake_value', {
                  stake: fmt.pct(r.founderStake),
                  value: fmt.money(r.valuationUsd * r.founderStake),
                })}
              </span>
            </div>
          </div>
        </div>

        <div class="tiles">
          <Tile
            label={t('ui.report.revenue')}
            value={fmt.money(r.revenueUsd)}
            sub={minedText(r) || t('ui.report.nothing_mined')}
          />
          <Tile
            label={t('ui.report.costs')}
            value={fmt.money(r.powerCostUsd + r.rentUsd)}
            sub={t('ui.report.costs_sub', {
              power: fmt.money(r.powerCostUsd),
              rent: fmt.money(r.rentUsd),
            })}
          />
          <Tile
            label={t('ui.report.cost_per_coin')}
            value={coin && cost !== null ? `${fmt.money(cost)}/${coin}` : '—'}
            sub={
              cost !== null && prevCost !== null && prev
                ? `${fmt.delta(cost - prevCost, 'money')} ${t('ui.report.vs_prev', { quarter: fmt.quarter(prev.quarter).slice(0, 2), value: fmt.money(prevCost) })}`
                : t('ui.report.power_only')
            }
            tone={
              cost !== null && prevCost !== null
                ? toneOf(cost - prevCost, true)
                : 'muted'
            }
          />
          <Tile
            label={t('ui.report.cash')}
            value={fmt.money(r.cash)}
            sub={t('ui.report.vs_start', {
              delta: fmt.delta(r.cash - r.startCash, 'money'),
              start: fmt.money(r.startCash),
            })}
            tone={toneOf(r.cash - r.startCash)}
          />
          <Tile
            label={t('ui.report.treasury')}
            value={fmt.money(r.treasuryValueUsd)}
            sub={t('ui.report.vs_start', {
              delta: fmt.delta(
                r.treasuryValueUsd - r.startTreasuryUsd,
                'money',
              ),
              start: fmt.money(r.startTreasuryUsd),
            })}
            tone={toneOf(r.treasuryValueUsd - r.startTreasuryUsd)}
          />
          <Tile
            label={t('ui.report.heat', {
              tier: tierName(r.heatTier).toLowerCase(),
            })}
            value={String(Math.round(r.heat))}
            sub={heatChange(r.heat, prev?.heat ?? r.heat)}
            tone={
              prev
                ? toneOf(Math.round(r.heat) - Math.round(prev.heat), true)
                : 'muted'
            }
          />
        </div>

        <div class="report-grid">
          <CostChart state={state} coin={coin} />
          <League state={state} r={r} />
          <Notes state={state} />
        </div>

        <div class="report-foot">
          {state.phase === 'gameover' ? (
            <button
              type="button"
              class="btn btn-primary"
              onClick={props.onGameOver}
            >
              {t('ui.report.see_game_over')}
            </button>
          ) : (
            <button
              type="button"
              class="btn btn-primary"
              onClick={() => act({ type: 'NEXT_QUARTER' })}
            >
              {isLast
                ? t('ui.report.finish')
                : t('ui.report.continue', {
                    quarter: fmt.quarter(quarterName(state.quarter + 1)),
                  })}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function minedText(r: QuarterReport): string {
  return (['ETH', 'BTC'] as const)
    .filter((c) => r.coinsMined[c] > 0)
    .map((c) => t('ui.report.mined', { coins: fmt.crypto(r.coinsMined[c], c) }))
    .join(' · ')
}

/** Cost per coin (bars) vs the coin's average price (line) for this year's quarters. */
function CostChart({ state, coin }: { state: GameState; coin: Coin | null }) {
  const r = state.reports.at(-1)!
  const year = r.quarter.slice(0, 4)
  const rows = state.reports
    .map((rep) => ({ rep, qi: CONTENT.quarters.indexOf(rep.quarter) }))
    .filter(({ rep }) => rep.quarter.startsWith(year))
  const c = coin ?? 'ETH'
  const data = rows.map(({ rep, qi }) => ({
    label: rep.quarter.slice(4),
    cost: rep.costPerCoinUsd[c],
    price: averagePrice(qi, c),
  }))
  const max =
    Math.max(1, ...data.map((d) => Math.max(d.cost ?? 0, d.price))) * 1.1
  const y = (v: number) => 170 - (v / max) * 150
  const x = (i: number) => 75 + i * 70
  const st = state.quarterStats
  return (
    <div class="panel p chart">
      <h2 class="panel-title">
        {t('ui.report.chart_title', { coin: c, year })}
      </h2>
      <svg
        viewBox="0 0 340 200"
        role="img"
        aria-label={t('ui.report.chart_title', { coin: c, year })}
      >
        {[1, 2, 3].map((k) => (
          <g key={k}>
            <line
              class="c-grid"
              x1={40}
              y1={y((max * k) / 3.3)}
              x2={330}
              y2={y((max * k) / 3.3)}
            />
            <text
              class="c-tick"
              x={34}
              y={y((max * k) / 3.3) + 3}
              text-anchor="end"
            >
              {fmt.money((max * k) / 3.3)}
            </text>
          </g>
        ))}
        <line class="c-axis" x1={40} y1={170} x2={330} y2={170} />
        {data.map((d, i) =>
          d.cost === null ? null : (
            <rect
              key={`b${i}`}
              class="c-you"
              x={x(i) - 14}
              y={y(d.cost)}
              width={28}
              height={Math.max(1.5, 170 - y(d.cost))}
            />
          ),
        )}
        <polyline
          class="c-eth-line"
          points={data
            .map((d, i) => `${x(i)},${y(d.price).toFixed(1)}`)
            .join(' ')}
        />
        {data.map((d, i) => (
          <g key={`p${i}`}>
            <circle class="c-eth" cx={x(i)} cy={y(d.price)} r={4} />
            <text class="c-tick" x={x(i)} y={188} text-anchor="middle">
              {d.label}
            </text>
          </g>
        ))}
      </svg>
      <div class="legend">
        <span>
          <svg width="12" height="12" aria-hidden="true">
            <rect class="c-you" width={12} height={12} />
          </svg>
          {t('ui.report.legend_cost', { coin: c })}
        </span>
        <span>
          <svg width="16" height="12" aria-hidden="true">
            <line class="c-eth-line" x1={0} y1={6} x2={16} y2={6} />
          </svg>
          {t('ui.report.legend_price', { coin: c })}
        </span>
      </div>
      <p class="num-s muted" style={{ margin: 0 }}>
        {st.interestUsd + st.principalUsd > 0
          ? t('ui.report.cash_line_loan', {
              start: fmt.money(st.startCash),
              sales: fmt.money(
                st.soldUsd + st.treasurySoldUsd + st.gridCreditsUsd,
              ),
              power: fmt.money(st.powerCostUsd),
              rent: fmt.money(st.rentUsd),
              loan: fmt.money(st.interestUsd + st.principalUsd),
              end: fmt.money(r.cash),
            })
          : t('ui.report.cash_line', {
              start: fmt.money(st.startCash),
              sales: fmt.money(
                st.soldUsd + st.treasurySoldUsd + st.gridCreditsUsd,
              ),
              power: fmt.money(st.powerCostUsd),
              rent: fmt.money(st.rentUsd),
              end: fmt.money(r.cash),
            })}
      </p>
      {r.gridCreditsUsd > 0 && (
        <p class="num-s muted" style={{ margin: 0 }}>
          {t('ui.report.grid_line', { credits: fmt.money(r.gridCreditsUsd) })}
        </p>
      )}
      {r.stormChargeUsd > 0 && (
        <p class="num-s loss" style={{ margin: 0 }}>
          {t('ui.report.storm_line', { usd: fmt.money(r.stormChargeUsd) })}
        </p>
      )}
      {r.salariesUsd > 0 && (
        <p class="num-s muted" style={{ margin: 0 }}>
          {t('ui.report.salaries_line', { usd: fmt.money(r.salariesUsd) })}
        </p>
      )}
      {r.rateHikeUsd > 0 && (
        <p class="num-s warn" style={{ margin: 0 }}>
          {t('ui.report.rate_hike_line', { usd: fmt.money(r.rateHikeUsd) })}
        </p>
      )}
      {r.debtUsd > 0 && (
        <p class="num-s muted" style={{ margin: 0 }}>
          {t('ui.report.debt_line', {
            debt: fmt.money(r.debtUsd),
            interest: fmt.money(r.interestUsd),
          })}
        </p>
      )}
    </div>
  )
}

function League({ state, r }: { state: GameState; r: QuarterReport }) {
  const kw = siteViews(state).reduce((a, s) => a + (s.ready ? s.usedKw : 0), 0)
  const hash = [
    r.hashrate.ETH > 0 ? fmt.hash(r.hashrate.ETH, 'MH') : null,
    r.hashrate.BTC > 0 ? fmt.hash(r.hashrate.BTC, 'TH') : null,
  ]
    .filter(Boolean)
    .join(' + ')
  const i = state.reports.length - 1
  const rows = leagueTable(state, i)
  const now = yourRank(state, i)
  const before = i > 0 ? yourRank(state, i - 1) : null
  const moved = before ? before.rank - now.rank : 0
  const coming = upcomingRivals(state.quarter)
  return (
    <div class="panel p">
      <div class="row-between">
        <h2 class="panel-title">
          {t('ui.report.league_title', { quarter: fmt.quarter(r.quarter) })}
        </h2>
        <span class="num-s muted">
          {t('ui.report.rank', { rank: now.rank, of: now.of })}{' '}
          {moved !== 0 && (
            <span class={moved > 0 ? 'gain' : 'loss'}>
              {moved > 0 ? `▲${moved}` : `▼${-moved}`}
            </span>
          )}
        </span>
      </div>
      <table>
        <thead>
          <tr>
            <th>{t('ui.report.col.company')}</th>
            <th>{t('ui.report.col.scale')}</th>
            <th class="r">{t('ui.report.col.value')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) =>
            row.rival === null ? (
              <tr class="you" key="you">
                <td>
                  <span class="mono you" aria-hidden="true">
                    {t('ui.report.you_code')}
                  </span>
                  {t('ui.report.you')}
                </td>
                <td class="num">
                  {hash ? `${fmt.power(kw)} · ${hash}` : fmt.power(kw)}
                </td>
                <td class="num r">{fmt.money(r.valuationUsd)}</td>
              </tr>
            ) : (
              <tr key={row.id}>
                <td>
                  <span class="mono" aria-hidden="true">
                    {rivalCode(row.id)}
                  </span>
                  {rivalName(row.id)}
                </td>
                <td class={rivalScale(row.rival) ? 'num' : 'muted'}>
                  {rivalScale(row.rival) ?? t('ui.report.not_mining')}
                </td>
                <td class={row.valueUsd === null ? 'num r muted' : 'num r'}>
                  {row.valueUsd === null
                    ? t('ui.report.private')
                    : fmt.money(row.valueUsd)}
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
      {coming.length > 0 && (
        <p class="num-s muted" style={{ margin: 0 }}>
          {coming
            .map((c) =>
              t('ui.report.rival_joins', {
                rival: c.id,
                quarter: fmt.quarter(c.quarter),
              }),
            )
            .join(' ')}
        </p>
      )}
    </div>
  )
}

/** "16 MW · 0.07 EH/s", or null before the rival mines. */
function rivalScale(r: RivalSnapshot): string | null {
  const parts = [
    r.mw !== null ? fmt.power(r.mw * 1000) : null,
    r.hashrateEhs !== null ? fmt.hash(r.hashrateEhs * 1e6, 'TH') : null,
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}

const END_KEYS: MessageKey[] = ['log.forced_sale', 'log.game_over']

function Notes({ state }: { state: GameState }) {
  const entries = state.log.filter((e) => e.quarter === state.quarter)
  return (
    <div class="panel p">
      <h2 class="panel-title">{t('ui.report.notes')}</h2>
      <div class="log">
        {entries.length === 0 && (
          <div class="muted">{t('ui.report.quiet')}</div>
        )}
        {entries.map((e, i) => (
          <div key={i}>
            <span class="num muted">
              {e.week
                ? t('ui.report.note_week', { week: e.week })
                : END_KEYS.includes(e.key)
                  ? t('ui.report.note_end')
                  : t('ui.report.note_plan')}{' '}
            </span>
            {say(e)}
          </div>
        ))}
      </div>
    </div>
  )
}
