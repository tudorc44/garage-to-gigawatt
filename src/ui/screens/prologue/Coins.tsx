// Coins & custody (wireframe P0-05): where your coins are, their history by place, moving and selling
// them, the selling limit as a sentence, the backup's status, the risks in plain words, the ledger of
// every coin lost, and the forum offers.
import { useState } from 'preact/hooks'
import { t, tDynamic } from '../../../i18n/t.ts'
import {
  prologueCoinsHistory,
  prologueLostLedger,
  prologueMarketView,
  prologueWalletView,
} from '../../../sim/prologue/views.ts'
import type { Coin, GameState } from '../../../sim/state.ts'
import { Icon } from '../../components/basics.tsx'
import { fmt } from '../../format.ts'
import { coins, price, useError, type PrologueProps } from './common.tsx'

/**
 * The selling limit, as a sentence (component sheet): what the market takes this quarter in BTC at
 * today's price; near the limit, a warning about the price.
 */
export function SellingLimit({ state }: { state: GameState }) {
  const w = prologueWalletView(state)
  const px = prologueMarketView(state).btcUsd
  if (w.noSellingNow)
    return <span class="num-s warn">{t('ui.p0.limit_halted')}</span>
  if (px <= 0 || w.capUsdWeek <= 0)
    return <span class="num-s muted">{t('ui.p0.limit_no_market')}</span>
  const limitBtc = (w.capUsdWeek * 13) / px
  const selling = w.coins[0].selling
  return selling >= limitBtc * 0.8 ? (
    <span class="num-s warn">
      {t('ui.p0.limit_near', {
        selling: coins(selling, 'BTC'),
        limit: coins(limitBtc, 'BTC'),
      })}
    </span>
  ) : (
    <span class="num-s">
      <strong>{t('ui.p0.limit_label')}</strong>{' '}
      {t('ui.p0.limit_line', { limit: coins(limitBtc, 'BTC') })}
    </span>
  )
}

/** Wallet and exchange lines over the quarters (a small two-series chart). */
function History({ state }: { state: GameState }) {
  const h = prologueCoinsHistory(state)
  if (h.length < 2)
    return <span class="num-s muted">{t('ui.p0.history_soon')}</span>
  const max = Math.max(1, ...h.map((x) => Math.max(x.wallet, x.exchange)))
  const x = (i: number) => 30 + (i / (h.length - 1)) * 260
  const y = (v: number) => 90 - (v / max) * 80
  const line = (k: 'wallet' | 'exchange') =>
    h.map((p, i) => `${i ? 'L' : 'M'}${x(i)} ${y(p[k])}`).join(' ')
  return (
    <svg
      viewBox="0 0 300 110"
      class="p0-chart"
      role="img"
      aria-label={t('ui.p0.history_title')}
    >
      <text x="0" y="14" class="axis">
        {fmt.crypto(max, 'BTC')}
      </text>
      <text x="0" y="92" class="axis">
        0
      </text>
      <text x="30" y="106" class="axis">
        {h[0].quarter}
      </text>
      <text x="290" y="106" class="axis" text-anchor="end">
        {h.at(-1)!.quarter}
      </text>
      <path d={line('wallet')} class="s-wallet" />
      <path d={line('exchange')} class="s-exchange" />
    </svg>
  )
}

export function Coins({ state, act }: PrologueProps) {
  const w = prologueWalletView(state)
  const lost = prologueLostLedger(state)
  const px = prologueMarketView(state).btcUsd
  const e = useError(act)
  const [coin, setCoin] = useState<Coin>('BTC')
  const [to, setTo] = useState<'exchange' | 'wallet'>('exchange')
  const [amount, setAmount] = useState('')
  const n = Number(amount)
  const exchange = tDynamic(`ui.p0.exchange_name.${w.exchangeName}`, '')
  const btc = w.coins[0]
  const held = w.coins.filter((c) => c.coin === 'BTC' || c.total > 0)
  const totalUsd = btc.total * px
  return (
    <div class="dash p0-dash">
      <div class="col">
        <section class="panel">
          <div class="row-between">
            <span class="panel-title">{t('ui.p0.where_coins')}</span>
            <span class="num">
              {coins(btc.total, 'BTC')} · {fmt.money(totalUsd)}
            </span>
          </div>
          <div class="p0-two">
            <div class="panel p0-tile">
              <span class="label">
                <Icon name="wallet" size={16} /> {t('ui.p0.in_wallet')}
              </span>
              <span class="num">{coins(btc.wallet, 'BTC')}</span>
              <span class="num-s muted">
                {fmt.money(btc.wallet * px)} ·{' '}
                {fmt.pct(btc.total > 0 ? btc.wallet / btc.total : 0)}
              </span>
            </div>
            <div class="panel p0-tile">
              <span class="label">
                <Icon name="exchange" size={16} />{' '}
                {t('ui.p0.on_exchange', { exchange })}
              </span>
              <span class="num">{coins(btc.exchange, 'BTC')}</span>
              <span class="num-s muted">
                {fmt.money(btc.exchange * px)} ·{' '}
                {fmt.pct(btc.total > 0 ? btc.exchange / btc.total : 0)}
              </span>
            </div>
          </div>
          {(btc.toExchange > 0 || btc.toWallet > 0 || btc.selling > 0) && (
            <span class="num-s muted">
              {t('ui.p0.moving_selling', {
                moving: coins(btc.toExchange + btc.toWallet, 'BTC'),
                selling: coins(btc.selling, 'BTC'),
              })}
            </span>
          )}
          {w.coins[1].total > 0 && (
            <span class="num-s">
              {t('ui.p0.eth_line', {
                wallet: coins(w.coins[1].wallet, 'ETH'),
                exchange: coins(w.coins[1].exchange, 'ETH'),
              })}
            </span>
          )}
        </section>
        <section class="panel">
          <div class="row-between">
            <span class="panel-title">{t('ui.p0.history_title')}</span>
            <span class="num-s muted">{t('ui.p0.history_legend')}</span>
          </div>
          <History state={state} />
        </section>
        <section class="panel">
          <span class="panel-title">{t('ui.p0.move_title')}</span>
          <div class="form-row">
            {held.length > 1 && (
              <span class="seg">
                {held.map((c) => (
                  <button
                    key={c.coin}
                    type="button"
                    class="btn"
                    aria-pressed={coin === c.coin}
                    onClick={() => setCoin(c.coin)}
                  >
                    {c.coin}
                  </button>
                ))}
              </span>
            )}
            <span class="seg">
              <button
                type="button"
                class="btn"
                aria-pressed={to === 'exchange'}
                onClick={() => setTo('exchange')}
              >
                {t('ui.p0.dir_to_exchange')}
              </button>
              <button
                type="button"
                class="btn"
                aria-pressed={to === 'wallet'}
                onClick={() => setTo('wallet')}
              >
                {t('ui.p0.dir_to_wallet')}
              </button>
            </span>
            <input
              type="number"
              min={0}
              step="any"
              value={amount}
              aria-label={t('ui.p0.amount')}
              placeholder={t('ui.p0.amount')}
              onInput={(ev) => setAmount((ev.target as HTMLInputElement).value)}
            />
            <button
              type="button"
              class="btn"
              disabled={!(n > 0)}
              onClick={() =>
                e.run({ type: 'P0_MOVE_COINS', coin, amount: n, to })
              }
            >
              {t('ui.p0.move')}
            </button>
            <button
              type="button"
              class="btn"
              disabled={!(n > 0)}
              title={t('ui.p0.sell_note', { n: w.sellBandwidth })}
              onClick={() => e.run({ type: 'P0_SELL', coin, amount: n })}
            >
              {t('ui.p0.sell')}
            </button>
            {w.coins.find((c) => c.coin === coin)!.selling > 0 && (
              <button
                type="button"
                class="btn btn-ghost"
                onClick={() => e.run({ type: 'P0_CANCEL_SALE', coin })}
              >
                {t('ui.p0.cancel_sale')}
              </button>
            )}
          </div>
          <span class="num-s muted">{t('ui.p0.move_note')}</span>
          <div class="row-between">
            <span class="label">{t('ui.p0.mined_to')}</span>
            <span class="seg">
              <button
                type="button"
                class="btn"
                aria-pressed={w.minedTo === 'wallet'}
                onClick={() => e.run({ type: 'P0_MINED_TO', to: 'wallet' })}
              >
                {t('ui.p0.in_wallet')}
              </button>
              <button
                type="button"
                class="btn"
                aria-pressed={w.minedTo === 'exchange'}
                onClick={() => e.run({ type: 'P0_MINED_TO', to: 'exchange' })}
              >
                {t('ui.p0.on_exchange', { exchange })}
              </button>
            </span>
          </div>
          {e.view}
        </section>
      </div>
      <div class="col">
        <section class="panel">
          <span class="panel-title">{t('ui.p0.limit_label')}</span>
          <SellingLimit state={state} />
        </section>
        <section class="panel">
          <div class="row-between">
            <span class="panel-title">
              <Icon name="backup" /> {t('ui.p0.backup_title')}
            </span>
            <span class={`num-s ${w.backup ? 'gain' : 'warn'}`}>
              {t(w.backup ? 'ui.p0.backup_ok' : 'ui.p0.backup_none')}
            </span>
          </div>
          <span class="num-s">
            {t('ui.p0.backup_explain', { btc: coins(btc.wallet, 'BTC') })}
          </span>
          <span class="num-s muted">{t('ui.p0.backup_where')}</span>
        </section>
        <section class="panel">
          <span class="panel-title">{t('ui.p0.risks_title')}</span>
          <span class="num-s">
            <strong>{t('ui.p0.risk_exchange_label')}</strong>{' '}
            {t('ui.p0.risk_exchange_long')}
          </span>
          <span class="num-s">
            <strong>{t('ui.p0.risk_wallet_label')}</strong>{' '}
            {t('ui.p0.risk_wallet_long')}
          </span>
        </section>
        <section class="panel">
          <div class="row-between">
            <span class="panel-title">
              <Icon name="lost-key" /> {t('ui.p0.lost_title')}
            </span>
            <span class="num">
              {t('ui.p0.lost_so_far', { btc: coins(lost.totalBtc, 'BTC') })}
            </span>
          </div>
          {lost.rows.length === 0 ? (
            <span class="num-s muted">{t('ui.p0.lost_none')}</span>
          ) : (
            <table class="num-s p0-table">
              <thead>
                <tr>
                  <th>{t('ui.p0.col_when')}</th>
                  <th class="g-right">{t('ui.p0.col_coins')}</th>
                  <th>{t('ui.p0.col_what')}</th>
                </tr>
              </thead>
              <tbody>
                {lost.rows.map((r, i) => (
                  <tr key={i}>
                    <td>{fmt.quarter(r.quarter)}</td>
                    <td class="g-right num loss">
                      −{coins(r.amount, r.coin)}
                    </td>
                    <td>
                      {t(`ui.p0.lost_${r.cause}`)} ·{' '}
                      <span class="muted">{price(r.valueUsd)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <span class="num-s muted">{t('ui.p0.lost_note')}</span>
        </section>
      </div>
    </div>
  )
}
