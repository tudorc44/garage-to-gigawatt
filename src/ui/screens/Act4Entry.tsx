// Act IV's ways in and its full-screen moments (M27.6, doc 33 §17; no wireframes: docs/wireframes/act4/README.md). The app
// loads this file lazily, so it is its own chunk and the main bundle stays small:
// - A4-01, the intro: what the company carries in (act4Entry), the three theatres, what's new, then "Enter 2031 →";
// - the chapter report: a stub until M32 (the reveal of the future and the lunar grade, the titles, the finale).
// "Continue to Act IV" is a button on the Act III chapter report (Act3Reveal.tsx); the test-build quick starts and the
// ?future= forcing are in Act4Preview.tsx and app.tsx.
import { t, type MessageKey } from '../../i18n/t.ts'
import type { GameState } from '../../sim/state.ts'
import { fmt } from '../format.ts'

/** A4-01: what the company carries into Act IV, the three theatres, what's new, and "Enter 2031 →". */
export function Act4Intro(props: { state: GameState; onEnter: () => void }) {
  const e = props.state.act4Entry
  const rows: [MessageKey, string][] = e
    ? [
        ['ui.act3.intro.valuation', fmt.money(e.valuationUsd)],
        ['ui.act3.intro.net_worth', fmt.money(e.founderNetWorthUsd)],
        ['ui.act3.intro.cash', fmt.money(e.cashUsd)],
        ['ui.act3.intro.debt', fmt.money(e.debtUsd)],
        ['ui.act3.intro.energized', fmt.power(e.energizedMw * 1000)],
        ['ui.act3.intro.contracted', fmt.power(e.contractedMw * 1000)],
        ['ui.act3.intro.rating', e.creditRating ?? t('ui.top.not_rated')],
      ]
    : []
  const theatres: [MessageKey, MessageKey][] = [
    ['ui.act4.intro.ground', 'ui.act4.intro.ground_body'],
    ['ui.act4.intro.orbit', 'ui.act4.intro.orbit_body'],
    ['ui.act4.intro.moon', 'ui.act4.intro.moon_body'],
  ]
  return (
    <div class="screen">
      <div class="center-page">
        <div class="panel end-card chapter-card act-intro" data-act4-intro>
          <div class="label">{t('ui.act4.intro.label')}</div>
          <h1 class="screen-title">{t('ui.act4.intro.title')}</h1>
          <p class="num-s">{t('ui.act4.intro.lead')}</p>
          <div class="panel act-intro-box">
            <div class="label">{t('ui.act4.intro.carried')}</div>
            <table>
              <tbody>
                {rows.map(([key, value]) => (
                  <tr key={key}>
                    <td>{t(key)}</td>
                    <td class="r num">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <span class="num-s muted">{t('ui.act4.intro.scored')}</span>
          </div>
          <div class="panel act-intro-box">
            <div class="label">{t('ui.act4.intro.theatres')}</div>
            <table>
              <tbody>
                {theatres.map(([name, body]) => (
                  <tr key={name}>
                    <td>
                      <strong>{t(name)}</strong>
                    </td>
                    <td class="num-s">{t(body)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div class="row-between">
            <span class="num-s muted">{t('ui.act4.intro.foot')}</span>
            <button type="button" class="btn btn-primary" onClick={props.onEnter}>
              {t('ui.act4.intro.enter')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// The Act IV chapter report with the reveal (A4-11, M32.2) and the campaign finale (A4-12) live in their own files and
// load with this one.
export { Act4Chapter } from './Act4Reveal.tsx'
