// The ledger (M37.1, doc 39): every change to the company's cash goes through book(), which labels it with a category
// (and, where it has one, the site, project, orbital block or venture it belongs to). Mined coins are revenue when mined
// (accrue(): no cash moves until they're sold). The ledger keeps, per quarter: the starting cash, totals by category, by
// business and by ref, the cash rounding, and the 13 end-of-week cash values; for the whole career. It never changes a
// rule: book() moves cash by exactly the amount the old code did, in the same order, so every game plays as before.
import { quarterIndex } from '../content/index.ts'
import { roundCents, type GameState } from './state.ts'

/**
 * The ledger's sections: the P&L's (revenue, operating costs, below EBITDA) and the cash flow's own (operating
 * adjustments outside the P&L, investing, financing, treasury).
 */
export type LedgerSection = 'revenue' | 'opex' | 'below' | 'operating' | 'investing' | 'financing' | 'treasury'

/** The businesses the P&L can be split by (doc 39 §M37.2; the Moon is its own column: mine). */
export const BUSINESSES = ['mining', 'hosting', 'ai', 'orbit', 'moon', 'energy', 'corporate'] as const
export type Business = (typeof BUSINESSES)[number]

/**
 * The categories (doc 39 §M37.1), each with its section, its default business and whether it moves cash (mined coins
 * don't: they're revenue when mined, cash when sold). Order = the order the screens list them in.
 */
export const CATEGORIES = {
  // Revenue
  mining_btc: { section: 'revenue', biz: 'mining', cash: false },
  mining_eth: { section: 'revenue', biz: 'mining', cash: false },
  mining_other: { section: 'revenue', biz: 'mining', cash: false },
  hosting_fees: { section: 'revenue', biz: 'hosting', cash: true },
  ai_shell_rent: { section: 'revenue', biz: 'ai', cash: true },
  ai_cloud: { section: 'revenue', biz: 'ai', cash: true },
  orbit_revenue: { section: 'revenue', biz: 'orbit', cash: true },
  lunar_revenue: { section: 'revenue', biz: 'moon', cash: true },
  grid_credits: { section: 'revenue', biz: 'energy', cash: true },
  energy_income: { section: 'revenue', biz: 'energy', cash: true },
  other_income: { section: 'revenue', biz: 'corporate', cash: true },
  // Operating costs
  power: { section: 'opex', biz: 'mining', cash: true },
  rent: { section: 'opex', biz: 'corporate', cash: true },
  salaries: { section: 'opex', biz: 'corporate', cash: true },
  repairs: { section: 'opex', biz: 'mining', cash: true },
  insurance: { section: 'opex', biz: 'corporate', cash: true },
  ai_opex: { section: 'opex', biz: 'ai', cash: true },
  orbit_opex: { section: 'opex', biz: 'orbit', cash: true },
  lunar_opex: { section: 'opex', biz: 'moon', cash: true },
  energy_opex: { section: 'opex', biz: 'energy', cash: true },
  community: { section: 'opex', biz: 'corporate', cash: true },
  other_opex: { section: 'opex', biz: 'corporate', cash: true },
  // Below EBITDA
  interest: { section: 'below', biz: 'corporate', cash: true },
  finance_fees: { section: 'below', biz: 'corporate', cash: true },
  one_offs: { section: 'below', biz: 'corporate', cash: true },
  taxes: { section: 'below', biz: 'corporate', cash: true },
  // Operating cash outside the P&L (mine, M37.3): a tenant's or buyer's prepayment comes in as cash, and the revenue it
  // later covers comes off it, so the P&L shows the revenue in full when it's earned (never a negative income)
  prepayments: { section: 'operating', biz: 'corporate', cash: true },
  // Investing (cash flow only)
  machines: { section: 'investing', biz: 'mining', cash: true },
  site_builds: { section: 'investing', biz: 'corporate', cash: true },
  project_capex: { section: 'investing', biz: 'ai', cash: true },
  gpus: { section: 'investing', biz: 'ai', cash: true },
  retrofits: { section: 'investing', biz: 'ai', cash: true },
  orbit_capex: { section: 'investing', biz: 'orbit', cash: true },
  lunar_capex: { section: 'investing', biz: 'moon', cash: true },
  venture_calls: { section: 'investing', biz: 'energy', cash: true },
  energy_assets: { section: 'investing', biz: 'energy', cash: true },
  asset_sales: { section: 'investing', biz: 'corporate', cash: true },
  // Financing (cash flow only)
  debt_drawn: { section: 'financing', biz: 'corporate', cash: true },
  debt_repaid: { section: 'financing', biz: 'corporate', cash: true },
  equity_raised: { section: 'financing', biz: 'corporate', cash: true },
  founder_payouts: { section: 'financing', biz: 'corporate', cash: true },
  // Treasury (cash flow only)
  coins_sold: { section: 'treasury', biz: 'mining', cash: true },
  coins_bought: { section: 'treasury', biz: 'mining', cash: true },
} as const satisfies Record<string, { section: LedgerSection; biz: Business; cash: boolean }>

export type Category = keyof typeof CATEGORIES
export const CATEGORY_IDS = Object.keys(CATEGORIES) as Category[]

/** What a booking belongs to: a site, a project, an orbital block or a venture; `biz` overrides the category's business. */
export interface LedgerRef {
  site?: string | null
  project?: string
  block?: string
  venture?: string
  biz?: Business
}

export type Lines = Partial<Record<Category, number>>

export interface LedgerQuarter {
  /** The quarter index (CONTENT.quarters / the prologue's negative indices). */
  q: number
  startCash: number
  /** Totals by category (mined coins included, at their value when mined). */
  lines: Lines
  /**
   * The part of a category booked to a business other than the category's own (rent at an AI site, power for hosting);
   * the rest of each line is its category's business (`businessLines` adds them up). Kept small: the game copies its
   * state every week.
   */
  byBiz: Partial<Record<Business, Lines>>
  /** Totals by ref ("site:<id>", "project:<id>", "block:<id>", "venture:<id>"). */
  byRef: Record<string, Lines>
  /** A project's or block's site ("project:<id>" → site id), for the by-site view. */
  parents?: Record<string, string>
  /** Cents rounding of the cash (the game rounds cash to cents once a week and at the quarter's end). */
  rounding: number
  /** Cash at the end of each week played (up to 13). */
  weeks: number[]
  /** Backfilled from an old save's quarter report: only these totals are known (the lines are empty). */
  partial?: PartialQuarter
}

/** What an old save's quarter report tells: revenue, power, rent and EBITDA (doc 39 §M37.1). */
export interface PartialQuarter {
  revenueUsd: number
  powerUsd: number
  rentUsd: number
  ebitdaUsd: number
}

export interface Ledger {
  /** The first quarter with full detail. */
  from: number
  quarters: LedgerQuarter[]
}

/** The quarter's ledger entry, opened (with the cash as it stands) on its first use. */
function current(state: GameState): LedgerQuarter {
  const ledger = (state.ledger ??= { from: state.quarter, quarters: [] })
  const last = ledger.quarters.at(-1)
  if (last && last.q === state.quarter && !last.partial) return last
  const q: LedgerQuarter = { q: state.quarter, startCash: state.cash, lines: {}, byBiz: {}, byRef: {}, rounding: 0, weeks: [] }
  ledger.quarters.push(q)
  return q
}

function addTo(lines: Lines, cat: Category, usd: number): void {
  lines[cat] = (lines[cat] ?? 0) + usd
}

function record(state: GameState, cat: Category, usd: number, ref?: LedgerRef): void {
  if (usd === 0) return
  const lq = current(state)
  addTo(lq.lines, cat, usd)
  if (ref?.biz && ref.biz !== CATEGORIES[cat].biz) addTo((lq.byBiz[ref.biz] ??= {}), cat, usd)
  if (!ref) return
  const site = ref.site ?? undefined
  if (site) addTo((lq.byRef[`site:${site}`] ??= {}), cat, usd)
  for (const [kind, id] of [
    ['project', ref.project],
    ['block', ref.block],
    ['venture', ref.venture],
  ] as const) {
    if (!id) continue
    const key = `${kind}:${id}`
    addTo((lq.byRef[key] ??= {}), cat, usd)
    if (site) (lq.parents ??= {})[key] = site
  }
}

/** An event card's (or other one-off's) plain cash effect: income if it's money in, a one-off cost if out. */
export const oneOffCategory = (usd: number): Category => (usd >= 0 ? 'other_income' : 'one_offs')

/** Moves cash by `usd` (+ in, − out) and labels it. The only way the sim changes `state.cash` (a test checks). */
export function book(state: GameState, cat: Category, usd: number, ref?: LedgerRef): void {
  record(state, cat, usd, ref)
  state.cash += usd
}

/**
 * Moves cash by `totalUsd` in one step, labelled as `parts` (which sum to it): for code that changed cash by one
 * combined amount (`cash += sold − power − rent`), so the arithmetic, and so every game, stays exactly as it was.
 */
export function bookSplit(
  state: GameState,
  totalUsd: number,
  parts: readonly (readonly [Category, number, LedgerRef?])[],
): void {
  for (const [cat, usd, ref] of parts) record(state, cat, usd, ref)
  state.cash += totalUsd
}

/** Labels mined coins as revenue at their value when mined; no cash moves (that happens when they're sold). */
export function accrue(state: GameState, cat: Category, usd: number, ref?: LedgerRef): void {
  record(state, cat, usd, ref)
}

/** Rounds the cash to cents (as the game always has), keeping the rounding so the ledger still adds up. */
export function roundCash(state: GameState): void {
  const before = state.cash
  state.cash = roundCents(state.cash)
  if (state.cash !== before) current(state).rounding += state.cash - before
}

/** Records the cash at the end of a week played. */
export function ledgerWeekEnd(state: GameState): void {
  current(state).weeks.push(state.cash)
}

/**
 * Sets the cash outright (a preset company's opening balance sheet) and starts the ledger afresh from now: nothing
 * before it is a cash movement the player made.
 */
export function openingCash(state: GameState, usd: number): void {
  state.cash = usd
  state.ledger = { from: state.quarter, quarters: [] }
}

/**
 * The business a site's shared costs (rent) belong to: mining while it has machines, else AI with a project there,
 * else hosting with a contract, else corporate (mine, reversible).
 */
export function siteBusiness(state: GameState, siteId: string): Business {
  if (state.machines.some((m) => m.siteId === siteId)) return 'mining'
  if (state.projects.some((p) => p.siteId === siteId)) return 'ai'
  if (state.hosting.some((h) => h.siteId === siteId)) return 'hosting'
  return 'corporate'
}

/**
 * An old save (from before the ledger) starts its ledger at load: its past quarter reports are kept as partial
 * quarters (revenue, power, rent, EBITDA), and full detail starts with the next quarter it plays (this one, when it's
 * loaded before the quarter's first week).
 */
export function startLedgerAtLoad(state: GameState): void {
  const quarters: LedgerQuarter[] = []
  for (const r of state.reports) {
    const q = quarterIndex(r.quarter)
    if (q === undefined || typeof r.revenueUsd !== 'number') continue
    quarters.push({
      q,
      startCash: r.startCash ?? 0,
      lines: {},
      byBiz: {},
      byRef: {},
      rounding: 0,
      weeks: [],
      partial: {
        revenueUsd:
          r.revenueUsd +
          (r.hostingFeesUsd ?? 0) +
          (r.aiRevenueUsd ?? 0) +
          (r.orbitRevenueUsd ?? 0) +
          (r.moonRevenueUsd ?? 0) +
          (r.energyRevenueUsd ?? 0),
        powerUsd: r.powerCostUsd ?? 0,
        rentUsd: r.rentUsd ?? 0,
        ebitdaUsd: r.ebitdaUsd ?? 0,
      },
    })
  }
  const fresh = state.phase === 'plan' && state.week === 0
  state.ledger = { from: fresh ? state.quarter : state.quarter + 1, quarters }
}

// ---------- Reading the ledger ----------

/** Lines by business: each category's own business holds what wasn't booked to another (see `byBiz`). */
export function businessLines(lines: Lines, overrides: Partial<Record<Business, Lines>>): Partial<Record<Business, Lines>> {
  const out: Partial<Record<Business, Lines>> = {}
  for (const cat of CATEGORY_IDS) {
    const total = lines[cat]
    if (!total) continue
    let rest = total
    for (const b of BUSINESSES) {
      const usd = overrides[b]?.[cat]
      if (!usd) continue
      ;(out[b] ??= {})[cat] = ((out[b] ??= {})[cat] ?? 0) + usd
      rest -= usd
    }
    // (a cent-level remainder of floating point isn't a business's line)
    if (Math.abs(rest) >= 0.005) {
      const own = CATEGORIES[cat].biz
      ;(out[own] ??= {})[cat] = ((out[own] ??= {})[cat] ?? 0) + rest
    }
  }
  return out
}

/** The cash-moving total of a set of lines (mined coins excluded). */
export function cashTotal(lines: Lines): number {
  let sum = 0
  for (const cat of CATEGORY_IDS) if (CATEGORIES[cat].cash) sum += lines[cat] ?? 0
  return sum
}

/** The quarter's ending cash: the next entry's start, or the cash now for the last one. */
export function endCash(state: GameState, i: number): number {
  const qs = state.ledger!.quarters
  return i + 1 < qs.length ? qs[i + 1].startCash : state.cash
}

/**
 * The reconciliation (doc 39 §M37.1): for each full quarter, start cash + its cash-moving lines + rounding = end cash.
 * Returns the quarters where the untagged remainder is more than a cent (the ledger's sums are in floating point, as
 * the game's cash is: a cent's tolerance is mine). Empty = every cash movement is labelled.
 */
export function unreconciled(state: GameState): { q: number; untaggedUsd: number }[] {
  const out: { q: number; untaggedUsd: number }[] = []
  const qs = state.ledger?.quarters ?? []
  qs.forEach((lq, i) => {
    if (lq.partial) return
    const untagged = endCash(state, i) - lq.startCash - cashTotal(lq.lines) - lq.rounding
    if (Math.abs(untagged) > 0.01) out.push({ q: lq.q, untaggedUsd: untagged })
  })
  return out
}
