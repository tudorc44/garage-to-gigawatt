// M34.2 (owner, 9 Oct 2026, 3f): no site action that charges a fee fires without a confirm, and the three routes to it
// (the to-do row for a single site, the site picker, the site card) land on this one dialog: what it does, at which site,
// its cost and Bandwidth, then Confirm (or why not) and Cancel.
import { t } from '../../i18n/t.ts'
import type { Action } from '../../sim/actions.ts'
import { siteActionView, type SiteFeeAction } from '../../sim/selectors.ts'
import type { GameState } from '../../sim/state.ts'
import { fmt } from '../format.ts'
import { say, siteLong } from '../names.ts'
import { Dialog, Pips } from './basics.tsx'

export function SiteActionConfirm(props: {
  state: GameState
  act: (a: Action) => unknown
  kind: SiteFeeAction
  siteId: string
  onClose: () => void
}) {
  const { state } = props
  const v = siteActionView(state, props.kind, props.siteId)
  if (!v) return null
  const site = siteLong(state, v.site)
  const effect =
    v.kind === 'talk'
      ? t('site.confirm.effect.talk', { grievance: fmt.signedInt(v.grievance), heat: Math.round(v.heat) })
      : v.kind === 'mitigate'
        ? t('site.confirm.effect.mitigate', { base: -v.base, heat: Math.round(v.heat) })
        : v.kind === 'transformer'
          ? t('site.confirm.effect.transformer', { quarters: v.quarters })
          : t('site.confirm.effect.station', { units: v.units, heat: v.heatAdd })
  return (
    <Dialog title={t(`site.confirm.title.${v.kind}`, { site })} onClose={props.onClose}>
      <div data-site-confirm={`${v.kind}:${props.siteId}`}>
        <p class="num-s" style={{ margin: 0 }}>
          {effect}
        </p>
        <p class="num" style={{ margin: '8px 0 0' }}>
          {t('site.confirm.cost', { cost: fmt.money(v.costUsd), bw: v.bandwidth })}
        </p>
      </div>
      <div class="row-between">
        <span class="num-s loss">{v.why ? say(v.why) : ''}</span>
        <span style={{ display: 'inline-flex', gap: '8px' }}>
          <button type="button" class="btn" onClick={props.onClose}>
            {t('site.confirm.cancel')}
          </button>
          <button
            type="button"
            class="btn btn-primary"
            disabled={!!v.why}
            onClick={() => {
              props.act(v.action)
              props.onClose()
            }}
          >
            {t('site.confirm.go')}
            {v.bandwidth > 0 && (
              <Pips
                total={v.bandwidth}
                filled={v.bandwidth}
                label={t('ui.plan.costs_bandwidth', { n: v.bandwidth })}
              />
            )}
          </button>
        </span>
      </div>
    </Dialog>
  )
}
