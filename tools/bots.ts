// Scripted strategies for the sim-runner. A bot looks at the Plan-phase state and
// returns actions, exactly like a player would, so it can't break any game rule.
import { BALANCE, CONTENT } from '../src/content/index.ts'
import { applyAction, type Action } from '../src/sim/actions.ts'
import type { Strategy } from '../src/sim/replay.ts'
import type { Condition, GameState } from '../src/sim/state.ts'
import { renewalDue } from '../src/sim/systems/contracts.ts'
import { maxCryptoLoanUsd } from '../src/sim/systems/cryptoLoan.ts'
import {
  outreachCostUsd,
  siteHeatValue,
  underMoratorium,
} from '../src/sim/systems/heat.ts'
import { collateralUsd, maxEquipmentLoanUsd } from '../src/sim/systems/loans.ts'
import { repairCostPerUnit, saleValueUsd } from '../src/sim/systems/machines.ts'
import { buyPriceNow } from '../src/sim/systems/eventEffects.ts'
import { canPitch } from '../src/sim/systems/pitch.ts'
import {
  getModel,
  marketWeek,
  revenuePerUnitDay,
} from '../src/sim/systems/market.ts'
import {
  normalPriceUsdKwh,
  baseCapexUsd,
  capacityKw,
  isReady,
  powerPriceUsdKwh,
  topTierIndex,
  usedKw,
} from '../src/sim/systems/sites.ts'

/** Price-alert answer on a drop: sell 25% of the coin that fell, if the treasury holds any. */
function sellDropped(s: GameState): string {
  const coin = s.interrupt!.coin
  return s.treasury[coin] > 0 ? `sell_${coin.toLowerCase()}` : 'hold'
}

interface BotSettings {
  /** Share of mined coins to keep (0–1), set in the first quarter. */
  hodlPct: number
  /** Cash the bot won't spend, given its current cash. */
  reserveUsd: (cash: number) => number
  /** Only buy machines that pay back within this many quarters at today's prices. */
  maxPaybackQuarters: number
  /** Price-alert answer: sell on drops, or always hold. */
  sellOnDrops: boolean
  /** Funding rounds to take as soon as each is allowed, in this order. */
  raises?: string[]
  /** Borrow the maximum equipment loan whenever it has none. */
  borrow?: boolean
  /** Borrow the maximum crypto-backed loan (against its bigger coin holding) whenever it has none. */
  cryptoBorrow?: boolean
  /** Bid this share of the lot's list value in distressed auctions (at least the minimum bid). */
  auctionBidShare?: number
  /** Talk to the neighbours at every site at or above this Heat (1 Bandwidth each, if it can). */
  outreachAt?: number
  /**
   * Negotiate every power contract renewal (2 Bandwidth) instead of taking the opening:
   * counter at these shares of the normal price, round by round, then take the last offer.
   */
  negotiateAt?: number[]
  /**
   * Pitch the rounds that can be pitched (2 Bandwidth) instead of taking the offer: counter at
   * these multiples of the investor's opening valuation, round by round, then take its last offer.
   * After a walk-away it pitches again when the round reopens.
   */
  pitchAt?: number[]
  /** Borrow at most this share of the machines' value (below the lender's own LTV). */
  maxLtv?: number
  /**
   * The highest site tier it climbs to (default: the top of the ladder). With `afterRound`, it
   * climbs past `tier` only once that funding round is done.
   */
  climbLimit?: { tier: string; afterRound?: string }
  /** From this quarter on: no more machines, no repairs, no new sites. */
  stopFrom?: string
  /**
   * Pick machines by profit per kW instead of payback per dollar whenever the cash can fill
   * the site's free space with them ("S19-class" machines once the money is there).
   */
  smartFill?: boolean
  /** Scout the next tier as soon as the top site is full, before it can pay to build (scouting is free). */
  scoutAhead?: boolean
  /**
   * Replace old machines: sell a lot when the best machine on sale makes at least this many
   * times its profit per kW (or the lot is losing money), if the swap is affordable.
   */
  upgradeAt?: number
}

function makeBot(settings: BotSettings): Strategy {
  return {
    plan(s: GameState): Action[] {
      const actions: Action[] = []
      let cash = s.cash
      let bandwidth = s.bandwidth
      // 0. Take funding rounds when allowed (checked by dry-running the action).
      let reserveBase = s.cash
      const raisedNow: string[] = []
      for (const round of settings.raises ?? []) {
        if (settings.pitchAt && canPitch(round)) {
          // The pitch is deterministic: play it out on a copy, then commit the same moves.
          const start: Action = { type: 'PITCH_START', round }
          const r0 = applyAction(s, start)
          if (!r0.ok || bandwidth < CONTENT.pitch.bandwidth) continue
          let sim = r0.state
          actions.push(start)
          bandwidth -= CONTENT.pitch.bandwidth
          const opening = sim.pitch!.openingUsd
          const moves: Action[] = settings.pitchAt.map((m) => ({
            type: 'PITCH_COUNTER',
            preMoneyUsd: opening * m,
          }))
          moves.push({ type: 'PITCH_ACCEPT' })
          for (const a of moves) {
            if (!sim.pitch) break
            if (a.type === 'PITCH_COUNTER' && sim.pitch.final) continue
            const r = applyAction(sim, a)
            if (!r.ok) break
            sim = r.state
            actions.push(a)
          }
          cash += sim.cash - s.cash
          reserveBase += sim.cash - s.cash
          if (sim.raisesDone.includes(round)) raisedNow.push(round)
          continue
        }
        const a: Action = { type: 'RAISE', round }
        const r = applyAction(s, a)
        if (r.ok && bandwidth >= s.bandwidth - r.state.bandwidth) {
          actions.push(a)
          raisedNow.push(round)
          cash += r.state.cash - s.cash
          reserveBase += r.state.cash - s.cash
          bandwidth -= s.bandwidth - r.state.bandwidth
        }
      }
      // 0b. Borrow the most lenders allow against the machines it owns.
      if (settings.borrow && !s.equipmentLoan && bandwidth >= 1) {
        const amountUsd = Math.min(
          maxEquipmentLoanUsd(s),
          Math.floor((settings.maxLtv ?? 1) * collateralUsd(s)),
        )
        const a: Action = { type: 'TAKE_LOAN', amountUsd }
        if (amountUsd >= 1 && applyAction(s, a).ok) {
          actions.push(a)
          cash += amountUsd
          reserveBase += amountUsd
          bandwidth -= 1
        }
      }
      // 0c. Borrow against the treasury: the coin that supports the bigger loan.
      if (settings.cryptoBorrow && !s.cryptoLoan && bandwidth >= 1) {
        const coin =
          maxCryptoLoanUsd(s, 'BTC') >= maxCryptoLoanUsd(s, 'ETH')
            ? 'BTC'
            : 'ETH'
        const amountUsd = maxCryptoLoanUsd(s, coin)
        const a: Action = { type: 'TAKE_CRYPTO_LOAN', coin, amountUsd }
        if (amountUsd >= 1 && applyAction(s, a).ok) {
          actions.push(a)
          cash += amountUsd
          reserveBase += amountUsd
          bandwidth -= 1
        }
      }
      // 0c2. Negotiate due power contract renewals. The negotiation is deterministic, so the
      // bot plays it out on a copy to see the utility's answers before committing the moves.
      if (settings.negotiateAt) {
        let sim = s
        for (const site of s.sites) {
          if (bandwidth < CONTENT.negotiation.bandwidth) break
          if (!renewalDue(sim, site)) continue
          const type = site.contract!.type
          const moves: Action[] = [
            {
              type: 'NEGOTIATE_START',
              siteId: site.id,
              contractType: type,
              term: CONTENT.negotiation.terms[0],
            },
          ]
          const normal = normalPriceUsdKwh(site, s.quarter, type)
          for (const share of settings.negotiateAt)
            moves.push({
              type: 'NEGOTIATE_COUNTER',
              priceUsdKwh: normal * share,
            })
          moves.push({ type: 'NEGOTIATE_ACCEPT' })
          for (const a of moves) {
            if (a.type !== 'NEGOTIATE_START' && !sim.negotiation) break
            if (a.type === 'NEGOTIATE_COUNTER' && sim.negotiation?.final)
              continue
            const r = applyAction(sim, a)
            if (!r.ok) break
            sim = r.state
            actions.push(a)
          }
          bandwidth -= CONTENT.negotiation.bandwidth
        }
      }
      // 0d. Talk to the neighbours where Heat is high (dry-run checks cash, Bandwidth, once a quarter).
      if (settings.outreachAt !== undefined) {
        for (const site of s.sites) {
          if (bandwidth < 1) break
          if (siteHeatValue(s, site.id) < settings.outreachAt) continue
          const a: Action = { type: 'OUTREACH', siteId: site.id }
          if (!applyAction(s, a).ok) continue
          actions.push(a)
          cash -= outreachCostUsd(site)
          bandwidth -= 1
        }
      }
      const spendable = () => cash - settings.reserveUsd(reserveBase)
      const stopped =
        settings.stopFrom !== undefined &&
        CONTENT.quarters[s.quarter] >= settings.stopFrom

      if (s.quarter === 0) {
        actions.push({ type: 'SET_HODL', pct: settings.hodlPct })
      }

      if (stopped) return actions

      // 1. Repair broken machines.
      for (const lot of s.machines) {
        const cost = lot.failed * repairCostPerUnit(lot.model)
        if (lot.failed > 0 && cost <= spendable()) {
          actions.push({ type: 'REPAIR_MACHINES', lotId: lot.id })
          cash -= cost
        }
      }

      // 2. Climb the site ladder once the current top site is running and full-ish.
      const top = topTierIndex(s)
      const topSite = s.sites.find(
        (x) => CONTENT.siteTiers.findIndex((t) => t.id === x.tier) === top,
      )!
      const next = CONTENT.siteTiers[top + 1]
      const topIsFull =
        isReady(topSite, s.quarter) &&
        usedKw(s, topSite.id) >= capacityKw(topSite) * 0.8
      const limit = settings.climbLimit
      const capped =
        next &&
        limit &&
        top >= CONTENT.siteTiers.findIndex((t) => t.id === limit.tier) &&
        !(
          limit.afterRound &&
          (s.raisesDone.includes(limit.afterRound) ||
            raisedNow.includes(limit.afterRound))
        )
      const available =
        next &&
        !(
          next.available_from &&
          CONTENT.quarters[s.quarter] < next.available_from
        )
      const nextOpen = available && !capped
      if (
        settings.scoutAhead &&
        next &&
        available &&
        topIsFull &&
        bandwidth >= 1 &&
        !(BALANCE.sites.noScoutingNeeded as readonly string[]).includes(
          next.id,
        ) &&
        !s.siteOffers.some((o) => o.tier === next.id) &&
        (capped || baseCapexUsd(next) * 0.85 > spendable())
      ) {
        actions.push({ type: 'SCOUT_SITES', tier: next.id })
        bandwidth -= 1
      } else if (next && nextOpen && topIsFull && bandwidth >= 1) {
        const direct = (
          BALANCE.sites.noScoutingNeeded as readonly string[]
        ).includes(next.id)
        const offers = s.siteOffers
          .filter((o) => o.tier === next.id)
          .sort((a, b) => a.capexUsd - b.capexUsd)
        if (direct && baseCapexUsd(next) <= spendable()) {
          actions.push({ type: 'BUILD_SITE', tier: next.id })
          cash -= baseCapexUsd(next)
          bandwidth -= 1
        } else if (!direct && offers[0] && offers[0].capexUsd <= spendable()) {
          actions.push({ type: 'BUILD_SITE', offerId: offers[0].id })
          cash -= offers[0].capexUsd
          bandwidth -= 1
        } else if (
          !direct &&
          offers.length === 0 &&
          baseCapexUsd(next) * 0.85 <= spendable()
        ) {
          actions.push({ type: 'SCOUT_SITES', tier: next.id })
          bandwidth -= 1
        }
      }

      // 1b. Bid on a distressed lot: at the cheapest-power site with room, if cash allows.
      // `after` is the state once the bid is settled, so the buying below sees the space it took.
      let after = s
      if (settings.auctionBidShare && s.auction && bandwidth >= 2) {
        const a = s.auction
        const bidUsd = Math.max(
          a.reserveUsd,
          Math.round(a.count * a.unitListUsd * settings.auctionBidShare),
        )
        const site = s.sites
          .filter(
            (x) =>
              capacityKw(x) - usedKw(s, x.id) >=
              getModel(a.model)!.power_kw * a.count,
          )
          .sort(
            (x, y) =>
              powerPriceUsdKwh(x, s.quarter) - powerPriceUsdKwh(y, s.quarter),
          )[0]
        if (site && bidUsd <= spendable()) {
          const bid: Action = { type: 'BID_AUCTION', bidUsd, siteId: site.id }
          const r = applyAction(s, bid)
          if (r.ok) {
            actions.push(bid)
            cash += r.state.cash - s.cash
            after = r.state
          }
        }
      }

      // 3. Fill free space with the best machine per dollar, cheapest power first.
      const w = marketWeek(s.quarter, 0)
      const ready = s.sites
        .filter((x) => isReady(x, s.quarter) && !underMoratorium(s, x.id))
        .sort(
          (a, b) =>
            powerPriceUsdKwh(a, s.quarter) - powerPriceUsdKwh(b, s.quarter),
        )
      const freedKw: Record<string, number> = {}
      for (const site of ready) {
        const power = powerPriceUsdKwh(site, s.quarter)
        const options = CONTENT.machines.flatMap((m) =>
          (['new', 'used'] as Condition[]).map((condition) => {
            const price = buyPriceNow(s, m, condition)
            const dailyProfit =
              revenuePerUnitDay(m, w) - m.power_kw * 24 * power
            const payback = price ? price / (dailyProfit * 91) : Infinity
            return { m, condition, price, dailyProfit, payback }
          }),
        )
        const viable = options.filter(
          (o) =>
            o.price !== undefined &&
            o.dailyProfit > 0 &&
            o.payback <= settings.maxPaybackQuarters,
        )
        let best = [...viable].sort((a, b) => a.payback - b.payback)[0]
        if (!best) continue
        // With cash to spare, power is the scarce thing: take the most profit per kW.
        if (settings.smartFill) {
          const perKw = [...viable].sort(
            (a, b) =>
              b.dailyProfit / b.m.power_kw - a.dailyProfit / a.m.power_kw ||
              a.payback - b.payback,
          )[0]
          const fits = Math.floor(
            (capacityKw(site) - usedKw(after, site.id)) / perKw.m.power_kw,
          )
          if (spendable() >= perKw.price! * Math.max(1, fits)) best = perKw
        }
        // 3b. Upgrade: sell old lots here that make far less per kW than the best machine.
        if (settings.upgradeAt) {
          const perKw = (m: typeof best.m) =>
            (revenuePerUnitDay(m, w) - m.power_kw * 24 * power) / m.power_kw
          const bestPerKw = best.dailyProfit / best.m.power_kw
          for (const lot of s.machines) {
            if (lot.siteId !== site.id || lot.model === best.m.id) continue
            const m = getModel(lot.model)!
            const own = perKw(m)
            if (own > 0 && own * settings.upgradeAt > bestPerKw) continue
            // Sell as many units as the cash (plus their sale value) can replace.
            const unitSale = saleValueUsd(lot, 1, s.quarter)
            const netPerUnit =
              (m.power_kw / best.m.power_kw) * best.price! - unitSale
            const k =
              netPerUnit <= 0
                ? lot.count
                : Math.min(lot.count, Math.floor(spendable() / netPerUnit))
            if (k < 1) continue
            actions.push({ type: 'SELL_MACHINES', lotId: lot.id, count: k })
            cash += saleValueUsd(lot, k, s.quarter)
            freedKw[site.id] = (freedKw[site.id] ?? 0) + m.power_kw * k
          }
        }
        const count = Math.min(
          Math.floor(
            (capacityKw(site) -
              usedKw(after, site.id) +
              (freedKw[site.id] ?? 0)) /
              best.m.power_kw,
          ),
          Math.floor(spendable() / best.price!),
        )
        if (count < 1) continue
        actions.push({
          type: 'BUY_MACHINES',
          model: best.m.id,
          condition: best.condition,
          count,
          siteId: site.id,
        })
        cash -= best.price! * count
      }
      return actions
    },
    // Without sellOnDrops, alerts get the game's default answer (as ff-climb always has).
    // Margin calls always get the default (post collateral, or its fallbacks).
    answer: settings.sellOnDrops
      ? (s) =>
          s.interrupt!.id !== 'price_alert'
            ? undefined
            : s.interrupt!.changePct < 0
              ? sellDropped(s)
              : 'hold'
      : undefined,
  }
}

/** The good path's rounds (no IPO) and its top site (the 20 MW own site; design thread A1). */
const GOOD_PATH_RAISES = ['friends_family', 'seed', 'series_a']
const GOOD_PATH_TOP = { tier: 'own_site' }

export const BOTS: Record<string, Strategy> = {
  /** Keeps half its cash, only buys machines that pay back within 3 quarters, holds 20%. */
  cautious: makeBot({
    hodlPct: 0.2,
    reserveUsd: (cash) => Math.max(5_000, cash * 0.5),
    maxPaybackQuarters: 3,
    sellOnDrops: true,
  }),
  /** Spends every dollar on machines and sites whenever they make money; sells all coins. */
  reinvest: makeBot({
    hodlPct: 0,
    reserveUsd: () => 0,
    maxPaybackQuarters: Infinity,
    sellOnDrops: false,
  }),
  /**
   * The "good player" path (scope §5): reinvest, plus F&F, seed and Series A as soon as each is
   * allowed; climbs the ladder up to one 20 MW own site. No IPO, no Texas.
   */
  'raise-climb': makeBot({
    hodlPct: 0,
    reserveUsd: () => 0,
    maxPaybackQuarters: Infinity,
    sellOnDrops: false,
    raises: GOOD_PATH_RAISES,
    climbLimit: GOOD_PATH_TOP,
  }),
  /** raise-climb that talks to the neighbours at any site with Heat 50 or more. */
  'raise-outreach': makeBot({
    hodlPct: 0,
    reserveUsd: () => 0,
    maxPaybackQuarters: Infinity,
    sellOnDrops: false,
    raises: GOOD_PATH_RAISES,
    climbLimit: GOOD_PATH_TOP,
    outreachAt: 50,
  }),
  /** raise-climb that negotiates every power renewal: counters at 92%, 97%, 102% of normal. */
  'raise-negotiate': makeBot({
    hodlPct: 0,
    reserveUsd: () => 0,
    maxPaybackQuarters: Infinity,
    sellOnDrops: false,
    raises: GOOD_PATH_RAISES,
    climbLimit: GOOD_PATH_TOP,
    negotiateAt: [0.92, 0.97, 1.02],
  }),
  /** raise-climb that pitches the seed and Series A: asks 1.10× then 1.05× the opening, then accepts. */
  'raise-pitch': makeBot({
    hodlPct: 0,
    reserveUsd: () => 0,
    maxPaybackQuarters: Infinity,
    sellOnDrops: false,
    raises: GOOD_PATH_RAISES,
    climbLimit: GOOD_PATH_TOP,
    pitchAt: [1.1, 1.05],
  }),
  /** raise-pitch, bolder: asks 1.20× then 1.10× the opening (design-thread target check). */
  'raise-pitch-bold': makeBot({
    hodlPct: 0,
    reserveUsd: () => 0,
    maxPaybackQuarters: Infinity,
    sellOnDrops: false,
    raises: GOOD_PATH_RAISES,
    climbLimit: GOOD_PATH_TOP,
    pitchAt: [1.2, 1.1],
  }),
  /** raise-climb that also borrows the maximum equipment loan whenever it has none. */
  'raise-borrow': makeBot({
    hodlPct: 0,
    reserveUsd: () => 0,
    maxPaybackQuarters: Infinity,
    sellOnDrops: false,
    raises: GOOD_PATH_RAISES,
    climbLimit: GOOD_PATH_TOP,
    borrow: true,
  }),
  /** raise-climb that also bids 85% of list on every distressed auction lot it has room and cash for. */
  'raise-auction': makeBot({
    hodlPct: 0,
    reserveUsd: () => 0,
    maxPaybackQuarters: Infinity,
    sellOnDrops: false,
    raises: GOOD_PATH_RAISES,
    climbLimit: GOOD_PATH_TOP,
    auctionBidShare: 0.85,
  }),
  /**
   * The "great player" path (scope §5): raise-climb plus the IPO (as soon as it qualifies), then
   * climbs to Texas with the IPO money and fills it, borrowing up to 50% of the machines' value.
   */
  'texas-ipo': makeBot({
    hodlPct: 0,
    reserveUsd: () => 0,
    maxPaybackQuarters: Infinity,
    sellOnDrops: false,
    raises: [...GOOD_PATH_RAISES, 'ipo_spac'],
    climbLimit: { tier: 'own_site', afterRound: 'ipo_spac' },
    scoutAhead: true,
    smartFill: true,
    borrow: true,
    maxLtv: 0.5,
  }),
  /**
   * Measurement, not a design-thread path: texas-ipo that also replaces old machines (sells a lot
   * when the best machine makes 2× its profit per kW, or it loses money). Shows what upgrading
   * the fleet (S9 → S19 Pro in 2020) is worth.
   */
  'texas-ipo-upgrade': makeBot({
    hodlPct: 0,
    reserveUsd: () => 0,
    maxPaybackQuarters: Infinity,
    sellOnDrops: false,
    raises: [...GOOD_PATH_RAISES, 'ipo_spac'],
    climbLimit: { tier: 'own_site', afterRound: 'ipo_spac' },
    scoutAhead: true,
    borrow: true,
    maxLtv: 0.5,
    smartFill: true,
    upgradeAt: 2,
  }),
  /** raise-climb that stops buying, repairing and building from 2022Q1 (the idle-MW check, E1). */
  'stop-2022': makeBot({
    hodlPct: 0,
    reserveUsd: () => 0,
    maxPaybackQuarters: Infinity,
    sellOnDrops: false,
    raises: GOOD_PATH_RAISES,
    climbLimit: GOOD_PATH_TOP,
    stopFrom: '2022Q1',
  }),
  /** Keeps every coin it mines; spends only its cash; never sells in alerts. */
  hodl: makeBot({
    hodlPct: 1,
    reserveUsd: () => 1_000,
    maxPaybackQuarters: Infinity,
    sellOnDrops: false,
  }),
  /** hodl, plus the biggest crypto-backed loan against its coins whenever it has none (2018Q1–2022Q2). */
  'hodl-borrow': makeBot({
    hodlPct: 1,
    reserveUsd: () => 1_000,
    maxPaybackQuarters: Infinity,
    sellOnDrops: false,
    cryptoBorrow: true,
  }),
  /** Raises friends & family in 2017Q1, builds the small unit, fills every site with GPU Gen 1 rigs. */
  'ff-climb': ffClimb({ reserveQuarters: 1 }),
  /**
   * Same start as ff-climb (F&F + small unit, sells every coin), but plays it safe: keeps
   * 4 quarters of rent in the bank, stops buying rigs from 2018Q1, sells on price drops.
   * Asks: can a sensible F&F player survive the 2018 crash?
   */
  'careful-ff': ffClimb({
    reserveQuarters: 4,
    stopBuyingFrom: '2018Q1',
    sellOnDrops: true,
  }),
  /** ff-climb that breaks the small unit's lease after its first losing quarter, and stays in the garage. */
  'ff-exit': ffClimb({ reserveQuarters: 1, leaveAfterLosingQuarters: 1 }),
}

/**
 * Probes: not strategies, just measurements. garage-max buys 5 GPU Gen 1 rigs on day one
 * (a full garage), sells every coin and never spends again: the best case for garage-only cash.
 */
export const PROBES: Record<string, Strategy> = {
  'garage-max': {
    plan: (s) =>
      s.quarter === 0
        ? [
            {
              type: 'BUY_MACHINES',
              model: 'gpu_gen1',
              condition: 'new',
              count: 5,
              siteId: 'site-1',
            },
          ]
        : s.machines
            .filter(
              (l) =>
                l.failed > 0 && l.failed * repairCostPerUnit(l.model) <= s.cash,
            )
            .map((l) => ({ type: 'REPAIR_MACHINES', lotId: l.id }) as Action),
  },
}

interface FfSettings {
  /** Quarters of rent (for every site, including one being built) kept in the bank. */
  reserveQuarters: number
  /** From this quarter on, buy no more rigs (repairs still happen). */
  stopBuyingFrom?: string
  /** Price-alert answer: sell on drops, or always hold. */
  sellOnDrops?: boolean
  /** Leave the small unit after this many losing quarters in a row (EBITDA below 0); never rebuild. */
  leaveAfterLosingQuarters?: number
}

/**
 * ff-climb (design brief): raise F&F in 2017Q1, build the small unit as soon as it can
 * pay for it, fill free capacity with GPU Gen 1 rigs, sell 100% of mined coins.
 * It keeps one quarter's rent in reserve: rent starts when a site is signed, but
 * machines only earn from the next quarter, so spending every dollar means a forced sale.
 */
function ffClimb(settings: FfSettings): Strategy {
  const rig = 'gpu_gen1'
  const smallUnit = CONTENT.siteTiers.find((t) => t.id === 'small_unit')!
  return {
    plan(s: GameState): Action[] {
      const actions: Action[] = []
      let cash = s.cash
      let bandwidth = s.bandwidth
      const ff = CONTENT.ladder.friends_family
      const q = CONTENT.quarters[s.quarter]
      if (
        !s.raisesDone.includes(ff.id) &&
        q >= ff.window[0] &&
        q <= ff.window[1] &&
        bandwidth >= 2
      ) {
        actions.push({ type: 'RAISE', round: ff.id })
        cash += ff.amount_usd
        bandwidth -= 2
      }
      // Leave the small unit once it has lost money for long enough (the lease exit).
      const losing = settings.leaveAfterLosingQuarters
      const left = s.log.some((e) => e.key === 'log.site_left')
      if (losing && s.reports.length >= losing) {
        const recent = s.reports.slice(-losing)
        const unit = s.sites.find((x) => x.tier === smallUnit.id)
        const leave: Action = { type: 'LEAVE_SITE', siteId: unit?.id ?? '' }
        // Only if it can pay the penalty (checked by dry-running the action).
        if (
          unit &&
          recent.every((r) => r.ebitdaUsd < 0) &&
          applyAction(s, leave).ok
        ) {
          actions.push(leave)
          return actions
        }
      }

      // Some quarters of rent, plus a $1,000 cushion for power and cent rounding.
      const rentQ = s.sites.reduce((sum, x) => sum + x.rentUsdQ, 0)
      let rentReserve = 1_000 + rentQ * settings.reserveQuarters

      for (const lot of s.machines) {
        const cost = lot.failed * repairCostPerUnit(lot.model)
        if (lot.failed > 0 && cash - cost >= rentReserve) {
          actions.push({ type: 'REPAIR_MACHINES', lotId: lot.id })
          cash -= cost
        }
      }

      // The small unit needs no scouting (BALANCE.sites.noScoutingNeeded): build it directly.
      const capex = baseCapexUsd(smallUnit)
      const sites = [...s.sites]
      if (
        !s.sites.some((x) => x.tier === smallUnit.id) &&
        !left &&
        bandwidth >= 1 &&
        cash - capex >=
          rentReserve + smallUnit.rent_usd_q * settings.reserveQuarters
      ) {
        actions.push({ type: 'BUILD_SITE', tier: smallUnit.id })
        cash -= capex
        rentReserve += smallUnit.rent_usd_q * settings.reserveQuarters
        // BUILD_SITE takes the next id; RAISE and REPAIR don't use ids.
        sites.push({
          id: `site-${s.nextId}`,
          tier: smallUnit.id,
          readyQuarter: s.quarter + smallUnit.build_quarters,
          rentUsdQ: smallUnit.rent_usd_q,
          powerPriceMult: 1,
          flaw: null,
        })
      }

      // Fill every site (built or still being built) with the cheaper of new/used GPU Gen 1.
      const model = CONTENT.machines.find((m) => m.id === rig)!
      const prices = (['used', 'new'] as Condition[])
        .map((c) => ({ c, p: buyPriceNow(s, model, c) }))
        .filter((x): x is { c: Condition; p: number } => x.p !== undefined)
        .sort((a, b) => a.p - b.p)
      const cheapest = prices[0]
      if (!cheapest) return actions
      if (settings.stopBuyingFrom && q >= settings.stopBuyingFrom)
        return actions
      for (const site of sites) {
        const free = capacityKw(site) - usedKw(s, site.id)
        const count = Math.min(
          Math.floor(free / model.power_kw + 1e-9),
          Math.floor((cash - rentReserve) / cheapest.p),
        )
        if (count < 1) continue
        actions.push({
          type: 'BUY_MACHINES',
          model: rig,
          condition: cheapest.c,
          count,
          siteId: site.id,
        })
        cash -= cheapest.p * count
      }
      return actions
    },
    // Without sellOnDrops, alerts get the game's default answer (as ff-climb always has).
    // Margin calls always get the default (post collateral, or its fallbacks).
    answer: settings.sellOnDrops
      ? (s) =>
          s.interrupt!.id !== 'price_alert'
            ? undefined
            : s.interrupt!.changePct < 0
              ? sellDropped(s)
              : 'hold'
      : undefined,
  }
}
