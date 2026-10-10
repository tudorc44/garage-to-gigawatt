// The Finances section (M37.3-M37.4, doc 39): where the money goes and where the profit comes from. Two tabs, the P&L
// and the cash flow, over a period (a quarter, a calendar year, an act or the career) beside the previous one. The
// P&L shows by line, by business or by site. Reads src/sim/financeViews.ts only: no game rules here. Its own chunk
// (financesLazy.tsx), so the main bundle stays small.
import { useState } from 'preact/hooks'
import { CONTENT } from '../../content/index.ts'
import { t } from '../../i18n/t.ts'
import {
  businessView,
  defaultPeriod,
  periodChoices,
  pnlView,
  siteView,
  type ActNo,
  type Contribution,
  type Period,
  type PeriodKind,
  type PnlFigures,
} from '../../sim/financeViews.ts'
import type { GameState } from '../../sim/state.ts'
import { fmt } from '../format.ts'
import { Change, lineName, money, periodName, refName } from './financeParts.tsx'
import { CashFlowTab } from './FinancesCash.tsx'

const label = (q: number) => CONTENT.quarters[q]

type Tab = 'pnl' | 'cash'
type View = 'line' | 'business' | 'site'

export function FinancesSection({ state }: { state: GameState }) {
  const [tab, setTab] = useState<Tab>('pnl')
  const [period, setPeriod] = useState<Period>(defaultPeriod(state))
  const [view, setView] = useState<View>('line')
  return (
    <div class="section single fin">
      <div class="col">
        <div class="panel p">
          <div class="row-between">
            <h2 class="panel-title">{t('ui.fin.title')}</h2>
            <div class="seg" role="tablist" aria-label={t('ui.fin.tabs')}>
              {(['pnl', 'cash'] as const).map((k) => (
                <button type="button" role="tab" key={k} aria-selected={tab === k} aria-pressed={tab === k} onClick={() => setTab(k)}>
                  {t(`ui.fin.tab.${k}`)}
                </button>
              ))}
            </div>
          </div>
          <PeriodPicker state={state} period={period} setPeriod={setPeriod} />
          {tab === 'pnl' && (
            <div class="fin-row">
              <span class="label">{t('ui.fin.view')}</span>
              <div class="seg" role="group" aria-label={t('ui.fin.view')}>
                {(['line', 'business', 'site'] as const).map((k) => (
                  <button type="button" key={k} aria-pressed={view === k} onClick={() => setView(k)}>
                    {t(`ui.fin.view.${k}`)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        {tab === 'pnl' ? (
          view === 'line' ? (
            <PnlByLine state={state} period={period} />
          ) : view === 'business' ? (
            <PnlByBusiness state={state} period={period} />
          ) : (
            <PnlBySite state={state} period={period} />
          )
        ) : (
          <CashFlowTab state={state} period={period} />
        )}
      </div>
    </div>
  )
}

/** Quarter (default: the last completed one) / Year / Act / Career, and which one. */
function PeriodPicker(props: { state: GameState; period: Period; setPeriod: (p: Period) => void }) {
  const { state, period } = props
  const choices = periodChoices(state)
  const first = (kind: PeriodKind): Period =>
    kind === 'quarter'
      ? defaultPeriod(state)
      : kind === 'year'
        ? { kind: 'year', year: choices.years.at(-1) ?? Number(label(state.quarter).slice(0, 4)) }
        : kind === 'act'
          ? { kind: 'act', act: (choices.acts.at(-1) ?? state.act) as ActNo }
          : { kind: 'career' }
  const options: { value: string; period: Period }[] =
    period.kind === 'quarter'
      ? [...choices.quarters].reverse().map((q) => ({ value: String(q), period: { kind: 'quarter', q } }))
      : period.kind === 'year'
        ? [...choices.years].reverse().map((year) => ({ value: String(year), period: { kind: 'year', year } }))
        : period.kind === 'act'
          ? [...choices.acts].reverse().map((act) => ({ value: String(act), period: { kind: 'act', act } }))
          : []
  const current = period.kind === 'quarter' ? period.q : period.kind === 'year' ? period.year : period.kind === 'act' ? period.act : ''
  return (
    <div class="fin-row">
      <span class="label">{t('ui.fin.period')}</span>
      <div class="seg" role="group" aria-label={t('ui.fin.period')}>
        {(['quarter', 'year', 'act', 'career'] as const).map((k) => (
          <button type="button" key={k} aria-pressed={period.kind === k} onClick={() => props.setPeriod(first(k))}>
            {t(`ui.fin.period.${k}`)}
          </button>
        ))}
      </div>
      {options.length > 0 && (
        <select
          class="fin-pick"
          aria-label={t('ui.fin.pick')}
          value={String(current)}
          onChange={(e) => {
            const o = options.find((x) => x.value === (e.currentTarget as HTMLSelectElement).value)
            if (o) props.setPeriod(o.period)
          }}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {periodName(state, o.period)}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}

/** The notes under a table: no depreciation; where full detail starts. */
function Notes(props: { fullFrom: string | null }) {
  return (
    <>
      {props.fullFrom && <p class="num-s muted fin-note">{t('ui.fin.full_from', { quarter: fmt.quarter(props.fullFrom) })}</p>}
      <p class="num-s muted fin-note">{t('ui.fin.no_depreciation')}</p>
    </>
  )
}

/** A P&L row: the period, and (when there is one) the previous period and the change. */
function FigureRow(props: { name: string; now: number; prev: number | null; compare: boolean; strong?: boolean }) {
  return (
    <tr class={props.strong ? 'fin-total' : undefined}>
      <td>{props.name}</td>
      <td class="r num">{money(props.now)}</td>
      {props.compare && <td class="r num">{props.prev === null ? '—' : money(props.prev)}</td>}
      {props.compare && (
        <td class="r num">
          <Change now={props.now} prev={props.prev} />
        </td>
      )}
    </tr>
  )
}

const marginText = (f: PnlFigures | null) => (f?.margin === null || f === null ? '—' : fmt.pct(f.margin, 1))

function PnlByLine({ state, period }: { state: GameState; period: Period }) {
  const v = pnlView(state, period)
  const sections = ['revenue', 'opex', 'below'] as const
  const totalOf = (s: (typeof sections)[number], f: PnlFigures | null) =>
    f === null ? null : s === 'revenue' ? f.revenue : s === 'opex' ? f.opex : f.below
  if (v.rows.length === 0)
    return (
      <div class="panel p">
        <p class="muted">{t('ui.fin.empty')}</p>
      </div>
    )
  // (the career, or a first period, has nothing before it: no comparison columns)
  const compare = v.prevPeriod !== null
  return (
    <>
      <div class="panel fin-table">
        <table class="num-s">
          <thead>
            <tr>
              <th>{t('ui.fin.col.line')}</th>
              <th class="r">{periodName(state, period)}</th>
              {compare && <th class="r">{periodName(state, v.prevPeriod!)}</th>}
              {compare && <th class="r">{t('ui.fin.col.change')}</th>}
            </tr>
          </thead>
          <tbody>
            {sections.map((s) => {
              const rows = v.rows.filter((r) => r.section === s)
              if (rows.length === 0 && s === 'below') return null
              return [
                <tr key={`h-${s}`} class="fin-head">
                  <td colSpan={compare ? 4 : 2}>{t(`ui.fin.section.${s}`)}</td>
                </tr>,
                ...rows.map((r) => (
                  <FigureRow key={r.id} name={lineName(r.id)} now={r.now} prev={r.prev} compare={compare} />
                )),
                s !== 'below' && (
                  <FigureRow
                    key={`t-${s}`}
                    name={t(`ui.fin.total.${s}`)}
                    now={totalOf(s, v.now)!}
                    prev={totalOf(s, v.prev)}
                    compare={compare}
                    strong
                  />
                ),
                s === 'opex' && (
                  <FigureRow
                    key="ebitda"
                    name={t('ui.fin.total.ebitda')}
                    now={v.now.ebitda}
                    prev={v.prev?.ebitda ?? null}
                    compare={compare}
                    strong
                  />
                ),
                s === 'opex' && (
                  <tr key="margin">
                    <td>{t('ui.fin.total.margin')}</td>
                    <td class="r num">{marginText(v.now)}</td>
                    {compare && <td class="r num">{marginText(v.prev)}</td>}
                    {compare && <td />}
                  </tr>
                ),
              ]
            })}
            <FigureRow name={t('ui.fin.total.net')} now={v.now.net} prev={v.prev?.net ?? null} compare={compare} strong />
          </tbody>
        </table>
      </div>
      <div class="panel p">
        <h2 class="panel-title">{t('ui.fin.changes_title')}</h2>
        {v.changes.length === 0 ? (
          <p class="num-s muted">{t(v.prevPeriod ? 'ui.fin.no_change' : 'ui.fin.no_prev')}</p>
        ) : (
          <ul class="fin-changes num-s">
            {v.changes.map((c) => (
              <li key={c.id}>
                {c.source
                  ? t('ui.fin.change_line', {
                      line: lineName(c.id),
                      delta: fmt.signed(c.deltaUsd),
                      source: refName(state, c.source),
                    })
                  : t('ui.fin.change_line_plain', { line: lineName(c.id), delta: fmt.signed(c.deltaUsd) })}
              </li>
            ))}
          </ul>
        )}
        <Notes fullFrom={v.fullFrom} />
      </div>
    </>
  )
}

function PnlByBusiness({ state, period }: { state: GameState; period: Period }) {
  const v = businessView(state, period)
  if (v.businesses.length === 0)
    return (
      <div class="panel p">
        <p class="muted">{t('ui.fin.empty')}</p>
      </div>
    )
  const sections = ['revenue', 'opex', 'below'] as const
  const fig = (k: keyof PnlFigures) => v.businesses.map((b) => v.figures[b]![k])
  const figRow = (name: string, vals: (number | null)[], strong = true, pct = false) => (
    <tr class={strong ? 'fin-total' : undefined}>
      <td>{name}</td>
      {vals.map((x, i) => (
        <td key={i} class="r num">
          {x === null ? '—' : pct ? fmt.pct(x, 1) : money(x)}
        </td>
      ))}
    </tr>
  )
  return (
    <>
      <div class="panel fin-table">
        <table class="num-s">
          <thead>
            <tr>
              <th>{t('ui.fin.col.line')}</th>
              {v.businesses.map((b) => (
                <th key={b} class="r">
                  {t(`ui.fin.biz.${b}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sections.map((s) => [
              <tr key={`h-${s}`} class="fin-head">
                <td colSpan={v.businesses.length + 1}>{t(`ui.fin.section.${s}`)}</td>
              </tr>,
              ...v.rows
                .filter((r) => r.section === s)
                .map((r) => (
                  <tr key={r.id}>
                    <td>{lineName(r.id)}</td>
                    {v.businesses.map((b) => (
                      <td key={b} class="r num">
                        {r.byBiz[b] ? money(r.byBiz[b]!) : '—'}
                      </td>
                    ))}
                  </tr>
                )),
              s === 'revenue' && figRow(t('ui.fin.total.revenue'), fig('revenue')),
              s === 'opex' && figRow(t('ui.fin.total.opex'), fig('opex')),
              s === 'opex' && figRow(t('ui.fin.total.ebitda'), fig('ebitda')),
              s === 'opex' && figRow(t('ui.fin.total.margin'), fig('margin'), false, true),
            ])}
            {figRow(t('ui.fin.total.net'), fig('net'))}
          </tbody>
        </table>
      </div>
      <div class="panel p">
        <p class="num-s muted fin-note">{t('ui.fin.biz.note')}</p>
        {v.hasSummary && <p class="num-s muted fin-note">{t('ui.fin.summary_note')}</p>}
        <p class="num-s muted fin-note">{t('ui.fin.no_depreciation')}</p>
      </div>
    </>
  )
}

const inPnl = (c: Contribution) => Math.abs(c.revenue) >= 0.005 || Math.abs(c.directCosts) >= 0.005

function PnlBySite({ state, period }: { state: GameState; period: Period }) {
  const v = siteView(state, period)
  const row = (c: Contribution, name: string, depth: number, strong = false) => (
    <tr key={`${c.key}-${depth}`} class={strong ? 'fin-total' : undefined}>
      <td style={{ paddingLeft: `${8 + depth * 18}px` }}>{name}</td>
      <td class="r num">{money(c.revenue)}</td>
      <td class="r num">{money(c.directCosts)}</td>
      <td class={`r num ${c.contribution < 0 ? 'loss' : ''}`}>{money(c.contribution)}</td>
    </tr>
  )
  return (
    <>
      <div class="panel fin-table">
        <table class="num-s">
          <thead>
            <tr>
              <th>{t('ui.fin.site.col.site')}</th>
              <th class="r">{t('ui.fin.site.col.revenue')}</th>
              <th class="r">{t('ui.fin.site.col.costs')}</th>
              <th class="r">{t('ui.fin.site.col.contribution')}</th>
            </tr>
          </thead>
          <tbody>
            {/* (a site, project or block with nothing in the P&L this period, only an investment, isn't listed) */}
            {v.rows.filter(inPnl).flatMap((r) => [
              row(r, refName(state, r.key), 0),
              ...r.children.filter(inPnl).map((c) => row(c, refName(state, c.key), 1)),
            ])}
            {row(v.unallocated, t('ui.fin.site.unallocated'), 0)}
            {row(v.total, t('ui.fin.site.total'), 0, true)}
          </tbody>
        </table>
      </div>
      <div class="panel p">
        <p class="num-s muted fin-note">{t('ui.fin.site.note')}</p>
        {v.hasSummary && <p class="num-s muted fin-note">{t('ui.fin.summary_note')}</p>}
        <p class="num-s muted fin-note">{t('ui.fin.no_depreciation')}</p>
      </div>
    </>
  )
}
