// Machines & Rooms (wireframe P0-03's second menu item): your rooms (the bedroom, the home rig, the
// garage, a small unit) with their load and machines, and the buy menu as MachineCards.
import { useState } from 'preact/hooks'
import { t } from '../../../i18n/t.ts'
import type { Message } from '../../../i18n/t.ts'
import {
  p0BuyCheck,
  prologueBuyView,
  prologueLifeView,
  prologueView,
} from '../../../sim/prologue/views.ts'
import type { GameState } from '../../../sim/state.ts'
import { quarterName } from '../../../sim/selectors.ts'
import { ActionRow, Icon, MachineCard, Tip } from '../../components/basics.tsx'
import { fmt } from '../../format.ts'
import { machineName, say, tierName } from '../../names.ts'
import {
  drawing,
  era,
  hashOf,
  useError,
  watts,
  type PrologueProps,
} from './common.tsx'

/**
 * Buying in bulk (owner, 10 Oct 2026): a count with − / + and quick 1 / 10 / Max (N), the cost and power of that many,
 * and one Buy. N is the most the reducer accepts here now (p0MaxBuy); a count it refuses shows why and can't be bought.
 */
export function BuyPicker(props: {
  state: GameState
  model: string
  condition: 'new' | 'used'
  unitUsd: number
  powerKw: number
  max: number
  blocker: Message | null
  siteId: string
  onBuy: (count: number) => void
}) {
  const [count, setCount] = useState(1)
  const set = (n: number) => setCount(Math.max(1, Math.floor(Number.isFinite(n) ? n : 1)))
  const why =
    props.max === 0 ? props.blocker : p0BuyCheck(props.state, props.model, props.condition, count, props.siteId)
  return (
    <div class="p0-buy">
      <div class="p0-buy-row">
        <span class="seg">
          <button type="button" aria-label={t('ui.p0.buy_less')} disabled={count <= 1} onClick={() => set(count - 1)}>
            −
          </button>
          <input
            type="number"
            min={1}
            class="p0-buy-count num"
            aria-label={t('ui.p0.buy_count')}
            value={count}
            onInput={(ev) => set(Number((ev.currentTarget as HTMLInputElement).value))}
          />
          <button type="button" aria-label={t('ui.p0.buy_more')} onClick={() => set(count + 1)}>
            +
          </button>
        </span>
        <span class="seg">
          <button type="button" aria-pressed={count === 1} onClick={() => set(1)}>
            1
          </button>
          <button type="button" aria-pressed={count === 10} onClick={() => set(10)}>
            10
          </button>
          <button
            type="button"
            aria-pressed={count === props.max && props.max > 0}
            disabled={props.max === 0}
            title={props.max === 0 && props.blocker ? say(props.blocker) : undefined}
            onClick={() => set(props.max)}
          >
            {t('ui.p0.buy_max', { n: props.max })}
          </button>
        </span>
      </div>
      <div class="num-s">
        {t('ui.p0.buy_total', {
          count,
          model: machineName(props.model),
          total: fmt.money(props.unitUsd * count),
          power: watts(props.powerKw * count),
        })}
      </div>
      {why && <div class="num-s loss">{say(why)}</div>}
      <button type="button" class="btn" disabled={!!why} onClick={() => props.onBuy(count)}>
        <Icon name="buy" size={16} />
        {t('ui.p0.buy')}
      </button>
    </div>
  )
}

export function Machines({ state, act }: PrologueProps) {
  const v = prologueView(state)
  const life = prologueLifeView(state)
  const e = useError(act)
  const ready = v.sites.filter((s) => s.site.readyQuarter <= state.quarter)
  const [siteId, setSiteId] = useState(ready.at(-1)?.site.id ?? '')
  const site = ready.find((s) => s.site.id === siteId) ?? ready.at(-1)
  const buy = site ? prologueBuyView(state, site.site.id) : []
  return (
    <div class="dash p0-dash">
      <div class="col">
        {v.sites.map((s) => (
          <div class="panel" key={s.site.id}>
            <div class="row-between">
              <span class="panel-title">{tierName(s.site.tier)}</span>
              <span class="num-s">
                {t('ui.p0.site_load', {
                  load: watts(s.loadKw),
                  capacity: watts(s.capacityKw),
                })}
                {s.thresholdKw !== null &&
                  ` · ${t('ui.p0.site_threshold', { kw: watts(s.thresholdKw) })}`}
              </span>
            </div>
            {s.site.readyQuarter > state.quarter && (
              <p class="num-s muted">
                {t('ui.p0.site_building', {
                  quarter: fmt.quarter(quarterName(s.site.readyQuarter)),
                })}
              </p>
            )}
            {s.lots.length === 0 && (
              <p class="num-s muted">{t('ui.p0.site_empty')}</p>
            )}
            {s.lots.map(({ lot, sellUsd }) => (
              <div class="fleet-row" key={lot.id}>
                <MachineCard
                  drawing={drawing(lot.model)}
                  caption={machineName(lot.model)}
                  compact
                />
                <span>
                  <strong>{machineName(lot.model)}</strong>
                  <br />
                  <span class="num-s muted">
                    {t('ui.p0.lot_line', {
                      count: lot.count,
                      hash: hashOf(lot.model),
                      broken: lot.failed,
                    })}
                    {lot.earnsFromQuarter > state.quarter &&
                      ` · ${t('ui.p0.lot_from_next')}`}
                  </span>
                </span>
                <span class="row-between" style={{ gap: '6px' }}>
                  {lot.failed > 0 && (
                    <button
                      type="button"
                      class="btn"
                      onClick={() =>
                        e.run({ type: 'REPAIR_MACHINES', lotId: lot.id })
                      }
                    >
                      {t('ui.p0.repair')}
                    </button>
                  )}
                  <button
                    type="button"
                    class="btn"
                    title={t('ui.p0.sell_for', { value: fmt.money(sellUsd) })}
                    onClick={() =>
                      e.run({
                        type: 'SELL_MACHINES',
                        lotId: lot.id,
                        count: lot.count,
                      })
                    }
                  >
                    {t('ui.p0.sell_all', { value: fmt.money(sellUsd) })}
                  </button>
                </span>
              </div>
            ))}
          </div>
        ))}
        {v.livingAtHome && !life.homeRig.built && (
          <div class="panel">
            <ActionRow
              icon="pc-tower"
              name={t('ui.p0.build_home_rig')}
              bandwidth={life.buildBandwidth}
              bandwidthLeft={state.bandwidth}
              price={fmt.money(life.homeRig.costUsd)}
              onClick={() => e.run({ type: 'P0_BUILD_HOME_RIG' })}
            />
            <p class="num-s muted">{t('ui.p0.home_rig_note')}</p>
          </div>
        )}
        {e.view}
      </div>
      <div class="col">
        <div class="panel">
          <Tip id="machines" act={0} />
          <div class="row-between">
            <span class="panel-title">{t('ui.p0.buy_title')}</span>
            {ready.length > 1 && (
              <span class="seg">
                {ready.map((s) => (
                  <button
                    key={s.site.id}
                    type="button"
                    class="btn"
                    aria-pressed={site?.site.id === s.site.id}
                    onClick={() => setSiteId(s.site.id)}
                  >
                    {tierName(s.site.tier)}
                  </button>
                ))}
              </span>
            )}
          </div>
          {buy.length === 0 && (
            <p class="num-s muted">{t('ui.p0.nothing_for_sale')}</p>
          )}
          <div class="p0-machines">
            {buy.map((b) => (
              <div key={`${b.model.id}:${b.condition}`}>
                <MachineCard
                  drawing={drawing(b.model.id)}
                  caption={machineName(b.model.id)}
                  era={era(b.model.id)}
                />
                <div class="num-s">
                  {t('ui.p0.buy_line', {
                    condition: t(`condition.${b.condition}`),
                    price: fmt.money(b.unitUsd!),
                    hash: hashOf(b.model.id),
                    power: watts(b.model.power_kw),
                  })}
                </div>
                <BuyPicker
                  state={state}
                  model={b.model.id}
                  condition={b.condition}
                  unitUsd={b.unitUsd!}
                  powerKw={b.model.power_kw}
                  max={b.max}
                  blocker={b.blocker}
                  siteId={site!.site.id}
                  onBuy={(count) =>
                    e.run({ type: 'P0_BUY', model: b.model.id, condition: b.condition, count, siteId: site!.site.id })
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
