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
    /** A live AI hall's kW count this share of mining's toward a site's Heat load (liquid-cooled halls are quieter; owner). */
    aiHeatShare: 0.5,
    /**
     * The deal builder's projected return (A2-05, a display only): a cloud or pilot is projected
     * over this many years of running with no GPU resale value; a shell over its tenant's term.
     * (mine, reversible: the content has no GPU life.)
     */
    cloudProjectionYears: 5,
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
