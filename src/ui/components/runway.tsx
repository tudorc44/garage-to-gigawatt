// The cash runway (M9.0), the same figure on the Dashboard, the Plan screen and the Capital screen, with a
// tooltip listing which fixed payments of the coming quarter it includes. Read-only; every number comes
// from runwayView (the sim), nothing is worked out here.
import { t } from '../../i18n/t.ts'
import { quarterName, runwayView } from '../../sim/selectors.ts'
import type { GameState } from '../../sim/state.ts'
import { fmt } from '../format.ts'

/** The runway as words: "not burning", "20+ quarters" or "3.4 quarters". */
export function runwayText(quarters: number | null): string {
  return quarters === null
    ? t('ui.cap2.not_burning')
    : quarters >= 20
      ? t('ui.cap2.quarters_plus', { n: 20 })
      : t('ui.cap2.quarters', { n: quarters.toFixed(1) })
}

/** The tooltip: what the figure includes this quarter, item by item, and what it leaves out. */
export function runwayTip(state: GameState): string | undefined {
  const v = runwayView(state)
  if (!v) return undefined
  const lines = [
    t('ui.runway.tip_head', {
      ebitda: fmt.money(v.ebitdaUsd),
      quarter: fmt.quarter(quarterName(v.quarter)),
    }),
    ...(v.items.length === 0
      ? [t('ui.runway.tip_none')]
      : v.items.map((i) =>
          t(`ui.runway.item.${i.kind}`, {
            usd: fmt.money(i.usd),
            n: i.projectN ?? 0,
            phase: i.phase ? t(`ui.bridge.phase.${i.phase}`) : '',
          }),
        )),
    t('ui.runway.tip_total', { usd: fmt.money(v.scheduledUsd) }),
    t('ui.runway.tip_not', { quarters: v.shortBelow }),
  ]
  return lines.join('\n')
}

export function Runway({ state }: { state: GameState }) {
  const v = runwayView(state)
  if (!v) return null
  return (
    <div class="num-s runway" title={runwayTip(state)}>
      <strong>{t('ui.runway.label')}</strong> {runwayText(v.quarters)}{' '}
      <span class={v.short ? 'loss' : 'muted'}>
        {v.short ? t('ui.cap2.short') : t('ui.cap2.ok')}
      </span>
    </div>
  )
}
