// Plan-phase dialogs: buy machines, sell or repair a batch, review scouted site offers.
// Previews come from dry-running the action through the sim (applyAction / whyNot).
import { useState } from 'preact/hooks'
import { t, tDynamic } from '../../i18n/t.ts'
import { applyAction, type Action } from '../../sim/actions.ts'
import {
  BANDWIDTH_COST,
  SELL_TREASURY_BANDWIDTH,
  auctionView,
  bestSite,
  communityView,
  hostingView,
  cryptoLoanView,
  equipmentLoanView,
  constructionLoanView,
  buyCapKw,
  fundingRound,
  hireViews,
  negotiationResult,
  offerFlawsVisible,
  pitchResult,
  pitchView,
  negotiationView,
  renewalViews,
  treasuryHoldings,
  lotViews,
  machineMarket,
  siteViews,
  whyNot,
  type LotView,
} from '../../sim/selectors.ts'
import type {
  Coin,
  Condition,
  GameState,
  ContractType,
} from '../../sim/state.ts'
import { Dialog, Icon, Pips } from '../components/basics.tsx'
import { fmt } from '../format.ts'
import {
  flawName,
  machineIcon,
  machineName,
  rivalCode,
  rivalName,
  say,
  tierIcon,
  tierName,
} from '../names.ts'
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
      Math.floor(Math.min(freeKw, buyCapKw(state, model)) / m.powerKw),
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
  // Phased sites (Texas) sign their power contract with phase 1: fixed or index.
  const [contractType, setContractType] = useState<ContractType>('fixed')
  const phased = state.siteOffers.some(
    (o) => constructionLoanView(state).firstBuild(o).phase,
  )
  return (
    <Dialog title={t('ui.offers.title')} onClose={onClose}>
      <p class="num-s muted" style={{ margin: 0 }}>
        {t('ui.offers.note')}
      </p>
      {phased && (
        <label class="num-s">
          {t('ui.offers.contract')}{' '}
          <select
            value={contractType}
            onChange={(e) =>
              setContractType(
                (e.currentTarget as HTMLSelectElement).value as ContractType,
              )
            }
          >
            <option value="fixed">{tDynamic('contract.fixed', 'fixed')}</option>
            <option value="index">{tDynamic('contract.index', 'index')}</option>
          </select>
        </label>
      )}
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
            const first = constructionLoanView(state).firstBuild(o)
            const a: Action = first.phase
              ? { type: 'BUILD_SITE', offerId: o.id, contractType }
              : { type: 'BUILD_SITE', offerId: o.id }
            const why = whyNot(state, a)
            const fin = first.financed
            const financed: Action = {
              type: 'BUILD_SITE',
              offerId: o.id,
              financed: true,
              contractType,
            }
            const whyFinanced = fin ? whyNot(state, financed) : null
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
                  {!offerFlawsVisible(state) ? (
                    <span class="tag">{t('ui.offers.hidden_flaw')}</span>
                  ) : o.flaw ? (
                    <span class="tag warn">{flawName(o.flaw)}</span>
                  ) : (
                    <span class="num-s muted">{t('ui.offers.no_flaw')}</span>
                  )}
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
                    {first.phase
                      ? t('ui.offers.build_phase', {
                          kw: fmt.power(first.phase.kw),
                          cost: fmt.money(first.costUsd),
                        })
                      : t('ui.offers.build')}
                    <Pips
                      total={BANDWIDTH_COST.build}
                      filled={BANDWIDTH_COST.build}
                      label={t('ui.plan.costs_bandwidth', {
                        n: BANDWIDTH_COST.build,
                      })}
                    />
                  </button>
                  {fin && (
                    <button
                      type="button"
                      class="btn"
                      style={{ marginTop: '6px' }}
                      disabled={!!whyFinanced}
                      title={
                        whyFinanced
                          ? say(whyFinanced)
                          : t('ui.offers.financed_hint', {
                              loan: fmt.money(fin.loanUsd),
                              cash: fmt.money(fin.cashUsd),
                            })
                      }
                      onClick={() => {
                        if (!act(financed)) onClose()
                      }}
                    >
                      {t('ui.offers.build_financed', {
                        cash: fmt.money(fin.cashUsd),
                      })}
                    </button>
                  )}
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

/** Distressed auction: one sealed bid for the whole lot, settled at once against the rivals. */
export function AuctionDialog({ state, act, onClose }: DialogProps) {
  const v = auctionView(state)
  const lot = v.lot!
  const [bid, setBid] = useState(lot.reserveUsd)
  const [siteId, setSiteId] = useState(
    (v.sitesWithRoom[0] ?? state.sites[0]).id,
  )
  const site = state.sites.find((s) => s.id === siteId)!
  const a: Action = { type: 'BID_AUCTION', bidUsd: bid, siteId }
  const why = whyNot(state, a)
  const profit = v.dailyProfitUsd(site)
  return (
    <Dialog title={t('ui.auction.title')} onClose={onClose}>
      <p style={{ margin: 0, fontWeight: 600 }}>
        {t('ui.auction.lot', {
          count: lot.count,
          model: machineName(lot.model),
          list: fmt.money(lot.unitListUsd),
        })}
      </p>
      <p class="num-s muted" style={{ margin: 0 }}>
        {t('ui.auction.note', {
          value: fmt.money(lot.valueUsd),
          reserve: fmt.money(lot.reserveUsd),
          power: fmt.power(lot.neededKw),
        })}
      </p>
      <div class="bidders" aria-label={t('ui.auction.bidders')}>
        <span class="label">{t('ui.auction.bidders')}</span>
        {lot.bidders.map((id) => (
          <span class="bidder" key={id}>
            <span class="mono" aria-hidden="true">
              {rivalCode(id)}
            </span>
            {rivalName(id)}
          </span>
        ))}
      </div>
      <div class="form-row">
        <label class="field">
          <span class="label">{t('ui.auction.your_bid')}</span>
          <input
            type="number"
            min={lot.reserveUsd}
            step={100}
            value={bid}
            style={{ width: '140px' }}
            onInput={(e) =>
              setBid(
                Math.max(
                  0,
                  Math.floor(Number((e.target as HTMLInputElement).value)),
                ),
              )
            }
          />
        </label>
        <label class="field">
          <span class="label">{t('ui.auction.site')}</span>
          <select
            value={siteId}
            onChange={(e) => setSiteId((e.target as HTMLSelectElement).value)}
          >
            {state.sites.map((s) => (
              <option key={s.id} value={s.id}>
                {tierName(s.tier)}
              </option>
            ))}
          </select>
        </label>
        <span class="num-s muted">
          {t('ui.auction.cash', { value: fmt.money(state.cash) })}
        </span>
      </div>
      <p class="num-s" style={{ margin: 0 }}>
        {t('ui.auction.preview', {
          share: fmt.pct(lot.valueUsd > 0 ? bid / lot.valueUsd : 0),
          each: fmt.money(bid / lot.count),
        })}{' '}
        <span class={profit >= 0 ? 'gain' : 'loss'}>
          {t('ui.auction.profit', {
            value: fmt.delta(profit, 'money'),
            tier: tierName(site.tier),
          })}
        </span>
      </p>
      <p class="num-s muted" style={{ margin: 0 }}>
        {t('ui.auction.rules')}
      </p>
      {why && <p class="num-s loss">{say(why)}</p>}
      <div class="row-between">
        <button type="button" class="btn" onClick={onClose}>
          {t('ui.auction.pass')}
        </button>
        <button
          type="button"
          class="btn btn-primary"
          disabled={!!why}
          onClick={() => {
            if (!act(a)) onClose()
          }}
        >
          {t('ui.auction.bid', { value: fmt.money(bid) })}
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

/** Every site's Heat, with "talk to the neighbours" and noise mitigation for each. */
export function CommunityDialog({ state, act, onClose }: DialogProps) {
  const v = communityView(state)
  const button = (a: Action, label: string, bw: number) => {
    const why = whyNot(state, a)
    return (
      <button
        type="button"
        class="btn"
        disabled={!!why}
        title={why ? say(why) : undefined}
        onClick={() => act(a)}
      >
        {label}
        {bw > 0 && (
          <Pips
            total={bw}
            filled={bw}
            label={t('ui.plan.costs_bandwidth', { n: bw })}
          />
        )}
      </button>
    )
  }
  return (
    <Dialog title={t('ui.community.title')} onClose={onClose}>
      <p class="num-s muted" style={{ margin: 0 }}>
        {t('ui.community.note', {
          bw: v.outreachBandwidth,
          grievance: fmt.signedInt(v.outreachGrievance),
          mbw: v.mitigationBandwidth,
          base: -v.mitigationBase,
        })}
      </p>
      <table>
        <thead>
          <tr>
            <th>{t('ui.community.col.site')}</th>
            <th class="r">{t('ui.community.col.heat')}</th>
            <th class="r">{t('ui.community.col.talk')}</th>
            <th class="r">{t('ui.community.col.walls')}</th>
          </tr>
        </thead>
        <tbody>
          {v.sites.map((x) => (
            <tr key={x.site.id}>
              <td>
                <span
                  style={{
                    display: 'inline-flex',
                    gap: '8px',
                    alignItems: 'center',
                  }}
                >
                  <Icon name={tierIcon(x.site.tier)} size={16} />
                  {tierName(x.site.tier)}
                </span>
              </td>
              <td class="num r">{Math.round(x.heat)}</td>
              <td class="r">
                {x.outreachDone
                  ? t('ui.community.done')
                  : button(
                      { type: 'OUTREACH', siteId: x.site.id },
                      fmt.money(x.outreachUsd),
                      v.outreachBandwidth,
                    )}
              </td>
              <td class="r">
                {x.mitigated
                  ? t('ui.community.done')
                  : button(
                      { type: 'MITIGATE_NOISE', siteId: x.site.id },
                      fmt.money(x.mitigationUsd),
                      v.mitigationBandwidth,
                    )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div class="row-between">
        <span />
        <button type="button" class="btn" onClick={onClose}>
          {t('ui.community.close')}
        </button>
      </div>
    </Dialog>
  )
}

/** A due power contract renewal: accept the opening, or negotiate (then the bargaining panel). */
export function RenewalDialog({
  state,
  act,
  onClose,
  siteId,
}: DialogProps & { siteId: string }) {
  const r = renewalViews(state).find((x) => x.site.id === siteId)
  const [type, setType] = useState<ContractType>(r?.current.type ?? 'fixed')
  const [term, setTerm] = useState<number>(r?.terms[0] ?? 4)
  if (!r) {
    // The renewal was just settled (a deal, or someone walked away): say how it ended.
    const site = state.sites.find((x) => x.id === siteId)
    const result = site && negotiationResult(state, site.tier)
    if (!site || !result) return null
    return (
      <Dialog
        title={t('ui.renewal.title', { tier: tierName(site.tier) })}
        onClose={onClose}
      >
        <p style={{ margin: 0 }}>{t(result.key, result.params)}</p>
        <div class="row-between">
          <span />
          <button type="button" class="btn btn-primary" onClick={onClose}>
            {t('ui.community.close')}
          </button>
        </div>
      </Dialog>
    )
  }
  const tier = tierName(r.site.tier)
  if (state.negotiation?.siteId === siteId) {
    return (
      <Dialog title={t('ui.renewal.title', { tier })} onClose={onClose}>
        <NegotiationPanel state={state} act={act} />
      </Dialog>
    )
  }
  const option = r.options.find((o) => o.type === type)!
  const accept: Action = {
    type: 'ACCEPT_RENEWAL',
    siteId,
    contractType: type,
  }
  const negotiate: Action = {
    type: 'NEGOTIATE_START',
    siteId,
    contractType: type,
    term,
  }
  const whyAccept = whyNot(state, accept)
  const whyNegotiate = whyNot(state, negotiate)
  return (
    <Dialog title={t('ui.renewal.title', { tier })} onClose={onClose}>
      <p class="num-s muted" style={{ margin: 0 }}>
        {t('ui.renewal.note', {
          tier,
          contract: tDynamic(`contract.${r.current.type}`, ''),
          price: fmt.cents(r.current.price),
          markup: fmt.pct(r.openingMult - 1),
          term: r.terms[0],
          long: r.terms[1],
          bw: r.bandwidth,
        })}
      </p>
      <div class="form-row">
        {r.options.length > 1 && (
          <div class="field">
            <span class="label">{t('ui.renewal.type')}</span>
            <div class="seg" role="group" aria-label={t('ui.renewal.type')}>
              {r.options.map((o) => (
                <button
                  key={o.type}
                  type="button"
                  aria-pressed={type === o.type}
                  onClick={() => setType(o.type)}
                >
                  {tDynamic(`contract.${o.type}`, o.type)}{' '}
                  {t('ui.renewal.normal', {
                    price: centsExact(o.normalUsdKwh),
                  })}
                </button>
              ))}
            </div>
          </div>
        )}
        <div class="field">
          <span class="label">{t('ui.renewal.term')}</span>
          <div class="seg" role="group" aria-label={t('ui.renewal.term')}>
            {r.terms.map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={term === n}
                onClick={() => setTerm(n)}
              >
                {t('ui.renewal.quarters', { n })}
              </button>
            ))}
          </div>
        </div>
      </div>
      {type === 'index' && (
        <p class="num-s muted" style={{ margin: 0 }}>
          {t('ui.renewal.index_note')}
        </p>
      )}
      {term === r.terms[1] && (
        <p class="num-s muted" style={{ margin: 0 }}>
          {t('ui.renewal.long_note', { pct: fmt.pct(r.longTermMult - 1) })}
        </p>
      )}
      {whyNegotiate && <p class="num-s loss">{say(whyNegotiate)}</p>}
      <div class="row-between">
        <button type="button" class="btn" onClick={onClose}>
          {t('ui.renewal.cancel')}
        </button>
        <span style={{ display: 'inline-flex', gap: '8px' }}>
          <button
            type="button"
            class="btn"
            disabled={!!whyAccept}
            title={whyAccept ? say(whyAccept) : undefined}
            onClick={() => {
              if (!act(accept)) onClose()
            }}
          >
            {t('ui.renewal.accept', {
              price: centsExact(option.openingUsdKwh),
              term: r.terms[0],
            })}
          </button>
          <button
            type="button"
            class="btn btn-primary"
            disabled={!!whyNegotiate}
            onClick={() => act(negotiate)}
          >
            {t('ui.renewal.negotiate')}
            <Pips
              total={r.bandwidth}
              filled={r.bandwidth}
              label={t('ui.plan.costs_bandwidth', { n: r.bandwidth })}
            />
          </button>
        </span>
      </div>
    </Dialog>
  )
}

/** Power prices to the hundredth of a cent, for bargaining: "5.23¢/kWh". */
function centsExact(usdPerKwh: number): string {
  return t('ui.negotiation.cents', { value: (usdPerKwh * 100).toFixed(2) })
}

/** The bargaining panel (wireframe 7): the utility's offer, your counter, rounds and risk. */
function NegotiationPanel({ state, act }: ScreenProps) {
  const v = negotiationView(state)
  const [price, setPrice] = useState<number>(
    v ? Math.min(v.offerUsdKwh, v.normalUsdKwh * 0.95) : 0,
  )
  if (!v) return null
  const counter: Action = { type: 'NEGOTIATE_COUNTER', priceUsdKwh: price }
  const risk = v.risk(price)
  const min = v.normalUsdKwh * 0.7
  return (
    <>
      <div class="row-between">
        <span class="label">
          {t('ui.negotiation.round', {
            n: Math.min(v.round + 1, v.rounds),
            rounds: v.rounds,
          })}
        </span>
        <span class="num-s muted">
          {t('ui.negotiation.terms', {
            contract: tDynamic(`contract.${v.contractType}`, ''),
            term: v.term,
          })}
        </span>
      </div>
      <div class="event-art">
        <span class="num-xl">{centsExact(v.offerUsdKwh)}</span>
        <span class="num-s">
          {t('ui.negotiation.their_offer', {
            opening: centsExact(v.openingUsdKwh),
            normal: centsExact(v.normalUsdKwh),
          })}
        </span>
      </div>
      {v.history.length > 0 && (
        <ol class="num-s muted" style={{ margin: 0, paddingLeft: '18px' }}>
          {v.history.map((h, i) => (
            <li key={i}>
              {t('ui.negotiation.history', {
                counter: centsExact(h.counterUsdKwh),
              })}
            </li>
          ))}
        </ol>
      )}
      {v.final ? (
        <p class="num-s warn" style={{ margin: 0 }}>
          {t('ui.negotiation.final')}
        </p>
      ) : (
        <div class="field">
          <label class="label" for="counter">
            {t('ui.negotiation.your_counter', { price: centsExact(price) })}
          </label>
          <input
            class="slider"
            id="counter"
            type="range"
            min={min}
            max={v.offerUsdKwh}
            step={0.0001}
            value={price}
            onInput={(e) =>
              setPrice(Number((e.target as HTMLInputElement).value))
            }
          />
          <span
            class={`num-s ${risk === 'high' ? 'loss' : risk === 'possible' ? 'warn' : 'muted'}`}
          >
            {tDynamic(`ui.negotiation.risk.${risk}`, '', {
              chance: fmt.pct(v.walkawayChance),
            })}
          </span>
        </div>
      )}
      <div class="row-between">
        <button
          type="button"
          class="btn"
          onClick={() => {
            act({ type: 'NEGOTIATE_WALK' })
          }}
        >
          {t('ui.negotiation.walk', { opening: centsExact(v.openingUsdKwh) })}
        </button>
        <span style={{ display: 'inline-flex', gap: '8px' }}>
          <button
            type="button"
            class="btn"
            onClick={() => {
              act({ type: 'NEGOTIATE_ACCEPT' })
            }}
          >
            {t('ui.negotiation.accept', { price: centsExact(v.offerUsdKwh) })}
          </button>
          {!v.final && (
            <button
              type="button"
              class="btn btn-primary"
              onClick={() => {
                act(counter)
              }}
            >
              {t('ui.negotiation.counter')}
            </button>
          )}
        </span>
      </div>
      <span class="num-s muted" style={{ fontStyle: 'italic' }}>
        {t('ui.negotiation.hint')}
      </span>
    </>
  )
}

/**
 * A funding round that can be pitched (capital.json › pitch): take the investor's opening,
 * or pitch for a higher pre-money valuation (then the pitch panel, then how it ended).
 */
export function PitchDialog({
  state,
  act,
  onClose,
  round: id,
}: DialogProps & { round: string }) {
  const r = fundingRound(state, id)
  const title = t('ui.pitch.title', { round: id })
  if (r.pitching) {
    return (
      <Dialog title={title} onClose={onClose}>
        <PitchPanel state={state} act={act} />
      </Dialog>
    )
  }
  if (r.status !== 'open') {
    // Settled (a deal, someone walked away, or the offer taken): say how it ended.
    const result = pitchResult(state, id)
    const raised = state.log.findLast(
      (e) =>
        e.key === 'log.raised' &&
        e.params?.round === id &&
        e.quarter === state.quarter,
    )
    if (!result && !raised) return null
    return (
      <Dialog title={title} onClose={onClose}>
        {result && <p style={{ margin: 0 }}>{t(result.key, result.params)}</p>}
        {raised && (
          <p class={result ? 'num-s muted' : ''} style={{ margin: 0 }}>
            {t(raised.key, raised.params)}
          </p>
        )}
        <div class="row-between">
          <span />
          <button type="button" class="btn btn-primary" onClick={onClose}>
            {t('ui.community.close')}
          </button>
        </div>
      </Dialog>
    )
  }
  const take: Action = { type: 'RAISE', round: id }
  const pitch: Action = { type: 'PITCH_START', round: id }
  const whyTake = whyNot(state, take)
  const whyPitch = whyNot(state, pitch)
  return (
    <Dialog title={title} onClose={onClose}>
      <p class="num-s muted" style={{ margin: 0 }}>
        {t('ui.pitch.note', {
          amount: fmt.money(r.amountUsd),
          valuation: fmt.money(r.preMoneyUsd ?? 0),
          share: fmt.pct(r.dilution, 1),
          stakeBefore: fmt.pct(state.founderStake, 1),
          stakeAfter: fmt.pct(state.founderStake * (1 - r.dilution), 1),
          bw: r.pitchBandwidth,
          lockout: r.lockoutQuarters,
          penalty: fmt.pct(r.walkawayPenalty),
        })}
      </p>
      {r.penalty > 0 && (
        <p class="num-s warn" style={{ margin: 0 }}>
          {t('ui.pitch.penalty_note', { penalty: fmt.pct(r.penalty) })}
        </p>
      )}
      {r.lastChance && (
        <p class="num-s warn" style={{ margin: 0 }}>
          {t('ui.pitch.last_chance')}
        </p>
      )}
      {whyPitch && <p class="num-s loss">{say(whyPitch)}</p>}
      <div class="row-between">
        <button type="button" class="btn" onClick={onClose}>
          {t('ui.pitch.cancel')}
        </button>
        <span style={{ display: 'inline-flex', gap: '8px' }}>
          <button
            type="button"
            class="btn"
            disabled={!!whyTake}
            title={whyTake ? say(whyTake) : undefined}
            onClick={() => act(take)}
          >
            {t('ui.pitch.take', {
              amount: fmt.money(r.amountUsd),
              share: fmt.pct(r.dilution, 1),
            })}
          </button>
          <button
            type="button"
            class="btn btn-primary"
            disabled={!!whyPitch}
            onClick={() => act(pitch)}
          >
            {t('ui.pitch.pitch')}
            <Pips
              total={r.pitchBandwidth}
              filled={r.pitchBandwidth}
              label={t('ui.plan.costs_bandwidth', { n: r.pitchBandwidth })}
            />
          </button>
        </span>
      </div>
    </Dialog>
  )
}

/** The pitch panel: the investor's valuation, your counter, dilution and stake, rounds and risk. */
function PitchPanel({ state, act }: ScreenProps) {
  const v = pitchView(state)
  const [valuation, setValuation] = useState<number>(
    v ? v.defaultCounterUsd : 0,
  )
  if (!v) return null
  const counter: Action = { type: 'PITCH_COUNTER', preMoneyUsd: valuation }
  const risk = v.risk(valuation)
  const offer = v.terms(v.offerUsd)
  const mine = v.terms(valuation)
  return (
    <>
      <div class="row-between">
        <span class="label">
          {t('ui.negotiation.round', {
            n: Math.min(v.round + 1, v.rounds),
            rounds: v.rounds,
          })}
        </span>
        <span class="num-s muted">{fmt.money(v.amountUsd)}</span>
      </div>
      <div class="event-art">
        <span class="num-xl">{fmt.money(v.offerUsd)}</span>
        <span class="num-s">
          {t('ui.pitch.their_offer', {
            opening: fmt.money(v.openingUsd),
            share: fmt.pct(offer.dilution, 1),
            stake: fmt.pct(offer.stakeAfter, 1),
          })}
        </span>
      </div>
      {v.history.length > 0 && (
        <ol class="num-s muted" style={{ margin: 0, paddingLeft: '18px' }}>
          {v.history.map((h, i) => (
            <li key={i}>
              {t('ui.pitch.history', { counter: fmt.money(h.counterUsd) })}
            </li>
          ))}
        </ol>
      )}
      {v.final ? (
        <p class="num-s warn" style={{ margin: 0 }}>
          {t('ui.pitch.final')}
        </p>
      ) : (
        <div class="field">
          <label class="label" for="pitch-counter">
            {t('ui.pitch.your_counter', {
              valuation: fmt.money(valuation),
              share: fmt.pct(mine.dilution, 1),
              stake: fmt.pct(mine.stakeAfter, 1),
            })}
          </label>
          <input
            class="slider"
            id="pitch-counter"
            type="range"
            min={v.sliderMinUsd}
            max={v.sliderMaxUsd}
            step={v.sliderStepUsd}
            value={valuation}
            onInput={(e) =>
              setValuation(Number((e.target as HTMLInputElement).value))
            }
          />
          <span
            class={`num-s ${risk === 'high' ? 'loss' : risk === 'possible' ? 'warn' : 'muted'}`}
          >
            {tDynamic(`ui.pitch.risk.${risk}`, '', {
              chance: fmt.pct(v.walkawayChance),
            })}
          </span>
        </div>
      )}
      {v.lastChance && (
        <p class="num-s warn" style={{ margin: 0 }}>
          {t('ui.pitch.last_chance')}
        </p>
      )}
      <div class="row-between">
        <button
          type="button"
          class="btn"
          onClick={() => {
            act({ type: 'PITCH_WALK' })
          }}
        >
          {t('ui.pitch.walk')}
        </button>
        <span style={{ display: 'inline-flex', gap: '8px' }}>
          <button
            type="button"
            class="btn"
            onClick={() => {
              act({ type: 'PITCH_ACCEPT' })
            }}
          >
            {t('ui.pitch.accept', { valuation: fmt.money(v.offerUsd) })}
          </button>
          {!v.final && (
            <button
              type="button"
              class="btn btn-primary"
              onClick={() => {
                act(counter)
              }}
            >
              {t('ui.pitch.counter')}
            </button>
          )}
        </span>
      </div>
      <span class="num-s muted" style={{ fontStyle: 'italic' }}>
        {t('ui.pitch.hint')}
      </span>
    </>
  )
}

/** People (scope §2.8): the five hires, their pay and effect; hire (1 Bandwidth) or let go. */
export function HiresDialog({ state, act, onClose }: DialogProps) {
  const hires = hireViews(state)
  return (
    <Dialog title={t('ui.hires.title')} onClose={onClose}>
      <p class="num-s muted" style={{ margin: 0 }}>
        {t('ui.hires.note', { bw: hires[0]?.bandwidth ?? 1 })}
      </p>
      <HiresTable state={state} act={act} />
      <div class="row-between">
        <span />
        <button type="button" class="btn btn-primary" onClick={onClose}>
          {t('ui.community.close')}
        </button>
      </div>
    </Dialog>
  )
}

/** The hires table (the People dialog and the People section). */
export function HiresTable({ state, act }: ScreenProps) {
  const hires = hireViews(state)
  return (
    <table>
      <thead>
        <tr>
          <th>{t('ui.hires.col.person')}</th>
          <th>{t('ui.hires.col.effect')}</th>
          <th class="r">{t('ui.hires.col.salary')}</th>
          <th class="r" />
        </tr>
      </thead>
      <tbody>
        {hires.map((h) => {
          const a: Action = h.hired
            ? { type: 'FIRE', hire: h.id }
            : { type: 'HIRE', hire: h.id }
          const why = whyNot(state, a)
          return (
            <tr key={h.id}>
              <td class="wrap">
                <strong>{tDynamic(`hire.${h.id}`, h.id)}</strong>
                <br />
                <span class="num-s">{h.name}</span>
                <br />
                <span class="num-s muted" style={{ fontStyle: 'italic' }}>
                  {h.bio}
                </span>
              </td>
              <td class="num-s wrap">{tDynamic(`hire_effect.${h.id}`, '')}</td>
              <td class="num r">
                {t('ui.offers.per_quarter', {
                  value: fmt.money(h.salaryUsdQ),
                })}
              </td>
              <td class="r">
                <button
                  type="button"
                  class={h.hired ? 'btn' : 'btn btn-primary'}
                  disabled={!!why}
                  title={why ? say(why) : undefined}
                  onClick={() => act(a)}
                >
                  {h.hired
                    ? t('ui.hires.fire', { value: fmt.money(h.severanceUsd) })
                    : t('ui.hires.hire')}
                  {!h.hired && (
                    <Pips
                      total={h.bandwidth}
                      filled={h.bandwidth}
                      label={t('ui.plan.costs_bandwidth', { n: h.bandwidth })}
                    />
                  )}
                </button>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

/**
 * Act II hosting (scope 0.2 §2.4): per site, convert free energized kW (cost, rate, power price and
 * a quarter's margin per MW shown up front); then the contracts, each with what ending costs now.
 */
export function HostingDialog({ state, act, onClose }: DialogProps) {
  const v = hostingView(state)
  const [kw, setKw] = useState<Record<string, number>>(() =>
    Object.fromEntries(v.sites.map((x) => [x.site.id, Math.floor(x.freeKw)])),
  )
  return (
    <Dialog title={t('ui.hosting.title')} onClose={onClose}>
      <p class="num-s muted" style={{ margin: 0 }}>
        {t('ui.hosting.note', {
          cost: fmt.money(v.sites[0]?.costPerMwUsd ?? 0),
          bw: v.bandwidth,
          term: v.termQuarters,
        })}
      </p>
      <table>
        <thead>
          <tr>
            <th>{t('ui.hosting.col.site')}</th>
            <th class="r">{t('ui.hosting.col.rate')}</th>
            <th class="r">{t('ui.hosting.col.margin')}</th>
            <th class="r">{t('ui.hosting.col.convert')}</th>
          </tr>
        </thead>
        <tbody>
          {v.sites.map((x) => {
            const amount = kw[x.site.id] ?? 0
            const a: Action = {
              type: 'HOST_START',
              siteId: x.site.id,
              kw: amount,
            }
            const why = whyNot(state, a)
            return (
              <tr key={x.site.id}>
                <td>
                  <span
                    style={{
                      display: 'inline-flex',
                      gap: '8px',
                      alignItems: 'center',
                    }}
                  >
                    <Icon name={tierIcon(x.site.tier)} size={16} />
                    {tierName(x.site.tier)}
                  </span>
                  <div class="num-s muted">
                    {t('ui.hosting.free', { value: fmt.power(x.freeKw) })}
                  </div>
                </td>
                <td class="num r">
                  {fmt.cents(x.rateUsdKwh)} / {fmt.cents(x.powerUsdKwh)}
                </td>
                <td class={`num r ${x.marginPerMwQUsd < 0 ? 'loss' : ''}`}>
                  {fmt.money(x.marginPerMwQUsd)}
                </td>
                <td class="r" style={{ whiteSpace: 'nowrap' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      gap: '6px',
                      alignItems: 'center',
                    }}
                  >
                    <input
                      type="number"
                      min={0}
                      max={Math.floor(x.freeKw)}
                      step={10}
                      value={amount}
                      aria-label={t('ui.hosting.col.convert')}
                      style={{ width: '72px' }}
                      onInput={(e) =>
                        setKw({
                          ...kw,
                          [x.site.id]: Math.max(
                            0,
                            Math.floor(
                              Number((e.target as HTMLInputElement).value),
                            ),
                          ),
                        })
                      }
                    />
                    <button
                      type="button"
                      class="btn"
                      disabled={!!why}
                      title={why ? say(why) : undefined}
                      onClick={() => act(a)}
                    >
                      {t('ui.hosting.convert', {
                        value: fmt.money((amount / 1000) * x.costPerMwUsd),
                      })}
                      <Pips
                        total={v.bandwidth}
                        filled={v.bandwidth}
                        label={t('ui.plan.costs_bandwidth', { n: v.bandwidth })}
                      />
                    </button>
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div class="label">{t('ui.hosting.contracts')}</div>
      {v.contracts.length === 0 ? (
        <p class="num-s muted" style={{ margin: 0 }}>
          {t('ui.hosting.none')}
        </p>
      ) : (
        v.contracts.map((c) => {
          const a: Action = { type: 'HOST_END', contractId: c.contract.id }
          const why = whyNot(state, a)
          return (
            <div class="row-between" key={c.contract.id}>
              <span class="num-s">
                {c.live
                  ? t('ui.hosting.live', {
                      kw: fmt.power(c.contract.kw),
                      tier: tierName(c.tier),
                      rate: fmt.cents(c.contract.rateUsdKwh),
                      quarter: fmt.quarter(c.termEnd),
                      fees: fmt.money(c.quarterFeesUsd),
                    })
                  : t('ui.hosting.converting', {
                      kw: fmt.power(c.contract.kw),
                      tier: tierName(c.tier),
                      quarter: fmt.quarter(c.readyQuarter),
                    })}
              </span>
              <button
                type="button"
                class="btn"
                disabled={!!why}
                title={why ? say(why) : undefined}
                onClick={() => act(a)}
              >
                {c.endFeeUsd > 0
                  ? t('ui.hosting.end', { fee: fmt.money(c.endFeeUsd) })
                  : t('ui.hosting.end_free')}
              </button>
            </div>
          )
        })
      )}
      <div class="row-between">
        <span />
        <button type="button" class="btn btn-primary" onClick={onClose}>
          {t('ui.hosting.close')}
        </button>
      </div>
    </Dialog>
  )
}
