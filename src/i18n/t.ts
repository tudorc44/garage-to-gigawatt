// t('key', params): looks up player-facing text in en.json and fills in {placeholders}.
// Number params are formatted by name: ending in "Usd" → money, "Pct" → percent.
// String params named model / tier / condition are content ids and get translated too.
import en from './en.json' with { type: 'json' }
import { formatNumber, formatPct, formatUsd } from './format.ts'

export type MessageKey = keyof typeof en
export type MessageParams = Record<string, string | number>

/** A message the sim hands to the UI: a key plus raw values, never finished English. */
export interface Message {
  key: MessageKey
  params?: MessageParams
}

const table: Record<string, string> = en

/** String params that hold content ids get translated through these key prefixes. */
const ID_PARAMS: Record<string, string> = {
  model: 'machine.',
  tier: 'site.',
  condition: 'condition.',
}

export function t(key: MessageKey, params: MessageParams = {}): string {
  const text = table[key] ?? key
  return text.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = params[name]
    if (value === undefined) return `{${name}}`
    if (typeof value === 'string') {
      const prefix = ID_PARAMS[name]
      return prefix ? (table[prefix + value] ?? value) : value
    }
    if (name.endsWith('Usd')) return formatUsd(value)
    if (name.endsWith('Pct')) return formatPct(value)
    return formatNumber(value)
  })
}

/** For keys built from content ids, e.g. `machine.${id}`. Falls back to the id itself. */
export function tDynamic(key: string, fallback: string): string {
  return table[key] ?? fallback
}
