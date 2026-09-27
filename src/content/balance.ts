// Balance constants that don't live in the content pack's JSON files.
// Tweak numbers here, not in sim code.

export const BALANCE = {
  startCash: 10_000,
  startSite: 'garage',
  weeksPerQuarter: 13,

  bandwidth: {
    perQuarter: 3,
    max: 6,
    /** +1 Bandwidth once this site tier is energized (scope §2.2). */
    bonusSiteTier: 'own_site',
    scout: 1,
    build: 1,
    /** Taking an equipment loan (scope §2.6). Repaying costs none. */
    loan: 1,
    /** Selling treasury coins from the Plan screen (owner's addition, beyond scope §2.6). */
    sellTreasury: 1,
  },

  failures: {
    /** Used machines fail this much more often than new ones (weekly roll in mining.ts). */
    usedMult: 1.5,
  },

  cryptoLoan: {
    /** Log a warning the week LTV first reaches this (interrupts.json margin_call trigger: "warning at 0.65"). */
    warningLtv: 0.65,
  },

  priceAlert: {
    /** interrupts.json price_alert trigger: a weekly BTC or ETH move of at least this size. */
    threshold: 0.15,
  },

  capital: {
    /** Bandwidth a raise costs when capital.json doesn't say (scope §2.6: pitch investors = 2). */
    raiseBandwidth: 2,
    /** Rounds the game can play (fixed offers until the negotiation mini-game exists). */
    openRounds: [
      'friends_family',
      'seed',
      'series_a',
      'ipo_spac',
    ] as readonly string[],
  },

  /** Hosting (Act II, scope 0.2 §2.4). Its cost and rates are in conversions.json and tenants.json. */
  hosting: {
    /** Contract term in quarters (scope 0.2 §2.4: "4-quarter contracts"); it renews at the then-current rate. */
    termQuarters: 4,
    /** Ending a contract mid-term costs this many quarters of fees (doc 18 §2.3). */
    earlyEndFeeQuarters: 1,
    /** Converting MW to hosting (scope 0.2 §2.6: building or upgrading a site costs 1). */
    bandwidth: 1,
    /**
     * Client defaults in winter (owner decision A1): rolled per live contract as a winter quarter
     * starts. A default loses that quarter's fees, ends the contract and leaves its MW idle; they
     * can be re-let with no conversion cost.
     */
    defaults: {
      /** Quarter numbers that count as winter (Q4 and Q1). */
      winterQuarters: [4, 1] as readonly number[],
      /** The FTX / Core Scientific winter. */
      chanceByQuarter: { '2022Q4': 0.15, '2023Q1': 0.15 } as Readonly<
        Record<string, number>
      >,
      /** Every later winter quarter. */
      chance: 0.05,
    },
  },

  /**
   * Act II regions for Act I sites (owner decision B3). Each tier has a fixed region; the garage
   * has none and keeps its household path. Tiers listed in premiumTiers pay a small-load premium
   * over the region: their 2022 power path minus the region's first Act II price, held constant.
   */
  act2Regions: {
    byTier: {
      small_unit: 'georgia',
      warehouse: 'georgia',
      own_site: 'georgia',
      texas_site: 'ercot',
    } as Readonly<Record<string, string>>,
    premiumTiers: ['small_unit', 'warehouse'] as readonly string[],
  },

  /**
   * Act II capital (scope 0.2 §2.2, §2.7; doc 18 §7). lenders.json holds the ranges and paths; these
   * are the rules the game adds to pick inside them. "(mine)" marks the M4 build's reversible choices.
   */
  finance: {
    /** Lowest to highest. Corporate ratings run CCC− to BBB (lenders.json); "A" is project debt only. */
    ratingScale: [
      'CCC-',
      'CCC',
      'CCC+',
      'B-',
      'B',
      'B+',
      'BB-',
      'BB',
      'BB+',
      'BBB-',
      'BBB',
      'A',
    ] as const,
    /** Project debt needs a signed tenant rated at least this (scope §2.7), and a DSCR ≥ 1.12× (lenders.json). */
    projectDebtMinRating: 'BBB',
    dscrMin: 1.12,
    /**
     * GPU-backed DDTL: 50–70% of GPU cost (doc 18 §7.1): an investment-grade tenant gets the top, any
     * other the bottom (mine). Spread: lenders.json's trend to 2025Q4; from 2026Q1 doc 18 §7.1 splits
     * it by tenant credit: IG SOFR+225; non-IG 450 (Q2–Q3) and 475 (Q4), 2026Q1 holding 2025Q4's 420 (mine).
     */
    ddtl: {
      advance: { ig: 0.7, other: 0.5 },
      spread2026Bps: {
        ig: 225,
        other: {
          '2026Q1': 420,
          '2026Q2': 450,
          '2026Q3': 450,
          '2026Q4': 475,
        } as Record<string, number>,
      },
    },
    /** Big-tech backstop from 2025Q3 (scope §2.7; lenders.json says 2025Q1, the scope wins). */
    backstopFrom: '2025Q3',
    /** It guarantees this share of the lease (tenants.json › Fluidline; doc 18 §7.1: ~47%). */
    backstopLeaseShare: 0.47,
    /** A backstopped tenant's backlog weight (owner, M3 answers: between its own tier and A). */
    backstopBacklogWeight: 0.1,
    /** Warrants worth this × the guaranteed dollars (lenders.json: 0.3–0.5×; mine: the middle), within 3–6%. */
    backstopWarrantValueShare: 0.4,
    /** Bandwidth: an equity raise 2 (scope §2.7); a JV or backstop deal 2 (mine, like negotiating). */
    bandwidth: { equity: 2, jv: 2, backstop: 2 },
    /** Foreclosure: this many quarters in a row of missed debt service on a project (scope §2.7). */
    foreclosureMissedQuarters: 2,
    /**
     * The Act II equipment loan (owner decision on the M4 questions): the only corporate debt. Its rate
     * (SOFR + spread) and max LTV come from the company's rating when it's taken: the first band whose
     * `from` the rating reaches (BBB band incl. BBB−, then BB, B, CCC). 8-quarter tenor, as in Act I.
     */
    equipmentLoan: {
      tenorQuarters: 8,
      bands: [
        { from: 'BBB-', spread: 0.025, ltv: 0.6 },
        { from: 'BB-', spread: 0.04, ltv: 0.5 },
        { from: 'B-', spread: 0.06, ltv: 0.4 },
        { from: 'CCC-', spread: 0.09, ltv: 0.25 },
      ],
    },
  },

  /**
   * The Merge head starts (scope 0.2 §2.10; doc 18 §2.3; merge_headstarts.json), applied at the act
   * boundary. hold_and_wait has no rule of its own: the GPUs stay, switched off (nothing earns ETH).
   * The shell-ready discount (hosting) is conversions.json › hosting_to_ai_shell.
   */
  headStarts: {
    /** sell_gpus_keep_btc: lean ops, mining power × 0.9 for 4 quarters from 2022Q4. */
    leanOps: { powerMult: 0.9, quarters: 4 },
    /** sell_gpus_keep_btc's handicap: the first AI project builds 1 quarter longer. */
    firstProjectExtraQuarters: 1,
    /**
     * gpu_cloud: the GPU rigs become an RTX-class legacy cloud at $0.15/GPU-hr × 40% utilisation
     * (merge_headstarts.json), 6 GPUs to a rig (machines.json real_basis). GPU know-how 1, the first
     * tenant cards from 2023Q1 (others 2023Q3), and the first cluster builds 1 quarter faster.
     */
    legacyCloud: { usdPerGpuHr: 0.15, utilisation: 0.4, gpusPerRig: 6 },
    gpuCloudKnowHow: 1,
    gpuCloudTenantsFrom: '2023Q1',
    firstClusterQuarters: -1,
    /**
     * hosting: the GPU halls host third-party ASICs at $0.075/kWh for their first 4-quarter term
     * (merge_headstarts.json), converted at conversions.json › gpu_hall_to_hosting's 2022Q4 cost,
     * live in 2022Q4 (the Merge quarter was the build; mine). Garage rigs are sold (no hosting there).
     */
    hostingRateUsdKwh: 0.075,
  },

  /**
   * Act II hires (scope 0.2 §2.8; hires_act2.json): the Act I hires at Act II salaries, and two new
   * ones. hires_act2.json names the Ex-Utility Exec ex_utility_exec. The new hires' effects (the file
   * says them in words): the Head of Development +1 Bandwidth (from the quarter after hiring, like
   * the Chief of Staff; mine); the Capital Markets Lead cuts the spread on new equipment loans and
   * DDTLs by 0.75 point (the middle of the owner's 0.5–1.0; mine).
   */
  act2Hires: {
    idMap: { ex_utility_exec: 'ex_utility' } as Readonly<
      Record<string, string>
    >,
    effects: {
      head_of_development: { bandwidth: 1 },
      capital_markets_lead: { spread_cut: 0.0075 },
    } as Readonly<Record<string, Record<string, number>>>,
  },

  /**
   * Act II event cards (events_act2.json, M5.8): the GPU failure wave hits clusters of 10,000 GPUs
   * and up (interrupts_act2.json › gpu_failure_wave's trigger); the JV card offers the middle of the
   * JV share range (50–80%; mine).
   */
  act2Events: {
    bigClusterGpus: 10_000,
    jvShare: 0.65,
  },

  /**
   * Act II spot-market alerts (scope 0.2 §2.9; M5.9). The random spot price shock (its chance is in
   * interrupts_act2.json) comes after the scripted one (card ec15, 2025Q2): from 2025Q3, in a random
   * week, and cuts spot prices like the card (× 0.7). The GPU spot alert fires on a weekly H100 spot
   * move as big as the coin price alert's. Both only with a live cluster on spot; "lock" fixes its
   * GPU-hours at a price for 4 quarters (the shocked price, or today's neocloud price for the alert).
   */
  act2Spot: {
    shockFrom: '2025Q3',
    shockMult: 0.7,
    lockQuarters: 4,
    weeks: [2, 12] as readonly [number, number],
  },

  /** Crypto-backed loans come back in Act II from this quarter (scope 0.2 §2.7: FTX closed them 2022Q4–2023Q2). */
  act2CryptoLoansFrom: '2023Q3',

  /**
   * Act II Bandwidth (scope 0.2 §2.2): base 3; +1 at 50 MW energized, +1 more at 200 MW; +1 each from
   * the Chief of Staff and the Head of Development; at most 8. (It replaces Act I's +1 for the own site.)
   */
  act2Bandwidth: {
    base: 3,
    mwSteps: [50_000, 200_000] as readonly number[],
    max: 8,
  },

  /**
   * The standalone preset, "Q4 2022: a mid-size miner" (scope 0.2 §2.10; doc 18 §2.4; the numbers in
   * capital_act2.json): 40 MW across 2 sites, a 20 MW own site and one 20 MW Texas phase on fixed
   * power, S19-class machines filling 70% of each site (used S19 Pros; mine), F&F, seed and Series A
   * taken, no IPO. The equipment debt is one loan at the last Act I era's terms. The company plays
   * 2022Q3 (so it has a quarter report), then its cash and debt are set to the preset's.
   */
  preset: {
    sites: [
      { tier: 'own_site', phases: 0 },
      { tier: 'texas_site', phases: 1 },
    ],
    fleet: { model: 's19pro', condition: 'used', shareOfCapacity: 0.7 },
    raisesDone: ['friends_family', 'seed', 'series_a'] as readonly string[],
  },

  /**
   * The distressed lifeline (scope 0.2 §2.10, doc 18 §2.2): below 20 MW energized or $5M cash at the
   * act boundary (the cash floor is in capital_act2.json), Act II opens with a bankrupt miner's 20 MW
   * site, bought with a bridge loan. The site is an owned 20 MW site in ERCOT (the Core Scientific /
   * Compute North / Helios pattern; mine), energized from 2022Q4. The bridge pays interest weekly and
   * its principal at the end of its term (a bullet, as bridges are; mine, reversible).
   */
  lifeline: {
    floorKw: 20_000,
    siteTier: 'own_site',
    region: 'ercot',
  },

  /**
   * Power reservation on idle and under-construction MW (Act II, owner decision A2): each quarter,
   * share × the full-load power cost at the site's current power price (MW × 2,190 h × $/kWh × 1,000).
   */
  powerReservation: {
    share: 0.25,
    hoursPerQuarter: 2190,
  },

  /**
   * Act II projects (scope 0.2 §2.5, doc 18 §4–5). Tenant cards, build costs, GPUs, cap rates,
   * backlog weights and the delay rule live in the Act II content files; these are the scope's
   * and the design doc's own numbers.
   */
  projects: {
    /** Scope §2.5: open 1, accept a tenant 0 (negotiate 2 comes later), start the build 1, sell 2. */
    bandwidth: { open: 1, accept: 0, start: 1, sell: 2 },
    /** Tenant offers from this quarter (doc 18 §2.3: "others 2023Q3"; the gpu_cloud head start comes later). */
    tenantsFrom: '2023Q3',
    /** Offers per shell project (like scouting, 2–3; +1 with the BD Lead, scope §2.8). */
    offers: { min: 2, max: 3 },
    /** AI shell lease: the host's costs are 15–20% of rent (doc 18 §4: an 80–85% margin); the tenant pays its power. */
    shellOpexShare: 0.175,
    /** AI cloud: power at a liquid-cooled AI hall's PUE (hires_act2.json operating_costs_ai_sites: 1.15). */
    cloudPue: 1.15,
    /** AI cloud: insurance a year on the GPUs' cost (hires_act2.json: 0.3–0.6% of replacement value). */
    cloudInsuranceShareYr: 0.0045,
    /** GPU know-how 0 (doc 18 §5.4): full stack costs +10%, and waiting for GPUs takes a quarter more. */
    knowHowZero: { costMult: 1.1, extraWaitQuarters: 1 },
    /** GPU know-how 3 at this many MW of live full stack (doc 18 §5.4). */
    knowHowThreeKw: 100_000,
    /** GPU allocation (scope §2.9; interrupts_act2.json gpu_allocation): 2023–24, pay 8% of capex or wait. */
    gpuAllocation: {
      from: '2023Q1',
      to: '2024Q4',
      premiumShareOfCapex: 0.08,
      waitQuarters: 1,
      week: 1,
    },
    /** Construction delays roll in a random week in this range (like the failure wave). */
    delayWeeks: [2, 12] as readonly [number, number],
    /** Scope §2.2: the mining multiple +2 from the quarter the first AI deal is signed. */
    pivotPremium: 2,
    /** Doc 18 §7.3: projects this big sell at the hyperscale NNN cap rate, smaller at the powered-shell rate. */
    hyperscaleKw: 100_000,
    /**
     * GPU contracts for AI clouds (owner decisions on the M3 questions). The cards that offer them
     * and their profile (the overflow card only at know-how 3, via its card; its profile is the
     * neocloud one: mine, reversible). Term in years and the ready-by buffer (quarters after the
     * planned go-live) are drawn per offer. Price = the quarter's H100 1-year contract $/GPU-hr ×
     * the term factor; H200 × h200Mult; B200 prices off its own neocloud series (the file has no
     * B200 contract column: mine, reversible).
     */
    gpuContracts: {
      cards: {
        tc_meridian_labs: 'ai_lab',
        tc_frontier_intelligence: 'ai_lab',
        tc_fluidline_backstopped: 'neocloud',
        tc_realname_coreweave_style: 'neocloud',
        tc_enterprise_render: 'enterprise',
        tc_hyperscaler_overflow: 'neocloud',
      } as Record<string, 'ai_lab' | 'neocloud' | 'enterprise'>,
      profiles: {
        ai_lab: { termYears: [1, 2], bufferQuarters: [0, 1] },
        neocloud: { termYears: [1, 3], bufferQuarters: [1, 1] },
        enterprise: { termYears: [2, 3], bufferQuarters: [1, 2] },
      } as Record<
        string,
        {
          termYears: readonly [number, number]
          bufferQuarters: readonly [number, number]
        }
      >,
      termFactor: { 1: 1, 2: 0.85, 3: 0.7 } as Record<number, number>,
      h200Mult: 1.2,
    },
    /**
     * GPU resale (owner decision on the M3 questions): a GPU is worth its purchase price × (1 −
     * declinePerYear × years since delivery), never below `floor` (an H100 of 2023 ≈ 55% by 2026;
     * the pack's range is 35–65%). Selling a live cloud's or pilot's GPUs costs `sellBandwidth`.
     */
    gpuResidual: { declinePerYear: 0.15, floor: 0.35, sellBandwidth: 1 },
    /** A live AI hall's kW count this share of mining's toward a site's Heat load (liquid-cooled halls are quieter; owner). */
    aiHeatShare: 0.5,
    /**
     * The deal builder's projected return (A2-05, a display only): a cloud or pilot is projected
     * over this many years of running plus its GPUs' residual value then (owner decision on the M3
     * questions); a shell over its tenant's term.
     */
    cloudProjectionYears: 5,
  },

  /**
   * Act II scouting (scope 0.2 §2.6; sites_act2.json): 1 Bandwidth for 2–3 offers (+1 with the BD
   * Lead), each from a category open that quarter, in a random region, of a size in its MW range (10
   * MW steps), priced per MW in its range, with one hidden flaw (mine: every offer has one, as in
   * Act I). A bought site is an owned site (tier own_site) of that size. Distressed and energized
   * sites have power from next quarter; greenfield waits the region's grid queue (months ÷ 3).
   */
  act2Scouting: {
    bandwidth: 1,
    offers: { min: 2, max: 3 },
    mwStep: 10,
    siteTier: 'own_site',
    greenfield: 'greenfield_new_site',
    /** A zoning challenge that is voided (its chance_voided) waits its delay a second time (mine). */
    voidedDelayMult: 2,
  },

  sites: {
    /** Tiers you can build straight away, without scouting first (scope §2.5: "Cash"). */
    noScoutingNeeded: ['small_unit'],
    scoutOffers: { min: 2, max: 3 },
    /** Each scouted offer's rent, capex and power price vary by up to ±15% around the tier's value. */
    offerSpread: 0.15,
    /** The power contract type a tier with power_options starts on (Texas: fixed). */
    defaultPowerOption: 'fixed' as 'fixed' | 'index',
    /** Leaving a site early (breaking the lease) costs this many months of its rent. No Bandwidth. */
    leaseBreakMonths: 1,
  },
} as const
