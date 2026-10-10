// The Finances views (M37.2-M37.4, doc 39): read-only views of the ledger for the Finances screen, the quarter report's
// summary and the chapter reports. A period is a quarter, a calendar year (4 quarters), an act or the career; each view
// sets the period beside the previous one of the same length. By line, by business (the ledger's business of each
// booking) or by site (a site's revenue, its direct costs and their difference, its contribution; costs with no site
// in one "not allocated" row, never spread). Old saves' quarters before the ledger are summaries only (partial).
import { CONTENT, actFirstQuarter, actLastQuarter } from '../content/index.ts'
import {
  BUSINESSES,
  CATEGORIES,
  CATEGORY_IDS,
  endCash,
  type Business,
  type Category,
  type LedgerQuarter,
  type LedgerSection,
  type Lines,
} from './ledger.ts'
import type { GameState } from './state.ts'

export type PeriodKind = 'quarter' | 'year' | 'act' | 'career'
export type ActNo = Parameters<typeof actFirstQuarter>[0]

/** A period: a quarter index, a calendar year, an act (0-4), or the whole career. */
export type Period =
  | { kind: 'quarter'; q: number }
  | { kind: 'year'; year: number }
  | { kind: 'act'; act: ActNo }
  | { kind: 'career' }

const label = (q: number) => CONTENT.quarters[q]
const yearOf = (q: number) => Number(label(q).slice(0, 4))

/** The last completed quarter (the default period), or the current one before any quarter has ended. */
export function defaultPeriod(state: GameState): Period {
  const r = state.reports.at(-1)
  const q = r ? CONTENT.quarters.indexOf(r.quarter) : -1
  return { kind: 'quarter', q: q >= 0 ? q : state.quarter }
}

/** True when the period is the quarter being played (its report not out yet): "this quarter so far". */
export function isSoFar(state: GameState, p: Period): boolean {
  return p.kind === 'quarter' && p.q === state.quarter && !state.reports.some((r) => r.quarter === label(p.q))
}

/** The quarters a period covers, up to the quarter being played. */
export function periodQuarters(state: GameState, p: Period): number[] {
  const last = state.quarter
  const first = ledgerFirstQuarter(state)
  const range = (a: number, b: number) => (b < a ? [] : Array.from({ length: b - a + 1 }, (_, i) => a + i))
  switch (p.kind) {
    case 'quarter':
      return p.q <= last ? [p.q] : []
    case 'year':
      return range(Math.max(first, firstQuarterOfYear(p.year)), last).filter((q) => yearOf(q) === p.year)
    case 'act':
      return range(Math.max(first, actFirstQuarter(p.act)), Math.min(last, actLastQuarter(p.act)))
    case 'career':
      return range(first, last)
  }
}

/** A calendar year's first quarter index (the prologue's quarters have negative indices). */
function firstQuarterOfYear(year: number): number {
  for (let q = actFirstQuarter(0); q < CONTENT.quarters.length; q++) if (label(q) === `${year}Q1`) return q
  return Number.POSITIVE_INFINITY
}

/** The first quarter the ledger knows (full or partial), or the current one. */
function ledgerFirstQuarter(state: GameState): number {
  return state.ledger?.quarters[0]?.q ?? state.quarter
}

/** The period before, of the same length (none before the career, or before the ledger's first quarter). */
export function previousPeriod(state: GameState, p: Period): Period | null {
  const first = ledgerFirstQuarter(state)
  switch (p.kind) {
    case 'quarter':
      return p.q - 1 >= first ? { kind: 'quarter', q: p.q - 1 } : null
    case 'year':
      return yearOf(first) <= p.year - 1 ? { kind: 'year', year: p.year - 1 } : null
    case 'act': {
      if (p.act === 0) return null
      const before = (p.act - 1) as ActNo
      return actLastQuarter(before) >= first ? { kind: 'act', act: before } : null
    }
    case 'career':
      return null
  }
}

/** The years and acts the player can pick (those the ledger has a quarter in). */
export function periodChoices(state: GameState): { quarters: number[]; years: number[]; acts: ActNo[] } {
  const qs = periodQuarters(state, { kind: 'career' })
  return {
    quarters: qs,
    years: [...new Set(qs.map(yearOf))],
    acts: [...new Set(qs.map((q) => (CONTENT.acts.find((a) => q >= a.firstQuarter && q <= a.lastQuarter)?.act ?? 0) as ActNo))],
  }
}

// ---------- Totals ----------

/** A period's totals: by category, business and ref, the summaries of partial quarters, its start and end cash. */
export interface PeriodTotals {
  quarters: number[]
  lines: Lines
  byBiz: Partial<Record<Business, Lines>>
  byRef: Record<string, Lines>
  parents: Record<string, string>
  rounding: number
  /** Quarters from before the ledger (an old save): their report's totals only. */
  summary: { revenueUsd: number; powerUsd: number; rentUsd: number; otherOpexUsd: number; cashChangeUsd: number } | null
  /** The first quarter with full detail inside the period, when some quarters are summaries. */
  fullFrom: number | null
  startCash: number
  endCash: number
}

function add(into: Lines, from: Lines, sign = 1): void {
  for (const c of CATEGORY_IDS) if (from[c]) into[c] = (into[c] ?? 0) + sign * from[c]!
}

export function periodTotals(state: GameState, p: Period): PeriodTotals {
  const quarters = periodQuarters(state, p)
  const set = new Set(quarters)
  const all = state.ledger?.quarters ?? []
  const t: PeriodTotals = {
    quarters,
    lines: {},
    byBiz: {},
    byRef: {},
    parents: {},
    rounding: 0,
    summary: null,
    fullFrom: null,
    startCash: state.cash,
    endCash: state.cash,
  }
  const inside: number[] = []
  all.forEach((lq, i) => {
    if (set.has(lq.q)) inside.push(i)
  })
  if (inside.length === 0) {
    // (no cash moved in the period: start = end = the cash at its end)
    const after = all.findIndex((lq) => lq.q > (quarters.at(-1) ?? Infinity))
    t.startCash = t.endCash = after >= 0 ? all[after].startCash : state.cash
    return t
  }
  t.startCash = all[inside[0]].startCash
  t.endCash = endCash(state, inside.at(-1)!)
  let anyPartial = false
  for (const i of inside) {
    const lq: LedgerQuarter = all[i]
    if (lq.partial) {
      anyPartial = true
      const s = (t.summary ??= { revenueUsd: 0, powerUsd: 0, rentUsd: 0, otherOpexUsd: 0, cashChangeUsd: 0 })
      s.revenueUsd += lq.partial.revenueUsd
      s.powerUsd -= lq.partial.powerUsd
      s.rentUsd -= lq.partial.rentUsd
      // (the report's EBITDA = revenue − power − rent − the rest: the rest is what it didn't itemise)
      s.otherOpexUsd -= lq.partial.revenueUsd - lq.partial.powerUsd - lq.partial.rentUsd - lq.partial.ebitdaUsd
      s.cashChangeUsd += endCash(state, i) - lq.startCash
      continue
    }
    if (anyPartial && t.fullFrom === null) t.fullFrom = lq.q
    add(t.lines, lq.lines)
    for (const b of BUSINESSES) if (lq.byBiz[b]) add((t.byBiz[b] ??= {}), lq.byBiz[b]!)
    for (const [k, l] of Object.entries(lq.byRef)) add((t.byRef[k] ??= {}), l)
    Object.assign(t.parents, lq.parents ?? {})
    t.rounding += lq.rounding
  }
  if (anyPartial && t.fullFrom === null) t.fullFrom = state.ledger!.from
  return t
}

// ---------- The P&L (M37.3) ----------

const PNL_SECTIONS: LedgerSection[] = ['revenue', 'opex', 'below']
export const catsOf = (section: LedgerSection): Category[] => CATEGORY_IDS.filter((c) => CATEGORIES[c].section === section)
const sum = (l: Lines, cats: Category[]) => cats.reduce((s, c) => s + (l[c] ?? 0), 0)
const MINED: Category[] = ['mining_btc', 'mining_eth', 'mining_other']

/** The P&L's figures for a set of lines (costs negative). */
export interface PnlFigures {
  revenue: number
  opex: number
  ebitda: number
  /** EBITDA ÷ revenue, or null without revenue. */
  margin: number | null
  below: number
  net: number
}

export function pnlFigures(lines: Lines, summary: PeriodTotals['summary'] = null): PnlFigures {
  const revenue = sum(lines, catsOf('revenue')) + (summary?.revenueUsd ?? 0)
  const opex = sum(lines, catsOf('opex')) + (summary ? summary.powerUsd + summary.rentUsd + summary.otherOpexUsd : 0)
  const ebitda = revenue + opex
  const below = sum(lines, catsOf('below'))
  return { revenue, opex, ebitda, margin: revenue !== 0 ? ebitda / revenue : null, below, net: ebitda + below }
}

export type PnlRowId = Category | 'summary_revenue' | 'summary_opex'

export interface PnlRow {
  section: 'revenue' | 'opex' | 'below'
  id: PnlRowId
  now: number
  prev: number | null
}

export interface PnlView {
  period: Period
  prevPeriod: Period | null
  soFar: boolean
  rows: PnlRow[]
  now: PnlFigures
  prev: PnlFigures | null
  /** The first quarter with full detail, when the period includes an old save's summary quarters. */
  fullFrom: string | null
  /** The three lines that changed most, each with its main source (a site, project, block or venture). */
  changes: { id: PnlRowId; deltaUsd: number; source: string | null }[]
}

function summaryRows(s: PeriodTotals['summary']): Partial<Record<PnlRowId, number>> {
  if (!s) return {}
  return { summary_revenue: s.revenueUsd, power: s.powerUsd, rent: s.rentUsd, summary_opex: s.otherOpexUsd }
}

export function pnlView(state: GameState, period: Period): PnlView {
  const now = periodTotals(state, period)
  const prevPeriod = previousPeriod(state, period)
  const prev = prevPeriod ? periodTotals(state, prevPeriod) : null
  const value = (t: PeriodTotals, id: PnlRowId): number =>
    (id === 'summary_revenue' || id === 'summary_opex' ? 0 : (t.lines[id] ?? 0)) + (summaryRows(t.summary)[id] ?? 0)
  const rows: PnlRow[] = []
  for (const section of PNL_SECTIONS) {
    const ids: PnlRowId[] = [...catsOf(section)]
    if (section === 'revenue') ids.push('summary_revenue')
    if (section === 'opex') ids.push('summary_opex')
    for (const id of ids) {
      const n = value(now, id)
      const p = prev ? value(prev, id) : null
      // (a line with nothing in either period is hidden)
      if (n === 0 && (p ?? 0) === 0) continue
      rows.push({ section: section as PnlRow['section'], id, now: n, prev: p })
    }
  }
  const changes = prev
    ? rows
        .filter((r) => r.prev !== null && r.now !== r.prev)
        .map((r) => ({ id: r.id, deltaUsd: r.now - r.prev!, source: r.id.startsWith('summary') ? null : mainSource(now, prev, r.id as Category) }))
        .sort((a, b) => Math.abs(b.deltaUsd) - Math.abs(a.deltaUsd))
        .slice(0, 3)
    : []
  return {
    period,
    prevPeriod,
    soFar: isSoFar(state, period),
    rows,
    now: pnlFigures(now.lines, now.summary),
    prev: prev ? pnlFigures(prev.lines, prev.summary) : null,
    fullFrom: now.fullFrom !== null ? label(now.fullFrom) : null,
    changes,
  }
}

/** The ref ("site:…", "block:…", "venture:…") whose part of a line changed most between two periods. */
function mainSource(now: PeriodTotals, prev: PeriodTotals, cat: Category): string | null {
  const keys = new Set([...Object.keys(now.byRef), ...Object.keys(prev.byRef)].filter((k) => !k.startsWith('project:')))
  let best: string | null = null
  let bestAbs = 0
  for (const k of keys) {
    const d = Math.abs((now.byRef[k]?.[cat] ?? 0) - (prev.byRef[k]?.[cat] ?? 0))
    if (d > bestAbs) {
      best = k
      bestAbs = d
    }
  }
  return best
}

// ---------- By business (M37.2) ----------

export interface BusinessView {
  /** The businesses with anything booked in the period, in the screen's order. */
  businesses: Business[]
  rows: { section: 'revenue' | 'opex' | 'below'; id: Category; byBiz: Partial<Record<Business, number>> }[]
  figures: Partial<Record<Business, PnlFigures>>
  /** The period includes summary-only quarters (not split by business). */
  hasSummary: boolean
}

export function businessView(state: GameState, period: Period): BusinessView {
  const t = periodTotals(state, period)
  const businesses = BUSINESSES.filter((b) => PNL_SECTIONS.some((s) => catsOf(s).some((c) => (t.byBiz[b]?.[c] ?? 0) !== 0)))
  const rows: BusinessView['rows'] = []
  for (const section of PNL_SECTIONS)
    for (const id of catsOf(section)) {
      if ((t.lines[id] ?? 0) === 0) continue
      rows.push({
        section: section as BusinessView['rows'][number]['section'],
        id,
        byBiz: Object.fromEntries(businesses.map((b) => [b, t.byBiz[b]?.[id] ?? 0])),
      })
    }
  return {
    businesses,
    rows,
    figures: Object.fromEntries(businesses.map((b) => [b, pnlFigures(t.byBiz[b] ?? {})])),
    hasSummary: t.summary !== null,
  }
}

// ---------- By site (M37.2) ----------

/** A site's (or project's, block's, venture's) revenue, its direct costs and their difference, its contribution. */
export interface Contribution {
  /** "site:<id>", "project:<id>", "block:<id>", "venture:<id>", or "unallocated". */
  key: string
  revenue: number
  directCosts: number
  contribution: number
  children: Contribution[]
}

function contributionOf(key: string, l: Lines): Contribution {
  const revenue = sum(l, catsOf('revenue'))
  const directCosts = sum(l, catsOf('opex'))
  return { key, revenue, directCosts, contribution: revenue + directCosts, children: [] }
}

export interface SiteView {
  /** One row per site with anything booked, its projects, ventures and blocks beneath; "orbit:" holds the blocks. */
  rows: Contribution[]
  /** Revenue and operating costs with no site (salaries, corporate fees, orbit's shared costs …): not spread. */
  unallocated: Contribution
  /** The by-line totals the rows and the unallocated row add up to. */
  total: Contribution
  hasSummary: boolean
}

export function siteView(state: GameState, period: Period): SiteView {
  const t = periodTotals(state, period)
  const sites = Object.keys(t.byRef).filter((k) => k.startsWith('site:'))
  const rows = sites.map((k) => contributionOf(k, t.byRef[k]))
  const children = Object.keys(t.byRef).filter((k) => !k.startsWith('site:'))
  const orbit: Contribution = { key: 'orbit', revenue: 0, directCosts: 0, contribution: 0, children: [] }
  for (const k of children) {
    const c = contributionOf(k, t.byRef[k])
    const parent = t.parents[k]
    const row = parent ? rows.find((r) => r.key === `site:${parent}`) : undefined
    if (row) row.children.push(c)
    else if (k.startsWith('block:')) {
      // (blocks are under Orbit: their revenue and costs count there, not in the unallocated row)
      orbit.children.push(c)
      orbit.revenue += c.revenue
      orbit.directCosts += c.directCosts
      orbit.contribution += c.contribution
    }
  }
  if (orbit.children.length) rows.push(orbit)
  const total = contributionOf('total', t.lines)
  const allocated = rows.reduce(
    (a, r) => ({ revenue: a.revenue + r.revenue, directCosts: a.directCosts + r.directCosts }),
    { revenue: 0, directCosts: 0 },
  )
  const unallocated: Contribution = {
    key: 'unallocated',
    revenue: total.revenue - allocated.revenue,
    directCosts: total.directCosts - allocated.directCosts,
    contribution: total.contribution - allocated.revenue - allocated.directCosts,
    children: [],
  }
  rows.sort((a, b) => b.contribution - a.contribution)
  return { rows, unallocated, total, hasSummary: t.summary !== null }
}

/** The best and worst site by contribution over a period (the chapter reports), or null without sites. */
export function bestWorstSite(state: GameState, period: Period): { best: Contribution; worst: Contribution } | null {
  const sites = siteView(state, period).rows.filter((r) => r.key.startsWith('site:'))
  if (sites.length === 0) return null
  return { best: sites[0], worst: sites[sites.length - 1] }
}

// ---------- The cash flow (M37.4) ----------

export interface CashFlowView {
  period: Period
  startCash: number
  /** Net profit; less the mined coins (revenue, but cash only when sold); the cents rounding; summary quarters. */
  operating: { netProfit: number; minedCoins: number; rounding: number; summaryChange: number; total: number }
  investing: { rows: { id: Category; usd: number }[]; total: number }
  financing: { rows: { id: Category; usd: number }[]; total: number }
  treasury: { rows: { id: Category; usd: number }[]; total: number }
  endCash: number
  /** The chart: a quarter's 13 end-of-week values (with its start); a longer period's end of each quarter. */
  chart: { points: { label: string; usd: number }[]; lowIndex: number; weekly: boolean }
  /** "Why cash fell (or rose)": the two largest outflows (or inflows). */
  why: { fell: boolean; lines: { id: Category | 'mined'; usd: number }[] }
  fullFrom: string | null
}

function sectionRows(lines: Lines, section: LedgerSection) {
  const rows = catsOf(section)
    .filter((c) => (lines[c] ?? 0) !== 0)
    .map((id) => ({ id, usd: lines[id]! }))
  return { rows, total: rows.reduce((s, r) => s + r.usd, 0) }
}

export function cashFlowView(state: GameState, period: Period): CashFlowView {
  const t = periodTotals(state, period)
  const f = pnlFigures(t.lines)
  const minedCoins = -sum(t.lines, MINED)
  const summaryChange = t.summary?.cashChangeUsd ?? 0
  const operating = {
    netProfit: f.net,
    minedCoins,
    rounding: t.rounding,
    summaryChange,
    total: f.net + minedCoins + t.rounding + summaryChange,
  }
  const investing = sectionRows(t.lines, 'investing')
  const financing = sectionRows(t.lines, 'financing')
  const treasury = sectionRows(t.lines, 'treasury')
  // Why cash fell or rose: the two biggest cash lines that way (mined coins aren't cash; their sale is).
  const fell = t.endCash < t.startCash
  const cashLines = CATEGORY_IDS.filter((c) => CATEGORIES[c].cash && (t.lines[c] ?? 0) !== 0).map((id) => ({
    id: id as Category | 'mined',
    usd: t.lines[id]!,
  }))
  const why = {
    fell,
    lines: cashLines
      .filter((l) => (fell ? l.usd < 0 : l.usd > 0))
      .sort((a, b) => Math.abs(b.usd) - Math.abs(a.usd))
      .slice(0, 2),
  }
  return {
    period,
    startCash: t.startCash,
    operating,
    investing,
    financing,
    treasury,
    endCash: t.endCash,
    chart: cashChart(state, period, t),
    why,
    fullFrom: t.fullFrom !== null ? label(t.fullFrom) : null,
  }
}

function cashChart(state: GameState, period: Period, t: PeriodTotals): CashFlowView['chart'] {
  const all = state.ledger?.quarters ?? []
  let points: { label: string; usd: number }[]
  let weekly = false
  if (period.kind === 'quarter') {
    const lq = all.find((x) => x.q === period.q && !x.partial)
    weekly = true
    points = [{ label: '0', usd: t.startCash }, ...(lq?.weeks ?? []).map((usd, i) => ({ label: String(i + 1), usd }))]
    // (the quarter's end, after its last week's settlement)
    if (lq && lq.weeks.length === 13 && !isSoFar(state, period)) points[13] = { label: '13', usd: t.endCash }
  } else {
    points = t.quarters.map((q) => {
      const i = all.findIndex((x) => x.q === q)
      return { label: label(q), usd: i >= 0 ? endCash(state, i) : t.endCash }
    })
  }
  let lowIndex = 0
  points.forEach((p, i) => {
    if (p.usd < points[lowIndex].usd) lowIndex = i
  })
  return { points, lowIndex, weekly }
}

// ---------- The quarter report's summary and the chapter reports (M37.5) ----------

/** The compact block on the quarter report: revenue, operating costs, EBITDA, net profit, the change in cash. */
export function quarterSummary(state: GameState): (PnlFigures & { cashChange: number }) | null {
  const p = defaultPeriod(state)
  const t = periodTotals(state, p)
  if (!state.ledger || t.quarters.length === 0) return null
  return { ...pnlFigures(t.lines, t.summary), cashChange: t.endCash - t.startCash }
}

/** An act's P&L summary for its chapter report: revenue, EBITDA, net profit, invested, raised; best and worst site. */
export function actSummary(
  state: GameState,
  act: ActNo,
): (PnlFigures & { investedUsd: number; raisedUsd: number; sites: ReturnType<typeof bestWorstSite>; fullFrom: string | null }) | null {
  if (!state.ledger) return null
  const p: Period = { kind: 'act', act }
  const t = periodTotals(state, p)
  if (t.quarters.length === 0) return null
  return {
    ...pnlFigures(t.lines, t.summary),
    investedUsd: -sum(t.lines, catsOf('investing').filter((c) => c !== 'asset_sales')),
    raisedUsd: (t.lines.equity_raised ?? 0) + (t.lines.debt_drawn ?? 0),
    sites: bestWorstSite(state, p),
    fullFrom: t.fullFrom !== null ? label(t.fullFrom) : null,
  }
}
