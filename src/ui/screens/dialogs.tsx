// Plan-phase dialogs: buy machines, sell or repair a batch, review scouted site offers.
// Previews come from dry-running the action through the sim (applyAction / whyNot).
import { useState } from 'preact/hooks'
import { t, tDynamic } from '../../i18n/t.ts'
import { applyAction, type Action } from '../../sim/actions.ts'
import {
  BANDWIDTH_COST,
  bestSite,
  lotViews,
  machineMarket,
  siteViews,
  whyNot,
  type LotView,
} from '../../sim/selectors.ts'
import type { Condition, GameState } from '../../sim/state.ts'
import { Dialog, Icon, Pips } from '../components/basics.tsx'
import { fmt } from '../format.ts'
import { machineIcon, machineName, say, tierIcon, tierName } from '../names.ts'
import type { ScreenProps } from './Plan.tsx'

type DialogProps = ScreenProps & { onClose: () => void }

const hashUnit = (coin: 'BTC' | 'ETH') => (coin === 'ETH' ? 'MH' : 'TH')

/** Cash change if this action ran now (null if it isn't allowed). */
function cashChange(state: GameState, a: Action): number | null {
  const r = applyAction(state, a)
  return r.ok ? r.state.cash - state.cash : null
}

export function BuyDialog({ state, act, onClose }: DialogProps) {
  const market = machineMarket(state)
  const sites = siteViews(state)
  const firstOut = market.find((m) => m.isOut)!
  const [model, setModel] = useState(firstOut.id)
  const [condition, setCondition] = useState<Condition>('new')
  const [count, setCount] = useState(1)
  const [siteId, setSiteId] = useState(bestSite(state).id)

  const m = market.find((x) => x.id === model)!
  const price = condition === 'new' ? m.newPriceUsd : m.usedPriceUsd
  const site = sites.find((s) => s.site.id === siteId)!
  const freeKw = site.capacityKw - site.usedKw
  const maxCount = Math.max(
    1,
    Math.min(
      Math.floor(freeKw / m.powerKw),
      price ? Math.floor(state.cash / price) : 0,
    ),
  )
  const action: Action = {
    type: 'BUY_MACHINES',
    model,
    condition,
    count,
    siteId,
  }
  const why = whyNot(state, action)

  return (
    <Dialog title={t('ui.buy.title')} onClose={onClose}>
      <table>
        <thead>
          <tr>
            <th>{t('ui.buy.col.machine')}</th>
            <th>{t('ui.buy.col.mines')}</th>
            <th class="r">{t('ui.buy.col.hashrate')}</th>
            <th class="r">{t('ui.buy.col.power')}</th>
            <th class="r">{t('ui.buy.col.new')}</th>
            <th class="r">{t('ui.buy.col.used')}</th>
            <th class="r">{t('ui.buy.col.profit')}</th>
          </tr>
        </thead>
        <tbody>
          {market.map((x) => (
            <tr
              key={x.id}
              class={!x.isOut ? 'off' : x.id === model ? 'picked pick' : 'pick'}
              onClick={() => {
                if (!x.isOut) return
                setModel(x.id)
                if (
                  (condition === 'new' ? x.newPriceUsd : x.usedPriceUsd) ===
                  undefined
                ) {
                  setCondition(x.newPriceUsd === undefined ? 'used' : 'new')
                }
              }}
            >
              <td>
                <span
                  style={{
                    display: 'inline-flex',
                    gap: '8px',
                    alignItems: 'center',
                  }}
                >
                  <Icon name={machineIcon(x.coin)} size={16} />
                  {machineName(x.id)}
                </span>
              </td>
              <td>{x.coin}</td>
              <td class="num r">{fmt.hash(x.hashrate, hashUnit(x.coin))}</td>
              <td class="num r">{fmt.power(x.powerKw)}</td>
              {x.isOut ? (
                <>
                  <td class="num r">
                    {x.newPriceUsd === undefined
                      ? '—'
                      : fmt.money(x.newPriceUsd)}
                  </td>
                  <td class="num r">
                    {x.usedPriceUsd === undefined
                      ? '—'
                      : fmt.money(x.usedPriceUsd)}
                  </td>
                  <td
                    class={`num r ${x.dailyProfitUsd >= 0 ? 'gain' : 'loss'}`}
                  >
                    {t('ui.buy.per_day', {
                      value: fmt.signed(x.dailyProfitUsd),
                    })}
                  </td>
                </>
              ) : (
                <td class="r" colSpan={3}>
                  {t('ui.locked.opens', {
                    quarter: fmt.quarter(x.availableFrom),
                  })}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <p class="num-s muted" style={{ margin: 0 }}>
        {t('ui.buy.profit_note', { site: tierName(bestSite(state).tier) })}
      </p>

      <div class="form-row">
        <div class="field">
          <span class="label">{t('ui.buy.condition')}</span>
          <div class="seg" role="group" aria-label={t('ui.buy.condition')}>
            {(['new', 'used'] as Condition[]).map((c) => {
              const p = c === 'new' ? m.newPriceUsd : m.usedPriceUsd
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={condition === c}
                  disabled={p === undefined}
                  onClick={() => setCondition(c)}
                >
                  {tDynamic(`condition.${c}`, c)}{' '}
                  {p === undefined ? '' : fmt.money(p)}
                </button>
              )
            })}
          </div>
        </div>
        <label class="field">
          <span class="label">{t('ui.buy.count')}</span>
          <input
            type="number"
            min={1}
            value={count}
            style={{ width: '90px' }}
            onInput={(e) =>
              setCount(
                Math.max(
                  0,
                  Math.floor(Number((e.target as HTMLInputElement).value)),
                ),
              )
            }
          />
        </label>
        <button type="button" class="btn" onClick={() => setCount(maxCount)}>
          {t('ui.buy.max', { n: maxCount })}
        </button>
        <label class="field">
          <span class="label">{t('ui.buy.site')}</span>
          <select
            value={siteId}
            onChange={(e) => setSiteId((e.target as HTMLSelectElement).value)}
          >
            {sites.map((s) => (
              <option key={s.site.id} value={s.site.id}>
                {t('ui.buy.site_option', {
                  tier: tierName(s.site.tier),
                  free: fmt.power(s.capacityKw - s.usedKw),
                })}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div class="row-between">
        <div>
          <div class="num-kpi">
            {price === undefined ? '—' : fmt.money(price * count)}
          </div>
          <div class="num-s muted">
            {t('ui.buy.earns_from', {
              quarter: fmt.quarter(
                (condition === 'new' ? m.earnsFromNew : m.earnsFromUsed) ?? '',
              ),
            })}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {why && <span class="reason-line">{say(why)}</span>}
          <button
            type="button"
            class="btn btn-primary"
            disabled={!!why}
            onClick={() => {
              if (!act(action)) onClose()
            }}
          >
            {t('ui.buy.confirm', { n: count, model: machineName(model) })}
          </button>
        </div>
      </div>
    </Dialog>
  )
}

export function FleetDialog({ state, act, onClose }: DialogProps) {
  const lots = lotViews(state)
  const sites = siteViews(state)
  return (
    <Dialog title={t('ui.fleet_dialog.title')} onClose={onClose}>
      <table>
        <thead>
          <tr>
            <th>{t('ui.fleet_dialog.col.batch')}</th>
            <th>{t('ui.fleet_dialog.col.site')}</th>
            <th class="r">{t('ui.fleet_dialog.col.working')}</th>
            <th class="r">{t('ui.fleet_dialog.col.repair')}</th>
            <th class="r">{t('ui.fleet_dialog.col.sell')}</th>
          </tr>
        </thead>
        <tbody>
          {lots.map((v) => (
            <FleetRow
              key={v.lot.id}
              v={v}
              state={state}
              act={act}
              siteName={tierName(
                sites.find((s) => s.site.id === v.lot.siteId)!.site.tier,
              )}
            />
          ))}
        </tbody>
      </table>
      <p class="num-s muted" style={{ margin: 0 }}>
        {t('ui.fleet_dialog.note')}
      </p>
    </Dialog>
  )
}

function FleetRow(props: {
  v: LotView
  state: GameState
  act: DialogProps['act']
  siteName: string
}) {
  const { v, state, act } = props
  const [count, setCount] = useState(1)
  const sell: Action = { type: 'SELL_MACHINES', lotId: v.lot.id, count }
  const repair: Action = { type: 'REPAIR_MACHINES', lotId: v.lot.id }
  const gets = cashChange(state, sell)
  const repairWhy = v.lot.failed > 0 ? whyNot(state, repair) : null
  return (
    <tr>
      <td>
        <span
          style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}
        >
          <Icon name={machineIcon(v.coin)} size={16} />
          {t('ui.fleet.batch', {
            count: v.lot.count,
            model: machineName(v.lot.model),
            condition: tDynamic(
              `condition.${v.lot.condition}`,
              v.lot.condition,
            ),
          })}
        </span>
      </td>
      <td>{props.siteName}</td>
      <td class="num r">
        {t('ui.fleet_dialog.working', {
          working: v.working,
          count: v.lot.count,
        })}
      </td>
      <td class="r">
        {v.lot.failed > 0 ? (
          <button
            type="button"
            class="btn"
            disabled={!!repairWhy}
            title={repairWhy ? say(repairWhy) : undefined}
            onClick={() => act(repair)}
          >
            {t('ui.fleet_dialog.repair', {
              n: v.lot.failed,
              cost: fmt.money(v.repairCostUsd),
            })}
          </button>
        ) : (
          <span class="muted">—</span>
        )}
      </td>
      <td class="r">
        <span
          style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}
        >
          <input
            type="number"
            min={1}
            max={v.lot.count}
            value={count}
            aria-label={t('ui.fleet_dialog.sell_count')}
            style={{
              width: '64px',
              font: '13px var(--font-num)',
              padding: '6px',
              border: '1.5px solid var(--ink)',
              borderRadius: 'var(--radius-2)',
            }}
            onInput={(e) =>
              setCount(
                Math.max(
                  0,
                  Math.floor(Number((e.target as HTMLInputElement).value)),
                ),
              )
            }
          />
          <button
            type="button"
            class="btn"
            disabled={gets === null}
            onClick={() => {
              if (!act(sell)) setCount(1)
            }}
          >
            {gets === null
              ? t('ui.fleet_dialog.sell')
              : t('ui.fleet_dialog.sell_for', { value: fmt.money(gets) })}
          </button>
        </span>
      </td>
    </tr>
  )
}

export function OffersDialog({ state, act, onClose }: DialogProps) {
  return (
    <Dialog title={t('ui.offers.title')} onClose={onClose}>
      <p class="num-s muted" style={{ margin: 0 }}>
        {t('ui.offers.note')}
      </p>
      <table>
        <thead>
          <tr>
            <th>{t('ui.offers.col.site')}</th>
            <th class="r">{t('ui.offers.col.build')}</th>
            <th class="r">{t('ui.offers.col.rent')}</th>
            <th class="r">{t('ui.offers.col.power')}</th>
            <th>{t('ui.offers.col.flaw')}</th>
            <th class="r" />
          </tr>
        </thead>
        <tbody>
          {state.siteOffers.map((o) => {
            const a: Action = { type: 'BUILD_SITE', offerId: o.id }
            const why = whyNot(state, a)
            return (
              <tr key={o.id}>
                <td>
                  <span
                    style={{
                      display: 'inline-flex',
                      gap: '8px',
                      alignItems: 'center',
                    }}
                  >
                    <Icon name={tierIcon(o.tier)} size={16} />
                    {tierName(o.tier)}
                  </span>
                </td>
                <td class="num r">{fmt.money(o.capexUsd)}</td>
                <td class="num r">
                  {t('ui.offers.per_quarter', { value: fmt.money(o.rentUsdQ) })}
                </td>
                <td class="num r">{fmt.pct(o.powerPriceMult)}</td>
                <td>
                  <span class="tag">{t('ui.offers.hidden_flaw')}</span>
                </td>
                <td class="r">
                  <button
                    type="button"
                    class="btn"
                    disabled={!!why}
                    title={why ? say(why) : undefined}
                    onClick={() => {
                      if (!act(a)) onClose()
                    }}
                  >
                    {t('ui.offers.build')}
                    <Pips
                      total={BANDWIDTH_COST.build}
                      filled={BANDWIDTH_COST.build}
                      label={t('ui.plan.costs_bandwidth', {
                        n: BANDWIDTH_COST.build,
                      })}
                    />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </Dialog>
  )
}
