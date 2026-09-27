// Player decisions as plain action objects. applyAction checks an action against the
// rules and returns either the new state or an error message (the old state is untouched).
import { BALANCE, CONTENT } from '../content/index.ts'
import {
  buildPhase,
  constructionLoanBlocker,
  constructionLoanUsd,
  gpuKwLeft,
  phaseBlocker,
  phaseBuildQuarters,
  phaseStartBlocker,
  repayConstructionLoan,
  takeConstructionLoan,
  transformerBlocker,
  upgradeTransformer,
} from './systems/construction.ts'
import type { Message, MessageKey, MessageParams } from '../i18n/t.ts'
import {
  logEntry,
  type Coin,
  type ContractType,
  type Condition,
  type GameState,
  type ProjectKind,
  type Site,
} from './state.ts'
import {
  addMachines,
  removeMachines,
  repairCostPerUnit,
} from './systems/machines.ts'
import { bidBlocker, closeAuction, placeBid } from './systems/auctions.ts'
import { raiseBlocker, takeRaise } from './systems/capital.ts'
import {
  cryptoBorrowBlocker,
  repayCryptoLoan,
  takeCryptoLoan,
} from './systems/cryptoLoan.ts'
import {
  doMitigation,
  doOutreach,
  mitigationBlocker,
  outreachBlocker,
  recalcHeat,
  scheduleComplaint,
  underMoratorium,
} from './systems/heat.ts'
import {
  acceptBlocker,
  acceptOpening,
  autoRenew,
  signContract,
} from './systems/contracts.ts'
import {
  acceptOffer,
  counter,
  startBlocker,
  startNegotiation,
  walkOut,
} from './systems/negotiation.ts'
import {
  pitchAccept,
  pitchBlocker,
  pitchCounter,
  pitchWalk,
  startPitch,
} from './systems/pitch.ts'
import {
  buildQuartersFor,
  fire,
  fireBlocker,
  hire,
  hireBlocker,
} from './systems/hires.ts'
import { resolveInterrupt } from './systems/interrupts.ts'
import { checkEvents, scheduleEvents } from './systems/events.ts'
import { planFailureWaves } from './systems/failureWave.ts'
import { buyPriceNow, newGpusLocked } from './systems/eventEffects.ts'
import { readMarket, readMarketBlocker } from './systems/readMarket.ts'
import {
  borrowBlocker,
  repayEquipmentLoan,
  takeEquipmentLoan,
} from './systems/loans.ts'
import { getModel, marketWeek } from './systems/market.ts'
import { sellTreasury, treasuryValueUsd } from './systems/treasury.ts'
import {
  endHosting,
  hostingBlocker,
  rollHostingDefaults,
  startHosting,
} from './systems/hosting.ts'
import {
  cancelProject,
  fundWithCash,
  openBlocker,
  openProject,
  planProjectEvents,
  signTenant,
  buildBlocker,
  sellBlocker,
  sellGpus,
  sellGpusBlocker,
  sellProject,
  startBuild,
  useSpot,
} from './systems/projects.ts'
import { endQuarter, startNextQuarter } from './systems/quarter.ts'
import {
  baseCapexUsd,
  capacityKw,
  flawEffect,
  getTier,
  leavingTerms,
  normalPriceUsdKwh,
  rollOffers,
  tierIndex,
  topTierIndex,
  usedKw,
} from './systems/sites.ts'

export type Action =
  | {
      type: 'BUY_MACHINES'
      model: string
      condition: Condition
      count: number
      siteId: string
    }
  | { type: 'SELL_MACHINES'; lotId: string; count: number }
  | { type: 'REPAIR_MACHINES'; lotId: string }
  /** Share of mined coins to keep (0–1), for one coin, or for both if `coin` is left out. */
  | { type: 'SET_HODL'; pct: number; coin?: Coin }
  | { type: 'SCOUT_SITES'; tier: string }
  /** Build from a scouted offer, or (tiers that need no scouting) straight from the tier. */
  /**
   * Build a scouted offer. Phased tiers (Texas) build phase 1 and sign the site's power contract
   * (contractType, negotiated like a renewal); `financed` takes the construction loan.
   */
  | {
      type: 'BUILD_SITE'
      offerId: string
      financed?: boolean
      contractType?: ContractType
    }
  /** Start the next 20 MW phase of a phased site (Texas). */
  | { type: 'BUILD_PHASE'; siteId: string; financed?: boolean }
  | { type: 'BUILD_SITE'; tier: string }
  /** Break the site's lease: its machines are sold, a penalty is paid, rent stops. */
  | { type: 'LEAVE_SITE'; siteId: string }
  /** Act II: convert free energized kW at a site to hosting (conversions.json cost, 1 Bandwidth). */
  | { type: 'HOST_START'; siteId: string; kw: number }
  /** Act II: end a hosting contract (a quarter of fees mid-term; free while converting or renewing). */
  | { type: 'HOST_END'; contractId: string }
  /** Act II: open a project on free energized kW at a site (1 Bandwidth; scope 0.2 §2.5). */
  | {
      type: 'PROJECT_OPEN'
      siteId: string
      kw: number
      kind: ProjectKind
      /** Cloud projects: the GPU generation (a pilot always uses conversions.json's). */
      gpu?: string
    }
  /** Act II: a shell project signs one of its tenant offers (accept, 0 Bandwidth). */
  | { type: 'PROJECT_SIGN_TENANT'; projectId: string; offerId: string }
  /** Act II: a cloud project sells its capacity on spot (its Tenant slot). */
  | { type: 'PROJECT_SPOT'; projectId: string }
  /** Act II: fund a project with own cash (its Capital slot). */
  | { type: 'PROJECT_FUND_CASH'; projectId: string }
  /** Act II: drop a project that hasn't started building (0 Bandwidth). */
  | { type: 'PROJECT_CANCEL'; projectId: string }
  /** Act II: every slot filled, start the build (1 Bandwidth, the capex paid now). */
  | { type: 'PROJECT_START'; projectId: string }
  /** Act II: sell a live AI shell at its cap rate (2 Bandwidth); its MW go with it. */
  | { type: 'PROJECT_SELL'; projectId: string }
  /** Act II: sell a live cloud's or pilot's GPUs at their residual value (1 Bandwidth); it ends. */
  | { type: 'PROJECT_SELL_GPUS'; projectId: string }
  /** Sell a share (0–1) of one coin in the treasury at this week's price (Plan phase, 1 Bandwidth). */
  | { type: 'SELL_TREASURY'; coin: Coin; pct: number }
  /** Talk to the neighbours at a site: cash + 1 Bandwidth for goodwill (heat.json outreach). */
  | { type: 'OUTREACH'; siteId: string }
  /** Noise mitigation at a site: capex, lowers its base Heat for good, once per site. */
  | { type: 'MITIGATE_NOISE'; siteId: string }
  /** Start negotiating a due renewal: contract type, 4 or 8 quarters (heat.json bw_cost Bandwidth). */
  | {
      type: 'NEGOTIATE_START'
      siteId: string
      contractType: ContractType
      term: number
    }
  /** Counter the utility's offer with a price per kWh. */
  | { type: 'NEGOTIATE_COUNTER'; priceUsdKwh: number }
  /** Take the utility's current offer. */
  | { type: 'NEGOTIATE_ACCEPT' }
  /** Walk away: the opening offer applies for the short term. */
  | { type: 'NEGOTIATE_WALK' }
  /** Accept the utility's opening offer for a due renewal (0 Bandwidth; Texas: choose the type). */
  | { type: 'ACCEPT_RENEWAL'; siteId: string; contractType: ContractType }
  /** Borrow against your machines (equipment loan). */
  | { type: 'TAKE_LOAN'; amountUsd: number }
  /** Pay the equipment loan off early. */
  | { type: 'REPAY_LOAN' }
  /** Pay off the Texas construction loan early. */
  | { type: 'REPAY_CONSTRUCTION_LOAN' }
  /** Clear an undersized-transformer flaw (sites.json upgrade cost, Bandwidth and build time). */
  | { type: 'UPGRADE_TRANSFORMER'; siteId: string }
  /** Pledge treasury coins and borrow against them (crypto-backed loan). */
  | { type: 'TAKE_CRYPTO_LOAN'; coin: Coin; amountUsd: number }
  /** Repay the crypto-backed loan and get the pledged coins back. */
  | { type: 'REPAY_CRYPTO_LOAN' }
  /** Sealed bid for the whole distressed lot this Plan phase; the machines go to `siteId` if you win. */
  | { type: 'BID_AUCTION'; bidUsd: number; siteId: string }
  /** Read the market: a hint of this quarter's BTC and ETH direction (1 Bandwidth; 0 with the Trader). */
  | { type: 'READ_MARKET' }
  /** Hire a person from hires.json (1 Bandwidth; needs a quarter's salary in cash). */
  | { type: 'HIRE'; hire: string }
  /** Let a person go (0 Bandwidth, severance). */
  | { type: 'FIRE'; hire: string }
  /** Take a funding round from capital.json at the investor's opening terms. */
  | { type: 'RAISE'; round: string }
  /** Pitch a round instead (capital.json › pitch): haggle over the pre-money valuation. */
  | { type: 'PITCH_START'; round: string }
  /** Counter the investor's offer with a pre-money valuation in dollars. */
  | { type: 'PITCH_COUNTER'; preMoneyUsd: number }
  /** Take the investor's current offer. */
  | { type: 'PITCH_ACCEPT' }
  /** Walk out: the round closes for a quarter and reopens lower. */
  | { type: 'PITCH_WALK' }
  /** Plan phase done: start the live quarter. */
  | { type: 'END_PLAN' }
  /** Answer the alert that paused the live quarter. */
  | { type: 'RESOLVE_INTERRUPT'; choice: string }
  /** Close the quarter report and go to the next Plan phase. */
  | { type: 'NEXT_QUARTER' }
  /** The Merge decision (merge.json choice id): ends Act I. */
  | { type: 'MERGE_CHOOSE'; choice: string }
  /** From the Act I chapter report to the Act II intro (the act boundary, scope 0.2 §2.1). */
  | { type: 'CONTINUE_TO_ACT_2' }
  /** From the Act II intro to the 2022Q4 Plan phase. */
  | { type: 'START_ACT_2' }

export type ActionResult =
  { ok: true; state: GameState } | { ok: false; error: Message }

export function applyAction(state: GameState, action: Action): ActionResult {
  const next = structuredClone(state)
  const error = run(next, action)
  return error ? { ok: false, error } : { ok: true, state: next }
}

const COINS: Coin[] = ['BTC', 'ETH']

function fail(key: MessageKey, params?: MessageParams): Message {
  return { key, params }
}

function run(s: GameState, a: Action): Message | undefined {
  switch (a.type) {
    case 'END_PLAN':
      if (s.phase !== 'plan') return fail('error.wrong_phase')
      if (s.negotiation) return fail('error.negotiation_open')
      if (s.pitch) return fail('error.pitch_open')
      closeAuction(s)
      autoRenew(s)
      s.phase = 'live'
      s.week = 0
      scheduleComplaint(s)
      scheduleEvents(s)
      planFailureWaves(s)
      rollHostingDefaults(s)
      planProjectEvents(s)
      s.quarterStats.startCash = s.cash
      s.quarterStats.startTreasuryUsd = treasuryValueUsd(
        s,
        marketWeek(s.quarter, 0),
      )
      return

    case 'RESOLVE_INTERRUPT': {
      if (s.phase !== 'live') return fail('error.wrong_phase')
      const error = resolveInterrupt(s, a.choice)
      if (error) return error
      // An alert in the last week holds the quarter open until it's answered (and any card
      // still due that week comes first).
      if (s.week === BALANCE.weeksPerQuarter) {
        s.week--
        checkEvents(s)
        s.week++
        if (!s.interrupt) endQuarter(s)
      }
      return
    }

    case 'NEXT_QUARTER':
      if (s.phase !== 'report') return fail('error.wrong_phase')
      startNextQuarter(s)
      return

    case 'MERGE_CHOOSE':
      if (s.phase !== 'merge') return fail('error.wrong_phase')
      if (!CONTENT.merge.choices.some((c) => c.id === a.choice))
        return fail('error.bad_choice')
      s.mergeChoice = a.choice
      s.phase = 'chapter'
      logEntry(s, 'log.merge_choice', { mergeChoice: a.choice })
      return

    case 'CONTINUE_TO_ACT_2':
      if (s.phase !== 'chapter' || s.act !== 1) return fail('error.wrong_phase')
      s.act = 2
      s.phase = 'intro'
      return

    case 'START_ACT_2':
      if (s.phase !== 'intro') return fail('error.wrong_phase')
      startNextQuarter(s)
      return
  }

  // Everything below is a Plan-phase decision.
  if (s.phase !== 'plan') return fail('error.wrong_phase')

  switch (a.type) {
    case 'BUY_MACHINES': {
      const model = getModel(a.model)
      if (!model) return fail('error.unknown_model', { model: a.model })
      if (!Number.isInteger(a.count) || a.count < 1)
        return fail('error.bad_count')
      if (model.coin === 'ETH' && a.condition === 'new' && newGpusLocked(s))
        return fail('error.gpus_sold_out')
      if (model.coin === 'ETH') {
        const leftKw = gpuKwLeft(s)
        if (model.power_kw * a.count > leftKw + 1e-9)
          return fail('error.gpu_cap', {
            capKw: CONTENT.gpuCap.kwPerQuarter,
            leftKw,
          })
      }
      const unit = buyPriceNow(s, model, a.condition)
      const cost = unit === undefined ? undefined : unit * a.count
      if (cost === undefined) {
        return fail('error.not_for_sale', {
          model: a.model,
          condition: a.condition,
        })
      }
      const site = s.sites.find((x) => x.id === a.siteId)
      if (!site) return fail('error.unknown_site')
      if (underMoratorium(s, site.id))
        return fail('error.moratorium', {
          tier: site.tier,
          at: CONTENT.heat.moratoriumAt,
        })
      const freeKw = capacityKw(site) - usedKw(s, site.id)
      const neededKw = model.power_kw * a.count
      if (neededKw > freeKw + 1e-9) {
        return fail('error.no_capacity', { tier: site.tier, freeKw, neededKw })
      }
      if (cost > s.cash)
        return fail('error.no_cash', { costUsd: cost, cashUsd: s.cash })
      s.cash -= cost
      addMachines(s, a.model, a.condition, a.count, site.id)
      logEntry(s, 'log.bought', {
        count: a.count,
        model: a.model,
        condition: a.condition,
        costUsd: cost,
      })
      return
    }

    case 'SELL_MACHINES': {
      const lot = s.machines.find((l) => l.id === a.lotId)
      if (!lot) return fail('error.unknown_lot')
      if (!Number.isInteger(a.count) || a.count < 1)
        return fail('error.bad_count')
      if (a.count > lot.count)
        return fail('error.too_many_units', { have: lot.count })
      const valueUsd = removeMachines(s, lot, a.count)
      s.cash += valueUsd
      logEntry(s, 'log.sold', { count: a.count, model: lot.model, valueUsd })
      return
    }

    case 'REPAIR_MACHINES': {
      const lot = s.machines.find((l) => l.id === a.lotId)
      if (!lot) return fail('error.unknown_lot')
      if (lot.failed === 0) return fail('error.nothing_to_repair')
      const cost = lot.failed * repairCostPerUnit(lot.model)
      if (cost > s.cash)
        return fail('error.no_cash', { costUsd: cost, cashUsd: s.cash })
      s.cash -= cost
      logEntry(s, 'log.repaired', {
        count: lot.failed,
        model: lot.model,
        costUsd: cost,
      })
      lot.failed = 0
      return
    }

    case 'BID_AUCTION': {
      const blocked = bidBlocker(s, a.bidUsd, a.siteId)
      if (blocked) return blocked
      placeBid(s, a.bidUsd, a.siteId)
      return
    }

    case 'RAISE': {
      const blocked = raiseBlocker(s, a.round)
      if (blocked) return blocked
      takeRaise(s, a.round)
      return
    }

    case 'READ_MARKET': {
      const blocked = readMarketBlocker(s)
      if (blocked) return blocked
      readMarket(s)
      return
    }

    case 'HIRE': {
      const blocked = hireBlocker(s, a.hire)
      if (blocked) return blocked
      hire(s, a.hire)
      return
    }

    case 'FIRE': {
      const blocked = fireBlocker(s, a.hire)
      if (blocked) return blocked
      fire(s, a.hire)
      return
    }

    case 'PITCH_START': {
      const blocked = pitchBlocker(s, a.round)
      if (blocked) return blocked
      startPitch(s, a.round)
      return
    }

    case 'PITCH_COUNTER':
      return pitchCounter(s, a.preMoneyUsd)

    case 'PITCH_ACCEPT':
      return pitchAccept(s)

    case 'PITCH_WALK':
      return pitchWalk(s)

    case 'SET_HODL': {
      if (!(a.pct >= 0 && a.pct <= 1)) return fail('error.bad_pct')
      for (const coin of a.coin ? [a.coin] : COINS) {
        if (s.hodlPct[coin] === a.pct) continue
        s.hodlPct[coin] = a.pct
        logEntry(s, 'log.hodl', { sellPct: 1 - a.pct, coin })
      }
      return
    }

    case 'SCOUT_SITES': {
      const tier = getTier(a.tier)
      if (
        !tier ||
        tierIndex(a.tier) === 0 ||
        tierIndex(a.tier) > topTierIndex(s) + 1
      ) {
        return fail('error.cannot_scout', { tier: a.tier })
      }
      if (
        (BALANCE.sites.noScoutingNeeded as readonly string[]).includes(tier.id)
      ) {
        return fail('error.no_scouting_needed', { tier: tier.id })
      }
      const notYet = tierNotAvailable(s, tier.id)
      if (notYet) return notYet
      const cost = BALANCE.bandwidth.scout
      if (s.bandwidth < cost)
        return fail('error.no_bandwidth', { needed: cost, have: s.bandwidth })
      s.bandwidth -= cost
      // New offers for a tier replace any old ones for that tier.
      const offers = rollOffers(s, tier)
      s.siteOffers = [
        ...s.siteOffers.filter((o) => o.tier !== tier.id),
        ...offers,
      ]
      logEntry(s, 'log.scouted', { count: offers.length, tier: tier.id })
      return
    }

    case 'BUILD_SITE': {
      let terms: {
        tier: string
        rentUsdQ: number
        capexUsd: number
        powerPriceMult: number
        flaw: string | null
      }
      if ('offerId' in a) {
        const offer = s.siteOffers.find((o) => o.id === a.offerId)
        if (!offer) return fail('error.unknown_offer')
        terms = offer
      } else {
        const tier = getTier(a.tier)
        if (
          !tier ||
          tierIndex(a.tier) === 0 ||
          tierIndex(a.tier) > topTierIndex(s) + 1
        ) {
          return fail('error.cannot_scout', { tier: a.tier })
        }
        if (
          !(BALANCE.sites.noScoutingNeeded as readonly string[]).includes(
            tier.id,
          )
        ) {
          return fail('error.needs_scouting', { tier: tier.id })
        }
        terms = {
          tier: tier.id,
          rentUsdQ: tier.rent_usd_q,
          capexUsd: baseCapexUsd(tier),
          powerPriceMult: 1,
          flaw: null,
        }
      }
      const notYet = tierNotAvailable(s, terms.tier)
      if (notYet) return notYet
      const cost = BALANCE.bandwidth.build
      if (s.bandwidth < cost)
        return fail('error.no_bandwidth', { needed: cost, have: s.bandwidth })
      // Phased tiers (Texas): this builds phase 1, which signs the site's power contract.
      const tierInfo = getTier(terms.tier)!
      const phased = tierInfo.phases
      const contractType =
        'offerId' in a ? (a.contractType ?? 'fixed') : 'fixed'
      if (phased) {
        const blocked = phaseStartBlocker(s, terms.tier)
        if (blocked) return blocked
        if (!['fixed', 'index'].includes(contractType))
          return fail('error.bad_choice')
      }
      const buildUsd = phased
        ? Math.round(terms.capexUsd * phased.cost_share)
        : terms.capexUsd
      // A financed build (the construction loan) needs only the rest in cash.
      const financed = 'offerId' in a && a.financed === true
      if (financed) {
        const blocked = constructionLoanBlocker(s, {
          tier: terms.tier,
          // Phase 1 signs the contract the loan is secured on.
          contract: phased
            ? { type: contractType, price: 0, startQuarter: 0, endQuarter: 0 }
            : undefined,
        })
        if (blocked) return blocked
      }
      const loanUsd = financed ? constructionLoanUsd(buildUsd) : 0
      if (buildUsd - loanUsd > s.cash) {
        return fail('error.no_cash', {
          costUsd: buildUsd - loanUsd,
          cashUsd: s.cash,
        })
      }
      s.bandwidth -= cost
      if (financed) takeConstructionLoan(s, loanUsd)
      s.cash -= buildUsd
      const site: Site = {
        id: `site-${s.nextId++}`,
        tier: terms.tier,
        readyQuarter:
          s.quarter +
          (phased
            ? phaseBuildQuarters(s, tierInfo)
            : buildQuartersFor(s, tierInfo)),
        rentUsdQ: terms.rentUsdQ,
        powerPriceMult: terms.powerPriceMult,
        flaw: terms.flaw,
      }
      // The hidden flaw is revealed now that it's bought: delays and one-off costs apply.
      site.readyQuarter += flawEffect(site, 'delay_quarters') ?? 0
      if (phased) {
        site.phases = [site.readyQuarter]
        site.phaseCapexUsd = buildUsd
        // The contract is signed now and negotiated like a renewal this Plan phase (its term
        // ends this quarter; untouched, it takes the opening offer at the end of the Plan).
        signContract(
          s,
          site,
          contractType,
          normalPriceUsdKwh(site, s.quarter, contractType),
          0,
        )
      }
      s.cash += flawEffect(site, 'cash') ?? 0
      s.sites.push(site)
      recalcHeat(s, site)
      logEntry(s, 'log.site_built', {
        tier: site.tier,
        costUsd: terms.capexUsd,
        quarter: CONTENT.quarters[site.readyQuarter] ?? '—',
      })
      if (site.flaw)
        logEntry(s, 'log.site_flaw', { tier: site.tier, flaw: site.flaw })
      if ('offerId' in a)
        s.siteOffers = s.siteOffers.filter((o) => o.id !== a.offerId)
      return
    }

    case 'SELL_TREASURY': {
      if (a.coin !== 'BTC' && a.coin !== 'ETH') return fail('error.bad_choice')
      if (!(a.pct > 0 && a.pct <= 1)) return fail('error.bad_pct')
      if (s.treasury[a.coin] <= 0)
        return fail('error.nothing_to_sell', { coin: a.coin })
      const bw = BALANCE.bandwidth.sellTreasury
      if (s.bandwidth < bw)
        return fail('error.no_bandwidth', { needed: bw, have: s.bandwidth })
      s.bandwidth -= bw
      const coins = s.treasury[a.coin] * a.pct
      const valueUsd = sellTreasury(s, a.pct, marketWeek(s.quarter, 0), a.coin)
      logEntry(s, 'log.treasury_sold', {
        amount: `${coins.toFixed(4)} ${a.coin}`,
        sharePct: a.pct,
        soldCoin: a.coin,
        valueUsd,
      })
      return
    }

    case 'NEGOTIATE_START': {
      const blocked = startBlocker(s, a.siteId, a.contractType, a.term)
      if (blocked) return blocked
      startNegotiation(s, a.siteId, a.contractType, a.term)
      return
    }

    case 'NEGOTIATE_COUNTER':
      return counter(s, a.priceUsdKwh)

    case 'NEGOTIATE_ACCEPT':
      return acceptOffer(s)

    case 'NEGOTIATE_WALK':
      return walkOut(s)

    case 'ACCEPT_RENEWAL': {
      if (s.negotiation) return fail('error.negotiation_open')
      const blocked = acceptBlocker(s, a.siteId, a.contractType)
      if (blocked) return blocked
      acceptOpening(
        s,
        s.sites.find((x) => x.id === a.siteId)!,
        a.contractType,
      )
      return
    }

    case 'OUTREACH': {
      const blocked = outreachBlocker(s, a.siteId)
      if (blocked) return blocked
      doOutreach(s, a.siteId)
      return
    }

    case 'MITIGATE_NOISE': {
      const blocked = mitigationBlocker(s, a.siteId)
      if (blocked) return blocked
      doMitigation(s, a.siteId)
      return
    }

    case 'TAKE_LOAN': {
      const blocked = borrowBlocker(s, a.amountUsd)
      if (blocked) return blocked
      takeEquipmentLoan(s, a.amountUsd)
      return
    }

    case 'REPAY_LOAN':
      return repayEquipmentLoan(s)

    case 'REPAY_CONSTRUCTION_LOAN':
      return repayConstructionLoan(s)

    case 'BUILD_PHASE': {
      const blocked = phaseBlocker(s, a.siteId, a.financed === true)
      if (blocked) return blocked
      buildPhase(s, a.siteId, a.financed === true)
      return
    }

    case 'UPGRADE_TRANSFORMER': {
      const blocked = transformerBlocker(s, a.siteId)
      if (blocked) return blocked
      upgradeTransformer(s, a.siteId)
      return
    }

    case 'TAKE_CRYPTO_LOAN': {
      const blocked = cryptoBorrowBlocker(s, a.coin, a.amountUsd)
      if (blocked) return blocked
      takeCryptoLoan(s, a.coin, a.amountUsd)
      return
    }

    case 'REPAY_CRYPTO_LOAN':
      return repayCryptoLoan(s)

    case 'HOST_START': {
      const blocker = hostingBlocker(s, a.siteId, a.kw)
      if (blocker) return blocker
      startHosting(s, a.siteId, a.kw)
      return
    }

    case 'HOST_END':
      return endHosting(s, a.contractId)

    case 'PROJECT_OPEN': {
      const blocker = openBlocker(s, a)
      if (blocker) return blocker
      openProject(s, a)
      return
    }

    case 'PROJECT_SIGN_TENANT':
      return signTenant(s, a.projectId, a.offerId)

    case 'PROJECT_SPOT':
      return useSpot(s, a.projectId)

    case 'PROJECT_FUND_CASH':
      return fundWithCash(s, a.projectId)

    case 'PROJECT_CANCEL':
      return cancelProject(s, a.projectId)

    case 'PROJECT_START': {
      const blocker = buildBlocker(s, a.projectId)
      if (blocker) return blocker
      startBuild(s, a.projectId)
      return
    }

    case 'PROJECT_SELL_GPUS': {
      const blocker = sellGpusBlocker(s, a.projectId)
      if (blocker) return blocker
      sellGpus(s, a.projectId)
      return
    }

    case 'PROJECT_SELL': {
      const blocker = sellBlocker(s, a.projectId)
      if (blocker) return blocker
      sellProject(s, a.projectId)
      return
    }

    case 'LEAVE_SITE': {
      const site = s.sites.find((x) => x.id === a.siteId)
      if (!site) return fail('error.unknown_site')
      if (tierIndex(site.tier) === 0) return fail('error.cannot_leave_garage')
      const { penaltyUsd, machinesUsd } = leavingTerms(s, site)
      if (penaltyUsd > s.cash + machinesUsd) {
        return fail('error.no_cash', {
          costUsd: penaltyUsd,
          cashUsd: s.cash + machinesUsd,
        })
      }
      for (const lot of s.machines.filter((l) => l.siteId === site.id)) {
        const count = lot.count
        const valueUsd = removeMachines(s, lot, count)
        s.cash += valueUsd
        logEntry(s, 'log.sold', { count, model: lot.model, valueUsd })
      }
      s.cash -= penaltyUsd
      // Hosting there ends with the lease (the clients leave with it; no separate fee).
      s.hosting = s.hosting.filter((h) => h.siteId !== site.id)
      s.sites = s.sites.filter((x) => x !== site)
      delete s.siteHeat[site.id]
      logEntry(s, 'log.site_left', { tier: site.tier, penaltyUsd })
      return
    }
  }
}

function tierNotAvailable(s: GameState, tierId: string): Message | undefined {
  const from = getTier(tierId)!.available_from
  if (from && CONTENT.quarters[s.quarter] < from) {
    return fail('error.tier_not_available', { tier: tierId, from })
  }
}
