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
import { buyCapKw, hostingView } from '../src/sim/selectors.ts'
import { convertibleKw } from '../src/sim/systems/hosting.ts'
import { projectCapex, tenantCard } from '../src/sim/systems/projects.ts'
import { debtPlan } from '../src/sim/systems/facilities.ts'
import {
  dilutionRange,
  equityPreMoneyUsd,
  raisesThisQuarter,
} from '../src/sim/systems/equity.ts'
import { fleetOffer } from '../src/sim/systems/headStarts.ts'
import {
  constructionLoanBlocker,
  constructionLoanUsd,
  nextPhase,
  phaseStartBlocker,
} from '../src/sim/systems/construction.ts'
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
  poweredKw,
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
  /** Only upgrade once this funding round is done (e.g. after the IPO). */
  upgradeAfterRound?: string
  /** Once upgrading has started (upgradeAfterRound), smartFill and upgrades pick BTC machines only. */
  asicOnly?: boolean
  /**
   * A GPU-heavy Act I (owner, M7.0 answer A4): buy the best-paying GPU rig whenever one pays back
   * in time, an ASIC only when no rig does.
   */
  gpuFirst?: boolean
  /** Also buy machines for a site that powers on next quarter, so they earn from its first quarter. */
  prebuy?: boolean
  /**
   * Phased Texas: start phase 1 on the construction loan as soon as it's allowed (even before
   * the climb limit's funding round), then, once that round is done, one more phase per spare
   * Bandwidth (cash first, the loan if cash is short).
   */
  phasedTexas?: boolean
}

/** Phased Texas: phase 1 could start now (offer scouted, allowed, loan allowed, cash for its part). */
function phaseOneReady(s: GameState): boolean {
  const tier = CONTENT.siteTiers.find((t) => t.phases)
  if (!tier || s.sites.some((x) => x.phases)) return false
  const offer = s.siteOffers
    .filter((o) => o.tier === tier.id)
    .sort((a, b) => a.capexUsd - b.capexUsd)[0]
  if (!offer || phaseStartBlocker(s, tier.id)) return false
  if (
    constructionLoanBlocker(s, {
      tier: tier.id,
      contract: { type: 'fixed', price: 0, startQuarter: 0, endQuarter: 0 },
    })
  )
    return false
  const cost = Math.round(offer.capexUsd * tier.phases!.cost_share)
  return s.cash >= cost - constructionLoanUsd(cost)
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
      // Phased Texas: phase 1 comes before the IPO, so keep 1 Bandwidth for it when it's ready.
      const keepBw = settings.phasedTexas && phaseOneReady(s) ? 1 : 0
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
        if (r.ok && bandwidth - keepBw >= s.bandwidth - r.state.bandwidth) {
          actions.push(a)
          raisedNow.push(round)
          cash += r.state.cash - s.cash
          reserveBase += r.state.cash - s.cash
          bandwidth -= s.bandwidth - r.state.bandwidth
        }
      }
      // 0b. Borrow the most lenders allow against the machines it owns.
      if (settings.borrow && !s.equipmentLoan && bandwidth - keepBw >= 1) {
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
      // Cash held back for a coming build (phased Texas: saving up for phase 1).
      let hold = 0
      const spendable = () => cash - settings.reserveUsd(reserveBase) - hold
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
      // Phased Texas: phase 1 on the construction loan as soon as it's allowed; later phases
      // once the climb limit's round (the IPO) is done.
      const roundDone =
        !limit?.afterRound ||
        s.raisesDone.includes(limit.afterRound) ||
        raisedNow.includes(limit.afterRound)
      const phaseTier = settings.phasedTexas && next?.phases ? next : undefined
      const phaseOffer = phaseTier
        ? s.siteOffers
            .filter((o) => o.tier === phaseTier.id)
            .sort((a, b) => a.capexUsd - b.capexUsd)[0]
        : undefined
      const phaseOneCash = phaseOffer
        ? Math.round(phaseOffer.capexUsd * phaseTier!.phases!.cost_share) -
          constructionLoanUsd(
            Math.round(phaseOffer.capexUsd * phaseTier!.phases!.cost_share),
          )
        : Infinity
      const phaseOne =
        phaseOffer &&
        topIsFull &&
        bandwidth >= 1 &&
        !phaseStartBlocker(s, phaseTier!.id) &&
        !constructionLoanBlocker(s, {
          tier: phaseTier!.id,
          contract: { type: 'fixed', price: 0, startQuarter: 0, endQuarter: 0 },
        }) &&
        phaseOneCash <= spendable()
      const phased = s.sites.find((x) => x.phases)
      if (settings.phasedTexas && phased && roundDone) {
        const n = nextPhase(s, phased)
        let added = 0
        while (n && n.n + added <= n.of && bandwidth >= 1) {
          const loanOk = !constructionLoanBlocker(s, phased)
          const loanCash = n.costUsd - constructionLoanUsd(n.costUsd)
          if (n.costUsd <= spendable()) {
            actions.push({ type: 'BUILD_PHASE', siteId: phased.id })
            cash -= n.costUsd
          } else if (loanOk && loanCash <= spendable()) {
            actions.push({
              type: 'BUILD_PHASE',
              siteId: phased.id,
              financed: true,
            })
            cash -= loanCash
          } else break
          bandwidth -= 1
          added++
        }
      }
      // Phase 1 is allowed but the cash isn't there yet: save for it instead of buying machines.
      if (
        !phaseOne &&
        phaseOffer &&
        !phased &&
        !phaseStartBlocker(s, phaseTier!.id) &&
        !constructionLoanBlocker(s, {
          tier: phaseTier!.id,
          contract: { type: 'fixed', price: 0, startQuarter: 0, endQuarter: 0 },
        })
      )
        hold = phaseOneCash
      if (phaseOne) {
        actions.push({
          type: 'BUILD_SITE',
          offerId: phaseOffer.id,
          financed: true,
          contractType: 'fixed',
        })
        cash -= phaseOneCash
        bandwidth -= 1
      } else if (
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
      } else if (
        next &&
        nextOpen &&
        topIsFull &&
        bandwidth >= 1 &&
        !(settings.phasedTexas && next.phases) &&
        // A phased tier (Texas) needs its funding round first (M7.0: a lifeline bot with cash to
        // spare in 2025 tried to build it without the IPO).
        !(next.phases && phaseStartBlocker(s, next.id))
      ) {
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
        .filter(
          (x) =>
            (isReady(x, s.quarter) ||
              (settings.prebuy && x.readyQuarter === s.quarter + 1)) &&
            !underMoratorium(s, x.id),
        )
        .sort(
          (a, b) =>
            powerPriceUsdKwh(a, s.quarter) - powerPriceUsdKwh(b, s.quarter),
        )
      const freedKw: Record<string, number> = {}
      const addedKw: Record<string, number> = {}
      // The GPU shortage cap is per quarter across all sites: count what this plan buys.
      let gpuKwBought = 0
      const capLeft = (m: { id: string; coin: string }) =>
        buyCapKw(s, m.id) - (m.coin === 'ETH' ? gpuKwBought : 0)
      // Room to fill: phased sites only count phases with power (next quarter's, with prebuy).
      const roomCapKw = (site: (typeof s.sites)[number]) =>
        Math.min(
          capacityKw(site),
          poweredKw(site, s.quarter + (settings.prebuy ? 1 : 0)),
        )
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
        // Up to two machines per site: the best, then the next best if the GPU cap stopped it.
        const skipped = new Set<(typeof options)[number]>()
        let gpuCapped = false
        for (let pass = 0; pass < 2 && (pass === 0 || gpuCapped); pass++) {
          const viable = options.filter(
            (o) =>
              !skipped.has(o) &&
              o.price !== undefined &&
              o.dailyProfit > 0 &&
              o.payback <= settings.maxPaybackQuarters,
          )
          let best = [...viable].sort((a, b) => a.payback - b.payback)[0]
          if (!best) break
          if (settings.gpuFirst) {
            const rig = viable
              .filter((o) => o.m.coin === 'ETH')
              .sort((a, b) => a.payback - b.payback)[0]
            if (rig) best = rig
          }
          // With cash to spare, power is the scarce thing: take the most profit per kW.
          const upgrading =
            !settings.upgradeAfterRound ||
            s.raisesDone.includes(settings.upgradeAfterRound) ||
            raisedNow.includes(settings.upgradeAfterRound)
          const candidates =
            settings.asicOnly && upgrading
              ? viable.filter((o) => o.m.coin === 'BTC')
              : viable
          if (settings.smartFill && candidates.length > 0 && !settings.gpuFirst) {
            const perKw = [...candidates].sort(
              (a, b) =>
                b.dailyProfit / b.m.power_kw - a.dailyProfit / a.m.power_kw ||
                a.payback - b.payback,
            )[0]
            const fits = Math.floor(
              (roomCapKw(site) -
                usedKw(after, site.id) -
                (addedKw[site.id] ?? 0)) /
                perKw.m.power_kw,
            )
            if (spendable() >= perKw.price! * Math.max(1, fits)) best = perKw
          }
          // 3b. Upgrade: sell old lots here that make far less per kW than the best machine.
          const upgradeNow =
            settings.upgradeAt !== undefined &&
            upgrading &&
            (!settings.asicOnly || best.m.coin === 'BTC')
          if (pass === 0 && upgradeNow && settings.upgradeAt) {
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
              (roomCapKw(site) -
                usedKw(after, site.id) -
                (addedKw[site.id] ?? 0) +
                (freedKw[site.id] ?? 0)) /
                best.m.power_kw,
            ),
            Math.floor(spendable() / best.price!),
            Math.floor(capLeft(best.m) / best.m.power_kw),
          )
          gpuCapped =
            count === Math.floor(capLeft(best.m) / best.m.power_kw) &&
            capLeft(best.m) !== Infinity
          if (count < 1) {
            skipped.add(best)
            continue
          }
          actions.push({
            type: 'BUY_MACHINES',
            model: best.m.id,
            condition: best.condition,
            count,
            siteId: site.id,
          })
          cash -= best.price! * count
          if (best.m.coin === 'ETH') gpuKwBought += best.m.power_kw * count
          addedKw[site.id] = (addedKw[site.id] ?? 0) + best.m.power_kw * count
          // Capped by the GPU shortage? Fill the rest with the next best machine.
          skipped.add(best)
        }
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

/**
 * Act II hosting (scope 0.2 §2.15, the "hosting-switcher" bot): plays `base`; in Act II, at every
 * site where hosting pays (the clients' rate above the site's power price), it sells the machines
 * that no longer mine there (GPU rigs and S9s) and converts all the free power to hosting ("switch
 * and stay": contracts keep renewing). The base plan then runs on what's left.
 */
function hostingSwitcher(base: Strategy): Strategy {
  return {
    ...base,
    plan(state) {
      if (state.act !== 2) return base.plan(state)
      const actions: Action[] = []
      let s = state
      const run = (a: Action) => {
        const r = applyAction(s, a)
        if (r.ok) {
          s = r.state
          actions.push(a)
        }
      }
      for (const v of hostingView(state).sites) {
        if (v.marginPerMwQUsd <= 0) continue
        for (const lot of s.machines.filter((l) => l.siteId === v.site.id)) {
          const model = getModel(lot.model)!
          if (model.coin === 'ETH' || model.id === 's9')
            run({ type: 'SELL_MACHINES', lotId: lot.id, count: lot.count })
        }
        const free = Math.floor(convertibleKw(s, v.site.id))
        if (free > 0) run({ type: 'HOST_START', siteId: v.site.id, kw: free })
      }
      return [...actions, ...base.plan(s)]
    },
  }
}

/**
 * Act II projects (scope 0.2 §2.5): plays `base`, and before it each Plan phase:
 * - finishes any proposed project: signs the best tenant offer (the best-rated, then the highest
 *   rent) or puts a cloud on spot, funds it with cash and starts the build;
 * - from `from`, opens a new one: a `pilot` of `pilotKw` (once), or a `shell` on the site with the
 *   most free MW, sized to what the cash can build (1 MW steps), after selling the machines that no
 *   longer mine there (GPU rigs and S9s) when `freeUp` is set. Shells keep coming while there's
 *   room and cash.
 */
function aiProjects(
  base: Strategy,
  opts: {
    kind: 'pilot' | 'shell' | 'cloud'
    /** A cloud's GPU generation (default: the pilot's H100). */
    gpu?: string
    /** A cloud signs a GPU contract with this tenant type when offered (else it goes on spot). */
    tenantType?: string
    /** Also take the biggest equipment loan whenever there's none (the overleveraged bot). */
    maxEquipmentLoan?: boolean
    from: string
    pilotKw?: number
    /** true: may sell GPU rigs and S9s for room; 'any': any machine (the pilot measurement). */
    freeUp?: boolean | 'any'
    /** Use Act II capital: project debt and DDTLs where lenders allow, and equity to close a gap. */
    capital?: boolean
    /** Keep this share of cash back (default 20%) when sizing a shell or affording a pilot. */
    reserveShare?: number
    /**
     * Size shells by trying: the biggest shell (1 MW steps) whose whole sequence (free the MW, open,
     * sign, debt, raise equity, start) the game accepts, played on a copy first. With `capital`, the
     * raise is priced after the signing (M5.0d), so a signed tenant funds a bigger build.
     */
    searchSize?: boolean
    /** Hire the Head of Development (Act II, +1 Bandwidth from the next quarter) when cash allows. */
    hireHod?: boolean
  },
): Strategy {
  const ratingRank = (r: string) =>
    r.startsWith('A') ? 2 : r.startsWith('BBB') ? 1 : 0
  return {
    ...base,
    plan(state) {
      if (state.act !== 2) return base.plan(state)
      const actions: Action[] = []
      let s = state
      const run = (a: Action) => {
        const r = applyAction(s, a)
        if (r.ok) {
          s = r.state
          actions.push(a)
        }
        return r.ok
      }
      /**
       * Raises `needUsd` of equity: one raise if it fits under the cap, two if two do (each priced at
       * the same pre-money), none if even two can't cover it. With `partial`, raises what it can.
       */
      const raiseFor = (needUsd: number, partial = false) => {
        const [lo, hi] = dilutionRange()
        const left =
          BALANCE.finance.equity.raisesPerQuarter - raisesThisQuarter(s)
        const pre = equityPreMoneyUsd(s)
        if (left <= 0 || pre <= 0) return
        const maxOne = (pre * hi) / (1 - hi)
        if (!partial && needUsd > maxOne * left) return
        let need = needUsd
        for (let i = 0; i < left && need > 0; i++) {
          const d = Math.min(hi, Math.max(lo, need / (pre + need)))
          const cash = s.cash
          if (!run({ type: 'RAISE_EQUITY', dilution: d })) return
          need -= s.cash - cash
        }
      }
      const finish = () => {
        for (const p of s.projects.filter((x) => x.stage === 'proposed')) {
          // Relying on project debt: only a tenant rated BBB or better will do; without one, drop
          // the project (nothing signed yet) and try again with new offers next quarter.
          if (
            opts.capital &&
            p.kind === 'shell' &&
            !p.tenant &&
            !p.offers.some((o) => ratingRank(tenantCard(o.card)!.rating) >= 1)
          ) {
            run({ type: 'PROJECT_CANCEL', projectId: p.id })
            continue
          }
          if (p.kind === 'shell' && !p.tenant && p.offers.length > 0) {
            const best = [...p.offers].sort((a, b) => {
              const ca = tenantCard(a.card)!
              const cb = tenantCard(b.card)!
              return (
                ratingRank(cb.rating) - ratingRank(ca.rating) ||
                cb.priceUsdMwYr - ca.priceUsdMwYr
              )
            })[0]
            run({
              type: 'PROJECT_SIGN_TENANT',
              projectId: p.id,
              offerId: best.id,
            })
          }
          if (p.kind === 'cloud') {
            const wanted = opts.tenantType
              ? p.offers.find(
                  (o) => tenantCard(o.card)!.type === opts.tenantType,
                )
              : undefined
            if (wanted)
              run({
                type: 'PROJECT_SIGN_TENANT',
                projectId: p.id,
                offerId: wanted.id,
              })
            else run({ type: 'PROJECT_SPOT', projectId: p.id })
          }
          if (opts.capital)
            for (const debt of ['project_debt', 'ddtl'] as const)
              run({ type: 'PROJECT_DEBT', projectId: p.id, debt, on: true })
          run({ type: 'PROJECT_FUND_CASH', projectId: p.id })
          // Short of cash for the part the debt doesn't cover: sell 8–30% of the company for it, twice
          // in a quarter if one raise isn't enough (M7.0, A1a); not at all if two can't cover it.
          const q = s.projects.find((x) => x.id === p.id)!
          const needUsd =
            projectCapex(s, q).totalUsd - debtPlan(s, q).totalUsd - s.cash
          if (opts.capital && needUsd > 0) raiseFor(needUsd)
          run({ type: 'PROJECT_START', projectId: p.id })
        }
      }
      /**
       * Machines `freeUp` may sell: GPU rigs and S9s (or, with 'any', every machine), and any machine
       * bought in Act II: a stopgap until the AI build (M6.0d).
       */
      const act2Start = CONTENT.acts[1].firstQuarter
      const sellable = (lot: { model: string; earnsFromQuarter: number }) => {
        const m = getModel(lot.model)!
        return (
          opts.freeUp === 'any' ||
          m.coin === 'ETH' ||
          m.id === 's9' ||
          lot.earnsFromQuarter > act2Start
        )
      }
      /** With `freeUp`: sells the site's sellable machines, a batch at a time, until `kw` are free. */
      const freeUp = (siteId: string, kw: number) => {
        if (!opts.freeUp) return
        for (const lot of s.machines.filter((l) => l.siteId === siteId)) {
          const left = kw - convertibleKw(s, siteId)
          if (left <= 0) return
          if (!sellable(lot)) continue
          const units = Math.min(
            lot.count,
            Math.ceil(left / getModel(lot.model)!.power_kw),
          )
          run({ type: 'SELL_MACHINES', lotId: lot.id, count: units })
        }
      }
      /** kW the site could give a project: free now, plus (with freeUp) its sellable machines. */
      const roomKw = (siteId: string) =>
        convertibleKw(s, siteId) +
        (opts.freeUp
          ? s.machines
              .filter((l) => l.siteId === siteId && sellable(l))
              .reduce((a, l) => a + l.count * getModel(l.model)!.power_kw, 0)
          : 0)
      // The lifeline's bridge is due in one payment (M6.0d: the lifeline bot went bust on it). From the
      // quarter before it falls due: raise equity for whatever cash can't cover, then repay it; until
      // it's repaid, no new project may spend the money it needs.
      const bridge = s.bridgeLoan
      const bridgeSoon = bridge !== null && s.quarter >= bridge.dueQuarter - 1
      if (bridge && bridgeSoon) {
        const needUsd = bridge.balanceUsd * 1.05 - s.cash
        if (needUsd > 0) raiseFor(needUsd, true)
        if (s.cash >= bridge.balanceUsd * 1.05)
          run({ type: 'REPAY_BRIDGE_LOAN' })
      }
      // M8.1e: since M7.0 (A5) the bridge also amortises (interest only 4 quarters, then equal slices), so
      // the bot no longer waits for one payment: from the quarter before the slices start it keeps the
      // next quarter's service (a slice + the interest) in cash, raising equity for any shortfall. The
      // lifeline companies bust in 2025 otherwise (a $40K start, cash spent on machines, EBITDA after the halving).
      if (
        bridge &&
        !bridgeSoon &&
        s.quarter >=
          bridge.takenQuarter + BALANCE.lifeline.bridgeInterestOnlyQuarters - 1
      ) {
        const slices =
          bridge.dueQuarter -
          bridge.takenQuarter +
          1 -
          BALANCE.lifeline.bridgeInterestOnlyQuarters
        const serviceUsd =
          bridge.amountUsd / slices + (bridge.balanceUsd * bridge.apr) / 4
        const shortUsd = serviceUsd * 1.1 - s.cash
        if (shortUsd > 0) raiseFor(shortUsd, true)
      }
      const bridgeOpen = s.bridgeLoan !== null && bridgeSoon
      // A Head of Development first (1 Bandwidth now, +1 every quarter after): Act II Bandwidth is tight.
      if (opts.hireHod && s.staff.head_of_development === undefined)
        run({ type: 'HIRE', hire: 'head_of_development' })
      // The overleveraged bot: the biggest equipment loan on its machines and GPUs whenever it has none.
      if (opts.maxEquipmentLoan && !s.equipmentLoan) {
        const amountUsd = Math.floor(maxEquipmentLoanUsd(s))
        if (amountUsd >= 1) run({ type: 'TAKE_LOAN', amountUsd })
      }
      finish()
      const label = CONTENT.quarters[s.quarter]
      const pending = s.projects.some((x) => x.stage === 'proposed')
      if (label >= opts.from && !pending && !bridgeOpen) {
        const sites = s.sites.filter((x) => x.tier !== BALANCE.startSite)
        const budget = s.cash * (1 - (opts.reserveShare ?? 0.2))
        if (opts.kind === 'pilot') {
          const kw = opts.pilotKw ?? 1000
          const cost = projectCapex(s, {
            kw,
            kind: 'pilot',
            gpu: CONTENT.projects.pilot.gpu,
            tenant: null,
          }).totalUsd
          const site = sites.find((x) => roomKw(x.id) >= kw)
          if (
            site &&
            cost <= budget &&
            !s.projects.some((x) => x.kind === 'pilot')
          ) {
            freeUp(site.id, kw)
            run({ type: 'PROJECT_OPEN', siteId: site.id, kw, kind: 'pilot' })
          }
        } else if (opts.searchSize) {
          const site = [...sites].sort((a, b) => roomKw(b.id) - roomKw(a.id))[0]
          /** Plays one shell of `mw` from freeing its MW to the build start; undone unless `keep` and it started. */
          const attempt = (mw: number, keep: boolean): boolean => {
            if (!site) return false
            const saved = s
            const n = actions.length
            freeUp(site.id, mw * 1000)
            const opened = run(
              opts.kind === 'cloud'
                ? {
                    type: 'PROJECT_OPEN',
                    siteId: site.id,
                    kw: mw * 1000,
                    kind: 'cloud',
                    gpu: opts.gpu ?? CONTENT.projects.pilot.gpu,
                  }
                : {
                    type: 'PROJECT_OPEN',
                    siteId: site.id,
                    kw: mw * 1000,
                    kind: 'shell',
                  },
            )
            if (opened) finish()
            const p = s.projects.at(-1)
            // It must leave the usual reserve of the quarter's starting cash for running costs, plus
            // the interest every building project's debt charges until it goes live (and a quarter more).
            const carryUsd = s.facilities.reduce((sum, f) => {
              const q = s.projects.find((x) => x.id === f.projectId)
              if (q?.stage !== 'building' || q.readyQuarter === null) return sum
              const quarters = q.readyQuarter - s.quarter + 1
              return sum + ((f.balanceUsd * f.apr) / 4) * quarters
            }, 0)
            // …and the equipment loan's payments over the same quarters (M6.0d: the preset's $25M
            // loan drained the cash its builds needed, and the lender foreclosed on both shells).
            const building = s.projects.filter(
              (x) => x.stage === 'building' && x.readyQuarter !== null,
            )
            const buildQuarters = Math.max(
              0,
              ...building.map((x) => x.readyQuarter! - s.quarter + 1),
            )
            const eq = s.equipmentLoan
            const loanUsd = eq
              ? Math.min(
                  eq.balanceUsd,
                  eq.weeklyPrincipalUsd * 13 * buildQuarters,
                ) +
                ((eq.balanceUsd * eq.apr) / 4) * buildQuarters
              : 0
            const started =
              opened &&
              p !== undefined &&
              p.kw === mw * 1000 &&
              p.stage === 'building' &&
              s.cash >=
                state.cash * (opts.reserveShare ?? 0.2) + carryUsd + loanUsd
            if (!started || !keep) {
              s = saved
              actions.length = n
            }
            return started
          }
          // The biggest size that starts (bigger ones need more cash, so it's a binary search).
          let lo = 0
          let hi = site ? Math.floor(roomKw(site.id) / 1000) : 0
          while (lo < hi) {
            const mid = Math.ceil((lo + hi) / 2)
            if (attempt(mid, false)) lo = mid
            else hi = mid - 1
          }
          if (lo >= 1) attempt(lo, true)
        } else {
          const site = [...sites].sort((a, b) => roomKw(b.id) - roomKw(a.id))[0]
          if (site) {
            const perMw = projectCapex(s, {
              kw: 1000,
              kind: 'shell',
              gpu: null,
              tenant: null,
            }).totalUsd
            // With capital, size for the lender funding 60% (lenders.json's low end).
            const ownShare = opts.capital
              ? 1 - CONTENT.finance.projectDebt.ltv[0]
              : 1
            const mw = Math.min(
              Math.floor(roomKw(site.id) / 1000),
              Math.floor(budget / (perMw * ownShare)),
            )
            if (mw >= 1) {
              freeUp(site.id, mw * 1000)
              run({
                type: 'PROJECT_OPEN',
                siteId: site.id,
                kw: mw * 1000,
                kind: 'shell',
              })
            }
          }
        }
        finish()
      }
      // Its MW are kept for AI: no new mining machines once its AI phase has begun (M6.0d). Before
      // that it may mine as a stopgap; those machines are sellable (see sellable).
      const aiPhase = label >= opts.from
      return [
        ...actions,
        ...base.plan(s).filter((a) => !aiPhase || a.type !== 'BUY_MACHINES'),
      ]
    },
  }
}

/** The good path's rounds (no IPO) and its top site (the 20 MW own site; design thread A1). */
const GOOD_PATH_RAISES = ['friends_family', 'seed', 'series_a']
const GOOD_PATH_TOP = { tier: 'own_site' }

/** The raise-climb bot's settings (the good path). */
const RAISE_CLIMB: BotSettings = {
  hodlPct: 0,
  reserveUsd: () => 0,
  maxPaybackQuarters: Infinity,
  sellOnDrops: false,
  raises: GOOD_PATH_RAISES,
  climbLimit: GOOD_PATH_TOP,
}

/** The texas-ipo bot's settings (the great path). */
const TEXAS_IPO: BotSettings = {
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
  phasedTexas: true,
  prebuy: true,
  // After the IPO: replace S9s with S19s wherever they make more per kW (no GPU swap).
  upgradeAt: 1,
  upgradeAfterRound: 'ipo_spac',
  asicOnly: true,
}

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
  /** raise-climb, then in Act II hosts other miners wherever hosting pays (see hostingSwitcher). */
  'hosting-switcher': hostingSwitcher(
    makeBot({
      hodlPct: 0,
      reserveUsd: () => 0,
      maxPaybackQuarters: Infinity,
      sellOnDrops: false,
      raises: GOOD_PATH_RAISES,
      climbLimit: GOOD_PATH_TOP,
    }),
  ),
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
  'texas-ipo': makeBot(TEXAS_IPO),
  /**
   * Act II good path with AI (scope §5): raise-climb, then from 2023Q3 frees its S9s and GPU rigs
   * and turns the free MW into AI shells as far as the cash goes (see aiProjects).
   */
  'shell-climb': aiProjects(makeBot(RAISE_CLIMB), {
    kind: 'shell',
    from: '2023Q3',
    freeUp: true,
  }),
  /** Act II great path with AI: texas-ipo, then AI shells the same way. */
  'texas-shell': aiProjects(makeBot(TEXAS_IPO), {
    kind: 'shell',
    from: '2023Q3',
    freeUp: true,
  }),
  /** shell-climb with Act II capital: project debt where the tenant allows, equity to close gaps. */
  'shell-capital': aiProjects(makeBot(RAISE_CLIMB), {
    kind: 'shell',
    from: '2023Q3',
    freeUp: true,
    capital: true,
  }),
  /** texas-shell with Act II capital (the great path's AI build-out). */
  'texas-capital': aiProjects(makeBot(TEXAS_IPO), {
    kind: 'shell',
    from: '2023Q3',
    freeUp: true,
    capital: true,
  }),
  /**
   * Good path, owner's M4 answer (c): raise-climb; from 2023Q3 signs a shell tenant first, then
   * raises equity priced with the contract in it and takes project debt, building the biggest shell
   * that closes (searchSize).
   */
  'sign-then-raise': aiProjects(makeBot(RAISE_CLIMB), {
    kind: 'shell',
    from: '2023Q3',
    freeUp: true,
    capital: true,
    searchSize: true,
    hireHod: true,
  }),
  /**
   * Great path, owner's M4 answer: texas-ipo; from 2023Q3 sells working ASICs too (any machine) to
   * free MW and cash for AI shells, with the same capital and sizing as sign-then-raise.
   */
  'asic-retirer': aiProjects(makeBot(TEXAS_IPO), {
    kind: 'shell',
    from: '2023Q3',
    freeUp: 'any',
    capital: true,
    searchSize: true,
    hireHod: true,
  }),
  /**
   * Scope §5 "overleveraged full stack": texas-ipo; from 2024Q1 sells its ASICs for room and builds
   * H100 clouds on AI-lab GPU contracts (never a backstop), with a DDTL, equity to close the gap and
   * the biggest equipment loan on everything it owns, sized as big as closes.
   */
  overleveraged: aiProjects(makeBot(TEXAS_IPO), {
    kind: 'cloud',
    gpu: 'h100',
    tenantType: 'ai_lab',
    from: '2024Q1',
    freeUp: 'any',
    capital: true,
    searchSize: true,
    hireHod: true,
    maxEquipmentLoan: true,
  }),
  /**
   * The lifeline path (scope §5): a weak Act I (cautious: half its cash kept, 3-quarter paybacks)
   * ends below the floor and takes the lifeline; from 2023Q3 it builds shells with capital, sized
   * to what closes (the 5 MW shell with a capex credit and project debt).
   */
  'lifeline-shell': aiProjects(
    makeBot({
      hodlPct: 0.2,
      reserveUsd: (cash) => Math.max(5_000, cash * 0.5),
      maxPaybackQuarters: 3,
      sellOnDrops: true,
    }),
    {
      kind: 'shell',
      from: '2023Q3',
      freeUp: true,
      capital: true,
      searchSize: true,
      hireHod: true,
    },
  ),
  /**
   * Measurement, not a design-thread path: texas-ipo without the ASIC-only rule, upgrading any
   * machine (GPU rigs included) from the start when the best one makes 2× its profit per kW.
   * Checks the GPU shortage cap (target: no more than texas-ipo + 50%).
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
    phasedTexas: true,
    prebuy: true,
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
/** sign-then-raise's Act II settings (the shell path every opening ends up on). */
/** The good path's Act I, GPU-heavy (M7.0, A4): raise-climb buying GPU rigs first. */
const GPU_HEAVY: BotSettings = { ...RAISE_CLIMB, gpuFirst: true }

/**
 * A GPU-heavy Act I company (the A4 test: ≥ 30%): the share of its 2022Q3 mining revenue from GPUs,
 * from that quarter's report (coins mined, at mid-quarter prices).
 */
export function gpuRevenueShare(state: GameState): number | null {
  const r = state.reports.find((x) => x.quarter === '2022Q3')
  if (!r) return null
  const w = marketWeek(CONTENT.quarters.indexOf('2022Q3'), 6)
  const eth = r.coinsMined.ETH * w.eth_usd
  const all = eth + r.coinsMined.BTC * w.btc_usd
  return all > 0 ? eth / all : null
}

const SHELL_PATH = {
  kind: 'shell' as const,
  freeUp: true,
  capital: true,
  searchSize: true,
  hireHod: true,
}

/**
 * Each Merge head start's intended opening (owner, 28 Sep 2026; M5 answer 2), on a GPU-heavy good
 * path Act I (raise-climb buying GPU rigs first: M7.0 answer A4), each making its own Merge choice.
 * All end up on sign-then-raise's shells:
 * - open-pilot (gpu_cloud): a 0.5 MW pilot in 2023Q2, the gap raised as equity; shells from 2023Q3.
 * - open-shell (hosting): shells from 2023Q3 (where the guaranteed AA offer waits).
 * - open-fleet (sell_gpus_keep_btc): frees a site's S9s and buys the distressed fleet in 2023Q1;
 *   shells only from 2024Q1 (mine more first, pivot later).
 * - open-hold (hold_and_wait): sells the parked rigs in 2023Q2 (the scarcity premium); shells from 2023Q3.
 */
function opening(
  choice: string,
  shellsFrom: string,
  before?: (now: () => GameState, run: (a: Action) => boolean) => void,
): Strategy {
  const shells = aiProjects(makeBot(GPU_HEAVY), {
    ...SHELL_PATH,
    from: shellsFrom,
  })
  return {
    ...shells,
    merge: () => choice,
    plan(state) {
      if (state.act !== 2 || !before) return shells.plan(state)
      let s = state
      const actions: Action[] = []
      const run = (a: Action) => {
        const r = applyAction(s, a)
        if (r.ok) {
          s = r.state
          actions.push(a)
        }
        return r.ok
      }
      before(() => s, run)
      return [...actions, ...shells.plan(s)]
    },
  }
}

export const HEAD_START_OPENINGS: Record<string, Strategy> = {
  'open-pilot': opening('gpu_cloud', '2023Q3', (now, run) => {
    const s0 = now()
    if (CONTENT.quarters[s0.quarter] !== '2023Q2') return
    if (s0.projects.some((p) => p.kind === 'pilot')) return
    const kw = 500
    const spare = (l: { model: string }) =>
      getModel(l.model)!.coin === 'ETH' || l.model === 's9'
    const site =
      s0.sites.find((x) => convertibleKw(s0, x.id) >= kw) ??
      s0.sites.find((x) =>
        s0.machines.some((l) => l.siteId === x.id && spare(l)),
      )
    if (!site) return
    for (const lot of s0.machines.filter(
      (l) => l.siteId === site.id && spare(l),
    ))
      if (convertibleKw(now(), site.id) < kw)
        run({ type: 'SELL_MACHINES', lotId: lot.id, count: lot.count })
    const cost = projectCapex(now(), {
      kw,
      kind: 'pilot',
      gpu: CONTENT.projects.pilot.gpu,
      tenant: null,
    }).totalUsd
    const need = cost * 1.1 - now().cash
    const pre = equityPreMoneyUsd(now())
    if (need > 0 && pre > 0)
      run({
        type: 'RAISE_EQUITY',
        dilution: Math.min(
          dilutionRange()[1],
          Math.max(dilutionRange()[0], need / (pre + need)),
        ),
      })
    if (now().cash < cost) return
    if (!run({ type: 'PROJECT_OPEN', siteId: site.id, kw, kind: 'pilot' }))
      return
    const p = now().projects.at(-1)!
    run({ type: 'PROJECT_FUND_CASH', projectId: p.id })
    run({ type: 'PROJECT_START', projectId: p.id })
  }),
  'open-shell': opening('hosting', '2023Q3'),
  'open-fleet': opening('sell_gpus_keep_btc', '2024Q1', (now, run) => {
    const s0 = now()
    if (!fleetOffer(s0)) return
    const site = [...s0.sites]
      .filter((x) => x.tier !== BALANCE.startSite)
      .sort((a, b) => capacityKw(b) - capacityKw(a))[0]
    if (!site) return
    for (const lot of s0.machines.filter(
      (l) => l.siteId === site.id && l.model === 's9',
    ))
      run({ type: 'SELL_MACHINES', lotId: lot.id, count: lot.count })
    run({ type: 'BUY_DISTRESSED_FLEET', siteId: site.id })
  }),
  'open-hold': opening('hold_and_wait', '2023Q3', (now, run) => {
    const s0 = now()
    if (CONTENT.quarters[s0.quarter] !== '2023Q2') return
    for (const lot of s0.machines.filter(
      (l) => getModel(l.model)!.coin === 'ETH',
    ))
      run({ type: 'SELL_MACHINES', lotId: lot.id, count: lot.count })
  }),
}

export const PROBES: Record<string, Strategy> = {
  /**
   * Scope §5 pilot timing: texas-ipo (the only path with a pilot's ~$31M) plus one 1 MW pilot,
   * opened in 2023Q3 (or 2025Q2) on MW freed by selling miners if needed.
   */
  'pilot-2023Q3': aiProjects(makeBot(TEXAS_IPO), {
    kind: 'pilot',
    from: '2023Q3',
    freeUp: 'any',
    reserveShare: 0,
  }),
  'pilot-2025Q2': aiProjects(makeBot(TEXAS_IPO), {
    kind: 'pilot',
    from: '2025Q2',
    freeUp: 'any',
    reserveShare: 0,
  }),
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
