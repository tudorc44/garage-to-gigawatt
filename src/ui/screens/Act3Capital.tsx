// Act III step 7 on the Capital screen (M18.2): the standby liquidity facility block (status, Arrange with its fee
// or the reason it's blocked, Draw an amount). Its draws and the corporate facilities sit in the debt stack above,
// each with Repay. Everything comes from the selectors; no rules here.
import { useState } from 'preact/hooks'
import { t } from '../../i18n/t.ts'
import { covenantView, standbyView } from '../../sim/selectors.ts'
import { fmt } from '../format.ts'
import { say } from '../names.ts'
import type { ScreenProps } from './Plan.tsx'
import { BwButton } from './Projects.tsx'

/** M18.13: the leverage covenant next to the company's LTV; in a breach, its cure level, deadline and sweep. */
export function CovenantPanel({ state }: Pick<ScreenProps, 'state'>) {
  const v = covenantView(state)
  if (!v) return null
  return (
    <section class="panel p" data-covenant>
      <div class="row-between">
        <span class="num-s">{t('ui.cap3.covenant_ltv')}</span>
        <span class="num-s">
          {Number.isFinite(v.ltv) ? fmt.pct(v.ltv) : '—'}
          {' · '}
          {t('ui.cap3.covenant', { limitPct: v.limit })}
        </span>
      </div>
      {v.breach && (
        <>
          <p class="num-s" style={{ margin: 0 }} data-covenant-breach>
            <span class="tag danger">
              {t('ui.cap3.covenant_breach', {
                curePct: v.cureLtv,
                quarter: v.breach.untilQuarter,
              })}
            </span>
          </p>
          <p class="num-s muted" style={{ margin: 0 }}>
            {t('ui.cap3.covenant_sweep')}
          </p>
        </>
      )}
    </section>
  )
}

export function StandbyPanel({ state, act }: ScreenProps) {
  const v = standbyView(state)
  const [amount, setAmount] = useState('')
  if (!v) return null
  const h = v.held
  const usd = Math.round(Number(amount.replace(/[^0-9.]/g, '')) * 1_000_000)
  return (
    <section class="panel p" data-standby>
      <div class="label">{t('ui.standby.title')}</div>
      <p class="num-s muted" style={{ margin: 0 }}>
        {t('ui.standby.what')}
      </p>
      {h ? (
        <>
          <p class="num-s" style={{ margin: 0 }} data-standby-status>
            {t('ui.standby.status', {
              quarter: h.untilQuarter,
              undrawnUsd: h.undrawnUsd,
              drawnUsd: v.drawnUsd,
              bps: h.spreadBps,
            })}
          </p>
          {h.drawBlocked ? (
            <p class="num-s muted" style={{ margin: 0 }}>
              {say(h.drawBlocked)}
            </p>
          ) : (
            <div class="row-between" style={{ justifyContent: 'flex-start', gap: '8px' }}>
              <label class="num-s">
                {t('ui.standby.amount')}{' '}
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  size={6}
                  onInput={(e) => setAmount((e.target as HTMLInputElement).value)}
                  data-standby-amount
                />
              </label>
              <BwButton
                label={t('ui.standby.draw')}
                bw={0}
                action={{ type: 'STANDBY_DRAW', amountUsd: usd }}
                state={state}
                act={act}
                onDone={() => setAmount('')}
              />
            </div>
          )}
        </>
      ) : (
        <>
          <p class="num-s" style={{ margin: 0 }} data-standby-status>
            {v.drawnUsd > 0
              ? t('ui.standby.none_drawn', { drawnUsd: v.drawnUsd })
              : t('ui.standby.none')}
          </p>
          <p class="num-s muted" style={{ margin: 0 }}>
            {t('ui.standby.terms', {
              sizeUsd: v.arrange.sizeUsd,
              feeUsd: v.arrange.feeUsd,
              bps: v.arrange.spreadBps,
            })}
          </p>
          <BwButton
            label={t('ui.standby.arrange', { fee: fmt.money(v.arrange.feeUsd) })}
            bw={1}
            action={{ type: 'STANDBY_ARRANGE' }}
            state={state}
            act={act}
          />
          {v.arrange.blocked && (
            <span class="num-s muted" data-block>
              {say(v.arrange.blocked)}
            </span>
          )}
        </>
      )}
    </section>
  )
}
