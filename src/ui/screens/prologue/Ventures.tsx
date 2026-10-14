// Ventures (M69.4, doc 51 v1.1 §2-§3): the Prologue's side businesses. Today one: your own bitcoin pool. Open it with a payout
// method and a fee, watch how many outside miners it pulls in and how much they trust it, buy protection against the
// risks, and sell it (or it is sold for you at the handover). The screen shows the sim's views and sends actions; it works
// out no rules of its own.
import { useState } from 'preact/hooks'
import { t, tDynamic } from '../../../i18n/t.ts'
import { prologuePoolView } from '../../../sim/prologue/views.ts'
import { Icon } from '../../components/basics.tsx'
import { fmt } from '../../format.ts'
import { say } from '../../names.ts'
import { Bar, Tile, useError, type PrologueProps } from './common.tsx'

type Method = 'PPLNS' | 'PPS'

/** The method and the fee, as one small form (opening and changing share it). */
function Settings(props: {
  method: Method
  fee: number
  range: Record<Method, [number, number]>
  onMethod: (m: Method) => void
  onFee: (f: number) => void
}) {
  const [text, setText] = useState(String(Math.round(props.fee * 1000) / 10))
  const [lo, hi] = props.range[props.method]
  return (
    <div class="form-row" data-pool-settings>
      <span class="seg" role="group" aria-label={t('ui.p0.pool.method')}>
        {(['PPLNS', 'PPS'] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={props.method === m}
            title={tDynamic(m === 'PPS' ? 'tooltip.p0.pool_pps' : 'tooltip.p0.pool_pplns', '')}
            onClick={() => {
              props.onMethod(m)
              const [l, h] = props.range[m]
              const f = Math.min(h, Math.max(l, props.fee))
              props.onFee(f)
              setText(String(Math.round(f * 1000) / 10))
            }}
          >
            {m}
          </button>
        ))}
      </span>
      <label class="field">
        <span class="label">{t('ui.p0.pool.fee', { lo: fmt.pct(lo), hi: fmt.pct(hi) })}</span>
        <input
          type="number"
          min={lo * 100}
          max={hi * 100}
          step={0.5}
          value={text}
          data-pool-fee
          aria-label={t('ui.p0.pool.fee_input')}
          onInput={(e) => {
            const v = (e.target as HTMLInputElement).value
            setText(v)
            if (Number.isFinite(Number(v)) && v !== '') props.onFee(Number(v) / 100)
          }}
        />
      </label>
    </div>
  )
}

export function Ventures({ state, act }: PrologueProps) {
  const v = prologuePoolView(state)
  const e = useError(act)
  const [method, setMethod] = useState<Method>(v?.pool?.method ?? 'PPLNS')
  const [fee, setFee] = useState(v?.pool?.feePct ?? 0.01)
  if (!v) return <p class="num-s muted">{t('ui.p0.pool.none')}</p>
  const pool = v.pool
  const openWhy = method === 'PPS' ? v.blockers.openPps : v.blockers.open
  return (
    <div class="dash p0-dash">
      <div class="col">
        <section class="panel" data-pool-panel>
          <div class="row-between">
            <span class="panel-title" title={tDynamic('tooltip.p0.own_pool', '')}>
              <Icon name="group-buy" size={16} /> {pool ? pool.name : t('ui.p0.pool.title')}
            </span>
            {pool && (
              <span class="num-s muted">
                {pool.method} · {fmt.pct(pool.feeNow)}
                {pool.feeOverrideUntil ? ` (${t('ui.p0.pool.fee_held', { quarter: fmt.quarter(pool.feeOverrideUntil) })})` : ''}
              </span>
            )}
          </div>
          {!pool && (
            <>
              <p class="num-s">{t('ui.p0.pool.intro')}</p>
              {!v.unlocked ? (
                <p class="num-s muted" data-pool-locked>
                  {t('ui.p0.pool.locked', { quarter: fmt.quarter(v.unlockQuarter) })}
                </p>
              ) : (
                <>
                  <Settings method={method} fee={fee} range={v.feeRange} onMethod={setMethod} onFee={setFee} />
                  {method === 'PPS' && (
                    <p class={`num-s ${v.blockers.ppsReserve ? 'warn' : 'muted'}`}>
                      {t('ui.p0.pool.pps_reserve', { usd: fmt.money(v.reserveUsd) })}
                    </p>
                  )}
                  <button
                    type="button"
                    class="btn btn-primary"
                    data-pool-open
                    disabled={!!openWhy && openWhy.key !== 'error.p0_pool_fee'}
                    title={openWhy ? say(openWhy) : undefined}
                    onClick={() => e.run({ type: 'P0_OPEN_POOL', method, feePct: fee })}
                  >
                    {t('ui.p0.pool.open', { usd: fmt.money(v.setupUsd), n: v.openBandwidth })}
                  </button>
                  {openWhy && <p class="num-s loss">{say(openWhy)}</p>}
                </>
              )}
              {v.ended && (
                <p class="num-s muted" data-pool-ended>
                  {v.ended.kind === 'closed'
                    ? t('ui.p0.pool.ended_closed', { pool: v.ended.name })
                    : t('ui.p0.pool.ended_sold', { pool: v.ended.name, value: fmt.money(v.ended.usd) })}
                </p>
              )}
            </>
          )}
          {pool && (
            <>
              <div class="p0-two">
                <Tile
                  label={t('ui.p0.pool.outside')}
                  value={fmt.hash(pool.outsideTh, 'TH')}
                  sub={pool.boycottOpen ? t('ui.p0.pool.boycott_bonus') : t('ui.p0.pool.outside_sub')}
                />
                <Tile
                  label={t('ui.p0.pool.luck')}
                  value={pool.luck === null ? '-' : fmt.pct(pool.luck)}
                  sub={pool.unluckyRun > 0 ? t('ui.p0.pool.unlucky', { n: pool.unluckyRun }) : t('ui.p0.pool.luck_sub')}
                  warn={pool.unluckyRun > 3}
                />
              </div>
              <div class="row-between">
                <span class="label">{t('ui.p0.pool.reputation')}</span>
                <span class="num">{Math.round(pool.reputation)} / 100</span>
              </div>
              <Bar share={pool.reputation / 100} danger={pool.reputation < 30} label={t('ui.p0.pool.reputation')} />
              <table class="num-s p0-table" data-pool-quarter>
                <tbody>
                  <tr>
                    <td>{t('ui.p0.pool.fee_income')}</td>
                    <td class="g-right">{fmt.money(pool.quarter.feeUsd)}</td>
                  </tr>
                  <tr>
                    <td>{t('ui.p0.pool.paid_miners')}</td>
                    <td class="g-right">{fmt.money(pool.quarter.paidMinersUsd)}</td>
                  </tr>
                  <tr>
                    <td>{t('ui.p0.pool.bills')}</td>
                    <td class="g-right">
                      {fmt.money(v.serverBillUsd + (pool.protectedFrom ? v.protection.billUsd : 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
              <p class="num-s muted">{t('ui.p0.pool.quarter_note')}</p>
            </>
          )}
          {e.view}
        </section>
      </div>
      <div class="col">
        {pool && (
          <>
            <section class="panel" data-pool-settings-panel>
              <span class="panel-title">{t('ui.p0.pool.settings')}</span>
              <Settings method={method} fee={fee} range={v.feeRange} onMethod={setMethod} onFee={setFee} />
              {method === 'PPS' && pool.method !== 'PPS' && (
                <p class={`num-s ${v.blockers.ppsReserve ? 'warn' : 'muted'}`}>
                  {t('ui.p0.pool.pps_reserve', { usd: fmt.money(v.reserveUsd) })}
                </p>
              )}
              <button
                type="button"
                class="btn"
                data-pool-apply
                disabled={method === pool.method && Math.abs(fee - pool.feePct) < 1e-9}
                onClick={() => e.run({ type: 'P0_POOL_SETTINGS', method, feePct: fee })}
              >
                {t('ui.p0.pool.apply', { n: v.settingsBandwidth })}
              </button>
            </section>
            <section class="panel" data-pool-protection>
              <span class="panel-title">{t('ui.p0.pool.protect_title')}</span>
              <div class="row-between">
                <span class="num-s">
                  <span title={tDynamic('glossary.ddos', '')}>{t('ui.p0.pool.ddos')}</span>{' '}
                  {pool.protectedFrom
                    ? t('ui.p0.pool.protected_from', { quarter: fmt.quarter(pool.protectedFrom) })
                    : t('ui.p0.pool.unprotected')}
                </span>
                {!pool.protectedFrom && (
                  <button
                    type="button"
                    class="btn"
                    data-pool-ddos
                    disabled={!!v.blockers.protection}
                    title={v.blockers.protection ? say(v.blockers.protection) : undefined}
                    onClick={() => e.run({ type: 'P0_POOL_DDOS_PROTECTION' })}
                  >
                    {t('ui.p0.pool.buy_protection', { usd: fmt.money(v.protection.billUsd), n: v.protection.bandwidth })}
                  </button>
                )}
              </div>
              <div class="row-between">
                <span class="num-s">
                  <span title={tDynamic('glossary.hot_wallet', '')}>{t('ui.p0.pool.theft')}</span>{' '}
                  {pool.coldStorage ? t('ui.p0.pool.cold_yes') : t('ui.p0.pool.cold_no')}
                </span>
                {!pool.coldStorage && (
                  <button
                    type="button"
                    class="btn"
                    data-pool-cold
                    disabled={!!v.blockers.cold}
                    title={v.blockers.cold ? say(v.blockers.cold) : tDynamic('tooltip.p0.cold_storage', '')}
                    onClick={() => e.run({ type: 'P0_POOL_COLD_STORAGE' })}
                  >
                    {t('ui.p0.pool.buy_cold', { n: v.coldBandwidth })}
                  </button>
                )}
              </div>
            </section>
            <section class="panel" data-pool-sale>
              <span class="panel-title">{t('ui.p0.pool.sale_title')}</span>
              <p class="num-s">
                {v.saleOpen
                  ? t('ui.p0.pool.sale_price', { usd: fmt.money(pool.salePriceUsd) })
                  : t('ui.p0.pool.sale_locked', { quarter: fmt.quarter(v.saleFrom) })}
              </p>
              <p class="num-s muted">{t('ui.p0.pool.handover_note')}</p>
              <div class="row-between">
                <button
                  type="button"
                  class="btn"
                  data-pool-sell
                  disabled={!!v.blockers.sell}
                  title={v.blockers.sell ? say(v.blockers.sell) : undefined}
                  onClick={() => e.run({ type: 'P0_SELL_POOL' })}
                >
                  {t('ui.p0.pool.sell')}
                </button>
                <button type="button" class="btn btn-ghost" data-pool-close onClick={() => e.run({ type: 'P0_CLOSE_POOL' })}>
                  {t('ui.p0.pool.close')}
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
