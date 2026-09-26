// Plan-phase dialogs: buy machines, sell or repair a batch, review scouted site offers.
// Previews come from dry-running the action through the sim (applyAction / whyNot).
import { useState } from 'preact/hooks'
import { t, tDynamic } from '../../i18n/t.ts'
import { applyAction, type Action } from '../../sim/actions.ts'
import {
  BANDWIDTH_COST,
  SELL_TREASURY_BANDWIDTH,
  bestSite,
  cryptoLoanView,
  equipmentLoanView,
  treasuryHoldings,
  lotViews,
  machineMarket,
  siteViews,
  whyNot,
  type LotView,
} from '../../sim/selectors.ts'
import type { Coin, Condition, GameState } from '../../sim/state.ts'
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

/** Confirm leaving a site: shows the penalty, the machines sold there and the rent saved. */
export function LeaveDialog({
  state,
  act,
  onClose,
  siteId,
}: DialogProps & { siteId: string }) {
  const sv = siteViews(state).find((x) => x.site.id === siteId)
  if (!sv?.leaving) return null
  const { penaltyUsd, units, machinesUsd } = sv.leaving
  const a: Action = { type: 'LEAVE_SITE', siteId }
  const why = whyNot(state, a)
  const tier = tierName(sv.site.tier)
  const change = cashChange(state, a)
  return (
    <Dialog title={t('ui.leave.title', { tier })} onClose={onClose}>
      <p class="num-s muted" style={{ margin: 0 }}>
        {t('ui.leave.note')}
      </p>
      <table>
        <tbody>
          <tr>
            <td>{t('ui.leave.penalty')}</td>
            <td class="num r loss">{fmt.signed(-penaltyUsd)}</td>
          </tr>
          <tr>
            <td>
              {units > 0
                ? t('ui.leave.machines', { n: units })
                : t('ui.leave.no_machines')}
            </td>
            <td class="num r">{units > 0 ? fmt.signed(machinesUsd) : ''}</td>
          </tr>
          <tr>
            <td>{t('ui.leave.rent_saved')}</td>
            <td class="num r">
              {t('ui.offers.per_quarter', {
                value: fmt.money(sv.site.rentUsdQ),
              })}
            </td>
          </tr>
          <tr>
            <td>
              <strong>{t('ui.leave.cash_change')}</strong>
            </td>
            <td class="num r">
              <strong>{change === null ? '—' : fmt.signed(change)}</strong>
            </td>
          </tr>
        </tbody>
      </table>
      {why && <p class="num-s loss">{say(why)}</p>}
      <div class="row-between">
        <button type="button" class="btn" onClick={onClose}>
          {t('ui.leave.cancel')}
        </button>
        <button
          type="button"
          class="btn btn-primary"
          disabled={!!why}
          onClick={() => {
            if (!act(a)) onClose()
          }}
        >
          {t('ui.leave.confirm')}
        </button>
      </div>
    </Dialog>
  )
}

/** Borrow against your machines: pick an amount up to the lenders' limit. */
export function LoanDialog({ state, act, onClose }: DialogProps) {
  const v = equipmentLoanView(state)
  const [amount, setAmount] = useState(v.maxUsd)
  if (!v.terms) return null
  const a: Action = { type: 'TAKE_LOAN', amountUsd: amount }
  const why = whyNot(state, a)
  const quarters = v.terms.tenorQuarters
  return (
    <Dialog title={t('ui.loan.title')} onClose={onClose}>
      <p class="num-s muted" style={{ margin: 0 }}>
        {t('ui.loan.note', { quarters, apr: fmt.pct(v.terms.apr) })}
      </p>
      <table>
        <tbody>
          <tr>
            <td>{t('ui.loan.collateral')}</td>
            <td class="num r">{fmt.money(v.collateralUsd)}</td>
          </tr>
          <tr>
            <td>{t('ui.loan.max', { ltv: fmt.pct(v.terms.ltv) })}</td>
            <td class="num r">{fmt.money(v.maxUsd)}</td>
          </tr>
        </tbody>
      </table>
      <div class="row-between">
        <label class="field">
          <span class="label">{t('ui.loan.amount')}</span>
          <input
            type="number"
            min={1}
            max={v.maxUsd}
            step={100}
            value={amount}
            style={{ width: '140px' }}
            onInput={(e) =>
              setAmount(
                Math.max(
                  0,
                  Math.floor(Number((e.target as HTMLInputElement).value)),
                ),
              )
            }
          />
        </label>
        <button type="button" class="btn" onClick={() => setAmount(v.maxUsd)}>
          {t('ui.buy.max', { n: fmt.money(v.maxUsd) })}
        </button>
      </div>
      <p class="num-s muted" style={{ margin: 0 }}>
        {t('ui.loan.payment', {
          value: fmt.money(v.quarterlyPaymentUsd(amount)),
          quarters,
        })}
      </p>
      {why && <p class="num-s loss">{say(why)}</p>}
      <div class="row-between">
        <button type="button" class="btn" onClick={onClose}>
          {t('ui.loan.cancel')}
        </button>
        <button
          type="button"
          class="btn btn-primary"
          disabled={!!why}
          onClick={() => {
            if (!act(a)) onClose()
          }}
        >
          {t('ui.loan.borrow', { value: fmt.money(amount) })}
          <Pips
            total={v.bandwidth}
            filled={v.bandwidth}
            label={t('ui.plan.costs_bandwidth', { n: v.bandwidth })}
          />
        </button>
      </div>
    </Dialog>
  )
}

const SELL_SHARES = [0.25, 0.5, 0.75, 1] as const

/** Sell part of one coin in the treasury: pick the coin and a share. 1 Bandwidth. */
export function SellCoinsDialog({ state, act, onClose }: DialogProps) {
  const holdings = treasuryHoldings(state)
  const [coin, setCoin] = useState<Coin>(
    holdings.find((h) => h.amount > 0)?.coin ?? 'BTC',
  )
  const [pct, setPct] = useState<number>(0.25)
  const held = holdings.find((h) => h.coin === coin)!
  const a: Action = { type: 'SELL_TREASURY', coin, pct }
  const why = whyNot(state, a)
  const valueUsd = held.valueUsd * pct
  const amount = fmt.crypto(held.amount * pct, coin)
  return (
    <Dialog title={t('ui.sell_coins.title')} onClose={onClose}>
      <p class="num-s muted" style={{ margin: 0 }}>
        {t('ui.sell_coins.note')}
      </p>
      <div class="form-row">
        <div class="field">
          <span class="label">{t('ui.sell_coins.coin')}</span>
          <div class="seg" role="group" aria-label={t('ui.sell_coins.coin')}>
            {holdings.map((h) => (
              <button
                key={h.coin}
                type="button"
                aria-pressed={coin === h.coin}
                disabled={h.amount <= 0}
                onClick={() => setCoin(h.coin)}
              >
                {h.coin}{' '}
                {t('ui.sell_coins.holding', {
                  amount: fmt.crypto(h.amount, h.coin),
                  value: fmt.money(h.valueUsd),
                })}
              </button>
            ))}
          </div>
        </div>
        <div class="field">
          <span class="label">{t('ui.sell_coins.share')}</span>
          <div class="seg" role="group" aria-label={t('ui.sell_coins.share')}>
            {SELL_SHARES.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={pct === p}
                onClick={() => setPct(p)}
              >
                {fmt.pct(p)}
              </button>
            ))}
          </div>
        </div>
      </div>
      <p class="num-s" style={{ margin: 0 }}>
        {t('ui.sell_coins.preview', { amount, value: fmt.money(valueUsd) })}
      </p>
      {why && <p class="num-s loss">{say(why)}</p>}
      <div class="row-between">
        <button type="button" class="btn" onClick={onClose}>
          {t('ui.loan.cancel')}
        </button>
        <button
          type="button"
          class="btn btn-primary"
          disabled={!!why}
          onClick={() => {
            if (!act(a)) onClose()
          }}
        >
          {t('ui.sell_coins.confirm', { value: fmt.money(valueUsd) })}
          <Pips
            total={SELL_TREASURY_BANDWIDTH}
            filled={SELL_TREASURY_BANDWIDTH}
            label={t('ui.plan.costs_bandwidth', { n: SELL_TREASURY_BANDWIDTH })}
          />
        </button>
      </div>
    </Dialog>
  )
}

/** Borrow against treasury coins: pick the coin and the amount; shows the prices where it goes wrong. */
export function CryptoLoanDialog({ state, act, onClose }: DialogProps) {
  const v = cryptoLoanView(state)
  const holdings = treasuryHoldings(state)
  const [coin, setCoin] = useState<Coin>(
    v.maxUsd('BTC') >= v.maxUsd('ETH') ? 'BTC' : 'ETH',
  )
  const [amount, setAmount] = useState(v.maxUsd(coin))
  const a: Action = { type: 'TAKE_CRYPTO_LOAN', coin, amountUsd: amount }
  const why = whyNot(state, a)
  const p = v.preview(coin, amount)
  const held = holdings.find((h) => h.coin === coin)!
  const pick = (c: Coin) => {
    setCoin(c)
    setAmount(v.maxUsd(c))
  }
  return (
    <Dialog title={t('ui.cloan.title')} onClose={onClose}>
      <p class="num-s muted" style={{ margin: 0 }}>
        {t('ui.cloan.note', {
          ltv: fmt.pct(v.terms.ltvMax),
          apr: fmt.pct(v.terms.apr),
          call: fmt.pct(v.terms.marginCallLtv),
          liquidation: fmt.pct(v.terms.liquidationLtv),
        })}
      </p>
      <div class="form-row">
        <div class="field">
          <span class="label">{t('ui.sell_coins.coin')}</span>
          <div class="seg" role="group" aria-label={t('ui.sell_coins.coin')}>
            {holdings.map((h) => (
              <button
                key={h.coin}
                type="button"
                aria-pressed={coin === h.coin}
                disabled={v.maxUsd(h.coin) < 1}
                onClick={() => pick(h.coin)}
              >
                {h.coin}{' '}
                {t('ui.sell_coins.holding', {
                  amount: fmt.crypto(h.amount, h.coin),
                  value: fmt.money(h.valueUsd),
                })}
              </button>
            ))}
          </div>
        </div>
        <label class="field">
          <span class="label">{t('ui.loan.amount')}</span>
          <input
            type="number"
            min={1}
            max={v.maxUsd(coin)}
            step={100}
            value={amount}
            style={{ width: '140px' }}
            onInput={(e) =>
              setAmount(
                Math.max(
                  0,
                  Math.floor(Number((e.target as HTMLInputElement).value)),
                ),
              )
            }
          />
        </label>
        <button
          type="button"
          class="btn"
          onClick={() => setAmount(v.maxUsd(coin))}
        >
          {t('ui.buy.max', { n: fmt.money(v.maxUsd(coin)) })}
        </button>
      </div>
      <p class="num-s" style={{ margin: 0 }}>
        {t('ui.cloan.pledge', {
          amount: fmt.crypto(p.collateral, coin),
          held: fmt.crypto(held.amount, coin),
        })}{' '}
        {t('ui.cloan.danger', {
          coin,
          call: fmt.money(p.marginCallPrice),
          price: fmt.money(p.price),
          liquidation: fmt.money(p.liquidationPrice),
        })}
      </p>
      {why && <p class="num-s loss">{say(why)}</p>}
      <div class="row-between">
        <button type="button" class="btn" onClick={onClose}>
          {t('ui.loan.cancel')}
        </button>
        <button
          type="button"
          class="btn btn-primary"
          disabled={!!why}
          onClick={() => {
            if (!act(a)) onClose()
          }}
        >
          {t('ui.cloan.borrow', { value: fmt.money(amount) })}
          <Pips
            total={v.bandwidth}
            filled={v.bandwidth}
            label={t('ui.plan.costs_bandwidth', { n: v.bandwidth })}
          />
        </button>
      </div>
    </Dialog>
  )
}
