// The lifeline bridge's payments (M8.7f), shown on the Act II Plan screen and the Capital screen so a
// player sees the step from interest-only to amortising coming a quarter early. Read-only.
import { t } from '../../i18n/t.ts'
import { bridgePaymentView, quarterName } from '../../sim/selectors.ts'
import type { GameState } from '../../sim/state.ts'
import { fmt } from '../format.ts'

export function BridgePayment({ state }: { state: GameState }) {
  const v = bridgePaymentView(state)
  if (!v) return null
  const phase = (p: 'interest_only' | 'amortising' | 'final') =>
    t(`ui.bridge.phase.${p}`)
  return (
    <div
      class="bridge-payment"
      title={t('ui.bridge.tip', { quarters: v.interestOnlyQuarters })}
    >
      <span class="label">{t('ui.bridge.title')}</span>
      <div class={`num-s ${v.coversNow ? '' : 'loss'}`}>
        {t('ui.bridge.now', {
          usd: fmt.money(v.now.totalUsd),
          phase: phase(v.now.phase),
        })}
      </div>
      {v.next && (
        <div class={`num-s ${v.coversNext ? 'muted' : 'loss'}`}>
          {t('ui.bridge.next', {
            usd: fmt.money(v.next.totalUsd),
            phase: phase(v.next.phase),
          })}
          {v.stepsUp && ` ${t('ui.bridge.steps_up')}`}
          {!v.coversNext && ` ${t('ui.bridge.raise_cash')}`}
        </div>
      )}
      <div class="num-s muted">
        {t('ui.bridge.left', {
          n: v.quartersLeft,
          quarter: fmt.quarter(quarterName(v.dueQuarter)),
        })}
      </div>
    </div>
  )
}
