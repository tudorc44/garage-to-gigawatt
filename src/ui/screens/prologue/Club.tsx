// The mining club's panel (M70.5, doc 51 v1.2 §4), shown in Ventures: the offer in 2013Q1 (what you put in, who holds the keys,
// where the machines run), then the members and their shares, the machines, the quarter's split, and the few free settings
// (the coin the GPUs mine, how the club ends at the handover). The screen shows the sim's view and sends actions only.
import { useState } from 'preact/hooks'
import { t } from '../../../i18n/t.ts'
import { prologueClubView } from '../../../sim/prologue/views.ts'
import { fmt } from '../../format.ts'
import { say } from '../../names.ts'
import { Bar, useError, type PrologueProps } from './common.tsx'

type Keys = 'player' | 'jun'
type Hosting = 'your_place' | 'friends_flat'
const COINS = ['BTC', 'LTC', 'DOGE'] as const

export function ClubPanel({ state, act }: PrologueProps) {
  const v = prologueClubView(state)
  const e = useError(act)
  const [stake, setStake] = useState(2000)
  const [keys, setKeys] = useState<Keys>('player')
  const [hosting, setHosting] = useState<Hosting>('your_place')
  if (!v) return null
  const c = v.club
  const blocked = v.offerOpen ? v.joinBlocker(stake) : null
  return (
    <section class="panel" data-club-panel>
      <div class="row-between">
        <span class="panel-title">{t('ui.p0.club.title')}</span>
      </div>
      {!c && v.offerOpen && (
        <>
          <p class="num-s">{t('ui.p0.club.intro')}</p>
          <label class="form-row">
            <span class="label">{t('ui.p0.club.stake')}</span>
            <select
              data-club-stake
              value={stake}
              onChange={(ev) => setStake(Number((ev.target as HTMLSelectElement).value))}
            >
              {Array.from(
                { length: Math.round((v.stake.max - v.stake.min) / v.stake.step) + 1 },
                (_, i) => v.stake.min + i * v.stake.step,
              ).map((n) => (
                <option key={n} value={n}>
                  {fmt.money(n)}
                </option>
              ))}
            </select>
          </label>
          <div class="form-row">
            <span class="label">{t('ui.p0.club.keys')}</span>
            <span class="seg" role="group" aria-label={t('ui.p0.club.keys')}>
              {(['player', 'jun'] as const).map((k) => (
                <button key={k} type="button" class="btn" data-club-keys={k} aria-pressed={keys === k} onClick={() => setKeys(k)}>
                  {t(`ui.p0.club.keys_${k}`)}
                </button>
              ))}
            </span>
          </div>
          <div class="form-row">
            <span class="label">{t('ui.p0.club.hosting')}</span>
            <span class="seg" role="group" aria-label={t('ui.p0.club.hosting')}>
              {(['your_place', 'friends_flat'] as const).map((h) => (
                <button
                  key={h}
                  type="button"
                  class="btn"
                  data-club-hosting={h}
                  aria-pressed={hosting === h}
                  onClick={() => setHosting(h)}
                >
                  {t(h === 'your_place' ? 'ui.p0.club.host_you' : 'ui.p0.club.host_flat')}
                </button>
              ))}
            </span>
          </div>
          <button
            type="button"
            class="btn btn-primary"
            data-club-join
            disabled={!!blocked}
            title={blocked ? say(blocked) : undefined}
            onClick={() => e.run({ type: 'P0_JOIN_CLUB', stake, keys, hosting })}
          >
            {t('ui.p0.club.join', { usd: fmt.money(stake), n: v.joinBandwidth })}
          </button>
        </>
      )}
      {!c && !v.offerOpen && !v.ended && (
        <p class="num-s muted" data-club-none>
          {t('ui.p0.club.offer_locked', { quarter: v.offerQuarter })}
        </p>
      )}
      {!c && v.ended && (
        <p class="num-s muted" data-club-ended>
          {t(v.ended.kind === 'buy_out' ? 'ui.p0.club.ended_buyout' : 'ui.p0.club.ended_dissolved', {
            usd: fmt.money(v.ended.usd),
          })}
        </p>
      )}
      {c && (
        <>
          <p class="num-s muted">
            {t('ui.p0.club.keys_note', {
              who: t(`ui.p0.club.keys_${c.keys}`),
              where: t(c.hosting === 'your_place' ? 'ui.p0.club.host_you' : 'ui.p0.club.host_flat'),
            })}
          </p>
          <span class="label">{t('ui.p0.club.members')}</span>
          <div data-club-members>
            {c.members.map((m) => (
              <div key={m.id}>
                <div class="row-between num-s">
                  <span>{m.id === 'you' ? t('ui.p0.club.you') : m.name}</span>
                  <span>
                    {fmt.pct(m.share)} · {t('ui.p0.club.value', { usd: fmt.money(m.valueUsd) })}
                  </span>
                </div>
                <Bar share={m.share} label={m.name} />
              </div>
            ))}
          </div>
          <span class="label">{t('ui.p0.club.machines')}</span>
          <div data-club-lots>
            {c.lots.length === 0 && <p class="num-s muted">{t('ui.p0.club.no_machines')}</p>}
            {c.lots.map((l) => (
              <p class="num-s" key={l.id}>
                {t(l.earning ? 'ui.p0.club.lot_earning' : 'ui.p0.club.lot_waiting', { n: l.count, model: l.model })}
              </p>
            ))}
            {c.orders.some((o) => !o.delivered) && (
              <p class="num-s muted">
                {t('ui.p0.club.orders', {
                  usd: fmt.money(c.orders.filter((o) => !o.delivered).reduce((n, o) => n + o.paidUsd, 0)),
                })}
              </p>
            )}
            {c.cloud && <p class="num-s muted">{t('ui.p0.club.cloud', { usd: fmt.money(c.cloud.investedUsd) })}</p>}
          </div>
          <table class="num-s p0-table" data-club-quarter>
            <tbody>
              <tr>
                <td>{t('ui.p0.club.output')}</td>
                <td class="g-right">{fmt.money(c.quarter.outputUsd)}</td>
              </tr>
              <tr>
                <td>{t('ui.p0.club.your_share')}</td>
                <td class="g-right">{fmt.money(c.quarter.yourShareUsd)}</td>
              </tr>
              <tr>
                <td>{t('ui.p0.club.hosting_fees')}</td>
                <td class="g-right">{fmt.money(c.quarter.hostingUsd)}</td>
              </tr>
            </tbody>
          </table>
          {c.lostUsd > 0 && <p class="num-s loss">{t('ui.p0.club.lost', { usd: fmt.money(c.lostUsd) })}</p>}
          {c.feeDebtUsd > 0 && <p class="num-s warn">{t('ui.p0.club.debt', { usd: fmt.money(c.feeDebtUsd) })}</p>}
          <div class="form-row">
            <span class="label">{t('ui.p0.club.gpu_coin')}</span>
            <span class="seg" role="group" aria-label={t('ui.p0.club.gpu_coin')}>
              {COINS.map((coin) => (
                <button
                  key={coin}
                  type="button"
                  class="btn"
                  data-club-coin={coin}
                  aria-pressed={c.gpuCoin === coin}
                  onClick={() => e.run({ type: 'P0_CLUB_GPU_COIN', coin })}
                >
                  {coin}
                </button>
              ))}
            </span>
          </div>
          <div class="form-row">
            <span class="label">{t('ui.p0.club.ending')}</span>
            <span class="seg" role="group" aria-label={t('ui.p0.club.ending')}>
              {(['buy_out', 'dissolve'] as const).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  class="btn"
                  data-club-ending={kind}
                  aria-pressed={c.ending === kind}
                  onClick={() => e.run({ type: 'P0_CLUB_ENDING', kind })}
                >
                  {t(kind === 'buy_out' ? 'ui.p0.club.end_buy' : 'ui.p0.club.end_dissolve')}
                </button>
              ))}
            </span>
          </div>
        </>
      )}
      {e.view}
    </section>
  )
}
