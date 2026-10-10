// Act IV's chapter report with the reveal (M32.2; doc 33 §15.1, A4-11; layout in docs/wireframes/act4/README.md). The
// one screen besides the campaign finale that names the future: it shows only once 2035Q4 is done or the game is over.
// Everything comes from the reveal record (act4End, through act4Outcome): numbers and ids; the words are in en.json.
// Loaded with the Act IV intro (Act4Entry.tsx's lazy chunk).
import { useState } from 'preact/hooks'
import { t, tDynamic } from '../../i18n/t.ts'
import type { GameState } from '../../sim/state.ts'
import { act4Outcome } from '../../sim/systems/act4End.ts'
import { fmt } from '../format.ts'
import { Act4Finale } from './Act4Finale.tsx'
import { ActFinances } from '../components/financeSummary.tsx'

const ARROW = (s: number) => (s > 0 ? '▲' : s < 0 ? '▼' : '·')
const tonnes = (x: number) => Math.round(x).toLocaleString('en-US')
const QUARTERS = Array.from({ length: 20 }, (_, i) => `${2031 + Math.floor(i / 4)}Q${(i % 4) + 1}`)

/** A4-11, then (its button) A4-12 the campaign finale. */
export function Act4Chapter(props: { state: GameState; onNew: () => void }) {
  const [finale, setFinale] = useState(false)
  if (finale) return <Act4Finale state={props.state} onNew={props.onNew} />
  const o = act4Outcome(props.state)
  const e = o.end
  const f = e.futureId
  const reading = e.reading
  return (
    <div class="screen">
      <div class="center-page">
        <div class="panel end-card chapter-card act4-reveal" data-act4-chapter>
          <div class="label">{t('ui.act4.chapter.label')}</div>
          <h1 class="screen-title">{t(o.survived ? 'ui.act4.chapter.title' : 'ui.act4.chapter.title_out')}</h1>

          <section data-reveal-future>
            <h2 class="panel-title">{t('ui.act4.reveal.future', { name: tDynamic(`act4.reveal.${f}.name`, f) })}</h2>
            <p class="num-s">{tDynamic(`act4.reveal.${f}.lead`, '')}</p>
            {e.triggerQuarter && (
              <p class="num-s">
                {t('ui.act4.reveal.trigger', { quarter: fmt.quarter(e.triggerQuarter) })} {tDynamic(`act4.reveal.${f}.trigger`, '')}
              </p>
            )}
            {e.decoy && (
              <p class="num-s muted">
                {t('ui.act4.reveal.decoy', {
                  from: fmt.quarter(e.decoy.quarters[0]),
                  to: fmt.quarter(e.decoy.quarters.at(-1)!),
                })}{' '}
                {tDynamic(`act4.reveal.${f}.decoy`, '')}
              </p>
            )}
          </section>

          {reading && (
            <section data-reveal-reading>
              <h2 class="panel-title">
                {reading.score === null
                  ? t('ui.act4.reveal.reading_none')
                  : t('ui.act4.reveal.reading', {
                      score: reading.score,
                      title: tDynamic(`act3.reveal.title.${e.readingTitleId}`, ''),
                    })}
              </h2>
              {o.wording && <p class="num-s">{t(`ui.act4.reveal.wording.${o.wording}`)}</p>}
              <table class="num-s act4-timeline">
                <tbody>
                  <tr>
                    <th>{t('ui.act4.reveal.row.quarter')}</th>
                    {QUARTERS.map((q, i) => (
                      <td key={q} class={e.triggerQ === i ? 'trigger' : ''} title={q}>
                        {q.slice(2)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th>{t('ui.act4.reveal.row.ideal')}</th>
                    {QUARTERS.map((q, i) => (
                      <td key={q}>{ARROW(reading.perQuarter.find((p) => p.q === i)?.ideal ?? 0)}</td>
                    ))}
                  </tr>
                  <tr>
                    <th>{t('ui.act4.reveal.row.you')}</th>
                    {QUARTERS.map((q, i) => {
                      const p = reading.perQuarter.find((x) => x.q === i)
                      return (
                        <td key={q} class={p && p.value >= 1 ? 'gain' : p && p.value === 0 ? 'loss' : ''}>
                          {p ? ARROW(p.stance) : ''}
                        </td>
                      )
                    })}
                  </tr>
                </tbody>
              </table>
              <p class="num-s muted">
                {t('ui.act4.reveal.moves', {
                  n: (e.moves ?? []).filter((m) => m.sign !== 0).length,
                  matched: (e.moves ?? []).filter((m) => m.mark === 'match').length,
                  decoy: (e.moves ?? []).filter((m) => m.mark === 'decoy').length,
                })}
                {reading.penalty > 0 && ` ${t('ui.act4.reveal.penalty', { n: reading.penalty })}`}
              </p>
            </section>
          )}

          {e.lunar && (
            <section data-reveal-moon>
              <h2 class="panel-title">{t('ui.act4.reveal.ice', { grade: t(`ui.act4.reveal.grade.${e.lunar.grade}`) })}</h2>
              {e.lunar.sites.length === 0 ? (
                <p class="num-s muted">{t('ui.act4.reveal.no_sites')}</p>
              ) : (
                <table class="num-s">
                  <thead>
                    <tr>
                      <th>{t('ui.act4.reveal.col.site')}</th>
                      <th class="r">{t('ui.act4.reveal.col.estimate')}</th>
                      <th class="r">{t('ui.act4.reveal.col.truth')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {e.lunar.sites.map((s) => (
                      <tr key={s.site}>
                        <td>{tDynamic(`moon.site.${s.site}`, s.site)}</td>
                        <td class="r num">
                          {s.estimateT === null
                            ? t('ui.act4.reveal.not_prospected')
                            : `${tonnes(s.estimateT)} t (${tDynamic(`ui.moon.category.${s.category}`, s.category)})`}
                        </td>
                        <td class="r num">{`${tonnes(s.truthT)} t`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          )}

          {e.fleet && (
            <section data-reveal-fleet>
              <p class="num-s">
                {t('ui.act4.reveal.fleet', {
                  rate: fmt.pct(e.fleet.failurePctYr / 100, 1),
                  life: e.fleet.lifeYears,
                })}{' '}
                {e.fleet.telemetryAvgPctYr !== null &&
                  t('ui.act4.reveal.telemetry', { avg: fmt.pct(e.fleet.telemetryAvgPctYr / 100, 1) })}
              </p>
            </section>
          )}

          <table data-reveal-numbers>
            <tbody>
              <tr>
                <td>{t('ui.act4.chapter.end_quarter')}</td>
                <td class="r num">{fmt.quarter(o.endQuarter)}</td>
              </tr>
              <tr>
                <td>{t('ui.act4.chapter.net_worth')}</td>
                <td class="r num">{fmt.money(o.netWorthUsd)}</td>
              </tr>
              {/* M36.8 (answer 11a): the company's ventures, marked to milestones (part of the valuation) */}
              {props.state.reports.at(-1)?.venturesUsd !== undefined && (
                <tr data-reveal-ventures>
                  <td>{t('ui.cap2.val.ventures')}</td>
                  <td class="r num">{fmt.money(props.state.reports.at(-1)!.venturesUsd!)}</td>
                </tr>
              )}
              <tr>
                <td>{t('ui.act4.chapter.growth')}</td>
                <td class="r num">{o.growth === null ? '—' : `${o.growth.toFixed(2)}×`}</td>
              </tr>
              <tr>
                <td>{t('ui.act4.reveal.career')}</td>
                <td class="r">{tDynamic(`ui.chapter2.title.${e.careerTitleId}`, e.careerTitleId ?? '')}</td>
              </tr>
              <tr>
                <td>{t('ui.act4.reveal.frontier')}</td>
                <td class="r">{tDynamic(`act4.frontier.${e.frontierTitleId}`, e.frontierTitleId ?? '')}</td>
              </tr>
            </tbody>
          </table>

          {e.rivalFates && (
            <section data-reveal-rivals>
              <h2 class="panel-title">{t('ui.act4.reveal.rivals')}</h2>
              {e.rivalFates.map((r) => (
                <p key={r.rival} class="num-s">
                  <strong>{tDynamic(`rival.${r.rival}`, r.rival)}</strong>
                  {r.valueUsd !== null && !r.failed ? ` (${fmt.money(r.valueUsd)})` : ''}: {tDynamic(`act4.fate.${r.rival}.${f}`, '')}
                </p>
              ))}
              <p class="num-s muted">{t('ui.act4.reveal.fates_note')}</p>
            </section>
          )}

          {/* M37.5 (doc 39): the act's P&L in figures, its best and worst site */}
          <ActFinances state={props.state} act={4} />

          <div class="row-between">
            <button type="button" class="btn" onClick={props.onNew}>
              {t('ui.act4.back_to_title')}
            </button>
            <button type="button" class="btn btn-primary" data-to-finale onClick={() => setFinale(true)}>
              {t('ui.act4.reveal.to_finale')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
