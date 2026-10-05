// The ways into Act III and its two full-screen moments, in every build since M20.2 (the Act III public release;
// before, they were the test-build preview, M13 and M18.4). The app loads this file lazily, so it is its own chunk
// and the main bundle stays small:
// - A3-12: New career → "Start at Act III (2027)" with the three preset companies, and Scenario Mode (unlocked
//   once an Act III chapter report has been reached on this device);
// - "Continue to Act III" on the Act II chapter report: the player's own company;
// - the intro (A3-01): what the company carries in (act3Entry) and what's new, then "Enter 2027 →";
// - the chapter report with the reveal (A3-11).
// The quick-start companies and the ?scenario= forcing stay test-build only (Act3Preview.tsx, app.tsx).
import { useState } from 'preact/hooks'
import {
  CONTENT,
  SCENARIO_IDS,
  type ScenarioId,
} from '../../content/index.ts'
import { t, type MessageKey } from '../../i18n/t.ts'
import type { GameState } from '../../sim/state.ts'
import { presetAct3Company, type PresetId } from '../act3PresetStart.ts'
import { fmt } from '../format.ts'
import { Act3Reveal } from './Act3Reveal.tsx'

/** The three preset cards (A3-12): name, valuation, MW, debt, rating and the summary; one is picked. */
function PresetCards(props: { pick: PresetId; onPick: (id: PresetId) => void }) {
  return (
    <div class="start-cards three">
      {CONTENT.act3Presets.map((p) => (
        <button
          key={p.id}
          type="button"
          class={`panel p start-card preset-card${props.pick === p.id ? ' on' : ''}`}
          aria-pressed={props.pick === p.id}
          onClick={() => props.onPick(p.id)}
          data-preset={p.id}
        >
          <span class="label">{t(`ui.preset.${p.id}.band` as MessageKey)}</span>
          <strong>{p.label}</strong>
          <span class="kv num-s">
            <span>{t('ui.preset.valuation')}</span>
            {/* (M18.8: "~$2.7B": a preset's value is its 2026Q4 company's, rounded) */}
            <span class="num">~{fmt.money(p.valuationUsd)}</span>
          </span>
          <span class="kv num-s">
            <span>{t('ui.preset.mw')}</span>
            <span class="num">{fmt.power(p.energizedMw * 1000)}</span>
          </span>
          <span class="kv num-s">
            <span>{t('ui.preset.debt')}</span>
            <span class="num">{fmt.money(p.debtUsd)}</span>
          </span>
          <span class="kv num-s">
            <span>{t('ui.preset.rating')}</span>
            <span class="num">{p.rating}</span>
          </span>
          <span class="num-s">{t(p.summaryKey as MessageKey)}</span>
        </button>
      ))}
    </div>
  )
}

/** Plays a preset's company to 2026Q4 (after the "Playing…" line paints), then hands it on. */
function usePresetStart(onReady: (end: GameState) => void) {
  const [busy, setBusy] = useState(false)
  const start = (id: PresetId) => {
    setBusy(true)
    setTimeout(() => {
      void presetAct3Company(id).then((end) => {
        setBusy(false)
        onReady(end)
      })
    }, 30)
  }
  return { busy, start }
}

/** A3-12 (M18.4): New career → "Start at Act III (2027)": pick a preset company, then "Start in 2027 →". */
export function StartAct3(props: { onReady: (end: GameState) => void }) {
  const [open, setOpen] = useState(false)
  const [pick, setPick] = useState<PresetId>('good')
  const { busy, start } = usePresetStart(props.onReady)
  return (
    <div class="panel p start-card" data-start-act3>
      <button
        type="button"
        class={`btn${open ? ' btn-primary' : ''}`}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {t('ui.title.start_act3')}
      </button>
      <span class="num-s muted">{t('ui.title.start_act3_line')}</span>
      {open && (
        <>
          <PresetCards pick={pick} onPick={setPick} />
          <button
            type="button"
            class="btn btn-primary"
            style={{ alignSelf: 'flex-end' }}
            disabled={busy}
            onClick={() => start(pick)}
            data-start-2027
          >
            {t('ui.title.start_act3_go')}
          </button>
          {busy && (
            <p class="num-s" role="status">
              {t('ui.act3.quick.playing')}
            </p>
          )}
        </>
      )}
    </div>
  )
}

/**
 * A3-12 (M18.4): Scenario Mode. Locked ("Finish Act III once to unlock.") until an Act III chapter report has been
 * reached on this device; unlocked, a preset and one of the four scenarios shown openly, then a start.
 */
export function ScenarioMode(props: {
  unlocked: boolean
  onReady: (end: GameState, scenario: ScenarioId) => void
}) {
  const [pick, setPick] = useState<PresetId>('good')
  const [scenario, setScenario] = useState<ScenarioId>('s0')
  const { busy, start } = usePresetStart((end) => props.onReady(end, scenario))
  if (!props.unlocked)
    return (
      <div class="panel p" data-scenario-mode="locked">
        <span class="label">{t('ui.scenario_mode.locked_label')}</span>
        <strong>{t('ui.scenario_mode.what')}</strong>
        <span class="num-s muted">{t('ui.scenario_mode.locked')}</span>
        <button type="button" class="btn" disabled style={{ alignSelf: 'flex-start' }}>
          {t('ui.scenario_mode.locked_button')}
        </button>
      </div>
    )
  return (
    <div class="panel p" data-scenario-mode="unlocked">
      <span class="label">{t('ui.scenario_mode.unlocked_label')}</span>
      <strong>{t('ui.scenario_mode.what')}</strong>
      <PresetCards pick={pick} onPick={setPick} />
      {SCENARIO_IDS.map((id) => (
        <button
          key={id}
          type="button"
          class={`row-between scenario-opt${scenario === id ? ' on' : ''}`}
          aria-pressed={scenario === id}
          onClick={() => setScenario(id)}
          data-scenario={id}
        >
          <span>{t(`ui.scenario_mode.${id}.name` as MessageKey)}</span>
          <span class="num-s muted">{t(`ui.scenario_mode.${id}.line` as MessageKey)}</span>
        </button>
      ))}
      <button
        type="button"
        class="btn btn-primary"
        style={{ alignSelf: 'flex-end' }}
        disabled={busy}
        onClick={() => start(pick)}
        data-scenario-start
      >
        {t('ui.scenario_mode.go')}
      </button>
      {busy && (
        <p class="num-s" role="status">
          {t('ui.act3.quick.playing')}
        </p>
      )}
    </div>
  )
}

/** The Act II chapter report's way on: "Continue to Act III" (M20.2: no longer marked "test build"). */
export function ContinueToAct3(props: { onClick: () => void }) {
  return (
    <button
      type="button"
      class="btn btn-primary"
      data-continue-act3
      onClick={props.onClick}
    >
      {t('ui.act3.continue')}
    </button>
  )
}

/** The end of Act III (2030Q4, or a game over): the chapter report with the reveal (M13.3, A3-11). */
export function Act3Chapter(props: {
  state: GameState
  onNew: () => void
  /** M27.6: continue the career into Act IV from the chapter report. */
  onContinueAct4?: () => void
}) {
  return <Act3Reveal {...props} />
}

/** A3-01, bare-bones: what the company carries into Act III, what's new, and "Enter 2027 →". */
export function Act3Intro(props: { state: GameState; onEnter: () => void }) {
  const e = props.state.act3Entry
  const rows: [MessageKey, string][] = e
    ? [
        ['ui.act3.intro.valuation', fmt.money(e.valuationUsd)],
        ['ui.act3.intro.net_worth', fmt.money(e.founderNetWorthUsd)],
        ['ui.act3.intro.cash', fmt.money(e.cashUsd)],
        ['ui.act3.intro.debt', fmt.money(e.debtUsd)],
        ['ui.act3.intro.energized', fmt.power(e.energizedMw * 1000)],
        ['ui.act3.intro.contracted', fmt.power(e.contractedMw * 1000)],
        [
          'ui.act3.intro.rating',
          e.creditRating ?? t('ui.top.not_rated'),
        ],
      ]
    : []
  const news: [MessageKey, MessageKey][] = [
    ['ui.act3.intro.new.signals', 'ui.act3.intro.new.signals_body'],
    ['ui.act3.intro.new.contracts', 'ui.act3.intro.new.contracts_body'],
    ['ui.act3.intro.new.density', 'ui.act3.intro.new.density_body'],
    ['ui.act3.intro.new.nuclear', 'ui.act3.intro.new.nuclear_body'],
    ['ui.act3.intro.new.political', 'ui.act3.intro.new.political_body'],
  ]
  return (
    <div class="screen">
      <div class="center-page">
        <div class="panel end-card chapter-card act-intro">
          <div class="label">{t('ui.act3.intro.label')}</div>
          <h1 class="screen-title">{t('ui.act3.intro.title')}</h1>
          <div class="panel act-intro-box">
            <div class="label">{t('ui.act3.intro.carried')}</div>
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
            <span class="num-s muted">{t('ui.act3.intro.scored')}</span>
          </div>
          <div class="panel act-intro-box">
            <div class="label">{t('ui.act3.intro.new')}</div>
            <table>
              <tbody>
                {news.map(([name, body]) => (
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
            <span class="num-s muted">{t('ui.act3.intro.foot')}</span>
            <button
              type="button"
              class="btn btn-primary"
              onClick={props.onEnter}
            >
              {t('ui.act3.intro.enter')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
