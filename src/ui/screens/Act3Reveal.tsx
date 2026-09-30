// The Act III chapter report with the scenario reveal (M13.3; wireframe A3-11), bare-bones. This is the
// ONLY file in src/ui allowed to show the scenario (its name, the trigger, the decoy, the rivals' fates):
// it is shown only at the end of Act III, when the scenario is no longer a secret (a grep test whitelists
// exactly this file). It is part of the test-build preview module (loaded behind ACT3_PREVIEW).
// The authored reveal text (scenario name, decoy reason and tell, rival fates) is content, like card text;
// the labels around it are in en.json. Fates flagged for the D15 editorial review are withheld (doc 27 §15).
import { CONTENT } from '../../content/index.ts'
import { t, tDynamic } from '../../i18n/t.ts'
import { signalsPanel } from '../../sim/selectors.ts'
import type { GameState } from '../../sim/state.ts'
import { act3Outcome } from '../../sim/systems/act3End.ts'
import { fmt } from '../format.ts'

export function Act3Reveal(props: { state: GameState; onNew: () => void }) {
  const s = props.state
  const o = act3Outcome(s)
  const e = o.end
  const labelOf = (id: string) =>
    CONTENT.signals[e.scenarioId].find((i) => i.id === id)?.label ?? id
  const reads = (signalsPanel(s)?.indicators ?? [])
    .flatMap((i) => i.reads.map((r) => ({ ...r, label: i.label })))
    .sort((a, b) => (a.quarter < b.quarter ? -1 : 1))
  const window =
    e.decoy.quarters.length > 0
      ? `${fmt.quarter(e.decoy.quarters[0])}–${fmt.quarter(e.decoy.quarters.at(-1)!)}`
      : ''
  return (
    <div class="screen">
      <div class="center-page">
        <div class="panel end-card chapter-card">
          <div class="label">{t('ui.act3.chapter.label')}</div>
          <h1 class="screen-title">
            {t('ui.act3.reveal.market', { name: e.scenarioName })}
          </h1>
          <p class="pitch">
            {t('ui.act3.reveal.title', {
              title: tDynamic(`ui.chapter2.title.${o.title}`, o.title),
            })}
          </p>

          <div class="panel p">
            <span class="label">{t('ui.act3.reveal.happened')}</span>
            <p style={{ margin: 0 }}>
              {t('ui.act3.reveal.trigger', {
                quarter: fmt.quarter(e.triggerQuarter),
                card: tDynamic(`event.${o.details.triggerCard}.title`, ''),
              })}
            </p>
          </div>

          <div class="panel p">
            <span class="label">{t('ui.act3.reveal.decoy')}</span>
            <strong>
              {labelOf(e.decoy.indicator)}, {window}
            </strong>
            <p class="num-s" style={{ margin: 0 }}>
              {o.details.decoyReason}
            </p>
            <p class="num-s muted" style={{ margin: 0 }}>
              {t('ui.act3.reveal.tell', { tell: o.details.decoyTell })}
            </p>
          </div>

          <div class="panel p">
            <span class="label">{t('ui.act3.reveal.reads')}</span>
            {reads.length === 0 ? (
              <p class="num-s muted" style={{ margin: 0 }}>
                {t('ui.act3.reveal.no_reads')}
              </p>
            ) : (
              reads.map((r, i) => (
                <div key={i} class="num-s">
                  {t('ui.act3.signals.read_line', {
                    quarter: fmt.quarter(r.quarter),
                    indicator: r.label,
                    low: r.low,
                    high: r.high,
                  })}
                </div>
              ))
            )}
            <span class="num-s muted">{t('ui.act3.reveal.score_later')}</span>
          </div>

          <div class="end-tiles">
            <div class="panel tile">
              <span class="label">{t('ui.act3.reveal.net_worth')}</span>
              <span class="num-xl">{fmt.money(o.netWorthUsd)}</span>
              <span class="num-s muted">
                {t('ui.act3.reveal.at_entry', {
                  value: fmt.money(o.entryNetWorthUsd),
                })}
              </span>
            </div>
            <div class="panel tile">
              <span class="label">{t('ui.act3.reveal.growth')}</span>
              <span class="num-xl">
                {o.growth === null ? '—' : `${o.growth.toFixed(2)}×`}
              </span>
              <span class="num-s muted">
                {t('ui.act3.reveal.valuation', {
                  from: fmt.money(o.entryValuationUsd),
                  to: fmt.money(o.valuationUsd),
                })}
              </span>
            </div>
            <div class="panel tile">
              <span class="label">{t('ui.act3.reveal.survival')}</span>
              <span class="num-xl">
                {t(o.survived ? 'ui.act3.reveal.survived' : 'ui.act3.reveal.bust')}
              </span>
            </div>
          </div>

          <div class="panel p">
            <span class="label">{t('ui.act3.reveal.rivals')}</span>
            <table class="num-s">
              <tbody>
                {e.rivalFates.map((r) => (
                  <tr key={r.rival}>
                    <td>
                      <strong>{r.name}</strong>
                    </td>
                    <td>
                      {o.details.withheldRivals.includes(r.rival)
                        ? t('ui.act3.reveal.withheld')
                        : r.fate}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p class="num-s muted">{t('ui.act3.reveal.continues')}</p>
          <button
            type="button"
            class="btn btn-primary"
            onClick={props.onNew}
          >
            {t('ui.act3.chapter.back')}
          </button>
        </div>
      </div>
    </div>
  )
}
