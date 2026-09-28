// The prologue's screens (Alpha 0.3 §2.13; Act 0, the bedroom era; wireframes docs/wireframes/prologue):
// the intro (P0-02) here; the Plan screen and its sections (P0-03, P0-05, P0-06), the live quarter,
// the reports and auto-play (P0-04), the chapter report and the handover (P0-07, P0-08) in
// ./prologue/. Layout from the wireframes, look from the design system.
import { useState } from 'preact/hooks'
import { t, tDynamic } from '../../i18n/t.ts'
import { MachineCard } from '../components/basics.tsx'
import { CenterCard, type PrologueProps } from './prologue/common.tsx'
import { Chapter } from './prologue/End.tsx'
import { AutoPlay, QuarterReport, type Speed } from './prologue/Live.tsx'
import { PlanOrLive } from './prologue/Plan.tsx'

export type { PrologueProps }

export function PrologueScreen(props: PrologueProps) {
  const { state } = props
  // Auto-play's speed (P0-04) lasts across quarters; UI only. It starts at 2× (owner, 28 Sep 2026: about half a minute for the auto quarters).
  const [speed, setSpeed] = useState<Speed>(2)
  if (state.phase === 'intro') return <Intro {...props} />
  if (state.phase === 'chapter') return <Chapter {...props} />
  if (state.phase === 'report' && state.prologue!.reports.at(-1)?.auto)
    return <AutoPlay {...props} speed={speed} setSpeed={setSpeed} />
  if (state.phase === 'report' || state.phase === 'gameover')
    return <QuarterReport {...props} />
  return <PlanOrLive {...props} speed={speed} setSpeed={setSpeed} />
}

/** The intro (wireframe P0-02): the label and date, the PC on the desk, the story, one way on. */
function Intro({ act }: PrologueProps) {
  return (
    <CenterCard>
      <div class="row-between">
        <span class="label">{t('ui.p0.intro_label')}</span>
        <span class="num-s">{t('ui.p0.intro_date')}</span>
      </div>
      <h1 class="screen-title">{t('ui.p0.intro_title')}</h1>
      <div class="p0-intro">
        <MachineCard
          drawing="pc-tower-2009"
          caption={t('ui.p0.intro_pc')}
          era="2009"
        />
        <p class="pitch">{tDynamic('p0.intro', '')}</p>
      </div>
      <div class="row-between">
        <span />
        <button
          type="button"
          class="btn btn-primary"
          onClick={() => act({ type: 'START_PROLOGUE' })}
        >
          {t('ui.p0.begin')}
        </button>
      </div>
    </CenterCard>
  )
}
