// The Act II intro (act boundary, scope 0.2 §2.1 and §2.14 screen 2; wireframe A2-02). Shown after
// the Act I chapter report, before the 2022Q4 Plan phase. For now only the way in: the carry-over
// summary comes next (build step 1e), the head start and the lifeline in later steps.
import { t } from '../../i18n/t.ts'
import type { ScreenProps } from './Plan.tsx'

export function ActIntroScreen({ act }: ScreenProps) {
  return (
    <div class="screen">
      <div class="center-page">
        <div class="panel end-card chapter-card">
          <div class="label">{t('ui.act2_intro.label')}</div>
          <h1 class="screen-title">{t('ui.act2_intro.title')}</h1>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              class="btn btn-primary"
              onClick={() => act({ type: 'START_ACT_2' })}
            >
              {t('ui.act2_intro.start')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
