// Act IV's money screens (M31.6; doc 33 §17 A4-09, A4-10; layout in docs/wireframes/act4/README.md). Re-exported by
// Act4Panels.tsx so they load in the Act IV lazy chunk. A4-09: the Capital screen's Act IV block (the space-equity
// window, orbital loans and their covenant, co-funded blocks, insurance, lunar funding). A4-10: the quarter report's
// orbit and Moon panel. Every number comes from src/sim/act4MoneyViews.ts.
import { t, tDynamic, type Message } from '../../i18n/t.ts'
import { capitalIvView, reportIvView } from '../../sim/act4MoneyViews.ts'
import { CONTENT } from '../../content/index.ts'
import type { GameState, QuarterReport } from '../../sim/state.ts'
import { ArtFrame } from '../components/artFrame.tsx'
import { fmt } from '../format.ts'
import { say } from '../names.ts'
import type { ScreenProps } from './Plan.tsx'

/** A4-09: the Capital screen's Act IV block. */
export function Act4CapitalPanel({ state, act }: ScreenProps) {
  const v = capitalIvView(state)
  if (!v) return null
  const why: Message | null = v.lunar.taskOrderWhy
  return (
    <div class="panel p" data-capital-iv>
      <h2 class="panel-title">{t('ui.capital_iv.title')}</h2>
      <p class="num-s">
        {v.window.open
          ? t('ui.capital_iv.window_open', { mult: v.window.multiple.toFixed(1), pre: fmt.money(v.window.preMoneyUsd) })
          : t('ui.capital_iv.window_shut', { mult: v.window.multiple.toFixed(1), min: v.window.minMultiple })}
        {v.window.underwayUsd > 0 && ` ${t('ui.capital_iv.story', { story: fmt.signedDollars(v.window.storyUsd) })}`}
      </p>
      <h3 class="label">{t('ui.capital_iv.debts', { total: fmt.money(v.orbitalDebtUsd) })}</h3>
      {v.debts.length === 0 ? (
        <p class="num-s muted">{t('ui.capital_iv.no_debts')}</p>
      ) : (
        <table class="num-s">
          <thead>
            <tr>
              <th>{t('ui.capital_iv.col.block')}</th>
              <th>{t('ui.capital_iv.col.kind')}</th>
              <th class="r">{t('ui.capital_iv.col.balance')}</th>
              <th class="r">{t('ui.capital_iv.col.rate')}</th>
              <th>{t('ui.capital_iv.col.status')}</th>
            </tr>
          </thead>
          <tbody>
            {v.debts.map((d) => (
              <tr key={`${d.n}-${d.kind}`}>
                <td class="num">{t('ui.capital_iv.block', { n: d.n })}</td>
                <td>{t(`ui.orbit.capital.${d.kind}`)}</td>
                <td class="r num">{fmt.money(d.balanceUsd)}</td>
                <td class="r num">{fmt.pct(d.apr, 2)}</td>
                <td class={d.cureLabel ? 'warn' : ''}>
                  {d.cureLabel
                    ? t('ui.capital_iv.cure', { quarter: fmt.quarter(d.cureLabel) })
                    : d.repaying
                      ? t('ui.capital_iv.repaying', { n: d.quartersLeft })
                      : t('ui.capital_iv.building')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {v.cofunded.length > 0 && (
        <p class="num-s">
          {t('ui.capital_iv.cofunded', { blocks: v.cofunded.map((c) => c.n).join(', '), share: fmt.pct(v.cofunded[0].share) })}
        </p>
      )}
      <p class="num-s">
        {t('ui.capital_iv.insurance', { insured: v.insurance.insured, blocks: v.insurance.blocks })}
        {v.insurance.hardMarket &&
          ` ${t('ui.capital_iv.hard_market', { quarter: fmt.quarter(v.insurance.hardUntilLabel ?? '') })}`}
      </p>
      <h3 class="label">{t('ui.capital_iv.lunar')}</h3>
      <p class="num-s muted">{t('ui.capital_iv.lunar_rule')}</p>
      {v.lunar.taskOrderUsd !== null && (
        <div class="orbit-row num-s">
          <span>{t('ui.capital_iv.task_order', { usd: fmt.money(v.lunar.taskOrderUsd) })}</span>
          <button
            type="button"
            class="btn"
            disabled={!!why}
            title={why ? say(why) : undefined}
            onClick={() => act({ type: 'ACCEPT_TASK_ORDER' })}
          >
            {t('ui.capital_iv.accept')}
          </button>
        </div>
      )}
      {v.lunar.creditUsd > 0 && (
        <p class="num-s">{t('ui.capital_iv.credit', { usd: fmt.money(v.lunar.creditUsd), next: fmt.money(v.lunar.nextMissionUsd) })}</p>
      )}
    </div>
  )
}

/** A4-10: the quarter report's orbit and Moon panel. */
/**
 * M43.A: the block that made this report's quarter the first one with a block of yours live, or null. A block goes live
 * at the start of its live quarter, so the company's earliest live quarter comes once per career: no flag is stored.
 */
function firstBlockLive(state: GameState, r: QuarterReport) {
  const went = (state.act4Orbit?.blocks ?? []).filter((b) => b.liveQuarter !== null && b.stage !== 'climbing')
  if (went.length === 0) return null
  const first = Math.min(...went.map((b) => b.liveQuarter!))
  if (CONTENT.quarters[first] !== r.quarter) return null
  return went.filter((b) => b.liveQuarter === first).sort((a, b) => a.n - b.n)[0]
}

/** M43.A: the one-time "First block live" moment on the quarter report, with the test image. */
function FirstBlockLive({ state, report }: { state: GameState; report: QuarterReport }) {
  const b = firstBlockLive(state, report)
  if (!b) return null
  return (
    <div class="panel p first-block-live" data-first-block-live>
      <h2 class="panel-title">{t('ui.report_iv.first_block_title')}</h2>
      <ArtFrame slot="orbit_first_block" caption={t('ui.report_iv.first_block', { n: b.n, mw: fmt.power(b.mw * 1000) })} />
    </div>
  )
}

export function Act4ReportPanel({ state, report }: { state: GameState; report?: QuarterReport }) {
  const r = report ?? state.reports.at(-1)
  const v = r ? reportIvView(state, r) : null
  if (!v || !r) return null
  return (
    <>
    <FirstBlockLive state={state} report={r} />
    <div class="panel p" data-report-iv>
      <h2 class="panel-title">{t('ui.report_iv.title')}</h2>
      {v.orbit && (
        <p class="num-s">
          {t('ui.report_iv.orbit', {
            live: v.orbit.live,
            underway: v.orbit.underway,
            revenue: fmt.money(v.orbit.revenueUsd),
            ebitda: fmt.signedDollars(v.orbit.ebitdaUsd),
            mult: v.orbit.multiple.toFixed(1),
            ev: fmt.money(v.orbit.evUsd),
          })}
        </p>
      )}
      {v.moon && (
        <p class="num-s">
          {t('ui.report_iv.moon', {
            water: v.moon.waterT.toFixed(1),
            revenue: fmt.money(v.moon.revenueUsd),
            unit: fmt.money(v.moon.unitUsd),
          })}
        </p>
      )}
      {v.events.length > 0 && (
        <ul class="num-s">
          {v.events.map((e, i) => (
            <li key={i}>{tDynamic(e.key, e.key, e.params)}</li>
          ))}
        </ul>
      )}
    </div>
    </>
  )
}
