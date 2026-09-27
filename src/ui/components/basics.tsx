// Small building blocks ported from the design system bundle (Icon, Pips, Sparkline,
// week strip) plus the dialog frame and the to-do action row from the mockup.
import type { ComponentChildren } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import { hasText, t, tDynamic } from '../../i18n/t.ts'
import { dismissTip, readDismissedTips } from '../../platform/tips.ts'
import { ICONS, type IconName } from '../icons.ts'

export function Icon(props: {
  name: IconName
  size?: 16 | 20
  label?: string
}) {
  const size = props.size ?? 20
  return (
    <svg
      class={size === 16 ? 'ico-16' : 'ico'}
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      stroke-width={1.5}
      stroke-linecap="round"
      stroke-linejoin="round"
      role={props.label ? 'img' : undefined}
      aria-label={props.label}
      aria-hidden={props.label ? undefined : 'true'}
      focusable="false"
      dangerouslySetInnerHTML={{ __html: ICONS[props.name] }}
    />
  )
}

/** Bandwidth dots: either "n of total left", or the cost of an action. */
export function Pips(props: {
  total: number
  filled: number
  short?: boolean
  label: string
}) {
  return (
    <span class="pips" role="img" aria-label={props.label}>
      {Array.from({ length: props.total }, (_, i) => (
        <span
          key={i}
          class={`pip${i < props.filled ? ' on' : ''}${props.short ? ' short' : ''}`}
        />
      ))}
    </span>
  )
}

export type Series = 'btc' | 'eth' | 'hash'

/** A 150×40 trend line; BTC gets a soft area fill like the mockup. */
export function Sparkline(props: {
  points: number[]
  series: Series
  label: string
}) {
  const w = 150
  const h = 40
  const pad = 4
  const pts = props.points
  const min = Math.min(...pts)
  const max = Math.max(...pts)
  const range = max - min || 1
  const xy = pts.map((v, i) => [
    (i * w) / Math.max(1, pts.length - 1),
    pad + (h - 2 * pad) * (1 - (v - min) / range),
  ])
  const line = xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const [lx, ly] = xy[xy.length - 1] ?? [0, h / 2]
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={props.label}
    >
      {props.series === 'btc' && (
        <polygon class="c-btc-area" points={`0,${h} ${line} ${w},${h}`} />
      )}
      <polyline
        class={`c-${props.series}-line`}
        points={line}
        vector-effect="non-scaling-stroke"
      />
      <circle class={`c-${props.series}`} cx={lx} cy={ly} r={2.8} />
    </svg>
  )
}

/** The 13-week strip. `current` is the week shown as "now" (0 = not started). */
export function WeekStrip(props: {
  current: number
  flags: number[]
  notes: Record<number, string>
}) {
  return (
    <div>
      <div
        class="weeks"
        role="list"
        aria-label={t('ui.live.weeks_label', { week: props.current })}
      >
        {Array.from({ length: 13 }, (_, i) => {
          const n = i + 1
          const state =
            n < props.current ? 'done' : n === props.current ? 'now' : 'future'
          return (
            <div
              key={n}
              role="listitem"
              class={`week ${state}`}
              aria-current={state === 'now' ? 'step' : undefined}
            >
              {props.flags.includes(n) && (
                <span class="flag" aria-hidden="true" />
              )}
              {n}
            </div>
          )
        })}
      </div>
      <div class="week-notes" aria-hidden="true">
        {Array.from({ length: 13 }, (_, i) => (
          <span key={i}>{props.notes[i + 1] ?? ''}</span>
        ))}
      </div>
    </div>
  )
}

/** A centred modal on a scrim. Escape or the × button closes it. */
export function Dialog(props: {
  title: string
  onClose: () => void
  children: ComponentChildren
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && props.onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [props.onClose])
  return (
    <div
      class="scrim"
      onClick={(e) => e.target === e.currentTarget && props.onClose()}
    >
      <section
        class="dialog"
        role="dialog"
        aria-modal="true"
        aria-label={props.title}
      >
        <div class="row-between">
          <h2 class="dialog-title">{props.title}</h2>
          <button
            class="icon-btn"
            type="button"
            aria-label={t('ui.close')}
            onClick={props.onClose}
          >
            <Icon name="close" />
          </button>
        </div>
        {props.children}
      </section>
    </div>
  )
}

/**
 * One row of the Plan to-do list. Free actions say "free"; others show Bandwidth pips.
 * A row with `locked` is struck through and shows the reason instead of a cost.
 */
export function ActionRow(props: {
  icon: IconName
  name: string
  bandwidth?: number
  bandwidthLeft?: number
  price?: string
  locked?: string
  disabledReason?: string
  onClick?: () => void
}) {
  if (props.locked) {
    return (
      <div class="action locked">
        <Icon name="locked" />
        <span class="name">{props.name}</span>
        <span class="num-s reason">{props.locked}</span>
      </div>
    )
  }
  const cost = props.bandwidth ?? 0
  return (
    <button
      type="button"
      class="action"
      disabled={!!props.disabledReason}
      title={props.disabledReason}
      onClick={props.onClick}
    >
      <Icon name={props.icon} />
      <span class="name">{props.name}</span>
      {cost > 0 ? (
        <Pips
          total={cost}
          filled={cost}
          short={(props.bandwidthLeft ?? cost) < cost}
          label={t('ui.plan.costs_bandwidth', { n: cost })}
        />
      ) : (
        <span class="num-s muted">{t('ui.plan.free')}</span>
      )}
      <span class="num-s price">{props.price ?? ''}</span>
    </button>
  )
}

/**
 * An onboarding tip (M6.5; scope 0.2 §2.15): a small info box with "Got it", which hides it for good
 * in this browser. `id` names the text (content.en.json › tooltip.act2.<id>).
 */
export function Tip(props: { id: string }) {
  const [gone, setGone] = useState(() => readDismissedTips().includes(props.id))
  if (gone || !hasText(`tooltip.act2.${props.id}`)) return null
  return (
    <div class="signal tip" role="note">
      <Icon name="info" />
      <div>
        <span class="label">{t('ui.signals.tip')}</span>
        {tDynamic(`tooltip.act2.${props.id}`, '')}{' '}
        <button
          type="button"
          class="btn"
          onClick={() => {
            dismissTip(props.id)
            setGone(true)
          }}
        >
          {t('ui.tip.got_it')}
        </button>
      </div>
    </div>
  )
}
