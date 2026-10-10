// The campaign finale (M32.3; doc 33 §15.2, A4-12): the last screen of the game. The career ledger (one row per act
// played: the year, net worth, energized MW, the act's title), the career multiple on the starting wealth, the megawatt
// line from the first act's kW to 2035's ground, orbital and lunar power, and a short epilogue. Every number and line id
// comes from src/sim/finaleViews.ts; the words are in en.json.
import { t, tDynamic } from '../../i18n/t.ts'
import { finaleView } from '../../sim/finaleViews.ts'
import type { GameState } from '../../sim/state.ts'
import { fmt } from '../format.ts'

/** A multiple to read at a glance: "3,100×" or "2.4×". */
const multiple = (x: number) => (x >= 100 ? `${Math.round(x).toLocaleString('en-US')}×` : `${x.toFixed(1)}×`)

export function Act4Finale(props: { state: GameState; onNew: () => void }) {
  const v = finaleView(props.state)
  return (
    <div class="screen">
      <div class="center-page">
        <div class="panel end-card chapter-card act4-finale" data-act4-finale>
          <div class="label">{t('ui.finale.label')}</div>
          <h1 class="screen-title">{t(v.survived ? 'ui.finale.title' : 'ui.finale.title_out')}</h1>
          {v.scenarioKnown && <p class="num-s muted">{t('ui.finale.scenario_known')}</p>}

          <section data-finale-ledger>
            <h2 class="panel-title">{t('ui.finale.ledger')}</h2>
            <p class="num-s muted">
              {t(`ui.finale.start.${v.start.kind}`, {
                wealth: fmt.money(v.start.wealthUsd),
                power: fmt.power(v.start.kw),
                year: String(v.start.year),
              })}
            </p>
            <table class="num-s">
              <thead>
                <tr>
                  <th>{t('ui.finale.col.act')}</th>
                  <th class="r">{t('ui.finale.col.year')}</th>
                  <th class="r">{t('ui.finale.col.net_worth')}</th>
                  <th class="r">{t('ui.finale.col.mw')}</th>
                  <th>{t('ui.finale.col.title')}</th>
                </tr>
              </thead>
              <tbody>
                {v.rows.map((r) => (
                  <tr key={r.act}>
                    <td>{t(`ui.finale.act.${r.act}`)}</td>
                    <td class="r num">{r.year}</td>
                    <td class="r num">{r.netWorthUsd === null ? '—' : fmt.money(r.netWorthUsd)}</td>
                    <td class="r num">{r.mw === null ? '—' : fmt.power(r.mw * 1000)}</td>
                    <td>{r.title ? tDynamic(r.title, '') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section data-finale-multiple>
            <p class="num">
              {t('ui.finale.multiple', {
                from: fmt.money(v.start.wealthUsd),
                to: fmt.money(v.netWorthUsd),
                x: v.careerMultiple === null ? '—' : multiple(v.careerMultiple),
              })}
            </p>
            <p class="num-s">
              {t('ui.finale.megawatts', {
                start: fmt.power(v.megawatts.startKw),
                ground: fmt.power(v.megawatts.groundMw * 1000),
                orbit: fmt.power(v.megawatts.orbitMw * 1000),
                moon: fmt.power(v.megawatts.moonKwe),
              })}
            </p>
            <p class="num-s">{t('ui.finale.frontier', { title: tDynamic(`act4.frontier.${v.frontierTitleId}`, v.frontierTitleId) })}</p>
          </section>

          <section data-finale-epilogue>
            {v.epilogue.map((id) => (
              <p key={id} class="epilogue-line">
                {tDynamic(id, '')}
              </p>
            ))}
          </section>

          <div class="row-between">
            <span class="num-s muted">{t('ui.finale.thanks')}</span>
            <button type="button" class="btn btn-primary" onClick={props.onNew}>
              {t('ui.act4.back_to_title')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
