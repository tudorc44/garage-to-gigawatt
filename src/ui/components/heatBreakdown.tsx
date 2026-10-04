// M21.2 (DT): a site's Heat breakdown. Its parts in order, each only when non-zero, then "Heat {value}" (with "capped
// at 0/100" when the clamp bit), and at Heat 30 or more a line naming the thresholds. The numbers come from
// heatBreakdownView (the sim adds them up); here they are only laid out. The Sites screen and the Community dialog
// show it as a list; the Plan screen's Heat meter carries the same lines as its tooltip.
import { t, tDynamic } from '../../i18n/t.ts'
import { heatBreakdownView } from '../../sim/selectors.ts'
import type { GameState } from '../../sim/state.ts'
import { fmt } from '../format.ts'

type View = NonNullable<ReturnType<typeof heatBreakdownView>>

/** The breakdown as label / points pairs, the total line and the thresholds line (for a list or a tooltip). */
export function heatLines(v: View): {
  parts: [string, string][]
  total: string
  thresholds: string | null
} {
  return {
    parts: v.parts.map((p) => [
      tDynamic(`ui.heat.part.${p.id}`, p.id, {
        mult: v.mult.toFixed(2),
        fade: v.fade,
      }),
      fmt.signedInt(Math.round(p.pts)),
    ]),
    total:
      t('ui.heat.total', { value: Math.round(v.value) }) +
      (v.clamped === 'low'
        ? ` (${t('ui.heat.capped_low')})`
        : v.clamped === 'high'
          ? ` (${t('ui.heat.capped_high')})`
          : ''),
    thresholds: v.thresholds ? t('ui.heat.thresholds', v.thresholds) : null,
  }
}

/** The breakdown as a plain-text tooltip (one line each). */
export function heatTooltip(state: GameState, siteId: string): string {
  const v = heatBreakdownView(state, siteId)
  if (!v) return ''
  const l = heatLines(v)
  return [
    ...l.parts.map(([label, pts]) => `${label} ${pts}`),
    l.total,
    ...(l.thresholds ? [l.thresholds] : []),
  ].join('\n')
}

/** The breakdown as a small list (Sites screen, Community dialog). */
export function HeatBreakdown({
  state,
  siteId,
}: {
  state: GameState
  siteId: string
}) {
  const v = heatBreakdownView(state, siteId)
  if (!v) return null
  const l = heatLines(v)
  return (
    <div class="heat-breakdown num-s" data-heat-breakdown>
      {l.parts.map(([label, pts]) => (
        <div key={label} class="row-between">
          <span class="muted">{label}</span>
          <span class="num">{pts}</span>
        </div>
      ))}
      <div class="row-between heat-total">
        <strong>{l.total}</strong>
      </div>
      {l.thresholds && <p class="muted">{l.thresholds}</p>}
    </div>
  )
}
