// The Finances summaries (M37.5, doc 39): a compact block on the quarter report (revenue, operating costs, EBITDA, net
// profit, the change in cash, and a way into the Finances screen) and each chapter report's act summary (revenue,
// EBITDA, net profit, invested, raised; the best and worst site by contribution). Reads the finance views only.
import { t } from '../../i18n/t.ts'
import { actSummary, quarterSummary, type ActNo } from '../../sim/financeViews.ts'
import type { GameState } from '../../sim/state.ts'
import { fmt } from '../format.ts'
import { money, refName } from '../screens/financeParts.tsx'

function Figure(props: { label: string; usd: number; tone?: boolean }) {
  const tone = props.tone ? (props.usd > 0 ? 'gain' : props.usd < 0 ? 'loss' : '') : ''
  return (
    <div class="fin-fig">
      <span class="label">{props.label}</span>
      <span class={`num ${tone}`}>{props.tone && props.usd > 0 ? '+' + fmt.money(props.usd) : money(props.usd)}</span>
    </div>
  )
}

/** The quarter report's block: this quarter's P&L in five figures, and "Open Finances ›". */
export function QuarterFinances(props: { state: GameState; onOpen: () => void }) {
  const q = quarterSummary(props.state)
  if (!q) return null
  return (
    <div class="panel p fin-summary">
      <div class="row-between">
        <h2 class="panel-title">{t('ui.fin.summary.quarter_title')}</h2>
        <button type="button" class="btn btn-ghost" onClick={props.onOpen}>
          {t('ui.fin.summary.open')}
        </button>
      </div>
      <div class="fin-figs">
        <Figure label={t('ui.fin.total.revenue')} usd={q.revenue} />
        <Figure label={t('ui.fin.total.opex')} usd={q.opex} />
        <Figure label={t('ui.fin.total.ebitda')} usd={q.ebitda} />
        <Figure label={t('ui.fin.total.net')} usd={q.net} />
        <Figure label={t('ui.fin.summary.cash_change')} usd={q.cashChange} tone />
      </div>
    </div>
  )
}

/** A chapter report's act summary: the act's P&L, what it invested and raised, its best and worst site. */
export function ActFinances(props: { state: GameState; act: ActNo }) {
  const a = actSummary(props.state, props.act)
  if (!a) return null
  return (
    <div class="panel p fin-summary">
      <h2 class="panel-title">{t('ui.fin.summary.act_title')}</h2>
      <div class="fin-figs">
        <Figure label={t('ui.fin.total.revenue')} usd={a.revenue} />
        <Figure label={t('ui.fin.total.ebitda')} usd={a.ebitda} />
        <Figure label={t('ui.fin.total.net')} usd={a.net} />
        <Figure label={t('ui.fin.summary.invested')} usd={a.investedUsd} />
        <Figure label={t('ui.fin.summary.raised')} usd={a.raisedUsd} />
      </div>
      {a.sites && (
        <p class="num-s fin-note">
          {a.sites.best.key === a.sites.worst.key
            ? t('ui.fin.summary.one_site', {
                site: refName(props.state, a.sites.best.key),
                usd: money(a.sites.best.contribution),
              })
            : t('ui.fin.summary.best_worst', {
                best: refName(props.state, a.sites.best.key),
                bestUsd: money(a.sites.best.contribution),
                worst: refName(props.state, a.sites.worst.key),
                worstUsd: money(a.sites.worst.contribution),
              })}
        </p>
      )}
      {a.fullFrom && <p class="num-s muted fin-note">{t('ui.fin.full_from', { quarter: fmt.quarter(a.fullFrom) })}</p>}
    </div>
  )
}
