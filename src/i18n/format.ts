// Number formatting for players. The sim works in plain numbers; only the UI (and the
// terminal game) turn them into text like "$1.24M".

const LOCALE = 'en-US'

const usd = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})
const usdCents = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})
const usdCompact = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 2,
})
const pct = new Intl.NumberFormat(LOCALE, {
  style: 'percent',
  maximumFractionDigits: 1,
})

/** $9,500 below a million, then $1.24M / $3.5B. Small amounts keep cents. */
export function formatUsd(n: number): string {
  if (Math.abs(n) >= 1_000_000) return usdCompact.format(n)
  if (n !== 0 && Math.abs(n) < 100) return usdCents.format(n)
  return usd.format(n)
}

/** 0.153 → "15.3%" */
export function formatPct(n: number): string {
  return pct.format(n)
}

/** Plain number with a sensible number of decimals. */
export function formatNumber(n: number, maxDecimals = 2): string {
  return new Intl.NumberFormat(LOCALE, {
    maximumFractionDigits: maxDecimals,
  }).format(n)
}

/** Signed percent change with an arrow, e.g. "▲ 12.0%" / "▼ 8.5%". */
export function formatChange(n: number): string {
  return `${n >= 0 ? '▲' : '▼'} ${pct.format(Math.abs(n))}`
}

/** Small dollar amounts that need more precision, e.g. "$0.0587" per MH per day. */
export function formatUsdSmall(n: number): string {
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 4,
  }).format(n)
}

/** ETH hashrate comes in MH/s, BTC in TH/s; scale up to the unit that reads best. */
export function formatHashrate(coin: 'BTC' | 'ETH', value: number): string {
  const units =
    coin === 'ETH' ? ['MH/s', 'GH/s', 'TH/s'] : ['TH/s', 'PH/s', 'EH/s']
  let i = 0
  while (value >= 1000 && i < units.length - 1) {
    value /= 1000
    i++
  }
  return `${formatNumber(value, 2)} ${units[i]}`
}
