// Act V's entry screens (M49, the walking skeleton; doc 43 §2, §17): A5-01 the intro (what the company carries in, and
// how much of it the futures can move, §0.8), and the chapter report (a skeleton: the reveal, the reading score and the
// exit come with their milestones). Loaded lazily, in their own chunk, like Act IV's. Nothing here reads the future.
import { tDynamic } from '../../i18n/t.ts'
import type { GameState } from '../../sim/state.ts'
import { fmt } from '../format.ts'

const tx = (key: string, params?: Record<string, string | number>) => tDynamic(key, key, params)

/** A5-01: what the company carries into Act V, and "Start 2036". */
export function Act5Intro(props: { state: GameState; onEnter: () => void }) {
  const e = props.state.act5Entry
  const rows: [string, string][] = e
    ? [
        ['ui.act3.intro.valuation', fmt.money(e.valuationUsd)],
        ['ui.act3.intro.net_worth', fmt.money(e.founderNetWorthUsd)],
        ['ui.act3.intro.cash', fmt.money(e.cashUsd)],
        ['ui.act3.intro.debt', fmt.money(e.debtUsd)],
        ['ui.act3.intro.energized', fmt.power(e.energizedMw * 1000)],
        ['ui.act3.intro.contracted', fmt.power(e.contractedMw * 1000)],
      ]
    : []
  return (
    <div class="screen">
      <div class="center-page">
        <div class="panel end-card chapter-card act-intro" data-act5-intro>
          <div class="label">{tx('a5.intro.years')}</div>
          <h1 class="screen-title">{tx('a5.intro.title')}</h1>
          <p class="num-s">{tx('a5.intro.lead')}</p>
          <div class="panel act-intro-box">
            <table>
              <tbody>
                {rows.map(([key, value]) => (
                  <tr key={key}>
                    <td>{tx(key)}</td>
                    <td class="r num">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <span class="num-s muted">{tx('a5.intro.carry')}</span>
          </div>
          <p class="num-s">{tx('a5.intro.mw')}</p>
          <p class="num-s muted">{tx('a5.intro.scenarios')}</p>
          <div class="row-between">
            <span />
            <button type="button" class="btn btn-primary" onClick={props.onEnter}>
              {tx('a5.intro.cta')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** The Act V chapter report (M49 skeleton): the net worth and the growth multiple since 2036Q1. */
export function Act5Chapter(props: { state: GameState; onNew: () => void }) {
  const end = props.state.act5End
  return (
    <div class="screen">
      <div class="center-page">
        <div class="panel end-card chapter-card" data-act5-chapter>
          <div class="label">{tx('ui.act5.chapter.label')}</div>
          <h1 class="screen-title">{tx('ui.act5.chapter.title')}</h1>
          {end && (
            <p class="num-s">
              {tx('ui.act5.chapter.net_worth', {
                quarter: end.endQuarter,
                usd: fmt.money(end.founderNetWorthUsd),
                multiple: end.growthMultiple === null ? '—' : `${end.growthMultiple.toFixed(2)}×`,
              })}
            </p>
          )}
          <p class="num-s muted">{tx('ui.act5.chapter.skeleton')}</p>
          <div class="row-between">
            <span />
            <button type="button" class="btn btn-primary" onClick={props.onNew}>
              {tx('ui.act4.back_to_title')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
