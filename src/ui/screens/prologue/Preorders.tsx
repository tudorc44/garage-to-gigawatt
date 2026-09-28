// Pre-order and group-buy cards (wireframe P0-06), side by side in a dialog: the vendor, the machine,
// price, share, on-time delivery, the refund if it never comes, and the delivery odds as a bar from
// light (good) to dark (bad) with the percentages written out (never red / green). Below, your orders.
import { useState } from 'preact/hooks'
import { t, tDynamic } from '../../../i18n/t.ts'
import { preorderMenuView } from '../../../sim/prologue/views.ts'
import { quarterName } from '../../../sim/selectors.ts'
import type { GameState } from '../../../sim/state.ts'
import { Dialog, MachineCard } from '../../components/basics.tsx'
import { fmt } from '../../format.ts'
import { say } from '../../names.ts'
import { useError, type PrologueProps } from './common.tsx'

function OddsBar(props: {
  odds: { on_time: number; moderate: number; severe: number; never: number }
}) {
  const o = props.odds
  const parts = [
    ['on_time', o.on_time],
    ['late', o.moderate],
    ['very_late', o.severe],
    ['never', o.never],
  ] as const
  const label = t('ui.p0.odds_aria', {
    onTime: fmt.pct(o.on_time),
    late: fmt.pct(o.moderate),
    veryLate: fmt.pct(o.severe),
    never: fmt.pct(o.never),
  })
  return (
    <>
      <div class="p0-odds" role="img" aria-label={label}>
        {parts.map(([k, share]) => (
          <i key={k} class={`o-${k}`} style={{ width: `${share * 100}%` }} />
        ))}
      </div>
      <div class="p0-odds-legend num-s">
        {parts.map(([k, share]) => (
          <span key={k}>
            <span class={`sw o-${k}`} />
            {t(`ui.p0.odds_${k}`, { pct: fmt.pct(share) })}
          </span>
        ))}
      </div>
    </>
  )
}

export function PreorderDialog({
  state,
  act,
  onClose,
}: {
  state: GameState
  act: PrologueProps['act']
  onClose: () => void
}) {
  const v = preorderMenuView(state)
  const e = useError(act)
  const [passed, setPassed] = useState<string[]>([])
  const shown = v.vendors.filter((o) => !passed.includes(o.id))
  return (
    <Dialog
      title={t('ui.p0.preorders_dialog', {
        quarter: fmt.quarter(quarterName(state.quarter)),
      })}
      onClose={onClose}
    >
      <div class="p0-preorders">
        {shown.map((o) => {
          const group = o.unitShare < 1
          return (
            <div class="panel p0-card" key={o.id}>
              <div class="row-between">
                <span class="label">
                  {t(group ? 'ui.p0.group_buy' : 'ui.p0.pre_order')}
                </span>
                <span class="num-s muted">
                  {t(group ? 'ui.p0.half_unit_short' : 'ui.p0.one_unit')}
                </span>
              </div>
              <strong>
                {t('ui.p0.vendor_machine', {
                  vendor: tDynamic(`p0.vendor.${o.id}`, o.id),
                })}
              </strong>
              <MachineCard
                drawing="asic-preorder-2013"
                caption={tDynamic(`p0.vendor.${o.id}`, o.id)}
                era="2013"
                compact
              />
              <div class="row-between num-s">
                <span>{t('ui.p0.kv_price')}</span>
                <span class="num">{fmt.money(o.priceUsd)}</span>
              </div>
              {group && (
                <div class="row-between num-s">
                  <span>{t('ui.p0.kv_share')}</span>
                  <span class="num">{t('ui.p0.half_hashrate')}</span>
                </div>
              )}
              <div class="row-between num-s">
                <span>{t('ui.p0.kv_promised')}</span>
                <span class="num">{fmt.quarter(o.shipsQuarter)}</span>
              </div>
              <div class="row-between num-s">
                <span>{t('ui.p0.kv_never')}</span>
                <span class="num">
                  {t('ui.p0.refund', { pct: fmt.pct(o.refundShare) })}
                </span>
              </div>
              <span class="label">
                {t(group ? 'ui.p0.odds_title_worse' : 'ui.p0.odds_title')}
              </span>
              <OddsBar odds={o.odds} />
              <span class="num-s">
                {t(group ? 'ui.p0.group_note' : 'ui.p0.preorder_note')}
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  class="btn btn-primary"
                  disabled={!!o.blocker}
                  title={o.blocker ? say(o.blocker) : undefined}
                  onClick={() => e.run({ type: 'P0_PREORDER', vendor: o.id })}
                >
                  {t('ui.p0.order_0bw')}
                </button>
                <button
                  type="button"
                  class="btn"
                  onClick={() => setPassed([...passed, o.id])}
                >
                  {t('ui.p0.pass')}
                </button>
              </div>
            </div>
          )
        })}
      </div>
      {shown.length === 0 && v.orders.length === 0 && (
        <p class="num-s muted">{t('ui.p0.preorders_none')}</p>
      )}
      <p class="num-s muted">{t('ui.p0.conference_edge')}</p>
      {v.orders.map((o) => {
        // What the player can know: waiting, late (past the ship date), arrived, or refunded.
        const status = o.delivered
          ? o.outcome === 'never'
            ? 'refunded'
            : 'arrived'
          : quarterName(state.quarter) > v.shipsQuarter
            ? 'late'
            : 'waiting'
        return (
          <p class="num-s" key={o.id}>
            {t(`ui.p0.order_${status}`, {
              vendor: tDynamic(`p0.vendor.${o.vendor}`, o.vendor),
              cash: fmt.money(o.paidUsd),
            })}
          </p>
        )
      })}
      {e.view}
    </Dialog>
  )
}
