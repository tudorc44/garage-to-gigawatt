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
  },

  failures: {
    /** Used machines fail this much more often than new ones (weekly roll in mining.ts). */
    usedMult: 1.5,
  },

  priceAlert: {
    /** interrupts.json price_alert trigger: a weekly BTC or ETH move of at least this size. */
    threshold: 0.15,
  },

  capital: {
    /** Bandwidth a raise costs when capital.json doesn't say (scope §2.6: pitch investors = 2). */
    raiseBandwidth: 2,
    /** Rounds the game can play so far (fixed offers, no negotiation). Series A and later: not built yet. */
    openRounds: ['friends_family', 'seed'] as readonly string[],
  },

  sites: {
    /** Tiers you can build straight away, without scouting first (scope §2.5: "Cash"). */
    noScoutingNeeded: ['small_unit'],
    scoutOffers: { min: 2, max: 3 },
    /** Each scouted offer's rent, capex and power price vary by up to ±15% around the tier's value. */
    offerSpread: 0.15,
    /** Which power option a tier with power_options uses until negotiation exists. */
    defaultPowerOption: 'fixed' as 'fixed' | 'index',
    /** Leaving a site early (breaking the lease) costs this many months of its rent. No Bandwidth. */
    leaseBreakMonths: 1,
  },
} as const
