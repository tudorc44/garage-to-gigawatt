// The founder's exit (M57.1; doc 43 §15.2, A5's exit panel): in the Plan phase of 2040Q3-Q4, the buyer's bid, what the
// plant stakes would fetch, and the three choices (hold is the default). Everything from the public view (selectors);
// the outlook factor is never read here.
import { t } from '../../i18n/t.ts'
import type { Action } from '../../sim/actions.ts'
import { act5ExitView } from '../../sim/selectors.ts'
import type { GameState } from '../../sim/state.ts'
import { fmt } from '../format.ts'

export function ExitPanel(props: { state: GameState; act: (a: Action) => unknown }) {
  const v = act5ExitView(props.state)
  if (!v || props.state.phase !== 'plan') return null
  return (
    <div class="panel p" data-exit>
      <h2 class="panel-title">{t('ui.act5.exit.title')}</h2>
      <p class="num-s">{t('ui.act5.exit.body')}</p>
      <p class="num-s">{t('ui.act5.exit.bid', { usd: fmt.money(v.bidUsd), share: fmt.money(v.founderShareUsd) })}</p>
      {v.plantsUsd > 0 && <p class="num-s muted">{t('ui.act5.exit.plants', { usd: fmt.money(v.plantsUsd) })}</p>}
      {v.choice && <p class="num-s">{t(`ui.act5.exit.chosen.${v.choice}`)}</p>}
      {v.open && (
        <div class="energy-choice-row">
          {(['sell_company', 'sell_plants', 'hold'] as const).map((c) => (
            <button
              key={c}
              type="button"
              class={`btn${v.choice === c ? ' btn-primary' : ''}`}
              onClick={() => props.act({ type: 'EXIT_CHOOSE', choice: c })}
            >
              {t(`ui.act5.exit.${c}`)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
