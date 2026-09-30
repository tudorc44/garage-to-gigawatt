// Title screen (wireframe P0-01): Continue, New career (expands in place into "Start in 2009
// (prologue)" and "Start in 2017", with Act II's preset below), Load, Import, and the saved careers
// with a Prologue / Act I / Act II tag. An optional seed. (The end screens are in End.tsx.)
import { useState } from 'preact/hooks'
import { t } from '../../i18n/t.ts'
import { quarterName } from '../../sim/selectors.ts'
import type { ComponentChildren } from 'preact'
import { inActII, inActIII, type GameState } from '../../sim/state.ts'
import { ImportBox, saveLabel } from '../components/saves.tsx'
import { fmt } from '../format.ts'

/** A save's act tag: Prologue, Act I or Act II. */
export function actTag(s: GameState): string {
  return t(
    s.act === 0
      ? 'ui.title.tag_prologue'
      : inActIII(s)
        ? 'ui.title.tag_act3'
        : inActII(s)
          ? 'ui.title.tag_act2'
          : 'ui.title.tag_act1',
  )
}

export function TitleScreen(props: {
  onStart: (seedText: string) => void
  /** "Start at Act II": the standalone preset company (scope 0.2 §2.10). */
  onStartAct2: (seedText: string) => void
  /** "Start in 2009 (prologue)": Act 0 (Alpha 0.3). */
  onStartPrologue: (seedText: string) => void
  /** Games saved in this browser (null when there's none). */
  saves: {
    autosave: GameState | null
    manual: GameState | null
    act2?: GameState | null
  }
  onLoad: (state: GameState) => void
  /** Test builds only (M13): the Act III preview's quick start, under the other starts. */
  preview?: ComponentChildren
}) {
  const [seed, setSeed] = useState('')
  const [open, setOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const { autosave, manual } = props.saves
  const careers = (
    [
      ['ui.title.slot_autosave', autosave],
      ['ui.title.slot_manual', manual],
      ['ui.title.slot_act2', props.saves.act2 ?? null],
    ] as const
  ).filter((x): x is [(typeof x)[0], GameState] => x[1] !== null)
  return (
    <div class="screen g-paper">
      <div class="title-grid">
        <div class="panel title-card">
          <div class="label">{t('ui.title.act')}</div>
          <h1 class="game-title">{t('ui.brand')}</h1>
          <p class="pitch">{t('ui.title.pitch')}</p>
          <div class="title-nav">
            {autosave && (
              <button
                type="button"
                class="btn btn-primary"
                onClick={() => props.onLoad(autosave)}
              >
                {t('ui.title.continue_tagged', {
                  label: saveLabel(autosave),
                  tag: actTag(autosave),
                })}
              </button>
            )}
            <button
              type="button"
              class="btn"
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              {t('ui.title.new_career_menu')}
            </button>
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
          <span class="num-s muted">{t('ui.title.version')}</span>
        </div>
        <div class="title-side">
          {open && (
            <div class="panel p">
              <span class="label">{t('ui.title.choose_start')}</span>
              <label class="field">
                <span class="label">{t('ui.title.seed')}</span>
                <input
                  type="text"
                  value={seed}
                  placeholder={t('ui.title.seed_placeholder')}
                  onInput={(e) =>
                    setSeed((e.target as HTMLInputElement).value)
                  }
                />
              </label>
              <div class="start-cards">
                <div class="panel p start-card">
                  <div class="row-between">
                    <strong>{t('ui.title.start_prologue')}</strong>
                    <span class="tag">{t('ui.title.tag_new')}</span>
                  </div>
                  <span>{t('ui.title.prologue_line')}</span>
                  <span class="num-s muted">
                    {t('ui.title.start_prologue_note')}
                  </span>
                  <button
                    type="button"
                    class="btn btn-primary"
                    onClick={() => props.onStartPrologue(seed.trim())}
                  >
                    {t('ui.title.start_prologue_go')}
                  </button>
                </div>
                <div class="panel p start-card">
                  <strong>{t('ui.title.start_2017')}</strong>
                  <span>{t('ui.title.start_2017_line')}</span>
                  <span class="num-s muted">
                    {t('ui.title.start_2017_note')}
                  </span>
                  <button
                    type="button"
                    class="btn"
                    onClick={() => props.onStart(seed.trim())}
                  >
                    {t('ui.title.new_career')}
                  </button>
                </div>
              </div>
              <button
                type="button"
                class="btn btn-ghost"
                title={t('ui.title.start_act2_note')}
                onClick={() => props.onStartAct2(seed.trim())}
              >
                {t('ui.title.start_act2')}
              </button>
              {props.preview}
            </div>
          )}
          {careers.length > 0 && (
            <div class="panel p">
              <span class="label">{t('ui.title.saved_careers')}</span>
              <table class="num-s" style={{ width: '100%' }}>
                <tbody>
                  {careers.map(([slot, s]) => (
                    <tr key={slot}>
                      <td>{t(slot)}</td>
                      <td>
                        <span class="tag">{actTag(s)}</span>
                      </td>
                      <td class="num">{fmt.quarter(quarterName(s.quarter))}</td>
                      <td class="num">
                        {fmt.money(s.cash)}
                        {s.treasury.BTC > 0 &&
                          ` · ${fmt.crypto(s.treasury.BTC, 'BTC')}`}
                      </td>
                      <td>
                        <button
                          type="button"
                          class="btn"
                          onClick={() => props.onLoad(s)}
                        >
                          {t('ui.title.load')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
