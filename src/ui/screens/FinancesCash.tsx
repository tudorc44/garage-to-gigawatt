// The Finances section's Cash flow tab (M37.4, doc 39): starting cash; operating cash (net profit, less the coins mined,
// which are cash only when sold; prepayments; rounding); investing; financing; treasury; ending cash, which is the
// game's cash. Under it, the cash chart: a quarter's weeks (its lowest point marked) or a longer period's quarters,
// and why cash fell or rose.
import { t } from '../../i18n/t.ts'
import { cashFlowView, type CashFlowView, type Period } from '../../sim/financeViews.ts'
import type { GameState } from '../../sim/state.ts'
import { fmt } from '../format.ts'
import { lineName, money, periodName } from './financeParts.tsx'

function Row(props: { name: string; usd: number; strong?: boolean; indent?: boolean }) {
  return (
    <tr class={props.strong ? 'fin-total' : undefined}>
      <td style={props.indent ? { paddingLeft: '26px' } : undefined}>{props.name}</td>
      <td class="r num">{money(props.usd)}</td>
    </tr>
  )
}

function Section(props: { title: string; rows: { id: Parameters<typeof lineName>[0]; usd: number }[]; total: number; totalName: string }) {
  if (props.rows.length === 0) return null
  return (
    <>
      <tr class="fin-head">
        <td colSpan={2}>{props.title}</td>
      </tr>
      {props.rows.map((r) => (
        <Row key={r.id} name={lineName(r.id)} usd={r.usd} indent />
      ))}
      <Row name={props.totalName} usd={props.total} strong />
    </>
  )
}

export function CashFlowTab({ state, period }: { state: GameState; period: Period }) {
  const v = cashFlowView(state, period)
  const o = v.operating
  return (
    <>
      <div class="panel fin-table">
        <table class="num-s">
          <thead>
            <tr>
              <th>{t('ui.fin.col.line')}</th>
              <th class="r">{periodName(state, period)}</th>
            </tr>
          </thead>
          <tbody>
            <Row name={t('ui.fin.cf.start')} usd={v.startCash} strong />
            <tr class="fin-head">
              <td colSpan={2}>{t('ui.fin.cf.operating')}</td>
            </tr>
            <Row name={t('ui.fin.total.net')} usd={o.netProfit} indent />
            {o.minedCoins !== 0 && <Row name={t('ui.fin.cf.mined')} usd={o.minedCoins} indent />}
            {o.prepayments !== 0 && <Row name={lineName('prepayments')} usd={o.prepayments} indent />}
            {Math.abs(o.rounding) >= 0.5 && <Row name={t('ui.fin.cf.rounding')} usd={o.rounding} indent />}
            {o.summaryChange !== 0 && <Row name={t('ui.fin.cf.summary')} usd={o.summaryChange} indent />}
            <Row name={t('ui.fin.cf.operating_total')} usd={o.total} strong />
            <Section title={t('ui.fin.cf.investing')} rows={v.investing.rows} total={v.investing.total} totalName={t('ui.fin.cf.investing_total')} />
            <Section title={t('ui.fin.cf.financing')} rows={v.financing.rows} total={v.financing.total} totalName={t('ui.fin.cf.financing_total')} />
            <Section title={t('ui.fin.cf.treasury')} rows={v.treasury.rows} total={v.treasury.total} totalName={t('ui.fin.cf.treasury_total')} />
            <Row name={t('ui.fin.cf.end')} usd={v.endCash} strong />
          </tbody>
        </table>
      </div>
      <div class="panel p fin-chart">
        <h2 class="panel-title">
          {v.chart.weekly ? t('ui.fin.cf.chart_week', { period: periodName(state, period) }) : t('ui.fin.cf.chart_quarter')}
        </h2>
        <CashChart chart={v.chart} />
        <p class="num-s fin-note">{whyLine(v)}</p>
        {v.fullFrom && <p class="num-s muted fin-note">{t('ui.fin.full_from', { quarter: fmt.quarter(v.fullFrom) })}</p>}
      </div>
    </>
  )
}

/** "Why cash fell this period: Power −$1.2M, Machines −$0.4M." */
function whyLine(v: CashFlowView): string {
  if (v.endCash === v.startCash || v.why.lines.length === 0) return t('ui.fin.cf.why_flat')
  const lines = v.why.lines.map((l) => `${lineName(l.id)} ${fmt.signed(l.usd)}`).join(', ')
  return t(v.why.fell ? 'ui.fin.cf.why_fell' : 'ui.fin.cf.why_rose', { lines })
}

/** The cash line: weekly within a quarter (week 0 = its start), or the end of each quarter; the lowest point marked. */
function CashChart({ chart }: { chart: CashFlowView['chart'] }) {
  const pts = chart.points
  if (pts.length < 2) return <p class="num-s muted">{t('ui.fin.cf.chart_empty')}</p>
  const W = 640
  const H = 200
  const left = 64
  const right = W - 12
  const top = 12
  const bottom = H - 26
  const vals = pts.map((p) => p.usd)
  const lo = Math.min(0, ...vals)
  const hi = Math.max(...vals, lo + 1)
  const pad = (hi - lo) * 0.08
  const y = (v: number) => bottom - ((v - lo) / (hi - lo + pad)) * (bottom - top)
  const x = (i: number) => left + (i / (pts.length - 1)) * (right - left)
  const low = pts[chart.lowIndex]
  // label every point for a quarter's weeks, about eight for a longer period
  const every = chart.weekly ? 1 : Math.max(1, Math.ceil(pts.length / 8))
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('ui.fin.cf.chart_aria', { low: money(low.usd) })}>
      {[0.25, 0.5, 0.75, 1].map((k) => {
        const v = lo + (hi - lo) * k
        return (
          <g key={k}>
            <line class="c-grid" x1={left} y1={y(v)} x2={right} y2={y(v)} />
            <text class="c-tick" x={left - 6} y={y(v) + 3} text-anchor="end">
              {money(v)}
            </text>
          </g>
        )
      })}
      <line class="c-axis" x1={left} y1={bottom} x2={right} y2={bottom} />
      {lo < 0 && <line class="c-axis" x1={left} y1={y(0)} x2={right} y2={y(0)} />}
      <polyline class="c-eth-line" points={pts.map((p, i) => `${x(i).toFixed(1)},${y(p.usd).toFixed(1)}`).join(' ')} />
      {pts.map((p, i) =>
        i % every === 0 || i === pts.length - 1 ? (
          <text key={`l${i}`} class="c-tick" x={x(i)} y={H - 8} text-anchor="middle">
            {chart.weekly ? p.label : fmt.quarter(p.label)}
          </text>
        ) : null,
      )}
      <circle class="c-you" cx={x(chart.lowIndex)} cy={y(low.usd)} r={5} />
      {/* (the label leans away from the chart's edges, clear of the axis) */}
      <text
        class="c-tick"
        x={x(chart.lowIndex) + (chart.lowIndex === 0 ? 8 : chart.lowIndex === pts.length - 1 ? -8 : 0)}
        y={y(low.usd) > (top + bottom) / 2 ? y(low.usd) - 10 : y(low.usd) + 16}
        text-anchor={chart.lowIndex === 0 ? 'start' : chart.lowIndex === pts.length - 1 ? 'end' : 'middle'}
      >
        {t('ui.fin.cf.low', { usd: money(low.usd) })}
      </text>
    </svg>
  )
}
