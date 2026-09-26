// Number formatting for players: a TypeScript port of G2G.fmt from
// docs/design-system/components/bundle.js (the README's "Numbers" table).
// Every number on screen goes through these functions; never format by hand.

/** The true minus sign (U+2212), not a hyphen. */
export const MINUS = '−'

export interface MoneyOpts {
  /** Full number with commas instead of $1.2K / $3.4M. */
  exact?: boolean
  /** Decimal places when exact. */
  dp?: number
}

/** $950 · $6,480 · $84.0K · $1.5M · $2.0B · $2.82 (cents only under $10) */
function money(v: number, opts: MoneyOpts = {}): string {
  const neg = v < 0
  const a = Math.abs(v)
  let s: string
  if (opts.exact) {
    s =
      '$' +
      a.toLocaleString('en-US', {
        minimumFractionDigits: opts.dp ?? 0,
        maximumFractionDigits: opts.dp ?? 0,
      })
  } else if (a >= 1e9) s = '$' + (a / 1e9).toFixed(1) + 'B'
  else if (a >= 1e6) s = '$' + (a / 1e6).toFixed(1) + 'M'
  else if (a >= 1e4) s = '$' + (a / 1e3).toFixed(1) + 'K'
  else if (a >= 1e3)
    s = '$' + a.toLocaleString('en-US', { maximumFractionDigits: 0 })
  else if (a < 10 && a !== Math.round(a)) s = '$' + a.toFixed(2)
  else s = '$' + Math.round(a)
  return (neg ? MINUS : '') + s
}

/** 850 BTC · 40 ETH · 1.2 BTC · 0.0269 BTC */
function crypto(v: number, coin: 'BTC' | 'ETH'): string {
  const a = Math.abs(v)
  const dp = a >= 100 ? 0 : a >= 1 ? 1 : 4
  return (v < 0 ? MINUS : '') + a.toFixed(dp).replace(/\.0$/, '') + ' ' + coin
}

/** 720 MH/s · 13.5 TH/s · 3.24 PH/s · 5.6 EH/s */
function hash(v: number, unit: 'MH' | 'TH'): string {
  const ladder =
    unit === 'MH' ? ['MH/s', 'GH/s', 'TH/s'] : ['TH/s', 'PH/s', 'EH/s']
  let i = 0
  let a = v
  while (a >= 1000 && i < ladder.length - 1) {
    a /= 1000
    i++
  }
  const dp = a >= 100 ? 0 : a >= 10 ? 1 : a >= 1 ? 2 : 4
  let t = a.toFixed(dp)
  if (t.includes('.')) t = t.replace(/0+$/, '').replace(/\.$/, '')
  return t + ' ' + ladder[i]
}

/** 3.8 kW · 53 kW · 1 MW · 20 MW */
function power(kw: number): string {
  if (kw >= 1000) {
    return (kw / 1000).toFixed(kw >= 10000 ? 0 : 1).replace(/\.0$/, '') + ' MW'
  }
  return (kw >= 10 || kw % 1 === 0 ? Math.round(kw) : kw.toFixed(1)) + ' kW'
}

/** 12¢/kWh · 3.5¢/kWh */
function cents(usdPerKwh: number): string {
  const c = usdPerKwh * 100
  return c.toFixed(Math.abs(c - Math.round(c)) > 1e-9 ? 1 : 0) + '¢/kWh'
}

/** 60% · −4% (whole percent unless dp is given) */
function pct(fraction: number, dp = 0): string {
  return (
    (fraction < 0 ? MINUS : '') + Math.abs(fraction * 100).toFixed(dp) + '%'
  )
}

/** ▲12% · ▼$10.4K · = flat */
function delta(
  v: number,
  kind: 'pct' | 'money' | 'count',
  opts: MoneyOpts & { dp?: number } = {},
): string {
  if (v === 0) return '= flat'
  const arrow = v > 0 ? '▲' : '▼'
  const body =
    kind === 'money'
      ? money(Math.abs(v), opts)
      : kind === 'pct'
        ? pct(Math.abs(v), opts.dp)
        : String(Math.abs(v))
  return arrow + body
}

/** +$2.82 · −$0.33 */
function signed(v: number, opts?: MoneyOpts): string {
  return (v > 0 ? '+' : v < 0 ? MINUS : '') + money(Math.abs(v), opts)
}

/** A plain signed number with a true minus: +15 · −10 (Heat, grievance). */
function signedInt(v: number): string {
  const n = Math.round(v)
  return (n > 0 ? '+' : n < 0 ? MINUS : '') + String(Math.abs(n))
}

/** "2017Q4" → "Q4 2017"; with a week: "Q4 2017 · week 6" */
function quarter(q: string, week?: number): string {
  const m = /^(\d{4})Q(\d)$/.exec(q)
  const s = m ? `Q${m[2]} ${m[1]}` : q
  return week ? `${s} · week ${week}` : s
}

/** "2017-10-02" → "2 Oct 2017" (or "2 Oct" without the year) */
function date(iso: string, withYear = true): string {
  const d = new Date(iso + 'T00:00:00Z')
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: withYear ? 'numeric' : undefined,
    timeZone: 'UTC',
  })
}

export const fmt = {
  money,
  crypto,
  hash,
  power,
  cents,
  pct,
  delta,
  signed,
  signedInt,
  quarter,
  date,
}
