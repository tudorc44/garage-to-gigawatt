// Act V's Queue panel (M53; doc 43 §8, §17's Queue screen as a panel of the Projects page): your grid positions (region,
// MW, requested, expected, security, the study's bill) with their actions (pay the upgrades, withdraw, take the fast
// lane), and per site its co-located MW, its free MW and what selling its power fetches. Everything from queueView.
import { useState } from 'preact/hooks'
import { PLANTS } from '../../content/plantsContent.ts'
import { t, type Message } from '../../i18n/t.ts'
import type { Action } from '../../sim/actions.ts'
import type { GameState } from '../../sim/state.ts'
import { queueView } from '../../sim/systems/queue.ts'
import { SiteName } from '../components/siteName.tsx'
import { fmt } from '../format.ts'
import { say } from '../names.ts'

export function QueuePanel(props: { state: GameState; act: (a: Action) => Message | null }) {
  const v = queueView(props.state)
  const [error, setError] = useState<Message | null>(null)
  if (!v) return null
  const plan = props.state.phase === 'plan'
  const run = (a: Action) => setError(props.act(a))
  const site = (id: string) => props.state.sites.find((s) => s.id === id)!
  return (
    <section class="panel p" data-queue>
      <h3 class="panel-title">{t('ui.queue.title')}</h3>
      <p class="num-s muted" style={{ margin: 0 }}>
        {t('ui.queue.intro', { security: `$${PLANTS.queue.security_usd_kw}` })}
        {v.fastLaneQuarters !== null && ` ${t('ui.queue.fast_open', { n: v.fastLaneQuarters })}`}
      </p>
      {error && <p class="num-s warn">{say(error)}</p>}
      {v.positions.length === 0 && <p class="num-s muted">{t('ui.queue.none')}</p>}
      {v.positions.map((p) => (
        <div key={p.projectId} class="venture-row" data-position={p.projectId}>
          <p class="num-s" style={{ margin: 0 }}>
            {t('ui.queue.row', {
              n: p.n,
              mw: fmt.power(p.kw),
              region: t(`ui.queue.region.${p.region}`),
              from: fmt.quarter(p.requestQuarter),
              to: p.expectedQuarter ? fmt.quarter(p.expectedQuarter) : '—',
            })}{' '}
            <SiteName state={props.state} site={site(p.siteId)} />
          </p>
          <p class="num-s" style={{ margin: 0 }}>
            {p.securityUsd > 0 && `${t('ui.queue.security', { usd: fmt.money(p.securityUsd) })} · `}
            {p.billUsd === null
              ? t('ui.queue.study_pending')
              : p.billPaid
                ? t('ui.queue.bill_paid', { usd: fmt.money(p.billUsd) })
                : t('ui.queue.bill', { usd: fmt.money(p.billUsd), perKw: `$${Math.round(p.billUsdKw!)}` })}
            {p.fastLane && ` · ${t('ui.queue.fast_taken')}`}
          </p>
          {plan && (
            <div class="energy-choice-row">
              <button
                type="button"
                class="btn"
                disabled={!!p.payBlocked}
                title={p.payBlocked ? say(p.payBlocked) : undefined}
                onClick={() => run({ type: 'PAY_UPGRADE', projectId: p.projectId })}
              >
                {t('ui.queue.pay')}
              </button>
              <button
                type="button"
                class="btn"
                disabled={!!p.fastBlocked}
                title={p.fastBlocked ? say(p.fastBlocked) : undefined}
                onClick={() => run({ type: 'TAKE_FAST_LANE', projectId: p.projectId })}
              >
                {t('ui.queue.fast')}
              </button>
              <button
                type="button"
                class="btn"
                disabled={!!p.withdrawBlocked}
                title={p.withdrawBlocked ? say(p.withdrawBlocked) : undefined}
                onClick={() => run({ type: 'WITHDRAW_POSITION', projectId: p.projectId })}
              >
                {t('ui.queue.withdraw')}
              </button>
            </div>
          )}
        </div>
      ))}
      {v.sites
        .filter((s) => s.colocatedKw > 0 || s.saleUsd > 0)
        .map((s) => (
          <div key={s.siteId} class="venture-row" data-queue-site={s.siteId}>
            <p class="num-s" style={{ margin: 0 }}>
              <SiteName state={props.state} site={site(s.siteId)} />
              {s.colocatedKw > 0 && ` · ${t('ui.queue.colocated', { mw: fmt.power(s.colocatedKw) })}`}
              {s.freeKw > 0 && ` · ${t('ui.queue.free', { mw: fmt.power(s.freeKw) })}`}
            </p>
            {plan && s.saleUsd > 0 && (
              <button
                type="button"
                class="btn"
                disabled={!!s.saleBlocked}
                title={s.saleBlocked ? say(s.saleBlocked) : undefined}
                onClick={() => run({ type: 'SELL_SITE_POWER', siteId: s.siteId })}
              >
                {t('ui.queue.sell', { usd: fmt.money(s.saleUsd) })}
              </button>
            )}
          </div>
        ))}
    </section>
  )
}
