// M78.3 (doc 58 v1.1 §4): the Ventures tab in Acts I-II, behind the ACTS12_VENTURES flag. Larkspur Silicon (the offer, your stake, its
// cash calls and the memory pick, a reservation, buying the machine) and, once Ethereum mining has ended, what each GPU lot can do
// (sell, mine its own coin, an alternative coin, rent it out). Numbers come from the sim's views; no game rule lives here.
import { useState } from 'preact/hooks'
import { t, tDynamic, type Message } from '../../i18n/t.ts'
import type { Action } from '../../sim/actions.ts'
import { lotChoices, larkspurView } from '../../sim/ventures12Views.ts'
import { fmt } from '../format.ts'
import { machineName, say, siteName } from '../names.ts'
import type { ScreenProps } from './Plan.tsx'

const pct = (x: number) => `${Math.round(x * 100)}%`

export function Ventures12Section({ state, act }: ScreenProps) {
  const [error, setError] = useState<Message | null>(null)
  const run = (a: Action) => setError((act as (a: Action) => Message | null)(a))
  const lk = larkspurView(state)
  return (
    <div class="section ventures" data-ventures12>
      <div class="col">
        <section class="panel p">
          <h2 class="panel-title">{t('ui.v12.title')}</h2>
          <p class="num-s muted" style={{ margin: 0 }}>{t('ui.v12.intro')}</p>
          {error && <p class="num-s warn">{say(error)}</p>}
        </section>
        {lk && <LarkspurPanel state={state} lk={lk} run={run} />}
        <AfterMergePanel state={state} run={run} />
      </div>
    </div>
  )
}

type LK = NonNullable<ReturnType<typeof larkspurView>>

function LarkspurPanel({ state, lk, run }: { state: ScreenProps['state']; lk: LK; run: (a: Action) => void }) {
  const [memory, setMemory] = useState<'lk5' | 'lk6'>('lk5')
  const [units, setUnits] = useState(0)
  const [count, setCount] = useState(1)
  const [siteId, setSiteId] = useState(state.sites[0]?.id ?? '')
  const reserveUnits = Math.min(Math.max(1, units || (lk.reserve?.maxUnits ?? 0)), Math.max(1, lk.reserve?.maxUnits ?? 1))
  return (
    <section class="panel p" data-larkspur>
      <h3 class="panel-title">{t('ui.v12.lk.title')}</h3>
      <p class="num-s" style={{ margin: 0 }}>
        {t(`ui.v12.lk.status.${lk.status}` as 'ui.v12.lk.status.raising', {
          budget: fmt.money(lk.budgetUsd),
          tape: fmt.quarter(lk.pitched.tapeOut),
          first: fmt.quarter(lk.pitched.firstUnits),
          volume: fmt.quarter(lk.pitched.volume),
        })}
      </p>
      <p class="num-s muted" style={{ margin: 0 }}>
        {t('ui.v12.lk.machines', {
          lk5: fmt.money(lk.lk5Usd),
          lk6: fmt.money(lk.lk6Usd),
          wall5: fmt.date(lk.wall.lk5),
          wall6: fmt.date(lk.wall.lk6),
        })}
      </p>
      {lk.offerOpen && (
        <div data-larkspur-offer>
          <p class="num-s muted" style={{ margin: 0 }}>
            {t('ui.v12.lk.offer', { from: fmt.quarter(lk.joinWindow[0]), to: fmt.quarter(lk.joinWindow[1]) })}
          </p>
          {lk.stakes.map((s) => (
            <div key={s.stake} class="row-between">
              <span class="num-s">
                {t('ui.v12.lk.join_line', { pct: pct(s.stake), total: fmt.money(s.totalUsd), third: fmt.money(s.thirdUsd) })}
              </span>
              <button
                type="button"
                class="btn"
                disabled={!!s.blocker}
                title={s.blocker ? say(s.blocker) : undefined}
                data-larkspur-join={s.stake}
                onClick={() => run({ type: 'LARKSPUR_JOIN', stake: s.stake })}
              >
                {t('ui.v12.lk.join')}
              </button>
            </div>
          ))}
        </div>
      )}
      {lk.stake && (
        <p class="num-s" style={{ margin: 0 }} data-larkspur-stake>
          {lk.stake.ended === 'sold'
            ? t('ui.v12.lk.sold', { value: fmt.money(lk.stake.proceedsUsd ?? lk.stakeSale?.soldUsd ?? 0) })
            : lk.stake.ended === 'cancelled'
            ? t('ui.v12.lk.ended.cancelled', { paid: fmt.money(lk.stake.paidUsd) })
            : lk.stake.ended === 'acquired'
              ? t('ui.v12.lk.ended.acquired', { proceeds: fmt.money(lk.stake.proceedsUsd ?? 0) })
              : lk.stake.walked
                ? t('ui.v12.lk.walked')
                : lk.stake.resolvedUsd !== null
                  ? t('ui.v12.lk.resolved', { value: fmt.money(lk.stake.resolvedUsd) })
                  : t('ui.v12.lk.stake', { share: pct(lk.stake.share), paid: fmt.money(lk.stake.paidUsd), value: fmt.money(lk.stake.valueUsd) })}
          {lk.stake.memory && ` ${t('ui.v12.lk.memory_is', { model: machineName(lk.stake.memory) })}`}
        </p>
      )}
      {lk.call && (
        <div class="venture-row" data-larkspur-call>
          <p class="num-s" style={{ margin: 0 }}>
            {t(`ui.v12.lk.call.${lk.call.kind}` as 'ui.v12.lk.call.tape_out', { due: fmt.money(lk.call.dueUsd) })}
          </p>
          {lk.call.canPickMemory && (
            <div>
              <p class="num-s muted" style={{ margin: 0 }}>{t('ui.v12.lk.memory_pick', { wall5: fmt.date(lk.wall.lk5) })}</p>
              {(['lk5', 'lk6'] as const).map((m) => (
                <label key={m} class="num-s" style={{ marginRight: '1rem' }}>
                  <input type="radio" name="lk-memory" checked={memory === m} onChange={() => setMemory(m)} data-larkspur-memory={m} />{' '}
                  {t(`ui.v12.lk.${m}` as 'ui.v12.lk.lk5', { price: fmt.money(m === 'lk5' ? lk.lk5Usd : lk.lk6Usd) })}
                </label>
              ))}
            </div>
          )}
          <div class="row">
            <button
              type="button"
              class="btn"
              disabled={!!lk.call.payBlocker}
              data-larkspur-call="pay"
              onClick={() => run({ type: 'LARKSPUR_CALL', choice: 'pay', memory })}
            >
              {t('ui.v12.lk.pay')}
            </button>
            <button type="button" class="btn" data-larkspur-call="dilute" onClick={() => run({ type: 'LARKSPUR_CALL', choice: 'dilute', memory })}>
              {t('ui.v12.lk.dilute')}
            </button>
            <button type="button" class="btn" data-larkspur-call="walk" onClick={() => run({ type: 'LARKSPUR_CALL', choice: 'walk', memory })}>
              {t('ui.v12.lk.walk')}
            </button>
          </div>
        </div>
      )}
      {lk.stakeSale?.open && (
        <div data-larkspur-stake-sale>
          <p class="num-s" style={{ margin: 0 }}>{t('ui.v12.lk.sale_value', { value: fmt.money(lk.stakeSale.valueUsd) })}</p>
          <p class="num-s muted" style={{ margin: 0 }}>{t('ui.v12.lk.sale_hint')}</p>
          <div class="row">
            {!lk.stakeSale.halfUsed && (
              <button
                type="button"
                class="btn"
                disabled={!!lk.stakeSale.blocker('half')}
                title={lk.stakeSale.blocker('half') ? say(lk.stakeSale.blocker('half')!) : undefined}
                data-larkspur-sell="half"
                onClick={() => run({ type: 'LARKSPUR_SELL', kind: 'half' })}
              >
                {t('ui.v12.lk.sale_half', { value: fmt.money(lk.stakeSale.valueUsd / 2) })}
              </button>
            )}
            <button
              type="button"
              class="btn"
              disabled={!!lk.stakeSale.blocker('all')}
              title={lk.stakeSale.blocker('all') ? say(lk.stakeSale.blocker('all')!) : undefined}
              data-larkspur-sell="all"
              onClick={() => run({ type: 'LARKSPUR_SELL', kind: 'all' })}
            >
              {t('ui.v12.lk.sale_all', { value: fmt.money(lk.stakeSale.valueUsd) })}
            </button>
          </div>
        </div>
      )}
      {lk.stakeSale && !lk.stakeSale.open && lk.stakeSale.soldUsd > 0 && (
        <p class="num-s" style={{ margin: 0 }}>
          {t(lk.stake?.ended === 'sold' ? 'ui.v12.lk.sold' : 'ui.v12.lk.sold_half', { value: fmt.money(lk.stakeSale.soldUsd) })}
        </p>
      )}
      {lk.reservation && (
        <p class="num-s" style={{ margin: 0 }} data-larkspur-reservation>
          {t('ui.v12.lk.reserved', {
            units: String(lk.reservation.units),
            bought: String(lk.reservation.bought),
            deposit: fmt.money(lk.reservation.depositUsd),
          })}
        </p>
      )}
      {lk.reserve && !lk.reservation && lk.reserve.maxUnits > 0 && (
        <div data-larkspur-reserve>
          <p class="num-s muted" style={{ margin: 0 }}>{t('ui.v12.lk.reserve_note', { max: String(lk.reserve.maxUnits) })}</p>
          <div class="row">
            <input
              type="number"
              min={1}
              max={lk.reserve.maxUnits}
              value={reserveUnits}
              onInput={(e) => setUnits(Number((e.target as HTMLInputElement).value))}
              aria-label={t('ui.v12.lk.reserve_units')}
            />
            <button
              type="button"
              class="btn"
              disabled={!!lk.reserve.blocker(reserveUnits)}
              title={lk.reserve.blocker(reserveUnits) ? say(lk.reserve.blocker(reserveUnits)!) : undefined}
              data-larkspur-reserve-btn
              onClick={() => run({ type: 'LARKSPUR_RESERVE', units: reserveUnits })}
            >
              {t('ui.v12.lk.reserve_btn', { units: String(reserveUnits), deposit: fmt.money(lk.reserve.depositPerUnitUsd * reserveUnits) })}
            </button>
          </div>
        </div>
      )}
      {lk.sale && (lk.sale.inWindow || lk.sale.marketOpen) && (
        <div data-larkspur-sale>
          <p class="num-s" style={{ margin: 0 }}>
            {lk.sale.reservedLeft > 0
              ? t('ui.v12.lk.sale_reserved', { model: machineName(lk.sale.model), left: String(lk.sale.reservedLeft), price: fmt.money(lk.sale.discountedUsd), list: fmt.money(lk.sale.listUsd) })
              : lk.sale.marketOpen
                ? t('ui.v12.lk.sale_market', { model: machineName(lk.sale.model), price: fmt.money(lk.sale.listUsd) })
                : t('ui.v12.lk.sale_wait', { model: machineName(lk.sale.model) })}
          </p>
          <div class="row">
            <input type="number" min={1} value={count} onInput={(e) => setCount(Math.max(1, Number((e.target as HTMLInputElement).value) || 1))} aria-label={t('ui.v12.lk.buy_count')} />
            <select value={siteId} onChange={(e) => setSiteId((e.target as HTMLSelectElement).value)} aria-label={t('ui.v12.lk.buy_site')}>
              {state.sites.map((s) => (
                <option key={s.id} value={s.id}>{siteName(s)}</option>
              ))}
            </select>
            <button
              type="button"
              class="btn"
              disabled={!!lk.sale.blocker(count, siteId)}
              title={lk.sale.blocker(count, siteId) ? say(lk.sale.blocker(count, siteId)!) : undefined}
              data-larkspur-buy
              onClick={() => run({ type: 'LARKSPUR_BUY', count, siteId })}
            >
              {t('ui.v12.lk.buy_btn', { count: String(count), cost: fmt.money(lk.sale.costUsd(count)) })}
            </button>
          </div>
        </div>
      )}
      {lk.lots.length > 0 && (
        <p class="num-s muted" style={{ margin: 0 }}>
          {lk.lots.map((l) => t('ui.v12.lk.lot', { count: String(l.count), model: machineName(l.model) })).join(' · ')}
        </p>
      )}
    </section>
  )
}

function AfterMergePanel({ state, run }: { state: ScreenProps['state']; run: (a: Action) => void }) {
  const lots = lotChoices(state)
  if (lots.length === 0) return null
  const open = lots.some((l) => l.open)
  return (
    <section class="panel p" data-after-merge>
      <h3 class="panel-title">{t('ui.v12.am.title')}</h3>
      <p class="num-s muted" style={{ margin: 0 }}>{open ? t('ui.v12.am.intro') : t('ui.v12.am.closed')}</p>
      {lots.map((l) => {
        const site = state.sites.find((s) => s.id === l.siteId)
        return (
          <div key={l.lotId} class="venture-row" data-lot-choice={l.lotId}>
            <div class="row-between">
              <strong class="num-s">
                {t('ui.v12.am.lot', { count: String(l.count), model: machineName(l.model), site: site ? siteName(site) : '' })}
              </strong>
              <span class="num-s">{t('ui.v12.am.sell', { value: fmt.money(l.saleUsd) })}</span>
            </div>
            {l.options.map((o) => (
              <div key={o.use} class="row-between">
                <span class="num-s">
                  {tDynamic(`ui.v12.am.use.${o.use}`, o.use)}: {t('ui.v12.am.net', { gross: fmt.money(o.grossQuarterUsd), power: fmt.money(o.powerQuarterUsd), net: fmt.money(o.netQuarterUsd) })}
                </span>
                {l.fixed ? (
                  <span class="num-s muted">{t('ui.v12.am.fixed')}</span>
                ) : l.current === o.use ? (
                  <span class="num-s">{t('ui.v12.am.current')}</span>
                ) : (
                  <button
                    type="button"
                    class="btn"
                    disabled={!l.open}
                    data-lot-use={o.use}
                    onClick={() => run({ type: 'SET_LOT_USE', lotId: l.lotId, use: o.use === 'own' ? null : o.use })}
                  >
                    {t('ui.v12.am.use_btn')}
                  </button>
                )}
              </div>
            ))}
          </div>
        )
      })}
    </section>
  )
}
