// Machines & Rooms (wireframe P0-03's second menu item): your rooms (the bedroom, the home rig, the
// garage, a small unit) with their load and machines, and the buy menu as MachineCards.
import { PROLOGUE_EXPANSION } from '../../../platform/preview.ts'
import { useState } from 'preact/hooks'
import { t, tDynamic } from '../../../i18n/t.ts'
import type { Message } from '../../../i18n/t.ts'
import {
  p0BuyCheck,
  prologueBuyView,
  prologueLifeView,
  prologueView,
} from '../../../sim/prologue/views.ts'
import type { GameState } from '../../../sim/state.ts'
import { quarterName } from '../../../sim/selectors.ts'
import { getModel } from '../../../sim/systems/market.ts'
import { ActionRow, Icon, MachineCard, Tip } from '../../components/basics.tsx'
import { SellCount } from '../../components/sellCount.tsx'
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
          model: machineName(props.model, props.condition),
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
  const [selling, setSelling] = useState<string | null>(null)
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
            {s.lots.map(({ lot, sellUsd, coin, altChoices }) => (
              <div class="fleet-row" key={lot.id}>
                <MachineCard
                  drawing={drawing(lot.model)}
                  caption={machineName(lot.model, lot.condition)}
                  compact
                />
                <span>
                  <strong>{machineName(lot.model, lot.condition)}</strong>
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
                  {lot.count > 1 ? (
                    // (a stack of several opens a count picker: 1, 10, half, all or a number; the cash shows before Sell)
                    <button
                      type="button"
                      class="btn"
                      aria-expanded={selling === lot.id}
                      onClick={() => setSelling(selling === lot.id ? null : lot.id)}
                    >
                      {t('ui.p0.sell_some')}
                    </button>
                  ) : (
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
                  )}
                </span>
                {PROLOGUE_EXPANSION && altChoices.length > 0 && (
                  // M68.5 (doc 51 v1.0 §5): a GPU lot can mine Litecoin or Dogecoin; only the coins open this quarter show
                  <div class="row-between" style={{ gridColumn: '1 / -1' }} data-lot-coin>
                    <span class="num-s muted" title={tDynamic('tooltip.p0.coin_choice', '')}>
                      {t('ui.p0.lot_mines')}
                    </span>
                    <span class="seg" role="group" aria-label={t('ui.p0.lot_mines')}>
                      {[getModel(lot.model)!.coin as string, ...altChoices].map((c) => (
                        <button
                          key={c}
                          type="button"
                          aria-pressed={coin === c}
                          title={c === 'LTC' || c === 'DOGE' ? t(`ui.p0.coin.${c}`) : undefined}
                          onClick={() => e.run({ type: 'P0_SET_LOT_COIN', lotId: lot.id, coin: c as 'BTC' | 'ETH' | 'LTC' | 'DOGE' })}
                        >
                          {c}
                        </button>
                      ))}
                    </span>
                  </div>
                )}
                {selling === lot.id && lot.count > 1 && (
                  <div class="p0-sell" style={{ gridColumn: '1 / -1' }}>
                    <SellCount
                      state={state}
                      lotId={lot.id}
                      stack={lot.count}
                      prologue
                      run={(a) => {
                        const ok = e.run(a)
                        if (ok) setSelling(null)
                        return ok
                      }}
                    />
                  </div>
                )}
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
                  caption={machineName(b.model.id, b.condition)}
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
