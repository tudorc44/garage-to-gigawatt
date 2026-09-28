// Shared pieces of the prologue's screens (Alpha 0.3; wireframes docs/wireframes/prologue): the props,
// small formatters for early prices and tiny machines, a KPI tile, the error line under a panel, and
// the centred card used by the intro, the reports and the handover.
import { useState } from 'preact/hooks'
import { t, type Message } from '../../../i18n/t.ts'
import type { Action } from '../../../sim/actions.ts'
import type { Coin, GameState } from '../../../sim/state.ts'
import { getModel } from '../../../sim/systems/market.ts'
import { Icon } from '../../components/basics.tsx'
import { fmt } from '../../format.ts'
import type { IconName } from '../../icons.ts'
import { PROLOGUE_DRAWINGS } from '../../machineDrawings.ts'
import { say } from '../../names.ts'

export interface PrologueProps {
  state: GameState
  act: (a: Action) => Message | null
  tick: () => void
  skip: () => void
  onNew: () => void
}

/** A coin price: $0.0033 in 2010, $5.28 in 2011, $1,150 in 2013; "no price yet" before a market. */
export const price = (usd: number) =>
  usd <= 0
    ? t('ui.p0.no_price')
    : usd < 1
      ? `$${usd.toPrecision(2)}`
      : fmt.money(usd, usd < 10 ? { exact: true, dp: 2 } : {})

/** 90 W, 350 W, 1.5 kW. */
export const watts = (kw: number) =>
  kw < 1 ? `${Math.round(kw * 1000)} W` : fmt.power(kw)

/** A BTC machine's hashrate (TH/s in content) as MH/s … TH/s; ETH machines are in MH/s. */
export const hashOf = (model: string, count = 1) => {
  const m = getModel(model)!
  return m.coin === 'BTC'
    ? fmt.hash(m.hashrate * 1e6 * count, 'MH')
    : fmt.hash(m.hashrate * count, 'MH')
}

export const coins = (n: number, coin: Coin) =>
  n === 0 ? `0 ${coin}` : fmt.crypto(n, coin)

export const drawing = (model: string) =>
  PROLOGUE_DRAWINGS[model] ?? 'asic-box-2016'

export const era = (model: string) =>
  getModel(model)?.available_from?.slice(0, 4)

/** A change, e.g. ▲150%: red / green for a price, neutral for difficulty (wireframe P0-04 note). */
export function Change(props: { value: number | null; neutral?: boolean }) {
  if (props.value === null) return null
  const tone = props.neutral
    ? 'muted'
    : props.value > 0
      ? 'gain'
      : props.value < 0
        ? 'loss'
        : 'muted'
  return (
    <span class={`num-s ${tone}`}>
      {props.neutral
        ? `${props.value >= 0 ? '+' : ''}${fmt.pct(props.value)}`
        : fmt.delta(props.value, 'pct')}
    </span>
  )
}

export function Tile(props: {
  label: string
  value: string
  sub?: string
  warn?: boolean
  icon?: IconName
}) {
  return (
    <div class="panel tile">
      <div class="label">
        {props.icon && <Icon name={props.icon} size={16} />} {props.label}
      </div>
      <div class="num-kpi">{props.value}</div>
      {props.sub && (
        <div class={`num-s ${props.warn ? 'warn' : 'muted'}`}>{props.sub}</div>
      )}
    </div>
  )
}

/** Refusals are shown under the panel that caused them. */
export function useError(act: PrologueProps['act']) {
  const [error, setError] = useState<Message | null>(null)
  return {
    error,
    run: (a: Action) => setError(act(a)),
    view: error ? <p class="num-s loss">{say(error)}</p> : null,
  }
}

export function CenterCard(props: {
  children: preact.ComponentChildren
  wide?: boolean
}) {
  return (
    <div class="screen g-paper">
      <div class="center-page">
        <div
          class={`panel end-card chapter-card${props.wide ? ' p0-wide' : ''}`}
        >
          {props.children}
        </div>
      </div>
    </div>
  )
}

/** A thin bar: a share filled; hatched when it's in the danger zone (as in Acts I–II). */
export function Bar(props: { share: number; danger?: boolean; label: string }) {
  const pct = Math.max(0, Math.min(1, props.share)) * 100
  return (
    <div class="p0-bar" role="img" aria-label={props.label}>
      <i
        class={props.danger ? 'danger' : undefined}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
