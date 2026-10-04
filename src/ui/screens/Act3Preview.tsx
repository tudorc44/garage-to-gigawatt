// The Act III preview (M13; narrowed in M20.2): test builds only. Since the Act III public release (M20.2) the
// presets, Scenario Mode, "Continue to Act III", the intro and the chapter report are in every build
// (Act3Entry.tsx). What stays here is the title screen's quick start: a bot plays a fixed company from 2017 to
// 2026Q4 (sim bots, fixed seeds), then it enters Act III. The app imports this file only behind an inline mode
// check, so the GitHub Pages build doesn't contain it (a test builds the game and looks for PREVIEW_MARKER).
import { useState } from 'preact/hooks'
import { t } from '../../i18n/t.ts'
import type { GameState } from '../../sim/state.ts'
import {
  PREVIEW_MARKER,
  QUICK_STARTS,
  quickStartCompany,
  type QuickStartId,
} from '../act3QuickStart.ts'

/** The title screen's "Act III preview (test build)": pick a company; it plays to 2026Q4, then enters. */
export function QuickStart(props: { onReady: (end: GameState) => void }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const start = (id: QuickStartId) => {
    setBusy(id)
    // Let the "Playing 2017–2026…" line paint before the bot runs.
    setTimeout(() => {
      void quickStartCompany(id).then((end) => {
        setBusy(null)
        props.onReady(end)
      })
    }, 30)
  }
  return (
    <div class="panel p start-card" data-preview={PREVIEW_MARKER}>
      <button
        type="button"
        class="btn btn-ghost"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {t('ui.act3.quick.menu')}
      </button>
      {open && (
        <>
          <span class="num-s muted">{t('ui.act3.quick.note')}</span>
          {QUICK_STARTS.map((q) => (
            <div key={q.id} class="row-between">
              <span>
                <strong>{t(q.key)}</strong>
                <br />
                <span class="num-s muted">{t(q.note)}</span>
              </span>
              <button
                type="button"
                class="btn"
                disabled={busy !== null}
                onClick={() => start(q.id)}
              >
                {t('ui.act3.quick.go')}
              </button>
            </div>
          ))}
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
