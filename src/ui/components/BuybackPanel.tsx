// The Capital screen's buy-back panel (M79.2, doc 62 §2), Act I: offer to buy a round's stake back (the investors may refuse), or buy
// on the open market after an IPO. The sim's views price it and say why not; this draws them and dispatches the actions.
import { useState } from 'preact/hooks'
import { CONTENT } from '../../content/index.ts'
import { t, tDynamic, type Message } from '../../i18n/t.ts'
import type { Action } from '../../sim/actions.ts'
import { buybackView } from '../../sim/buybackViews.ts'
import type { GameState } from '../../sim/state.ts'
import { fmt } from '../format.ts'
import { say } from '../names.ts'

type View = NonNullable<ReturnType<typeof buybackView>>

function RoundRow({ r, run }: { r: View['rounds'][number]; run: (a: Action) => void }) {
  const [pct, setPct] = useState(100)
  const share = Math.min(1, Math.max(0.01, pct / 100))
  const why = r.blocker(share)
  return (
    <div class="row-between" data-buyback-round={r.id}>
      <span class="num-s">
        {tDynamic(`round.${r.id}`, r.id)}:{' '}
        {r.closed ? t('ui.buyback.bought_out') : t('ui.buyback.stake', { stake: fmt.pct(r.stake, 1) })}
      </span>
      {!r.closed && (
        <span style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="number"
            min={1}
            max={100}
            value={pct}
            aria-label={t('ui.buyback.share')}
            style={{ width: '64px' }}
            onInput={(e) => setPct(Math.min(100, Math.max(1, Math.floor(Number((e.target as HTMLInputElement).value) || 1))))}
          />
          <span class="num-s">%</span>
          <button
            type="button"
            class="btn"
            disabled={!!why}
            title={why ? say(why) : undefined}
            data-buyback-offer={r.id}
            onClick={() => run({ type: 'BUYBACK_OFFER', round: r.id, share })}
          >
            {t('ui.buyback.offer', { cost: fmt.money(r.priceUsd(share)) })}
          </button>
        </span>
      )}
    </div>
  )
}

export function BuybackPanel({ state, act }: { state: GameState; act: (a: Action) => Message | null }) {
  const v = buybackView(state)
  const [pct, setPct] = useState(1)
  const [error, setError] = useState<Message | null>(null)
  if (!v) return null
  const run = (a: Action) => setError(act(a))
  const mpct = Math.min(Math.max(0.001, pct / 100), Math.max(0.001, v.roomPct))
  const why = v.marketBlocker(mpct)
  return (
    <div class="panel p" data-buyback>
      <h2 class="panel-title">{t('ui.buyback.title')}</h2>
      <p class="num-s muted" style={{ margin: 0 }}>
        {v.public
          ? t('ui.buyback.intro_public', { cap: fmt.pct(v.capPerYear), bw: v.bandwidth })
          : t('ui.buyback.intro_private', { mult: v.mult, bw: v.bandwidth })}
      </p>
      {!v.public && v.climate !== 'neutral' && (
        <p class="num-s" style={{ margin: 0 }} data-buyback-climate={v.climate}>
          {t(`ui.buyback.climate.${v.climate}` as 'ui.buyback.climate.boom', { pct: fmt.pct(v.climate === 'boom' ? v.boomPct : v.downturnPct) })}
        </p>
      )}
      {error && <p class="num-s warn">{say(error)}</p>}
      {v.last && (
        <p class="num-s" style={{ margin: 0 }} data-buyback-last>
          {t(v.last.accepted ? 'ui.buyback.last_accepted' : 'ui.buyback.last_refused', {
            quarter: fmt.quarter(CONTENT.quarters[v.last.quarter] ?? ''),
            round: tDynamic(`round.${v.last.round}`, v.last.round),
          })}
        </p>
      )}
      {v.public ? (
        <div class="row-between" data-buyback-market>
          <span class="num-s">{t('ui.buyback.room', { room: fmt.pct(v.roomPct, 1) })}</span>
          <span style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="number"
              min={0.1}
              step={0.1}
              value={pct}
              aria-label={t('ui.buyback.market_pct')}
              style={{ width: '72px' }}
              onInput={(e) => setPct(Math.max(0.1, Number((e.target as HTMLInputElement).value) || 0.1))}
            />
            <span class="num-s">%</span>
            <button
              type="button"
              class="btn"
              disabled={!!why}
              title={why ? say(why) : undefined}
              data-buyback-market-btn
              onClick={() => run({ type: 'BUYBACK_MARKET', pct: mpct })}
            >
              {t('ui.buyback.buy', { cost: fmt.money(v.marketCostUsd(mpct)) })}
            </button>
          </span>
        </div>
      ) : v.rounds.length === 0 ? (
        <p class="num-s muted" style={{ margin: 0 }}>{t('ui.buyback.none')}</p>
      ) : (
        v.rounds.map((r) => <RoundRow key={r.id} r={r} run={run} />)
      )}
    </div>
  )
}
