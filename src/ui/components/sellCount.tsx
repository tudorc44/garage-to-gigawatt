// Selling part of a machine stack: a count, the cash the sale brings (the sim's own dry run), and one Sell. Act I's "Your
// machines" dialog (dialogs.tsx) and the Prologue's Rig screen share it, so there is one count control, not two. The Prologue
// adds quick picks (1, 10, half, all) and shows why a count is refused; Act I keeps its plain number field.
import { useState } from 'preact/hooks'
import { t } from '../../i18n/t.ts'
import { applyAction, type Action } from '../../sim/actions.ts'
import { whyNot } from '../../sim/selectors.ts'
import type { GameState } from '../../sim/state.ts'
import { fmt } from '../format.ts'
import { say } from '../names.ts'

/** Cash change if this action ran now (null if it isn't allowed). */
export function cashChange(state: GameState, a: Action): number | null {
  const r = applyAction(state, a)
  return r.ok ? r.state.cash - state.cash : null
}

/** The distinct quick-pick counts for a stack: 1, 10, half and all, each within the stack. */
export function quickCounts(stack: number): { key: 'one' | 'ten' | 'half' | 'all'; n: number }[] {
  const picks: { key: 'one' | 'ten' | 'half' | 'all'; n: number }[] = [
    { key: 'one', n: 1 },
    { key: 'ten', n: 10 },
    { key: 'half', n: Math.floor(stack / 2) },
    { key: 'all', n: stack },
  ]
  // (where two picks are the same count, the later name wins: "All (10)" rather than "10"; shown smallest first)
  const byCount = new Map<number, (typeof picks)[number]>()
  for (const p of picks) if (p.n >= 1 && p.n <= stack && !(p.n === 1 && byCount.has(1))) byCount.set(p.n, p)
  return [...byCount.values()].sort((a, b) => a.n - b.n)
}

const intl = new Intl.NumberFormat('en-US')

/**
 * "Sell all" for one machine type (UI only): every batch of that model, all sites, as the same SELL_MACHINES actions a player would
 * enter row by row. The total is a dry run of them in order; null when the player has none or one is refused.
 */
export function sellAllPlan(state: GameState, model: string): { count: number; batches: number; total: number; actions: Action[] } | null {
  const lots = state.machines.filter((l) => l.model === model && l.count > 0)
  if (lots.length === 0) return null
  let s = state
  const actions: Action[] = []
  for (const l of lots) {
    const a: Action = { type: 'SELL_MACHINES', lotId: l.id, count: l.count }
    const r = applyAction(s, a)
    if (!r.ok) return null
    s = r.state
    actions.push(a)
  }
  return { count: lots.reduce((n, l) => n + l.count, 0), batches: lots.length, total: s.cash - state.cash, actions }
}

export function SellCount(props: {
  state: GameState
  lotId: string
  /** The stack's size: the most that can be sold. */
  stack: number
  /** Runs the action; true when it went through (the count then resets). */
  run: (a: Action) => boolean
  /** The Prologue's picker: quick picks, the reason a count is refused, and its own button text. */
  prologue?: boolean
}) {
  const [count, setCount] = useState(1)
  const set = (n: number) =>
    setCount(Math.min(props.stack, Math.max(0, Math.floor(Number.isFinite(n) ? n : 0))))
  const sell: Action = { type: 'SELL_MACHINES', lotId: props.lotId, count }
  const gets = cashChange(props.state, sell)
  const why = props.prologue && gets === null && count >= 1 ? whyNot(props.state, sell) : null
  const label =
    gets === null
      ? t(props.prologue ? 'ui.sell_count.sell' : 'ui.fleet_dialog.sell')
      : props.prologue
        ? t('ui.sell_count.sell_n_for', { n: count, value: fmt.money(gets) })
        : t('ui.fleet_dialog.sell_n_for', { n: intl.format(count), value: fmt.money(gets) })
  return (
    <span style={{ display: 'inline-flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }} data-sell-count>
      {props.prologue && (
        <span class="seg">
          {quickCounts(props.stack).map((p) => (
            <button key={p.key} type="button" aria-pressed={count === p.n} onClick={() => set(p.n)}>
              {p.key === 'half' || p.key === 'all' ? t(`ui.sell_count.${p.key}`, { n: p.n }) : String(p.n)}
            </button>
          ))}
        </span>
      )}
      <input
        type="number"
        min={1}
        max={props.stack}
        value={count}
        aria-label={t('ui.fleet_dialog.sell_count')}
        style={{
          width: '64px',
          font: '13px var(--font-num)',
          padding: '6px',
          border: '1.5px solid var(--ink)',
          borderRadius: 'var(--radius-2)',
        }}
        onInput={(e) => {
          const el = e.target as HTMLInputElement
          const n = Math.min(props.stack, Math.max(0, Math.floor(Number(el.value) || 0)))
          set(n)
          // (typing past the stack snaps the field back to it, even when the count did not change)
          if (String(n) !== el.value) el.value = String(n)
        }}
      />
      {!props.prologue && (
        <button type="button" class="btn" data-sell-max onClick={() => set(props.stack)}>
          {t('ui.fleet_dialog.max')}
        </button>
      )}
      <button
        type="button"
        class="btn"
        disabled={gets === null}
        onClick={() => {
          if (props.run(sell)) setCount(1)
        }}
      >
        {label}
      </button>
      {why && <span class="num-s loss">{say(why)}</span>}
    </span>
  )
}
