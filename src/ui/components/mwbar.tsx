// The MW-by-use bar (wireframes A2-03, A2-06 and the Act II component sheet): where a company's or
// a site's megawatts go. Fixed order left → right; segments under 3% show no label; building is
// hatched (counted in the total, earning nothing yet). Compact = the 12 px bar in site rows.
import { t, tDynamic } from '../../i18n/t.ts'
import { MW_USES, type MwUse } from '../../sim/selectors.ts'
import { fmt } from '../format.ts'

type Uses = Record<MwUse, number>

const total = (u: Uses) => MW_USES.reduce((kw, use) => kw + u[use], 0)

/** A use's name, e.g. "AI shell". */
export const useName = (use: MwUse) => tDynamic(`ui.mw.use.${use}`, use)

export function MwBar(props: { use: Uses; compact?: boolean }) {
  const sum = total(props.use)
  const label = MW_USES.filter((use) => props.use[use] > 0)
    .map((use) =>
      t('ui.mw.part', {
        use: useName(use),
        value: fmt.power(props.use[use]),
      }),
    )
    .join(', ')
  return (
    <div
      class={`mwbar${props.compact ? ' compact' : ''}`}
      role="img"
      aria-label={label || t('ui.mw.none')}
    >
      {sum > 0 &&
        MW_USES.filter((use) => props.use[use] > 0).map((use) => {
          const share = props.use[use] / sum
          return (
            <div
              key={use}
              class={`mw-${use}`}
              style={{ width: `${share * 100}%` }}
            >
              {!props.compact && share >= 0.03 && <span>{useName(use)}</span>}
            </div>
          )
        })}
    </div>
  )
}

/** The key under or beside a bar: every use with its MW (zeros included, as in A2-03). */
export function MwLegend(props: { use: Uses }) {
  return (
    <div class="mw-legend">
      {MW_USES.map((use) => (
        <span key={use} class="mw-key">
          <i class={`mw-${use}`} aria-hidden="true" />
          {useName(use)} <span class="num">{fmt.power(props.use[use])}</span>
        </span>
      ))}
    </div>
  )
}
