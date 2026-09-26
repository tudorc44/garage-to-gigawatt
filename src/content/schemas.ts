// Zod schemas for the Act I content files. They describe what each file must contain;
// the loader in index.ts checks the files against them and stops the game on bad data.
import { z } from 'zod'

export const quarterId = z
  .string()
  .regex(/^\d{4}Q[1-4]$/, 'expected a quarter like "2017Q1"')
const yearId = z.string().regex(/^\d{4}$/, 'expected a year like "2017"')
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'expected a date like "2017-01-02"')
const nonNeg = z.number().min(0)

/** A number with its source, e.g. { value: 0.95, source: "...", estimate: true }. */
const sourced = z.object({
  value: z.number(),
  source: z.string(),
  estimate: z.boolean(),
})

/** Accepts a plain number or a sourced value, and gives back the plain number. */
const num = z
  .union([nonNeg, sourced])
  .transform((v) => (typeof v === 'number' ? v : v.value))

// ---------- market_weekly.json (generated from market_weekly.csv) ----------

export const marketWeekSchema = z.object({
  week: isoDate,
  quarter: quarterId,
  btc_usd: nonNeg,
  eth_usd: nonNeg,
  btc_difficulty_T: nonNeg,
  btc_hashrate_EHs: nonNeg,
  btc_block_subsidy: nonNeg,
  btc_fee_share: z.number().min(0).max(1),
  btc_hashprice_usd_th_day: nonNeg,
  btc_hashprice_usd_ph_day: nonNeg,
  eth_hashrate_THs: nonNeg,
  eth_blocks_day: nonNeg,
  eth_block_reward: nonNeg,
  eth_rev_usd_mh_day: nonNeg,
})
export const marketSchema = z.array(marketWeekSchema).min(1)

// ---------- machines.json ----------

const priceCurve = z.record(quarterId, nonNeg)

export const machineSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    coin: z.enum(['ETH', 'BTC']),
    available_from: quarterId,
    hashrate_mhs: sourced.optional(),
    hashrate_ths: sourced.optional(),
    power_kw: num,
    annual_failure_rate: num,
    lifespan_years: num,
    heat_per_unit_garage: nonNeg,
    price_new: priceCurve,
    price_used: priceCurve,
    retail_new_ends: quarterId.optional(),
    lead_time_quarters: z
      .record(
        z.string().regex(/^(default|\d{4}Q[1-4])$/),
        z.number().int().min(0),
      )
      .refine((r) => 'default' in r, 'needs a "default" lead time'),
  })
  .refine(
    (m) => (m.coin === 'ETH' ? m.hashrate_mhs : m.hashrate_ths) !== undefined,
    {
      message: 'ETH machines need hashrate_mhs, BTC machines need hashrate_ths',
    },
  )
  .transform((m) => ({
    ...m,
    // One hashrate number in the coin's usual unit: MH/s for ETH, TH/s for BTC.
    hashrate: (m.coin === 'ETH' ? m.hashrate_mhs : m.hashrate_ths)!.value,
  }))

export const machinesFileSchema = z.object({
  models: z.array(machineSchema).min(1),
})

// ---------- sites.json ----------

export const siteTierSchema = z
  .object({
    id: z.string(),
    capacity_kw: z.number().positive(),
    available_from: quarterId.optional(),
    power_usd_kwh: num.optional(),
    power_path: z.record(yearId, nonNeg).optional(),
    power_options: z.object({ fixed: num, index: num }).optional(),
    /** Owned sites (Texas) have no rent. */
    rent_usd_q: num.default(0),
    capex_usd: num.optional(),
    capex_per_mw_usd: num.optional(),
    land_usd: num.optional(),
    build_quarters: z.number().int().min(0),
    heat_base: nonNeg,
    possible_flaws: z.array(z.string()),
  })
  .refine((t) => t.power_path !== undefined || t.power_options !== undefined, {
    message: 'a site tier needs power_path or power_options',
  })

export const flawSchema = z.object({
  label: z.string(),
  effect: z.record(z.string(), z.number()),
  basis: z.string(),
})

export const sitesFileSchema = z.object({
  tiers: z.array(siteTierSchema).min(1),
  flaws: z.record(z.string(), flawSchema),
})

// ---------- interrupts.json ----------

export const interruptSchema = z
  .object({
    id: z.string(),
    trigger: z.string(),
    choices: z
      .array(
        z.object({
          id: z.string(),
          label: z.string(),
          effects: z.record(z.string(), z.unknown()).optional(),
        }),
      )
      .min(1)
      .optional(), // mini-games like negotiation have no choice list
    default: z.string(),
    /** Fallback choices when the default can't be paid for, e.g. "sell_machines, then default". */
    default_if_unaffordable: z.string().optional(),
    /** failure_wave: repair cost per broken unit, by machine id. */
    repair_cost_usd: z.record(z.string(), nonNeg).optional(),
  })
  .refine((i) => !i.choices || i.choices.some((c) => c.id === i.default), {
    message: 'default must be one of the choice ids',
  })

export const interruptsFileSchema = z.object({
  max_per_quarter: z.number().int().min(0),
  interrupts: z.array(interruptSchema),
})

const range = (min: number, max = Infinity) =>
  z
    .tuple([z.number().min(min).max(max), z.number().min(min).max(max)])
    .refine(([a, b]) => a <= b, 'expected [low, high]')

/** The distressed auction's structured rules (extra fields on its interrupts.json entry). */
export const auctionRulesSchema = z
  .object({
    windows: z
      .array(
        z.object({
          from: quarterId,
          to: quarterId,
          models: z.array(z.string()).min(1),
        }),
      )
      .min(1),
    chance_per_quarter: z.number().min(0).max(1),
    lot_units: range(1).refine(
      ([a, b]) => Number.isInteger(a) && Number.isInteger(b),
      'expected whole units',
    ),
    /** Lowest bid accepted, as a share of the lot's value at the used price. */
    reserve_share: range(0, 1),
    /** Each rival's sealed bid, as a share of the lot's value. */
    rival_bid_share: range(0, 2),
    rival_bidders: range(1),
    bandwidth: z.number().int().min(0),
  })
  .transform((a) => ({
    windows: a.windows,
    chancePerQuarter: a.chance_per_quarter,
    lotUnits: a.lot_units,
    reserveShare: a.reserve_share,
    rivalBidShare: a.rival_bid_share,
    rivalBidders: a.rival_bidders,
    bandwidth: a.bandwidth,
  }))

// ---------- capital.json (only what the sim uses so far) ----------

/** One rung of the funding ladder (savings → F&F → seed → Series A → IPO). */
export const ladderStepSchema = z.object({
  id: z.string(),
  amount_usd: num,
  /** Share of the company given up, 0–1. */
  dilution: z.number().min(0).max(1),
  window: z.tuple([quarterId, quarterId]),
  requires: z
    .object({
      /** A built, powered site of at least this many MW (not machines running). */
      min_mw: nonNeg.optional(),
      min_ebitda_usd_q: nonNeg.optional(),
    })
    .strict()
    .optional(),
  /** Bandwidth cost; if missing, BALANCE.capital.raiseBandwidth. */
  bandwidth: z.number().int().min(0).optional(),
})

/** Equipment loan terms for an era ("2017-2019" or "2022"), secured on machines. */
export const equipmentLoanSchema = z
  .object({
    era: z.string().regex(/^\d{4}(-\d{4})?$/, 'expected "2017-2019" or "2022"'),
    /** Loan-to-value: the most you can borrow, as a share of your machines' value. */
    ltv: num.pipe(z.number().max(1)),
    /** Yearly interest rate, e.g. 0.15. */
    apr: num,
    tenor_quarters: z.number().int().min(1),
    available_until: quarterId.optional(),
  })
  .transform(({ era, tenor_quarters, available_until, ...rest }) => {
    const [from, to = from] = era.split('-').map(Number)
    return {
      ...rest,
      fromYear: from,
      toYear: to,
      tenorQuarters: tenor_quarters,
      availableUntil: available_until,
    }
  })

/** The game's crypto-backed loan: pledge coins, borrow up to ltv_max; margin call and liquidation levels. */
export const cryptoLoanSchema = z
  .object({
    ltv_max: z.number().min(0).max(1),
    apr: z.number().min(0),
    margin_call_ltv: z.number().min(0).max(1),
    liquidation_ltv: z.number().min(0).max(1),
    cure_weeks: z.number().int().min(0),
    available: z.tuple([quarterId, quarterId]),
  })
  .transform((c) => ({
    ltvMax: c.ltv_max,
    apr: c.apr,
    marginCallLtv: c.margin_call_ltv,
    liquidationLtv: c.liquidation_ltv,
    cureWeeks: c.cure_weeks,
    available: c.available,
  }))

export const capitalFileSchema = z.object({
  ladder: z.array(ladderStepSchema).min(1),
  loans: z.object({
    equipment: z.array(equipmentLoanSchema).min(1),
    game_crypto_loan: cryptoLoanSchema,
  }),
  /** EV / EBITDA multiple per quarter, for the company valuation (review A5). */
  era_multiple_ev_ebitda: z
    .record(z.string(), z.union([nonNeg, z.string(), z.boolean()]))
    .transform((r) =>
      Object.fromEntries(
        Object.entries(r).filter(
          (e): e is [string, number] =>
            quarterId.safeParse(e[0]).success && typeof e[1] === 'number',
        ),
      ),
    ),
})

// ---------- rivals.json ----------

const quarterSeries = z.record(quarterId, nonNeg)

/** A scripted rival (review: real companies, end-of-quarter values, ≈ between verified anchors). */
export const rivalSchema = z.object({
  id: z.string(),
  name: z.string(),
  style: z.string(),
  hashrate_ehs: quarterSeries,
  mw: quarterSeries,
  btc_mined_q: quarterSeries,
  btc_held: quarterSeries,
  /** Market capitalisation in millions of dollars: the rival's value on the league table. */
  mcap_musd: quarterSeries,
  key_moves: z.record(quarterId, z.string()).default({}),
})

export const rivalsFileSchema = z.object({
  rivals: z.array(rivalSchema).min(1),
})

export type LadderStep = z.output<typeof ladderStepSchema>
export type EquipmentLoanTerms = z.output<typeof equipmentLoanSchema>
export type CryptoLoanTerms = z.output<typeof cryptoLoanSchema>
export type MarketWeek = z.output<typeof marketWeekSchema>
export type Machine = z.output<typeof machineSchema>
export type SiteTier = z.output<typeof siteTierSchema>
export type Flaw = z.output<typeof flawSchema>
export type Interrupt = z.output<typeof interruptSchema>
export type Rival = z.output<typeof rivalSchema>
export type AuctionRules = z.output<typeof auctionRulesSchema>
