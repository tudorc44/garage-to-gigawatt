// Title screen (new career, optional seed) and the two end screens:
// end of Act I (the Merge) and game over.
import { useState } from 'preact/hooks'
import { t } from '../../i18n/t.ts'
import { quarterName } from '../../sim/selectors.ts'
import type { GameState } from '../../sim/state.ts'
import { fmt } from '../format.ts'
import { say } from '../names.ts'

export function TitleScreen(props: { onStart: (seedText: string) => void }) {
  const [seed, setSeed] = useState('')
  return (
    <div class="screen">
      <div class="center-page">
        <form
          class="panel title-card"
          onSubmit={(e) => {
            e.preventDefault()
            props.onStart(seed.trim())
          }}
        >
          <div class="label">{t('ui.title.act')}</div>
          <h1 class="game-title">{t('ui.brand')}</h1>
          <p class="pitch">{t('ui.title.pitch')}</p>
          <label class="field">
            <span class="label">{t('ui.title.seed')}</span>
            <input
              type="text"
              value={seed}
              placeholder={t('ui.title.seed_placeholder')}
              onInput={(e) => setSeed((e.target as HTMLInputElement).value)}
            />
          </label>
          <div>
            <button type="submit" class="btn btn-primary">
              {t('ui.title.new_career')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function EndScreen(props: {
  state: GameState
  onReplay: () => void
  onNew: () => void
}) {
  const s = props.state
  const over = s.phase === 'gameover'
  const last = s.reports.at(-1)
  const peak = s.reports.reduce(
    (a, b) => (!a || b.valuationUsd > a.valuationUsd ? b : a),
    last,
  )
  const lastNotes = s.log.filter((e) => e.quarter === s.quarter)
  return (
    <div class="screen">
      <div class="center-page">
        <div class="panel end-card">
          <div class="label">
            {t(over ? 'ui.end.over_label' : 'ui.end.act_label')}
          </div>
          <h1 class="screen-title">
            {over
              ? t('ui.end.over_title', {
                  quarter: fmt.quarter(quarterName(s.quarter)),
                })
              : t('ui.end.act_title')}
          </h1>
          <p class="pitch">
            {t(over ? 'ui.end.over_body' : 'ui.end.act_body')}
          </p>
          <div class="end-tiles">
            <div class="panel tile">
              <span class="label">{t('ui.end.final_value')}</span>
              <span class="num-xl">
                {fmt.money(last?.valuationUsd ?? s.cash)}
              </span>
              <span class="num-s muted">
                {t('ui.end.cash', { value: fmt.money(s.cash) })}
              </span>
            </div>
            <div class="panel tile">
              <span class="label">{t('ui.end.peak')}</span>
              <span class="num-xl">{fmt.money(peak?.valuationUsd ?? 0)}</span>
              <span class="num-s muted">
                {peak ? fmt.quarter(peak.quarter) : ''}
              </span>
            </div>
            <div class="panel tile">
              <span class="label">{t('ui.end.quarters')}</span>
              <span class="num-xl">{s.reports.length}</span>
              <span class="num-s muted">{t('ui.end.of_turns', { n: 23 })}</span>
            </div>
          </div>
          {over && (
            <div class="log">
              <span class="label">{t('ui.end.what_happened')}</span>
              {lastNotes.map((e, i) => (
                <div key={i}>{say(e)}</div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              class="btn btn-primary"
              onClick={props.onReplay}
            >
              {t('ui.end.replay', { seed: String(s.seed) })}
            </button>
            <button type="button" class="btn" onClick={props.onNew}>
              {t('ui.end.new')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
