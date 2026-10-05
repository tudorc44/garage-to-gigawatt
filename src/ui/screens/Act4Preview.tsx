// The Act IV preview (M27.6): test builds only. The title screen's "Act IV preview (test build)": a bot plays a fixed
// company from 2017 through Act III, then it enters Act IV. The app imports this file only behind an inline mode check,
// so the GitHub Pages build doesn't contain it (a test builds the game and looks for ACT4_PREVIEW_MARKER).
import { useState } from 'preact/hooks'
import { t } from '../../i18n/t.ts'
import type { GameState } from '../../sim/state.ts'
import {
  ACT4_PREVIEW_MARKER,
  ACT4_QUICK_STARTS,
  act4QuickStartCompany,
  type Act4QuickStartId,
} from '../act4QuickStart.ts'

/** Pick a company; it plays to 2030Q4's chapter report, then enters Act IV. */
export function QuickStartAct4(props: { onReady: (end: GameState) => void }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const start = (id: Act4QuickStartId) => {
    setBusy(id)
    // Let the "Playing 2017–2030…" line paint before the bot runs.
    setTimeout(() => {
      void act4QuickStartCompany(id).then((end) => {
        setBusy(null)
        props.onReady(end)
      })
    }, 30)
  }
  return (
    <div class="panel p start-card" data-preview={ACT4_PREVIEW_MARKER}>
      <button type="button" class="btn btn-ghost" aria-expanded={open} onClick={() => setOpen(!open)}>
        {t('ui.act4.quick.menu')}
      </button>
      {open && (
        <>
          <span class="num-s muted">{t('ui.act4.quick.note')}</span>
          {ACT4_QUICK_STARTS.map((q) => (
            <div key={q.id} class="row-between">
              <span>
                <strong>{t(q.key)}</strong>
                <br />
                <span class="num-s muted">{t(q.note)}</span>
              </span>
              <button type="button" class="btn" disabled={busy !== null} onClick={() => start(q.id)}>
                {t('ui.act4.quick.go')}
              </button>
            </div>
          ))}
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
