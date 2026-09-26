// Save and load (scope §2.13): the in-game Save / load dialog and the pieces the title screen
// shares. The app provides the current game and a way to switch to another through SaveContext.
import { createContext } from 'preact'
import { useContext, useState } from 'preact/hooks'
import { t } from '../../i18n/t.ts'
import {
  decodeSave,
  encodeSave,
  readSlot,
  writeSlot,
  type Slot,
} from '../../platform/saves.ts'
import { quarterName } from '../../sim/selectors.ts'
import type { GameState } from '../../sim/state.ts'
import { fmt } from '../format.ts'
import { say } from '../names.ts'
import { Dialog } from './basics.tsx'

export interface SaveApi {
  /** The game being played right now. */
  current: () => GameState | null
  /** Switch to a loaded game. */
  load: (state: GameState) => void
}

export const SaveContext = createContext<SaveApi | null>(null)

/** "Q2 2019 · week 5 · cash $1.2M" */
export function saveLabel(s: GameState): string {
  return t(s.phase === 'live' ? 'ui.save.label_live' : 'ui.save.label', {
    quarter: fmt.quarter(quarterName(s.quarter)),
    week: s.week + 1,
    cash: fmt.money(s.cash),
  })
}

/** Paste-a-save box: decodes the text and hands the game over, or shows what's wrong. */
export function ImportBox(props: { onLoad: (s: GameState) => void }) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  return (
    <label class="field">
      <span class="label">{t('ui.save.import_label')}</span>
      <textarea
        class="export-box"
        rows={3}
        value={text}
        placeholder={t('ui.save.import_placeholder')}
        onInput={(e) => setText((e.target as HTMLTextAreaElement).value)}
      />
      {error && <span class="num-s loss">{error}</span>}
      <div>
        <button
          type="button"
          class="btn"
          disabled={text.trim() === ''}
          onClick={() => {
            const r = decodeSave(text)
            if (r.ok) props.onLoad(r.state)
            else setError(say(r.error))
          }}
        >
          {t('ui.save.import')}
        </button>
      </div>
    </label>
  )
}

/** The Save / load dialog: manual slot, autosave, export and import. */
export function SaveDialog({ onClose }: { onClose: () => void }) {
  const api = useContext(SaveContext)
  const [message, setMessage] = useState<string | null>(null)
  const [exported, setExported] = useState<string | null>(null)
  const [, refresh] = useState(0)
  if (!api) return null
  const now = api.current()
  const slots: Slot[] = ['manual', 'autosave']
  const load = (s: GameState) => {
    api.load(s)
    onClose()
  }
  return (
    <Dialog title={t('ui.save.title')} onClose={onClose}>
      <p class="num-s muted" style={{ margin: 0 }}>
        {t('ui.save.note')}
      </p>
      {now && (
        <div class="row-between">
          <span>{t('ui.save.now', { label: saveLabel(now) })}</span>
          <button
            type="button"
            class="btn btn-primary"
            onClick={() => {
              setMessage(
                writeSlot('manual', now)
                  ? t('ui.save.saved', { label: saveLabel(now) })
                  : t('ui.save.no_storage'),
              )
              refresh((n) => n + 1)
            }}
          >
            {t('ui.save.save')}
          </button>
        </div>
      )}
      {message && (
        <p class="num-s" style={{ margin: 0 }}>
          {message}
        </p>
      )}
      {slots.map((slot) => {
        const saved = readSlot(slot)
        return (
          <div class="row-between" key={slot}>
            <span>
              <span class="label">{t(`ui.save.slot.${slot}`)}</span>{' '}
              <span class="num-s muted">
                {saved ? saveLabel(saved) : t('ui.save.empty')}
              </span>
            </span>
            <button
              type="button"
              class="btn"
              disabled={!saved}
              onClick={() => saved && load(saved)}
            >
              {t('ui.save.load')}
            </button>
          </div>
        )
      })}
      {now && (
        <div class="row-between">
          <span class="label">{t('ui.save.export_label')}</span>
          <button
            type="button"
            class="btn"
            onClick={() => {
              const text = encodeSave(now)
              setExported(text)
              try {
                void navigator.clipboard?.writeText(text).catch(() => undefined)
              } catch {
                // The box below shows it for copying by hand.
              }
            }}
          >
            {t('ui.save.export')}
          </button>
        </div>
      )}
      {exported !== null && (
        <textarea
          class="export-box"
          readOnly
          rows={3}
          value={exported}
          onFocus={(e) => (e.target as HTMLTextAreaElement).select()}
        />
      )}
      <ImportBox onLoad={load} />
    </Dialog>
  )
}
