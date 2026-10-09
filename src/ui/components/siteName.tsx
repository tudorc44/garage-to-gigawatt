// M33.1 (design thread, doc 35): telling sites apart. A site's short name ("Own site 3") with its long name as the
// tooltip ("Own site 3 · Georgia · 20 MW"); and, in pickers and lists only, the facts after it: free MW, a Heat chip
// from Heat 30 (the Heat colours, hatched from the moratorium), and flags for a power renewal due or a flaw.
import { t } from '../../i18n/t.ts'
import { heatBand, siteFacts, type SiteFacts } from '../../sim/selectors.ts'
import type { GameState, Site } from '../../sim/state.ts'
import { fmt } from '../format.ts'
import { flawName, siteLongName, siteName } from '../names.ts'
import { Icon } from './basics.tsx'

/** Heat at which a site's row shows a Heat chip (doc 35). */
export const HEAT_CHIP_FROM = 30

/** A site's short name, its long name on hover. */
export function SiteName({ state, site }: { state: GameState; site: Site }) {
  return (
    <span class="site-name" title={siteLongName(site, siteFacts(state, site))}>
      {siteName(site)}
    </span>
  )
}

/** A Heat chip: the Heat colour band's swatch and the value. Nothing under Heat 30. */
export function HeatChip({ heat }: { heat: number }) {
  if (heat < HEAT_CHIP_FROM) return null
  return (
    <span class="heat-chip num-s">
      <i class={`heat-swatch g-heat-${heatBand(heat)}`} aria-hidden="true" />
      {t('site.facts.heat', { heat: Math.round(heat) })}
    </span>
  )
}

/** The facts after a site's name in a picker or list: free MW, a Heat chip, flag icons. */
export function SiteExtras({ facts }: { facts: SiteFacts }) {
  return (
    <span class="site-extras">
      <span class="num-s muted">
        {t('site.facts.free', { mw: fmt.power(facts.freeKw) })}
      </span>
      <HeatChip heat={facts.heat} />
      {facts.renewalDue && (
        <span class="site-flag" title={t('site.flag.renewal')}>
          <Icon name="negotiate" size={16} />
        </span>
      )}
      {facts.flaw && (
        <span
          class="site-flag"
          title={t('site.flag.flaw', { flaw: flawName(facts.flaw) })}
        >
          <Icon name="warning" size={16} />
        </span>
      )}
    </span>
  )
}

/** A site's short name with its facts, for a picker or list row. */
export function SiteLabel({ state, site }: { state: GameState; site: Site }) {
  return (
    <span class="site-label">
      <SiteName state={state} site={site} />
      <SiteExtras facts={siteFacts(state, site)} />
    </span>
  )
}
