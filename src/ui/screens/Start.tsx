// Title screen: new career, or Act II from the preset company (A2-01), with an optional seed.
// (The end screens are in End.tsx.)
import { useState } from 'preact/hooks'
import { t } from '../../i18n/t.ts'
import type { GameState } from '../../sim/state.ts'
import { ImportBox, saveLabel } from '../components/saves.tsx'

export function TitleScreen(props: {
  onStart: (seedText: string) => void
  /** "Start at Act II": the standalone preset company (scope 0.2 §2.10). */
  onStartAct2: (seedText: string) => void
  /** "Start in 2009 (prologue)": Act 0 (Alpha 0.3). */
  onStartPrologue: (seedText: string) => void
  /** Games saved in this browser (null when there's none). */
  saves: { autosave: GameState | null; manual: GameState | null }
  onLoad: (state: GameState) => void
}) {
  const [seed, setSeed] = useState('')
  const [importing, setImporting] = useState(false)
  const { autosave, manual } = props.saves
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
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button type="submit" class="btn btn-primary">
              {t('ui.title.new_career')}
            </button>
            <button
              type="button"
              class="btn"
              title={t('ui.title.start_prologue_note')}
              onClick={() => props.onStartPrologue(seed.trim())}
            >
              {t('ui.title.start_prologue')}
            </button>
            <button
              type="button"
              class="btn"
              title={t('ui.title.start_act2_note')}
              onClick={() => props.onStartAct2(seed.trim())}
            >
              {t('ui.title.start_act2')}
            </button>
            {autosave && (
              <button
                type="button"
                class="btn"
                title={saveLabel(autosave)}
                onClick={() => props.onLoad(autosave)}
              >
                {t('ui.title.continue', { label: saveLabel(autosave) })}
              </button>
            )}
            {manual && (
              <button
                type="button"
                class="btn"
                onClick={() => props.onLoad(manual)}
              >
                {t('ui.title.load_manual', { label: saveLabel(manual) })}
              </button>
            )}
            <button
              type="button"
              class="btn"
              aria-expanded={importing}
              onClick={() => setImporting(!importing)}
            >
              {t('ui.title.import')}
            </button>
          </div>
          {importing && <ImportBox onLoad={props.onLoad} />}
        </form>
      </div>
    </div>
  )
}
