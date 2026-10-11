// Act V's entry screens (M49, the walking skeleton; doc 43 §2, §17): A5-01 the intro (what the company carries in, and
// how much of it the futures can move, §0.8), and the chapter report (a skeleton: the reveal, the reading score and the
// exit come with their milestones). Loaded lazily, in their own chunk, like Act IV's. Nothing here reads the future: the
// chapter report's reveal lives in Act5Reveal.tsx (M51), the one Act V screen allowed to.
import { useState } from 'preact/hooks'
import { PRESETS_V } from '../../content/presetsAct5.ts'
import { tDynamic } from '../../i18n/t.ts'
import type { GameState } from '../../sim/state.ts'
import { presetAct5Company, type Act5PresetId } from '../act5PresetStart.ts'
import { fmt } from '../format.ts'
import { Act5Reveal } from './Act5Reveal.tsx'

const tx = (key: string, params?: Record<string, string | number>) => tDynamic(key, key, params)

/**
 * Marks Act V's entry points (doc 43 §0.13: behind a dev flag until Act V is playable end to end). This module loads
 * only outside the production build, so the GitHub Pages build carries neither it nor this string (act3Gate.test.ts).
 */
export const ACT5_ENTRY_MARKER = 'g2g-act5-entry'

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
        <div class="panel end-card chapter-card act-intro" data-act5-intro data-flag={ACT5_ENTRY_MARKER}>
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

/**
 * M49 (doc 43 §3.4): New career → "Start at Act V (2036)": pick a preset company (it plays 2017–2035, carrying its Act
 * IV future), then "Start in 2036 →". The figures shown are the preset's at 2035Q4: nothing about the Act V future.
 */
export function StartAct5(props: { onReady: (end: GameState, preset: Act5PresetId) => void }) {
  const [open, setOpen] = useState(false)
  const [pick, setPick] = useState<Act5PresetId | null>(PRESETS_V[0]?.id ?? null)
  const [busy, setBusy] = useState(false)
  if (PRESETS_V.length === 0) return null
  const start = (id: Act5PresetId) => {
    setBusy(true)
    setTimeout(() => {
      void presetAct5Company(id).then((end) => {
        setBusy(false)
        props.onReady(end, id)
      })
    }, 30)
  }
  return (
    <div class="panel p start-card" data-start-act5 data-flag={ACT5_ENTRY_MARKER}>
      <button type="button" class={`btn${open ? ' btn-primary' : ''}`} aria-expanded={open} onClick={() => setOpen(!open)}>
        {tx('ui.title.start_act5')}
      </button>
      <span class="num-s muted">{tx('ui.title.start_act5_line')}</span>
      {open && (
        <>
          {PRESETS_V.map((p) => (
            <label key={p.id} class="num-s">
              <input type="radio" name="act5-preset" checked={pick === p.id} onChange={() => setPick(p.id)} />{' '}
              {tx(`ui.title.act5_preset.${p.id}`)}
              <br />
              <span class="muted">
                {tx('ui.title.act5_preset.figures', {
                  valuation: fmt.money(p.valuation_usd_m * 1e6),
                  netWorth: fmt.money(p.founder_net_worth_usd_m * 1e6),
                  mw: fmt.power(p.energized_mw * 1000),
                })}
              </span>
            </label>
          ))}
          <button
            type="button"
            class="btn btn-primary"
            style={{ alignSelf: 'flex-end' }}
            disabled={busy || !pick}
            onClick={() => pick && start(pick)}
            data-start-2036
          >
            {tx('ui.title.start_act5_go')}
          </button>
          {busy && (
            <p class="num-s" role="status">
              {tx('ui.act4.quick.playing')}
            </p>
          )}
        </>
      )}
    </div>
  )
}

/** The Act V chapter report (M49 skeleton; M51 the reveal): the net worth, the growth multiple, the future revealed. */
export function Act5Chapter(props: { state: GameState; onNew: () => void }) {
  const end = props.state.act5End
  return (
    <div class="screen">
      <div class="center-page">
        <div class="panel end-card chapter-card act4-reveal" data-act5-chapter>
          <div class="label">{tx('ui.act5.chapter.label')}</div>
          <h1 class="screen-title">{tx('ui.act5.chapter.title')}</h1>
          <Act5Reveal state={props.state} />
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
