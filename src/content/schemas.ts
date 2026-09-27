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

// ---------- market_weekly_act2.json (generated from market_weekly_act2.csv) ----------
// Act II's columns differ from Act I's: no ETH mining columns (no ETH mining after the Merge),
// plus ASIC price tiers, H100 rental prices (empty before 2023Q3, so null) and an estimate flag.

const nullableNonNeg = nonNeg.nullable()

export const marketWeekAct2Schema = z.object({
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
  asic_price_usd_th_old: nonNeg,
  asic_price_usd_th_mid: nonNeg,
  asic_price_usd_th_new: nonNeg,
  asic_price_usd_th_latest: nonNeg,
  gpu_h100_hyperscaler_usd_hr: nullableNonNeg,
  gpu_h100_neocloud_usd_hr: nullableNonNeg,
  gpu_h100_spot_usd_hr: nullableNonNeg,
  estimate: z.boolean(),
})
export const marketAct2Schema = z.array(marketWeekAct2Schema).min(1)

// ---------- market_quarterly_act2.json (generated from market_quarterly_act2.csv) ----------
// One row per Act II quarter: GPU rental and purchase prices (empty before a GPU exists, so null),
// build costs per MW, rates and spreads, cap rates, regional power prices and the AI demand index.
// It has no multiple columns: capital_act2.json is the only source for multiples (owner, B6).

const n = nonNeg
const nn = nullableNonNeg
export const marketQuarterAct2Schema = z.object({
  quarter: quarterId,
  btc_usd_close: n,
  eth_usd_close: n,
  btc_difficulty_T: n,
  btc_hashrate_EHs: n,
  btc_block_subsidy: n,
  btc_hashprice_usd_ph_day: n,
  gpu_h100_hyperscaler_usd_hr: nn,
  gpu_h100_neocloud_usd_hr: nn,
  gpu_h100_spot_usd_hr: nn,
  gpu_h100_1yr_contract_usd_hr: nn,
  gpu_a100_hyperscaler_usd_hr: nn,
  gpu_h200_hyperscaler_usd_hr: nn,
  gpu_h200_neocloud_usd_hr: nn,
  gpu_b200_hyperscaler_usd_hr: nn,
  gpu_b200_neocloud_usd_hr: nn,
  gpu_gb200nvl72_blended_usd_hr: nn,
  h100_unit_purchase_usd: nn,
  h100_hgx8_system_usd: nn,
  h200_unit_purchase_usd: nn,
  b200_unit_purchase_usd: nn,
  gb200_nvl72_rack_usd: nn,
  capex_hosting_usd_mw: n,
  capex_retrofit_shell_usd_mw: n,
  capex_greenfield_shell_usd_mw: n,
  capex_fullstack_incremental_usd_mw: n,
  sofr_pct: n,
  hy_spread_bps: n,
  ddtl_spread_bps: nn,
  cap_rate_hyperscale_pct: n,
  ev_per_mw_mining_usd_m: n,
  ev_per_mw_ai_announced_usd_m: nn,
  ev_per_mw_ai_stabilized_usd_m: nn,
  power_usd_kwh_ercot: n,
  power_usd_kwh_pjm: n,
  power_usd_kwh_ohio: n,
  power_usd_kwh_georgia: n,
  power_usd_kwh_arizona: n,
  power_usd_kwh_nordics: n,
  pjm_capacity_price_usd_mwday: n,
  hyperscaler_capex_usd_bn_q: n,
  ai_demand_index_0_100: z.number().min(0).max(100),
  estimate: z.boolean(),
})
export const marketQuarterlyAct2Schema = z.array(marketQuarterAct2Schema).min(1)
export type MarketQuarterAct2Row = z.infer<typeof marketQuarterAct2Schema>

// ---------- capital_act2.json ----------
// So far only the era multiples (doc 18 §8): anchor quarters with a value; the loader
// interpolates the quarters in between. The rest of the file is read in later steps.

/** { "2022Q4": 4, "2023Q4": 8, …, "source": "…" } → the quarter entries only. */
const quarterAnchors = z
  .record(z.string(), z.union([nonNeg, z.string(), z.boolean()]))
  .transform((r) =>
    Object.fromEntries(
      Object.entries(r).filter(
        (e): e is [string, number] =>
          quarterId.safeParse(e[0]).success && typeof e[1] === 'number',
      ),
    ),
  )

// ---------- conversions.json and tenants.json (Act II) ----------
// So far only what hosting needs (scope 0.2 §2.4): the same-site mining → hosting conversion,
// and the hosting market's all-in rate by year. The rest is read with projects (M3).

export const conversionsFileSchema = z.looseObject({
  conversions: z.array(
    z.looseObject({
      id: z.string(),
      capex_usd_mw: z.unknown().optional(),
      build_quarters: z.number().int().min(0).optional(),
    }),
  ),
})

/** One conversion's flat cost per MW ({ value, source, estimate }). */
export const flatCapexSchema = sourced

/** conversions.json › grid_upgrade: a cost per MW and a queue in quarters by (pack) region id. */
export const gridUpgradeSchema = z.looseObject({
  capex_usd_mw: sourced,
  build_quarters_by_region: z.record(
    z.string(),
    z.looseObject({
      value: z.tuple([z.number().int().min(0), z.number().int().min(0)]),
    }),
  ),
})

/** conversions.json › on_site_gas: a cost per MW, a build and the Heat it adds. */
export const onSiteGasSchema = z.looseObject({
  capex_usd_mw: sourced,
  build_quarters: z.number().int().min(0),
  heat_delta: nonNeg,
})

/** conversions.json › pilot_cluster (scope 0.2 §2.5 [P3], owner decision 27 Sep 2026). */
export const pilotClusterSchema = z.looseObject({
  mw_min: nonNeg,
  mw_max: nonNeg,
  mw_step: nonNeg,
  available_from: quarterId,
  build_quarters: z.number().int().min(0),
  gpu: z.enum(['h100', 'h200', 'b200']),
  revenue: z.looseObject({
    utilisation_base: z.number().min(0).max(1),
    utilisation_bonus_by_know_how: z.record(z.string(), nonNeg),
  }),
})

export const tenantsFileSchema = z.looseObject({
  hosting_market_2022_2024: z.object({
    rate_usd_kwh: z
      .record(z.string(), z.union([nonNeg, z.string(), z.boolean()]))
      .transform((r) =>
        Object.fromEntries(
          Object.entries(r).filter(
            (e): e is [string, number] =>
              yearId.safeParse(e[0]).success && typeof e[1] === 'number',
          ),
        ),
      ),
  }),
  /** Projects (M3): the tenant cards a shell project can sign, and the take-or-pay terms. */
  tenant_cards: z.array(
    z.looseObject({
      id: z.string(),
      type: z.enum(['hyperscaler', 'ai_lab', 'neocloud_sub_tenant', 'spot']),
      fictional_name: z.string(),
      credit_rating: z.string(),
      price_usd_mw_yr: nonNeg.optional(),
      term_years: nonNeg,
      prepayment_pct: nonNeg,
      ready_by_window_quarters: z.tuple([nonNeg, nonNeg]),
      capex_credit_cap_usd_mw: nonNeg.optional(),
      unlock: z.string().optional(),
      region_lock: z.string().optional(),
    }),
  ),
  take_or_pay_terms: z.looseObject({
    penalty_pct_of_annual_contract_per_quarter_late: sourced,
    walk_chance_late_2q: z.looseObject({
      hyperscaler: z.number().min(0).max(1),
      neocloud_sub_tenant: z.number().min(0).max(1),
      ai_lab: z.number().min(0).max(1),
    }),
  }),
})

/** A year / quarter keyed series with notes, e.g. { "2023": 7, "2026Q3": 5.25, "source": "…" }. */
const numberSeries = z
  .record(z.string(), z.unknown())
  .transform((r) =>
    Object.fromEntries(
      Object.entries(r).filter(
        (e): e is [string, number] => typeof e[1] === 'number',
      ),
    ),
  )

export const capitalAct2FileSchema = z.looseObject({
  era_multiple_ev_ebitda: z.object({
    mining: quarterAnchors,
    ai_infra: quarterAnchors,
  }),
  /** Doc 18 §7.3: cap rates (%) by year, 2026Q3, and the 2026Q4 aftershock. */
  cap_rate_pct: z.looseObject({
    hyperscale_nnn_100mw_plus: numberSeries,
    powered_shell_stabilized: numberSeries,
  }),
  /** Doc 18 §8: the share (%) of remaining take-or-pay revenue counted in the valuation. */
  backlog_weight_pct_of_remaining_revenue: z.looseObject({
    a_aa_tenant: nonNeg,
    bbb_tenant: nonNeg,
    ai_lab_tenant: nonNeg,
    spot: nonNeg,
  }),
  /** Scope 0.2 §2.10, doc 18 §2.2: the distressed lifeline card (ec03). */
  lifeline_card_final_numbers: z.looseObject({
    site_mw: nonNeg,
    price_usd: sourced,
    bridge_loan_apr_pct: nonNeg,
    bridge_loan_tenor_quarters: z.number().int().min(1),
    cash_floor_reached_usd: nonNeg,
  }),
  /** Scope 0.2 §2.10, doc 18 §2.4: the standalone preset company ("Q4 2022: a mid-size miner"). */
  standalone_preset_final_numbers: z.looseObject({
    cash_usd: nonNeg,
    equipment_debt_usd: nonNeg,
    founder_stake_pct: z.number().min(0).max(100),
  }),
})

// ---------- sites_act2.json (Act II scouting, scope 0.2 §2.6, doc 18 §6) ----------

export const sitesAct2FileSchema = z.object({
  site_categories: z.array(
    z.object({
      id: z.string(),
      window: z.tuple([quarterId, quarterId]),
      mw_range: z.tuple([nonNeg, nonNeg]),
      price_usd_mw: z.tuple([nonNeg, nonNeg]),
      source: z.string(),
      hidden_flaws: z.array(z.string()).min(1),
    }),
  ),
  flaws: z.record(
    z.string(),
    z.object({
      effect: z.record(z.string(), z.number()),
      basis: z.string(),
    }),
  ),
})

export type SiteCategory = z.output<
  typeof sitesAct2FileSchema
>['site_categories'][number]

// ---------- regions.json (Act II regions, scope 0.2 §2.6, doc 18 §6) ----------

/** A policy's game effect (doc 18 §6, §11). Empty = news only. */
const policyEffectSchema = z.object({
  /** ERCOT (SB6): it can curtail sites of min_kw and up directly, from this quarter. */
  direct_curtailment_from: quarterId.optional(),
  min_kw: nonNeg.optional(),
  /** No new grid upgrades in the region for this many quarters. */
  no_grid_upgrades_quarters: z.number().int().min(1).optional(),
  /** Added to the region's power price per kWh from the policy's quarter on. */
  power_adder_usd_kwh: nonNeg.optional(),
  /** Added to every site's Heat from the policy's quarter on. */
  heat_delta: z.number().optional(),
  /** Extra quarters on grid-upgrade queues, by region, from the policy's quarter on. */
  queue_quarters: z.record(z.string(), z.number().int().min(0)).optional(),
  /** Projects started there from the policy's quarter pay this share of full power on their MW while building (AEP Ohio). */
  project_reservation_share: z.number().min(0).max(1).optional(),
  /** Projects started there from the policy's quarter cost this much more (Arizona's paused incentives). */
  project_capex_mult: z.number().min(1).optional(),
})

const policySchema = z.object({
  id: z.string(),
  date: z.string(),
  quarter: quarterId,
  effect: policyEffectSchema,
  source: z.string(),
})

export const regionsFileSchema = z.object({
  regions: z.array(
    z.object({
      id: z.string(),
      pack_id: z.string(),
      queue_months: z.tuple([nonNeg, nonNeg]),
      heat_modifier: nonNeg,
      anger_modifier: nonNeg,
      policies: z.array(policySchema),
    }),
  ),
  national: z.array(policySchema),
})

export type RegionPolicy = z.output<typeof policySchema>
export type RegionRaw = z.output<typeof regionsFileSchema>['regions'][number]

// ---------- lenders.json (Act II capital, doc 18 §7) ----------

const pctRange = z
  .tuple([nonNeg, nonNeg])
  .refine(([a, b]) => a <= b, 'expected [low, high]')
const ratingCells = z.object({
  weak_backlog: z.string(),
  mixed_backlog: z.string(),
  strong_backlog: z.string(),
})
const instrument = z.looseObject

export const lendersFileSchema = z.looseObject({
  instruments: z.tuple([
    instrument({
      id: z.literal('project_debt'),
      available_from: quarterId,
      ltv_max_pct: z.looseObject({ value: pctRange }),
      rate_pct: quarterAnchors,
    }),
    instrument({
      id: z.literal('gpu_backed_ddtl'),
      available_from: quarterId,
    }),
    instrument({
      id: z.literal('equity_atm'),
      dilution_pct: z.looseObject({ value: pctRange }),
    }),
    instrument({
      id: z.literal('jv_partner'),
      available_from: quarterId,
      funds_pct_of_equity: pctRange,
      takes_pct_of_project: pctRange,
    }),
    instrument({
      id: z.literal('backstop'),
      available_from: quarterId,
      takes_pct_equity: pctRange,
    }),
  ]),
  credit_rating_mapping: z.looseObject({
    matrix: z.object({
      debt_to_ebitda_lt_2x: ratingCells,
      debt_to_ebitda_2_4x: ratingCells,
      debt_to_ebitda_4_6x: ratingCells,
      debt_to_ebitda_gt_6x: ratingCells,
    }),
    corporate_rating_range: z.looseObject({ min: z.string(), max: z.string() }),
    runway_notch: z.looseObject({
      cash_runway_quarters_below: nonNeg,
      notches: z.number().int(),
    }),
  }),
})

// ---------- gpus.json and interrupts_act2.json ----------

export const gpusFileSchema = z.looseObject({
  generations: z.array(
    z.looseObject({
      id: z.string(),
      /** "2022Q4 (shipping began …)": the loader reads the leading quarter. */
      available_from: z.string().regex(/^\d{4}Q[1-4]/),
      in_alpha_0_2: z.boolean(),
      gpus_per_mw_it_load: sourced.optional(),
    }),
  ),
})

export const interruptsAct2FileSchema = z.looseObject({
  new_interrupts: z.array(z.looseObject({ id: z.string() })),
  updated_interrupts: z.array(z.looseObject({ id: z.string() })),
})

/** interrupts_act2.json › spot_price_shock: the random chance after the scripted one. */
export const spotShockSchema = z.looseObject({ chance_pct_random: nonNeg })

/** interrupts_act2.json › curtailment_ai_sites: an AI site's SLA credit when it curtails. */
export const curtailmentAiSchema = z.looseObject({
  sla_penalty_pct_mrc: z.looseObject({ value: nonNeg }),
})

/** interrupts_act2.json › construction_delay (scope §2.9 [P5]). */
export const constructionDelaySchema = z.looseObject({
  chance_pct: sourced,
  choices: z.array(
    z.looseObject({
      id: z.string(),
      cost_pct_of_capex: nonNeg.optional(),
      bandwidth_next_quarter: z.number().optional(),
      no_slip_chance: z.number().min(0).max(1).optional(),
    }),
  ),
  default: z.string(),
})

/** interrupts_act2.json › gpu_allocation (scope §2.9). */
export const gpuAllocationSchema = z.looseObject({
  chance_pct: nonNeg,
})
export type MarketWeekAct1 = z.infer<typeof marketWeekSchema>
export type MarketWeekAct2 = z.infer<typeof marketWeekAct2Schema>

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
    /**
     * Act II prices (owner decision B7): the market file's $/TH tier × the machine's TH/s; used =
     * new × the used/new ratio of `used_ratio_from` (a model and an Act I quarter with both prices).
     */
    act2_price: z
      .object({
        tier: z.enum(['old', 'mid', 'new', 'latest']),
        used_ratio_from: z.object({ model: z.string(), quarter: quarterId }),
      })
      .optional(),
    /** Act II: the first quarter you can buy it used (before that, new only). */
    act2_used_from: quarterId.optional(),
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
  /** The 2020Q4–2022Q1 GPU shortage: GPU rigs bought per quarter are capped (kW), used ones cost at least new. */
  gpu_cap: z.object({
    window: z.tuple([quarterId, quarterId]),
    kw_per_quarter: nonNeg,
    used_price_min_new_mult: nonNeg,
  }),
  models: z.array(machineSchema).min(1),
})

// ---------- sites.json ----------

/** One power contract type at a tier (Texas: fixed or index). */
const powerOptionSchema = z.object({
  price: num,
  /** Index contracts: each quarter the paid price is the base × U(range). */
  quarterly_range: z.tuple([nonNeg, nonNeg]).optional(),
  /** Multiplier on grid curtailment credits ("curtailment rights"). */
  curtail_credit_mult: nonNeg,
})

export const siteTierSchema = z
  .object({
    id: z.string(),
    capacity_kw: z.number().positive(),
    available_from: quarterId.optional(),
    power_usd_kwh: num.optional(),
    power_path: z.record(yearId, nonNeg).optional(),
    /** Texas: a fixed or an index power contract (the price is the normal price for that type). */
    power_options: z
      .object({ fixed: powerOptionSchema, index: powerOptionSchema })
      .optional(),
    /** Owned sites (Texas) have no rent. */
    rent_usd_q: num.default(0),
    capex_usd: num.optional(),
    capex_per_mw_usd: num.optional(),
    land_usd: num.optional(),
    build_quarters: z.number().int().min(0),
    /** Texas: built in phases of `kw`, each cost_share of the full cost (design thread). */
    phases: z
      .object({
        count: z.number().int().min(1),
        kw: z.number().positive(),
        cost_share: z.number().min(0).max(1),
        build_quarters: z.number().int().min(0),
        from: quarterId,
        requires_round: z.string(),
      })
      .optional(),
    heat_base: nonNeg,
    /** Heat added by a full site of running machines (0 for the garage, which counts units instead). */
    heat_load_max: nonNeg,
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

/** Grid curtailment's structured rules (extra fields on its interrupts.json entry, review A8). */
export const curtailmentRulesSchema = z
  .object({
    site_tier: z.string(),
    quarter_of_year: z.number().int().min(1).max(4),
    chance_per_quarter: z.number().min(0).max(1),
    credit_usd_per_mw: nonNeg,
    forgone_revenue_mult: nonNeg,
    alert_after_week: range(1, 12).refine(
      ([a, b]) => Number.isInteger(a) && Number.isInteger(b),
      'expected whole weeks',
    ),
  })
  .transform((c) => ({
    siteTier: c.site_tier,
    quarterOfYear: c.quarter_of_year,
    chancePerQuarter: c.chance_per_quarter,
    creditUsdPerMw: c.credit_usd_per_mw,
    forgoneRevenueMult: c.forgone_revenue_mult,
    alertAfterWeek: c.alert_after_week,
  }))

/** Power contract renewals: interrupts.json › negotiation's structured fields (design thread). */
export const negotiationRulesSchema = z
  .object({
    rounds: z.number().int().min(1),
    walkaway_chance_per_lowball: z.number().min(0).max(1),
    opening_mult: z.number().min(1),
    limit_range: z.tuple([nonNeg, nonNeg]),
    lowball_margin: z.number().min(0).max(1),
    terms: z.tuple([z.number().int().min(1), z.number().int().min(1)]),
    long_term_limit_mult: z.number().min(1),
    hire_shift: z.number().min(0).max(1),
    bw_cost: z.number().int().min(0),
  })
  .transform((n) => ({
    rounds: n.rounds,
    walkawayChance: n.walkaway_chance_per_lowball,
    openingMult: n.opening_mult,
    limitRange: n.limit_range,
    lowballMargin: n.lowball_margin,
    /** [short, long]; the short term is also the first contract's and a walk-away's. */
    terms: n.terms,
    longTermLimitMult: n.long_term_limit_mult,
    hireShift: n.hire_shift,
    bandwidth: n.bw_cost,
  }))

export type NegotiationRules = z.output<typeof negotiationRulesSchema>

// ---------- capital.json (only what the sim uses so far) ----------

/** One rung of the funding ladder (savings → F&F → seed → Series A → IPO). */
export const ladderStepSchema = z.object({
  id: z.string(),
  amount_usd: num,
  /** Share of the company given up, 0–1. */
  dilution: z.number().min(0).max(1),
  /** Valuation before the money comes in; pitched rounds negotiate it (capital.json › pitch). */
  pre_money_usd: nonNeg.optional(),
  window: z.tuple([quarterId, quarterId]),
  requires: z
    .object({
      /** A built, powered site of at least this many MW (not machines running). */
      min_mw: nonNeg.optional(),
      /** At least this many MW powered across all your sites together. */
      min_total_mw: nonNeg.optional(),
      min_ebitda_usd_q: nonNeg.optional(),
      /** At least this many quarters with machines earning, at any site (seed; owner, 28 Sep 2026). */
      min_quarters_operated: z.number().int().min(1).optional(),
    })
    .strict()
    .optional(),
  /** Bandwidth cost; if missing, BALANCE.capital.raiseBandwidth. */
  bandwidth: z.number().int().min(0).optional(),
})

/** Investor pitches: capital.json › pitch (design thread, 26 Sep 2026). */
export const pitchRulesSchema = z
  .object({
    applies_to: z.array(z.string()),
    bw_cost: z.number().int().min(0),
    rounds: z.number().int().min(1),
    limit_range: z.tuple([nonNeg, nonNeg]),
    below_opening_behavior: z.literal('hold_at_opening'),
    lowball_margin: z.number().min(0).max(1),
    walkaway_chance_per_lowball: z.number().min(0).max(1),
    walkaway_penalty: z.number().min(0).max(1),
    walkaway_penalty_max: z.number().min(0).max(1),
    lockout_quarters: z.number().int().min(0),
    player_walkout_penalized: z.boolean(),
    warn_if_lockout_exceeds_window: z.boolean(),
    hire_shift: z.number().min(0).max(1),
    /** The hire (hires.json id) whose presence applies hire_shift. */
    hire_shift_source: z.string(),
  })
  .transform((p) => ({
    rounds: p.rounds,
    /** Ladder ids you can pitch; the other rounds stay fixed offers. */
    appliesTo: p.applies_to,
    bandwidth: p.bw_cost,
    limitRange: p.limit_range,
    lowballMargin: p.lowball_margin,
    walkawayChance: p.walkaway_chance_per_lowball,
    walkawayPenalty: p.walkaway_penalty,
    walkawayPenaltyMax: p.walkaway_penalty_max,
    lockoutQuarters: p.lockout_quarters,
    playerWalkoutPenalized: p.player_walkout_penalized,
    warnIfLockoutExceedsWindow: p.warn_if_lockout_exceeds_window,
    hireShift: p.hire_shift,
    hireShiftSource: p.hire_shift_source,
  }))

export type PitchRules = z.output<typeof pitchRulesSchema>

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

/** The Texas construction loan: a share (ltc) of a site's build cost, financed when you build it. */
export const constructionLoanSchema = z
  .object({
    tier: z.string(),
    from: quarterId,
    /** Loan-to-cost: the most it finances, as a share of the build cost. */
    ltc: z.number().min(0).max(1),
    apr: z.number().min(0),
    tenor_quarters: z.number().int().min(1),
    requires_round: z.string(),
    requires_contract: z.boolean(),
  })
  .transform((c) => ({
    tier: c.tier,
    from: c.from,
    ltc: c.ltc,
    apr: c.apr,
    tenorQuarters: c.tenor_quarters,
    requiresRound: c.requires_round,
    requiresContract: c.requires_contract,
  }))

export type ConstructionLoanTerms = z.output<typeof constructionLoanSchema>

export const capitalFileSchema = z.object({
  ladder: z.array(ladderStepSchema).min(1),
  pitch: pitchRulesSchema,
  loans: z.object({
    construction: constructionLoanSchema,
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

/** An Act II rival (rivals_act2.json, the game copy of the pack's file; M6.2). Series by quarter. */
export const rivalAct2Schema = z.object({
  id: z.string(),
  name: z.string(),
  style: z.string(),
  mw_energized: quarterSeries,
  mw_ai_contracted: quarterSeries,
  mw_mining: quarterSeries,
  hashrate_ehs: quarterSeries,
  /** Value in millions of dollars (market cap; a private valuation before an IPO). */
  mcap_usd_m: quarterSeries,
  debt_usd_m: quarterSeries,
  /** Quarters with a key move (its text: en.json › rival_move.<id>.<quarter>). */
  moves: z.array(quarterId),
})

export const rivalsAct2FileSchema = z.object({
  rivals: z.array(rivalAct2Schema).min(1),
})
export type RivalAct2 = z.output<typeof rivalAct2Schema>

export type LadderStep = z.output<typeof ladderStepSchema>
export type EquipmentLoanTerms = z.output<typeof equipmentLoanSchema>
export type CryptoLoanTerms = z.output<typeof cryptoLoanSchema>
/** Columns only one act's market file has. In the other act's weeks they are null ("no value"). */
type ActOnlyMarketColumns = {
  eth_hashrate_THs: number | null
  eth_blocks_day: number | null
  eth_block_reward: number | null
  asic_price_usd_th_old: number | null
  asic_price_usd_th_mid: number | null
  asic_price_usd_th_new: number | null
  asic_price_usd_th_latest: number | null
  gpu_h100_hyperscaler_usd_hr: number | null
  gpu_h100_neocloud_usd_hr: number | null
  gpu_h100_spot_usd_hr: number | null
  /** Act II's estimate flag; Act I's file has none (null). */
  estimate: boolean | null
}

/**
 * One week of the market as the sim sees it, in either act. Act II weeks have
 * eth_rev_usd_mh_day = 0: there is no ETH mining after the Merge.
 */
export type MarketWeek = Omit<MarketWeekAct1, keyof ActOnlyMarketColumns> &
  ActOnlyMarketColumns
export type Machine = z.output<typeof machineSchema>
export type SiteTier = z.output<typeof siteTierSchema>
export type Flaw = z.output<typeof flawSchema>
export type Interrupt = z.output<typeof interruptSchema>
export type Rival = z.output<typeof rivalSchema>
export type AuctionRules = z.output<typeof auctionRulesSchema>
export type CurtailmentRules = z.output<typeof curtailmentRulesSchema>

// ---------- heat.json ----------

const moneyRule = z.object({
  bw: z.number().int().min(0),
  per_mw: nonNeg,
  min: nonNeg,
  max: nonNeg,
})

/** Community Heat rules: growth, decay, outreach, mitigation and the threshold effects. */
export const heatFileSchema = z
  .object({
    grievance_decay: nonNeg,
    grievance_min: z.number().max(0),
    ignore_complaint: nonNeg,
    keep_mining: nonNeg,
    era_pressure: z.object({ from: quarterId, min_mw: nonNeg, value: nonNeg }),
    outreach: moneyRule.extend({ grievance: z.number().max(0) }),
    mitigation: moneyRule.extend({
      heat_base: z.number().max(0),
      once: z.boolean(),
    }),
    rate_hike: z.object({ at: nonNeg, power_mult: z.number().min(1) }),
    moratorium_at: nonNeg,
    shutdown: z.object({
      at: nonNeg,
      until_below: nonNeg,
      min_quarters: z.number().int().min(0),
    }),
    complaint_at: nonNeg,
    complaint_chance_offset: nonNeg,
    complaints_per_quarter: z.number().int().min(0),
  })
  .transform((h) => ({
    grievanceDecay: h.grievance_decay,
    grievanceMin: h.grievance_min,
    ignoreComplaint: h.ignore_complaint,
    keepMining: h.keep_mining,
    era: {
      from: h.era_pressure.from,
      minMw: h.era_pressure.min_mw,
      value: h.era_pressure.value,
    },
    outreach: {
      bandwidth: h.outreach.bw,
      perMwUsd: h.outreach.per_mw,
      minUsd: h.outreach.min,
      maxUsd: h.outreach.max,
      grievance: h.outreach.grievance,
    },
    mitigation: {
      bandwidth: h.mitigation.bw,
      perMwUsd: h.mitigation.per_mw,
      minUsd: h.mitigation.min,
      maxUsd: h.mitigation.max,
      heatBase: h.mitigation.heat_base,
      once: h.mitigation.once,
    },
    rateHike: { at: h.rate_hike.at, powerMult: h.rate_hike.power_mult },
    moratoriumAt: h.moratorium_at,
    shutdown: {
      at: h.shutdown.at,
      untilBelow: h.shutdown.until_below,
      minQuarters: h.shutdown.min_quarters,
    },
    complaintAt: h.complaint_at,
    complaintChanceOffset: h.complaint_chance_offset,
    complaintsPerQuarter: h.complaints_per_quarter,
  }))

export type HeatRules = z.output<typeof heatFileSchema>

// ---------- hires.json ----------

/** One hire: a named person, a yearly salary (2017 and 2021 anchors) and effects by key. */
export const hireSchema = z.object({
  id: z.string(),
  name: z.string(),
  bio: z.string(),
  salary_usd_year: z.object({ '2017': nonNeg, '2021': nonNeg }),
  effect: z.record(z.string(), z.union([z.number(), z.boolean()])),
})

export const hiresFileSchema = z
  .object({
    hires: z.array(hireSchema).min(1),
    /** Salaries in 2022 = the 2021 value × this (wage inflation). */
    salary_2022_mult: z.number().min(1),
    global: z.object({
      bw_cost: z.number().int().min(0),
      rehire_same_quarter: z.boolean(),
      severance_quarters: nonNeg,
      hire_cash_quarters: nonNeg,
    }),
  })
  .transform((f) => ({
    list: f.hires,
    salary2022Mult: f.salary_2022_mult,
    bandwidth: f.global.bw_cost,
    rehireSameQuarter: f.global.rehire_same_quarter,
    severanceQuarters: f.global.severance_quarters,
    hireCashQuarters: f.global.hire_cash_quarters,
  }))

/** hires_act2.json (scope 0.2 §2.8): Act II salaries by quarter anchor, and the new hires. */
export const hiresAct2FileSchema = z.looseObject({
  hires: z.array(
    z.looseObject({
      id: z.string(),
      in_alpha_0_2: z.boolean(),
      label: z.string(),
      salary_usd_yr: z.record(
        z.string(),
        z.union([z.number(), z.string(), z.boolean()]),
      ),
    }),
  ),
})

export type Hire = z.output<typeof hireSchema>
export type HiresRules = z.output<typeof hiresFileSchema>

// ---------- events.json ----------

/** Effect keys the event engine implements (src/sim/systems/events.ts). */
export const EVENT_EFFECTS = [
  'cash',
  'buy_machine',
  'lock_new_gpus_quarters',
  'sell_treasury_pct',
  'plan_new_price_mult',
  'plan_used_discount',
  'open_buy',
  'guarantee_auction',
  'mothball',
  'sell_machines_pct',
  'flag',
  'sell_model',
  'ipo_bandwidth',
  'rent_racks',
  'repay_crypto_from_collateral',
  'margin_stress',
  'grievance',
  'hashrate_mult',
  'failure_mult',
  'fire_rebuild',
  'cash_rent_quarters',
  'rent_zero',
  'tariff_pay_pct',
  'tariff_delay_quarters',
  'lawyer',
  'lose_machines',
  'scam',
  'rate_class',
  'bandwidth_next',
  'run_hot',
  'chillers',
  'stake_points',
  'tax',
  'tax_plan',
  // Act II (events_act2.json, M5.8)
  'credit_notch',
  'cash_revenue_share',
  'valuation_mult',
  'region_power_mult',
  'region_grievance',
  'all_sites_grievance',
  'plan_gpu_price_mult',
  'delay_marginal_project',
  'delay_building_projects',
  'spot_price_mult',
  'lock_spot',
  'take_backstop',
  'take_jv',
  'ebitda_mult',
  'gpu_repair',
  'gpu_degraded',
  'debt_spread_add',
  'ai_lab_revenue_mult',
  'ai_lab_walk_chance',
  'extra_tenant_offers',
  // M6.0g: ec21's moratorium in the card's region
  'region_moratorium',
] as const
/** Named conditions (events.ts): a card's requires/trigger, a choice's requires, the card's site. */
export const EVENT_CONDITIONS = [
  'owns_s9',
  'ipo_eligible',
  'not_ipo_eligible',
  'spare_mw',
  'has_crypto_loan',
  'machines_30',
  'landlord_site',
  'bought_new_asics',
  'heat_70',
  'theft_site',
  'bought_used',
  'rate_class_due',
  'q3_big_site',
  'ff_winter',
  'tax_quarter',
  // Act II (events_act2.json, M5.8)
  'first_ai_deal',
  'site_pjm',
  'site_pjm_ohio_georgia',
  'backstop_eligible',
  'jv_eligible',
  'big_cluster',
  'ai_lab_tenant',
  'building_project',
  'has_treasury',
  'spot_cluster',
  'gpu_cluster',
  'mining',
  'always',
  // M6.0g–h
  'anger_high',
  'site_pjm_ohio',
] as const
export const EVENT_SITES = [
  'most_machines',
  'landlord_site',
  'moratorium_site',
  'theft_site',
  'rate_class_site',
  'pjm_site',
  'anger_site',
] as const

const eventChoiceSchema = z.object({
  id: z.string(),
  requires: z.enum(EVENT_CONDITIONS).optional(),
  effects: z
    .record(z.string(), z.unknown())
    .refine(
      (e) =>
        Object.keys(e).every((k) =>
          (EVENT_EFFECTS as readonly string[]).includes(k),
        ),
      {
        message: `effects must use the known keys: ${EVENT_EFFECTS.join(', ')}`,
      },
    ),
})

const eventBase = {
  id: z.string(),
  requires: z.enum(EVENT_CONDITIONS).optional(),
  site: z.enum(EVENT_SITES).optional(),
  /** When this condition fails, the card shows its news text (body_news) instead of body. */
  news_unless: z.enum(EVENT_CONDITIONS).optional(),
  default: z.string(),
  choices: z.array(eventChoiceSchema).min(1),
}

export const eventSchema = z
  .discriminatedUnion('type', [
    z.object({
      ...eventBase,
      type: z.literal('scripted'),
      quarter: quarterId,
      week_of: z.string(),
    }),
    z.object({
      ...eventBase,
      type: z.literal('random'),
      trigger: z.enum(EVENT_CONDITIONS),
      weight: nonNeg,
      /** Fires when its condition is first met, taking that quarter's random slot. */
      bypass_random_roll: z.boolean().optional(),
      /** If the 3 interrupts are used up, it comes in week 1 of next quarter instead. */
      defer_if_cap_full: z.boolean().optional(),
      /** Only in these quarters (the tax_quarter trigger). */
      quarters: z.array(quarterId).optional(),
      /** Only from the first to the last of these quarters. */
      window: z.tuple([quarterId, quarterId]).optional(),
      /** The theft_site condition: a site needs at least this many units. */
      min_units: z.number().int().min(1).optional(),
      /** The card's weight is multiplied by this when its site is the garage. */
      garage_weight_mult: nonNeg.optional(),
      /** Act II: the weight scales with the AI demand index (index ÷ 50). */
      weight_by_ai_demand: z.boolean().optional(),
    }),
  ])
  .refine((e) => e.choices.some((c) => c.id === e.default), {
    message: 'default must be one of the choice ids',
  })

export const eventsFileSchema = z.object({
  engine: z.object({
    random_chance_per_quarter: z.number().min(0).max(1),
    random_start: quarterId,
    random_week_range: z.tuple([
      z.number().int().min(1),
      z.number().int().max(13),
    ]),
    random_max_per_quarter: z.literal(1),
    random_once_per_game: z.literal(true),
    random_counts_toward_cap: z.literal(true),
    scripted_counts_toward_cap: z.literal(false),
    rng_stream: z.string(),
  }),
  market_phases: z.object({
    boom: z.array(quarterId),
    winter: z.array(quarterId),
  }),
  events: z.array(eventSchema).min(1),
})

/**
 * events_act2.json (the game's Act II deck, M5.8): the same card format as events.json, its own
 * random-card engine settings, and the scripted timeline's market effects (they apply whatever
 * anyone chooses).
 */
export const eventsAct2FileSchema = z.looseObject({
  engine: z.object({
    random_chance_per_quarter: z.number().min(0).max(1),
    random_start: quarterId,
    random_week_range: z.tuple([
      z.number().int().min(1),
      z.number().int().max(13),
    ]),
  }),
  market_effects: z.array(
    z.object({
      id: z.string(),
      from: quarterId,
      quarters: z.number().int().min(1),
      ai_multiple_delta: z.number().optional(),
      ai_demand_delta: z.number().optional(),
      credit_notch: z.number().int().optional(),
      no_new_debt: z.boolean().optional(),
      source: z.string(),
    }),
  ),
  events: z.array(eventSchema).min(1),
})

export type MarketEffect = z.output<
  typeof eventsAct2FileSchema
>['market_effects'][number]
export type EventCardRaw = z.output<typeof eventSchema>
export type EventChoice = z.output<typeof eventChoiceSchema>

// ---------- merge.json ----------

/** The Merge decision (end of Act I) and the chapter score. */
export const mergeFileSchema = z
  .object({
    choices: z
      .array(
        z.object({
          id: z.string(),
          text: z.string(),
          act2_preview: z.string(),
          /** What the choice is about: a note shows when you have none ("gpus" or "sites"). */
          applies_if: z.enum(['gpus', 'sites']),
        }),
      )
      .length(4),
    /** The choice sim bots make. */
    bot_default: z.string(),
    score: z.object({
      title_bands: z.array(z.object({ min: nonNeg, title: z.string() })).min(1),
      bust_title: z.string(),
    }),
  })
  .refine((m) => m.choices.some((c) => c.id === m.bot_default), {
    message: 'bot_default must be one of the choice ids',
  })
  .transform((m) => ({
    choices: m.choices.map((c) => ({
      id: c.id,
      text: c.text,
      act2Preview: c.act2_preview,
      appliesIf: c.applies_if,
    })),
    botDefault: m.bot_default,
    /** Highest min first, so the first band at or under your net worth is your title. */
    titleBands: [...m.score.title_bands].sort((a, b) => b.min - a.min),
    bustTitle: m.score.bust_title,
  }))

export type MergeRules = z.output<typeof mergeFileSchema>

/** The failure wave: interrupts.json › failure_wave (design thread F1–F4). */
export const failureWaveRulesSchema = z
  .object({
    week_range: z.tuple([z.number().int().min(1), z.number().int().max(13)]),
    min_working_units: z.number().int().min(1),
    base_chance: z.number().min(0).max(1),
    used_share_bonus: nonNeg,
    heat_wave_run_hot_mult: nonNeg,
    ops_manager_mult: nonNeg,
    wave_size_range: z.tuple([
      z.number().min(0).max(1),
      z.number().min(0).max(1),
    ]),
    choices: z.array(
      z.object({
        id: z.enum(['repair_now', 'run_degraded']),
        effects: z.object({ cost_mult: nonNeg.optional() }).passthrough(),
      }),
    ),
  })
  .transform((f) => ({
    weekRange: f.week_range,
    minWorkingUnits: f.min_working_units,
    baseChance: f.base_chance,
    usedShareBonus: f.used_share_bonus,
    runHotMult: f.heat_wave_run_hot_mult,
    opsManagerMult: f.ops_manager_mult,
    sizeRange: f.wave_size_range,
    rushCostMult:
      f.choices.find((c) => c.id === 'repair_now')?.effects.cost_mult ?? 1,
  }))

export type FailureWaveRules = z.output<typeof failureWaveRulesSchema>

/** Read the market: interrupts.json › read_market (design thread). */
export const readMarketSchema = z
  .object({
    bw_cost: z.number().int().min(0),
    bw_cost_with_trader: z.number().int().min(0),
    accuracy: z.number().min(0).max(1),
    up_threshold: z.number().min(0),
    down_threshold: z.number().max(0),
    error_mode: z.literal('adjacent_only'),
    assets: z.array(z.enum(['BTC', 'ETH'])).min(1),
    once_per_quarter: z.literal(true),
  })
  .transform((r) => ({
    bandwidth: r.bw_cost,
    bandwidthWithTrader: r.bw_cost_with_trader,
    accuracy: r.accuracy,
    upThreshold: r.up_threshold,
    downThreshold: r.down_threshold,
    assets: r.assets,
  }))

export type ReadMarketRules = z.output<typeof readMarketSchema>

// ---------- shocks.json ----------

/**
 * Market shocks on fixed dates (Uri): index contracts that keep mining pay storm_price_per_kwh on
 * their contracted (firm) load for `weeks` weeks; curtailing protects them.
 */
export const shocksFileSchema = z.object({
  shocks: z.array(
    z.object({
      id: z.string(),
      quarter: quarterId,
      week_of: isoDate,
      weeks: z.number().int().min(1),
      affects: z.literal('index'),
      storm_price_per_kwh: nonNeg,
      billing: z.literal('firm_load'),
      firm_load_includes: z.array(z.enum(['working', 'broken'])),
      firm_load_excludes: z.array(z.literal('undelivered')),
      curtail_protects: z.literal(true),
      keep_mining_grievance: nonNeg,
      interrupt_cap_exempt: z.literal(true),
      default_choice: z.literal('curtail'),
    }),
  ),
})

// ---------- the prologue (Alpha 0.3): machines_prologue.json, prologue.json ----------

export const machinesPrologueFileSchema = z.object({
  models: z.array(machineSchema).min(1),
})

const yearValues = z.record(z.string().regex(/^\d{4}$/), nonNeg)
const designedValue = z.object({ value: nonNeg }).passthrough()

export const prologueFileSchema = z.object({
  start: z.object({
    cash_usd: nonNeg,
    income_usd_q: nonNeg,
    site_tier: z.string(),
    machines: z.array(z.string()),
    bandwidth: z.number().int().min(1),
    bandwidth_after_move_out: z.number().int().min(0),
  }),
  site_tiers: z.array(
    z.object({
      id: z.string(),
      capacity_kw: nonNeg,
      household_threshold_kw: nonNeg,
      capex_usd: nonNeg,
      unlock: z.string(),
    }),
  ),
  act1_tiers: z.record(
    z.string(),
    z.object({ unlock: z.string(), from: quarterId.optional() }),
  ),
  household: z.object({
    patience_start: nonNeg,
    drain_per_quarter: designedValue,
    at_zero_default: z.enum(['cut_load', 'move_out']),
    patience_after_cut: nonNeg,
  }),
  bandwidth_costs: z.object({ build: nonNeg, sell: nonNeg }),
  move_out: z.object({
    deposit_usd_by_year: yearValues,
    rent_usd_q_by_year: yearValues,
  }),
  conferences: z.array(
    z.object({ id: z.string(), quarter: quarterId, cost_usd: nonNeg }),
  ),
  conference_effect: z.object({
    preorder_on_time_pp: nonNeg,
    used_offer_discount: nonNeg,
  }),
  vanity: z.array(z.object({ id: z.string(), cost_usd: nonNeg })),
  pools: z.object({
    from: quarterId,
    fee_by_year: z.record(z.string(), z.number().min(0).max(1)),
  }),
  blocks_per_week: z.number().positive(),
  exchange: z.object({
    gox_hack: z.object({
      quarter: quarterId,
      week_of: isoDate,
      no_selling_weeks: z.number().int().min(0),
      household_patience: z.number(),
    }),
    gox_collapse: z.object({
      quarter: quarterId,
      week_of: isoDate,
      loss_share: z.number().min(0).max(1),
      withdraw_success: z.number().min(0).max(1),
      withdraw_saves_share: z.number().min(0).max(1),
    }),
    bitfinex: z.object({
      quarter: quarterId,
      week_of: isoDate,
      chance: designedValue,
      loss_share: z.number().min(0).max(1),
    }),
    named_until: quarterId,
  }),
  wallet_loss: z.object({
    chance_per_quarter: designedValue,
    backup_mult: z.number().min(0).max(1),
    backup_bandwidth: z.number().int().min(0),
    backup_cash_usd: nonNeg,
    pc_class: z.array(z.string()),
  }),
  sell_caps_usd_week: z.object({
    by_year: yearValues,
    impact: z.number().min(0).max(1),
  }),
  preorders: z.object({
    vendors: z.array(
      z.object({
        id: z.string(),
        window: z.tuple([quarterId, quarterId]),
        model: z.string(),
        price_usd: nonNeg,
        unit_share: z.number().positive().max(1),
        promised_quarters: z.number().int().min(0),
        odds: z.object({
          on_time: nonNeg,
          moderate: nonNeg,
          severe: nonNeg,
          never: nonNeg,
        }),
        moderate_quarters: z.tuple([z.number().int(), z.number().int()]),
        severe_quarters: z.tuple([z.number().int(), z.number().int()]),
        refund_share: z.number().min(0).max(1),
      }),
    ),
  }),
  decision_quarters: z.array(quarterId),
  offers: z.array(
    z.object({
      id: z.string(),
      quarter: quarterId,
      btc: z.number().positive(),
      usd: nonNeg,
    }),
  ),
  not_for_sale: z.array(z.string()),
  handover: z.object({
    model_map: z.record(z.string(), z.string()),
    home_tiers_to: z.string(),
  }),
})
export type PrologueRules = z.output<typeof prologueFileSchema>
