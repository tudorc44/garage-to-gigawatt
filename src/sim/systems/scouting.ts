// Act II scouting (scope 0.2 §2.6; doc 18 §6; sites_act2.json): 1 Bandwidth brings 2–3 site offers
// (+1 with the BD Lead), each from a category open that quarter (distressed miner sites 2022Q4–2023,
// greenfield from 2023, energized land from 2024) in a random region; 70% carry one hidden flaw that
// shows once the site is bought (or at once, with the BD Lead). Energized land is priced as land. Buying one (BUILD_SITE with its offer)
// makes it an owned site of that size in that region: distressed and energized sites have power
// from next quarter; greenfield waits the region's grid queue. Rolls use their own streams.
import {
  BALANCE,
  CONTENT,
  quarterInputs,
  type PowerRegion,
  type MarketKey,
  POWER_REGIONS,
} from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import { chance, randomInt, substream, uniform } from '../rng.ts'
import {
  logEntry,
  type GameState,
  type Site,
  type SiteOffer,
} from '../state.ts'
import { inAct2Rules, logQuarterLabel } from '../state.ts'
import { recalcHeat } from './heat.ts'
import { extraScoutOffers } from './hires.ts'
import { scenarioOf } from './market.ts'
import { extraQueueQuarters, getRegion } from './regions.ts'
import { flawEffect } from './sites.ts'

const S = BALANCE.act2Scouting
const label = (quarter: number) => CONTENT.quarters[quarter]

/** The site categories open in a quarter. */
export function openCategories(quarter: number) {
  const q = label(quarter)
  // Act III (M11.5a, DT): every category is open; their dated windows end with Act II (2026Q4).
  const act3 = CONTENT.acts.find((a) => a.act === 3)!
  if (quarter >= act3.firstQuarter) return CONTENT.act2Sites.categories
  return CONTENT.act2Sites.categories.filter(
    (c) => c.window[0] <= q && q <= c.window[1],
  )
}

/** Why Act II scouting can't happen now, or undefined if it can. */
export function scoutAct2Blocker(state: GameState): Message | undefined {
  if (!inAct2Rules(state)) return { key: 'error.act2_only' }
  if (openCategories(state.quarter).length === 0)
    return { key: 'error.no_sites_to_scout' }
  if (state.bandwidth < S.bandwidth)
    return {
      key: 'error.no_bandwidth',
      params: { needed: S.bandwidth, have: state.bandwidth },
    }
  return undefined
}

/**
 * Scouts (assumes scoutAct2Blocker passed): new Act II offers replace the old ones. Each offer's
 * category, region, size, price, flaw and (greenfield) grid queue are drawn on this scouting's
 * own stream.
 */
export function scoutAct2(state: GameState): SiteOffer[] {
  state.bandwidth -= S.bandwidth
  const r = substream(
    state.seed,
    `scout_act2:${label(state.quarter)}:${state.nextId}`,
  )
  const open = openCategories(state.quarter)
  const n = randomInt(r, S.offers.min, S.offers.max) + extraScoutOffers(state)
  const offers: SiteOffer[] = []
  for (let i = 0; i < n; i++) {
    const cat = open[randomInt(r, 0, open.length - 1)]
    const region = POWER_REGIONS[randomInt(r, 0, POWER_REGIONS.length - 1)]
    const [lo, hi] = cat.mw_range
    const mw =
      S.mwStep *
      randomInt(r, Math.ceil(lo / S.mwStep), Math.floor(hi / S.mwStep))
    const perMw =
      cat.id === S.energizedLand.category
        ? landUsdMw(state.quarter, region, scenarioOf(state)) *
          uniform(r, 1 - S.energizedLand.spread, 1 + S.energizedLand.spread)
        : uniform(r, cat.price_usd_mw[0], cat.price_usd_mw[1])
    const flaw = chance(r, S.flawChance)
      ? cat.hidden_flaws[randomInt(r, 0, cat.hidden_flaws.length - 1)]
      : null
    offers.push({
      id: `offer-${state.nextId++}`,
      tier: S.siteTier,
      rentUsdQ: 0,
      capexUsd: Math.round(perMw * mw),
      powerPriceMult: 1,
      flaw,
      category: cat.id,
      kw: mw * 1000,
      region,
      readyQuarters:
        cat.id === S.greenfield ? greenfieldQuarters(state, region, r) : 1,
    })
  }
  state.siteOffers = [...state.siteOffers.filter((o) => !o.category), ...offers]
  logEntry(state, 'log.scouted_act2', { count: offers.length })
  return offers
}

/** Energized land's price per MW in a quarter and region, before the offer's ±15% (owner, 28 Sep 2026). */
export function landUsdMw(
  quarter: number,
  region: PowerRegion,
  scenario?: MarketKey | null,
): number {
  const L = S.energizedLand
  const years = Object.keys(L.usdMwByYear).sort()
  const year = label(quarter).slice(0, 4)
  const key = years.includes(year)
    ? year
    : year < years[0]
      ? years[0]
      : years.at(-1)!
  const base = L.usdMwByYear[key] * (L.regionMult[region] ?? 1)
  // Act III (M11.5a, DT): Act II's 2026 price (the table's last year holds) × the scenario's announced-AI
  // EV per MW this quarter ÷ its 2027Q1 value: cheap land in S1's bust, dear in S2, from authored data.
  const act3 = CONTENT.acts.find((a) => a.act === 3)!
  if (quarter >= act3.firstQuarter) {
    const now = quarterInputs(quarter, scenario)?.evPerMwUsdM.aiAnnounced
    const first = quarterInputs(act3.firstQuarter, scenario)?.evPerMwUsdM
      .aiAnnounced
    if (now && first) return base * (now / first)
  }
  return base
}

/** A greenfield site's wait for power: the region's grid queue (months ÷ 3), plus policy delays. */
function greenfieldQuarters(
  state: GameState,
  region: PowerRegion,
  r: ReturnType<typeof substream>,
): number {
  const [lo, hi] = getRegion(region).queue_months
  const months = randomInt(r, lo, hi)
  return Math.ceil(months / 3) + extraQueueQuarters(region, state.quarter)
}

/** Why this Act II offer can't be bought now, or undefined if it can. */
export function buyAct2Blocker(
  state: GameState,
  offer: SiteOffer,
): Message | undefined {
  const bw = BALANCE.bandwidth.build
  if (state.bandwidth < bw)
    return {
      key: 'error.no_bandwidth',
      params: { needed: bw, have: state.bandwidth },
    }
  if (offer.capexUsd > state.cash)
    return {
      key: 'error.no_cash',
      params: { costUsd: offer.capexUsd, cashUsd: state.cash },
    }
  return undefined
}

/**
 * Buys an Act II offer (assumes buyAct2Blocker passed): an owned site of its size in its region.
 * Its flaw shows now: delays (a voided zoning challenge waits twice), capacity, a one-off cost.
 */
export function buyAct2Site(state: GameState, offer: SiteOffer): Site {
  state.bandwidth -= BALANCE.bandwidth.build
  state.cash -= offer.capexUsd
  const site: Site = {
    id: `site-${state.nextId++}`,
    tier: offer.tier,
    readyQuarter: state.quarter + (offer.readyQuarters ?? 1),
    rentUsdQ: 0,
    powerPriceMult: offer.powerPriceMult,
    flaw: offer.flaw,
    region: offer.region,
    category: offer.category,
    kw: offer.kw,
  }
  let delay = flawEffect(site, 'delay_quarters') ?? 0
  const voided = flawEffect(site, 'chance_voided')
  if (
    voided !== undefined &&
    chance(substream(state.seed, `zoning_voided:${site.id}`), voided)
  ) {
    delay *= S.voidedDelayMult
    logEntry(state, 'log.zoning_voided', { quarters: delay })
  }
  site.readyQuarter += delay
  state.cash += flawEffect(site, 'cash') ?? 0
  state.sites.push(site)
  recalcHeat(state, site)
  state.siteOffers = state.siteOffers.filter((o) => o.id !== offer.id)
  logEntry(state, 'log.act2_site_bought', {
    category: offer.category ?? '',
    siteKw: offer.kw ?? 0,
    region: offer.region ?? '',
    costUsd: offer.capexUsd,
    quarter: logQuarterLabel(state, site.readyQuarter),
  })
  if (site.flaw) logEntry(state, 'log.site_flaw_act2', { flawAct2: site.flaw })
  return site
}
