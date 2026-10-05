// The campaign finale (doc 33 §15.2, A4-12): the last screen of the game. M32.2: the stub the chapter report opens;
// M32.3 builds the career ledger, the multiple, the megawatt line and the epilogue.
import { t } from '../../i18n/t.ts'
import type { GameState } from '../../sim/state.ts'

export function Act4Finale(props: { state: GameState; onNew: () => void }) {
  return (
    <div class="screen">
      <div class="center-page">
        <div class="panel end-card chapter-card" data-act4-finale>
          <div class="label">{t('ui.finale.label')}</div>
          <h1 class="screen-title">{t('ui.finale.title')}</h1>
          <div class="row-between">
            <span />
            <button type="button" class="btn btn-primary" onClick={props.onNew}>
              {t('ui.act4.back_to_title')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
