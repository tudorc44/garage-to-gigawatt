// Act IV's ways in and its full-screen moments (M27.6, doc 33 §17; no wireframes: docs/wireframes/act4/README.md). The app
// loads this file lazily, so it is its own chunk and the main bundle stays small:
// - A4-01, the intro: what the company carries in (act4Entry), the three theatres, what's new, then "Enter 2031 →";
// - the chapter report with the reveal (A4-11) and the campaign finale (A4-12), from Act4Reveal.tsx;
// - A4-13 (M32.4): New career → "Start at Act IV (2031)" with the three preset companies, and Act IV's Scenario Mode
//   (unlocked once an Act IV chapter report has been reached on this device).
// "Continue to Act IV" is a button on the Act III chapter report (Act3Reveal.tsx); the test-build quick starts and the
// ?future= forcing are in Act4Preview.tsx and app.tsx.
import { useState } from 'preact/hooks'
import { FUTURE_IDS, type FutureId } from '../../content/index.ts'
import { PRESETS_IV } from '../../content/presetsAct4.ts'
import { t, tDynamic, type MessageKey } from '../../i18n/t.ts'
import type { GameState } from '../../sim/state.ts'
import { presetAct4Company, type Act4PresetId } from '../act4PresetStart.ts'
import { fmt } from '../format.ts'

/** The three preset cards (A4-13): name, valuation, MW, cloud MW, debt, rating and a line; one is picked. */
function PresetCardsIv(props: { pick: Act4PresetId; onPick: (id: Act4PresetId) => void }) {
  return (
    <div class="start-cards three">
      {PRESETS_IV.map((p) => (
        <button
          key={p.id}
          type="button"
          class={`panel p start-card preset-card${props.pick === p.id ? ' on' : ''}`}
          aria-pressed={props.pick === p.id}
          onClick={() => props.onPick(p.id)}
          data-preset-iv={p.id}
        >
          <strong>{tDynamic(`ui.preset_iv.${p.id}.name`, p.id)}</strong>
          <span class="kv num-s">
            <span>{t('ui.preset.valuation')}</span>
            <span class="num">~{fmt.money(p.valuation_usd_m * 1e6)}</span>
          </span>
          <span class="kv num-s">
            <span>{t('ui.preset.mw')}</span>
            <span class="num">{fmt.power(p.energized_mw * 1000)}</span>
          </span>
          <span class="kv num-s">
            <span>{t('ui.preset.debt')}</span>
            <span class="num">{fmt.money(p.debt_usd_m * 1e6)}</span>
          </span>
          <span class="kv num-s">
            <span>{t('ui.preset.rating')}</span>
            <span class="num">{p.rating ?? '—'}</span>
          </span>
          <span class="num-s">{tDynamic(`ui.preset_iv.${p.id}.line`, '')}</span>
        </button>
      ))}
    </div>
  )
}

/** Plays a preset's company to 2030Q4 (after the "Playing…" line paints), then hands it on. */
function usePresetIvStart(onReady: (end: GameState, id: Act4PresetId) => void) {
  const [busy, setBusy] = useState(false)
  const start = (id: Act4PresetId) => {
    setBusy(true)
    setTimeout(() => {
      void presetAct4Company(id).then((end) => {
        setBusy(false)
        onReady(end, id)
      })
    }, 30)
  }
  return { busy, start }
}

/** A4-13 (M32.4): New career → "Start at Act IV (2031)": pick a preset company, then "Start in 2031 →". */
export function StartAct4(props: { onReady: (end: GameState, preset: Act4PresetId) => void }) {
  const [open, setOpen] = useState(false)
  const [pick, setPick] = useState<Act4PresetId>('fortress')
  const { busy, start } = usePresetIvStart(props.onReady)
  return (
    <div class="panel p start-card" data-start-act4>
      <button type="button" class={`btn${open ? ' btn-primary' : ''}`} aria-expanded={open} onClick={() => setOpen(!open)}>
        {t('ui.title.start_act4')}
      </button>
      <span class="num-s muted">{t('ui.title.start_act4_line')}</span>
      {open && (
        <>
          <PresetCardsIv pick={pick} onPick={setPick} />
          <button
            type="button"
            class="btn btn-primary"
            style={{ alignSelf: 'flex-end' }}
            disabled={busy}
            onClick={() => start(pick)}
            data-start-2031
          >
            {t('ui.title.start_act4_go')}
          </button>
          {busy && (
            <p class="num-s" role="status">
              {t('ui.act4.quick.playing')}
            </p>
          )}
        </>
      )}
    </div>
  )
}

/**
 * A4-13 (M32.4): Act IV's Scenario Mode. Locked until an Act IV chapter report has been reached on this device;
 * unlocked, a preset and one of the four futures shown openly, then a start. The finale marks the campaign "scenario
 * known".
 */
export function ScenarioModeAct4(props: {
  unlocked: boolean
  onReady: (end: GameState, preset: Act4PresetId, future: FutureId) => void
}) {
  const [pick, setPick] = useState<Act4PresetId>('fortress')
  const [future, setFuture] = useState<FutureId>('f1')
  const { busy, start } = usePresetIvStart((end, id) => props.onReady(end, id, future))
  if (!props.unlocked)
    return (
      <div class="panel p" data-scenario-mode-iv="locked">
        <span class="label">{t('ui.scenario_mode_iv.locked_label')}</span>
        <strong>{t('ui.scenario_mode_iv.what')}</strong>
        <span class="num-s muted">{t('ui.scenario_mode_iv.locked')}</span>
      </div>
    )
  return (
    <div class="panel p" data-scenario-mode-iv="unlocked">
      <span class="label">{t('ui.scenario_mode_iv.unlocked_label')}</span>
      <strong>{t('ui.scenario_mode_iv.what')}</strong>
      <PresetCardsIv pick={pick} onPick={setPick} />
      {FUTURE_IDS.map((id) => (
        <button
          key={id}
          type="button"
          class={`row-between scenario-opt${future === id ? ' on' : ''}`}
          aria-pressed={future === id}
          onClick={() => setFuture(id)}
          data-future={id}
        >
          <span>{tDynamic(`act4.reveal.${id}.name`, id)}</span>
          <span class="num-s muted">{tDynamic(`ui.scenario_mode_iv.${id}.line`, '')}</span>
        </button>
      ))}
      <button
        type="button"
        class="btn btn-primary"
        style={{ alignSelf: 'flex-end' }}
        disabled={busy}
        onClick={() => start(pick)}
        data-scenario-iv-start
      >
        {t('ui.scenario_mode_iv.go')}
      </button>
      {busy && (
        <p class="num-s" role="status">
          {t('ui.act4.quick.playing')}
        </p>
      )}
    </div>
  )
}

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
