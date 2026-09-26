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
  if (Math.abs(n) < 100) return usdCents.format(n)
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
