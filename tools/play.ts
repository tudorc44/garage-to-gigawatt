// Terminal version of Act I: Plan phase → live quarter (13 weeks) → quarter report,
// until the Merge, bankruptcy, or "quit".  Run: npm run play  (options: --seed N, --fast)
// This file is a UI: it reads the game state, sends actions, and prints text via t().
import { createInterface } from 'node:readline'
import { BALANCE, CONTENT } from '../src/content/index.ts'
import { fmt } from '../src/ui/format.ts'
import { t, tDynamic, type MessageKey } from '../src/i18n/t.ts'
import { applyAction, type Action } from '../src/sim/actions.ts'
import { advance } from '../src/sim/advance.ts'
import { newGame, type GameState } from '../src/sim/state.ts'
import { URI_POWER_MULT, interruptChoices } from '../src/sim/selectors.ts'
import { openingOfferUsdKwh, renewalDue } from '../src/sim/systems/contracts.ts'
import { ltv } from '../src/sim/systems/cryptoLoan.ts'
import {
  isShutDown,
  siteHeatValue,
  underMoratorium,
} from '../src/sim/systems/heat.ts'
import { defaultChoice } from '../src/sim/systems/interrupts.ts'
import { repairCostPerUnit } from '../src/sim/systems/machines.ts'
import {
  buyPrice,
  getModel,
  leadTimeQuarters,
  marketWeek,
  previousMarketWeek,
  revenuePerUnitDay,
} from '../src/sim/systems/market.ts'
import {
  baseCapexUsd,
  capacityKw,
  isReady,
  powerPriceUsdKwh,
  tierIndex,
  topTierIndex,
  usedKw,
} from '../src/sim/systems/sites.ts'
import { treasuryValueUsd } from '../src/sim/systems/treasury.ts'
import { leagueTable, yourRank } from '../src/sim/systems/rivals.ts'

// ---------- input / output ----------

const args = process.argv.slice(2)
const seedArg = args.indexOf('--seed')
const seed =
  seedArg >= 0 ? Number(args[seedArg + 1]) : Math.floor(Math.random() * 1e9)
const fast = args.includes('--fast') || !process.stdout.isTTY

const rl = createInterface({ input: process.stdin })
const lines = rl[Symbol.asyncIterator]()

/** Asks for a line of input. End of input (e.g. a piped script) counts as "quit". */
async function ask(prompt: string): Promise<string> {
  process.stdout.write(prompt)
  const next = await lines.next()
  const answer = next.done ? 'quit' : String(next.value).trim()
  if (!process.stdin.isTTY) console.log(answer) // echo, so piped transcripts read well
  return answer
}

const say = (key: MessageKey, params?: Record<string, string | number>) =>
  console.log(t(key, params))
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const header = (text: string) =>
  console.log(`\n══ ${text} ${'═'.repeat(Math.max(0, 60 - text.length))}`)
const coins = (n: number) =>
  n.toLocaleString('en-US', { maximumFractionDigits: 4 })
const hashOf = (coin: 'BTC' | 'ETH', v: number) =>
  fmt.hash(v, coin === 'ETH' ? 'MH' : 'TH')
const change = (x: number) => fmt.delta(x, 'pct', { dp: 1 })
const name = (
  kind: 'machine' | 'site' | 'flaw' | 'condition' | 'rival',
  id: string,
) => tDynamic(`${kind}.${id}`, id)

function bye(): never {
  say('play.bye')
  rl.close()
  process.exit(0)
}

// ---------- screens ----------

function showStatus(s: GameState) {
  const w = marketWeek(s.quarter, 0)
  say('play.status', {
    cashUsd: s.cash,
    bandwidth: s.bandwidth,
    btcHodlPct: s.hodlPct.BTC,
    ethHodlPct: s.hodlPct.ETH,
    btc: coins(s.treasury.BTC),
    eth: coins(s.treasury.ETH),
    treasuryUsd: treasuryValueUsd(s, w),
  })
  if (s.cryptoLoan) {
    say('play.crypto_loan_status', {
      balanceUsd: s.cryptoLoan.balanceUsd,
      pledged: `${s.cryptoLoan.collateral.toFixed(4)} ${s.cryptoLoan.coin}`,
      ltvPct: ltv(s, marketWeek(s.quarter, 0)),
    })
  }
  if (s.equipmentLoan) {
    say('play.loan_status', {
      balanceUsd: s.equipmentLoan.balanceUsd,
      aprPct: s.equipmentLoan.apr,
    })
  }
}

function showPlan(s: GameState) {
  const w = marketWeek(s.quarter, 0)
  header(t('play.plan_header', { quarter: CONTENT.quarters[s.quarter] }))
  showStatus(s)
  say('play.prices', {
    btcUsd: w.btc_usd,
    ethUsd: w.eth_usd,
    hashprice: fmt.money(w.btc_hashprice_usd_ph_day),
    ethRev: fmt.money(w.eth_rev_usd_mh_day, { exact: true, dp: 4 }),
  })

  console.log()
  say('play.sites')
  s.sites.forEach((site, i) => {
    let line = t('play.site_line', {
      n: i + 1,
      tier: name('site', site.tier),
      usedKw: usedKw(s, site.id),
      capKw: capacityKw(site),
      power: fmt.cents(powerPriceUsdKwh(site, s.quarter)),
      rentUsd: site.rentUsdQ,
    })
    if (!isReady(site, s.quarter)) {
      line += t('play.site_building', {
        quarter: CONTENT.quarters[site.readyQuarter] ?? '—',
      })
    }
    if (site.flaw)
      line += t('play.site_flaw', { flaw: name('flaw', site.flaw) })
    line += t('play.site_heat', {
      heat: Math.round(siteHeatValue(s, site.id)),
    })
    if (site.contract) {
      line += renewalDue(s, site)
        ? t('play.site_renewal_due', {
            contract: site.contract.type,
            opening: fmt.cents(
              openingOfferUsdKwh(site, s.quarter, site.contract.type),
            ),
          })
        : t('play.site_contract', {
            contract: site.contract.type,
            quarter: CONTENT.quarters[site.contract.endQuarter] ?? '—',
          })
    }
    if (site.surcharge) line += t('play.site_rate_hike')
    if (isShutDown(s, site.id)) line += t('play.site_shut_down')
    else if (underMoratorium(s, site.id)) line += t('play.site_moratorium')
    console.log(line)
  })

  console.log()
  say('play.machines')
  if (s.machines.length === 0) say('play.none')
  s.machines.forEach((lot, i) => {
    let line = t('play.batch_line', {
      n: i + 1,
      count: lot.count,
      model: lot.model,
      condition: lot.condition,
      site: String(s.sites.findIndex((x) => x.id === lot.siteId) + 1),
    })
    if (lot.earnsFromQuarter > s.quarter) {
      line += t('play.batch_waiting', {
        quarter: CONTENT.quarters[lot.earnsFromQuarter] ?? '—',
      })
    }
    if (lot.failed > 0) {
      line += t('play.batch_broken', {
        failed: lot.failed,
        repairUsd: lot.failed * repairCostPerUnit(lot.model),
      })
    }
    console.log(line)
  })

  console.log()
  say('play.market')
  const ready = s.sites.filter((x) => isReady(x, s.quarter))
  const cheapestPower = Math.min(
    ...ready.map((x) => powerPriceUsdKwh(x, s.quarter)),
  )
  CONTENT.machines.forEach((m, i) => {
    if (CONTENT.quarters[s.quarter] < m.available_from) {
      say('play.market_soon', {
        n: i + 1,
        model: m.id,
        quarter: m.available_from,
      })
      return
    }
    const price = (c: 'new' | 'used') => {
      const p = buyPrice(m, s.quarter, c)
      if (p === undefined) return t('play.market_na')
      const lead = leadTimeQuarters(m, s.quarter, c)
      return fmt.money(p) + (lead > 0 ? t('play.market_lead', { n: lead }) : '')
    }
    const profit = revenuePerUnitDay(m, w) - m.power_kw * 24 * cheapestPower
    say('play.market_line', {
      n: i + 1,
      model: m.id,
      coin: m.coin,
      hashrate: hashOf(m.coin, m.hashrate),
      kw: m.power_kw,
      newPrice: price('new'),
      usedPrice: price('used'),
      profit: fmt.signed(profit),
    })
  })

  console.log()
  say('play.ladder')
  const top = topTierIndex(s)
  for (const tier of CONTENT.siteTiers.slice(1, top + 2)) {
    const params = {
      id: tier.id,
      tier: name('site', tier.id),
      capKw: tier.capacity_kw,
      capexUsd: baseCapexUsd(tier),
      quarters: tier.build_quarters,
    }
    if (
      tier.available_from &&
      CONTENT.quarters[s.quarter] < tier.available_from
    ) {
      say('play.ladder_locked', { ...params, quarter: tier.available_from })
    } else if (
      (BALANCE.sites.noScoutingNeeded as readonly string[]).includes(tier.id)
    ) {
      say('play.ladder_direct', params)
    } else if (tierIndex(tier.id) <= top + 1) {
      say('play.ladder_scout', params)
    }
  }

  if (s.auction) {
    const a = s.auction
    console.log()
    say('play.auction', {
      count: a.count,
      model: a.model,
      listUsd: a.unitListUsd,
      valueUsd: a.count * a.unitListUsd,
      reserveUsd: a.reserveUsd,
      kw: fmt.power(getModel(a.model)!.power_kw * a.count),
      rivals: a.bids.map((b) => name('rival', b.rival)).join(', '),
    })
  }

  if (s.siteOffers.length > 0) {
    console.log()
    say('play.offers')
    s.siteOffers.forEach((o, i) =>
      say('play.offer_line', {
        n: i + 1,
        tier: name('site', o.tier),
        capexUsd: o.capexUsd,
        rentUsd: o.rentUsdQ,
        powerPct: o.powerPriceMult,
      }),
    )
  }
}

/** Turns a typed command into an action. Returns a message key on bad input. */
function parse(
  s: GameState,
  input: string,
): Action | 'help' | 'look' | 'quit' | MessageKey {
  const [cmd, ...rest] = input.toLowerCase().split(/\s+/)
  const num = (i: number) => Number(rest[i])
  const item = <T>(list: T[], i: number): T | undefined => list[num(i) - 1]
  switch (cmd) {
    case 'help':
    case 'look':
    case 'quit':
      return cmd
    case 'end':
      return { type: 'END_PLAN' }
    case 'raise':
      return {
        type: 'RAISE',
        round:
          { ff: 'friends_family', a: 'series_a', ipo: 'ipo_spac' }[
            rest[0] ?? ''
          ] ??
          rest[0] ??
          '',
      }
    case 'hodl':
      return {
        type: 'SET_HODL',
        pct: num(0) / 100,
        coin: rest[1] === 'btc' ? 'BTC' : rest[1] === 'eth' ? 'ETH' : undefined,
      }
    case 'scout':
      return { type: 'SCOUT_SITES', tier: rest[0] ?? '' }
    case 'build': {
      if (/^\d+$/.test(rest[0] ?? '')) {
        const offer = item(s.siteOffers, 0)
        return offer
          ? { type: 'BUILD_SITE', offerId: offer.id }
          : 'play.bad_number'
      }
      return { type: 'BUILD_SITE', tier: rest[0] ?? '' }
    }
    case 'sellcoins': {
      const coin =
        rest[0] === 'btc' ? 'BTC' : rest[0] === 'eth' ? 'ETH' : undefined
      if (!coin) return 'play.bad_number'
      return { type: 'SELL_TREASURY', coin, pct: num(1) / 100 }
    }
    case 'cloan': {
      const coin =
        rest[0] === 'btc' ? 'BTC' : rest[0] === 'eth' ? 'ETH' : undefined
      if (!coin) return 'play.bad_number'
      return { type: 'TAKE_CRYPTO_LOAN', coin, amountUsd: num(1) }
    }
    case 'crepay':
      return { type: 'REPAY_CRYPTO_LOAN' }
    case 'negotiate': {
      const site = item(s.sites, 0)
      if (!site) return 'play.bad_number'
      const term = rest.includes('8') ? 8 : 4
      return {
        type: 'NEGOTIATE_START',
        siteId: site.id,
        contractType: rest.includes('index')
          ? 'index'
          : rest.includes('fixed')
            ? 'fixed'
            : (site.contract?.type ?? 'fixed'),
        term,
      }
    }
    case 'counter':
      return { type: 'NEGOTIATE_COUNTER', priceUsdKwh: num(0) / 100 }
    case 'accept':
      return { type: 'NEGOTIATE_ACCEPT' }
    case 'walk':
      return { type: 'NEGOTIATE_WALK' }
    case 'renew': {
      const site = item(s.sites, 0)
      if (!site) return 'play.bad_number'
      return {
        type: 'ACCEPT_RENEWAL',
        siteId: site.id,
        contractType:
          rest[1] === 'index'
            ? 'index'
            : rest[1] === 'fixed'
              ? 'fixed'
              : (site.contract?.type ?? 'fixed'),
      }
    }
    case 'talk':
    case 'mitigate': {
      const site = item(s.sites, 0)
      if (!site) return 'play.bad_number'
      return cmd === 'talk'
        ? { type: 'OUTREACH', siteId: site.id }
        : { type: 'MITIGATE_NOISE', siteId: site.id }
    }
    case 'loan':
      return { type: 'TAKE_LOAN', amountUsd: num(0) }
    case 'repay':
      return { type: 'REPAY_LOAN' }
    case 'bid': {
      const site = s.sites[(rest[1] ? num(1) : 1) - 1]
      if (!site) return 'play.bad_number'
      return { type: 'BID_AUCTION', bidUsd: num(0), siteId: site.id }
    }
    case 'leave': {
      const site = item(s.sites, 0)
      return site ? { type: 'LEAVE_SITE', siteId: site.id } : 'play.bad_number'
    }
    case 'buy': {
      const model = item(CONTENT.machines, 0)
      const used = rest.includes('used')
      const siteArg = rest.slice(2).find((x) => /^\d+$/.test(x))
      const site = s.sites[(siteArg ? Number(siteArg) : 1) - 1]
      if (!model || !site) return 'play.bad_number'
      return {
        type: 'BUY_MACHINES',
        model: model.id,
        condition: used ? 'used' : 'new',
        count: num(1),
        siteId: site.id,
      }
    }
    case 'sell':
    case 'repair': {
      const lot = item(s.machines, 0)
      if (!lot) return 'play.bad_number'
      return cmd === 'sell'
        ? { type: 'SELL_MACHINES', lotId: lot.id, count: num(1) }
        : { type: 'REPAIR_MACHINES', lotId: lot.id }
    }
    default:
      return 'play.unknown_command'
  }
}

async function planPhase(s: GameState): Promise<GameState> {
  showPlan(s)
  console.log()
  say('play.help')
  for (;;) {
    const parsed = parse(s, await ask(t('play.prompt')))
    if (parsed === 'quit') bye()
    if (parsed === 'help') {
      say('play.help')
      continue
    }
    if (parsed === 'look') {
      showPlan(s)
      continue
    }
    if (typeof parsed === 'string') {
      say(parsed)
      continue
    }
    const r = applyAction(s, parsed)
    if (!r.ok) {
      console.log(t(r.error.key, r.error.params))
      continue
    }
    s = r.state
    if (parsed.type === 'END_PLAN') return s
    // An auction bid is settled at once: say who won. Negotiation moves say what happened.
    if (parsed.type === 'BID_AUCTION') {
      const e = s.log.at(-1)!
      console.log(t(e.key, e.params))
    } else if (parsed.type.startsWith('NEGOTIATE_') && !s.negotiation) {
      const e = s.log.findLast((x) => x.key.startsWith('log.negotiation_'))!
      console.log(t(e.key, e.params))
    } else say('play.ok')
    if (s.negotiation) {
      const n = s.negotiation
      say(n.final ? 'play.negotiation_final' : 'play.negotiation', {
        offer: `${(n.offerUsdKwh * 100).toFixed(2)}¢`,
        round: n.round + 1,
        rounds: CONTENT.negotiation.rounds,
      })
    }
    showStatus(s)
  }
}

async function livePhase(s: GameState): Promise<GameState> {
  header(t('play.live_header', { quarter: CONTENT.quarters[s.quarter] }))
  while (s.phase === 'live') {
    if (s.interrupt) {
      s = await answerInterrupt(s)
      continue
    }
    s = advance(s)
    const wk = s.quarterStats.weeks.at(-1)!
    const prev = previousMarketWeek(s.quarter, wk.week - 1)
    let line = t('play.week_line', {
      week: String(wk.week).padStart(2),
      date: wk.date,
      btcUsd: wk.btcUsd,
      btcChange: prev ? change(wk.btcUsd / prev.btc_usd - 1) : '',
      ethUsd: wk.ethUsd,
      ethChange: prev ? change(wk.ethUsd / prev.eth_usd - 1) : '',
      revenueUsd: wk.revenueUsd,
      powerUsd: wk.powerCostUsd,
      cashUsd: wk.cash,
    })
    if (wk.batchesOff > 0) line += t('play.week_off', { n: wk.batchesOff })
    if (wk.failures > 0) line += t('play.week_failures', { n: wk.failures })
    console.log(line)
    if (!fast) await sleep(250)
  }
  return s
}

async function answerInterrupt(s: GameState): Promise<GameState> {
  const alert = s.interrupt!
  const choices = interruptChoices(s)
  const label = (id: string) => tDynamic(`interrupt.${alert.id}.${id}`, id)
  const fallback = defaultChoice(s)
  console.log()
  if (alert.id === 'neighbour_complaint') {
    const site = s.sites.find((x) => x.id === alert.siteId)!
    say('play.complaint', {
      tier: name('site', site.tier),
      heat: Math.round(siteHeatValue(s, site.id)),
    })
  } else if (alert.id === 'margin_call') {
    say('play.margin_call', {
      coin: alert.coin,
      balanceUsd: s.cryptoLoan!.balanceUsd,
      ltvPct: alert.ltv ?? 0,
    })
  } else if (alert.id === 'uri') {
    say('play.uri', {
      week: alert.week + 2,
      mw: fmt.power(alert.curtail!.mw * 1000),
      creditUsd: alert.curtail!.creditUsd,
      mult: URI_POWER_MULT,
    })
  } else if (alert.id === 'curtailment') {
    say('play.grid', {
      week: alert.week + 2,
      mw: fmt.power(alert.curtail!.mw * 1000),
      creditUsd: alert.curtail!.creditUsd,
      forgoneUsd: alert.curtail!.forgoneUsd,
    })
  } else {
    say('play.alert', {
      coin: alert.coin,
      change: change(alert.changePct),
      btc: coins(s.treasury.BTC),
      eth: coins(s.treasury.ETH),
      treasuryUsd: treasuryValueUsd(s, marketWeek(s.quarter, alert.week)),
    })
  }
  choices.forEach((c, i) =>
    say('play.choice_line', { n: i + 1, label: label(c.id) }),
  )
  const answer = await ask(t('play.choose', { label: label(fallback) }))
  if (answer === 'quit') bye()
  const picked = choices[Number(answer) - 1]?.id ?? fallback
  const r = applyAction(s, { type: 'RESOLVE_INTERRUPT', choice: picked })
  console.log()
  return r.ok ? r.state : s
}

function showReport(s: GameState) {
  const r = s.reports.at(-1)!
  const perCoin = (v: number | null) => (v === null ? '—' : fmt.money(v))
  header(t('play.report_header', { quarter: r.quarter }))
  say('play.report_hashrate', {
    eth: hashOf('ETH', r.hashrate.ETH),
    btc: hashOf('BTC', r.hashrate.BTC),
  })
  say('play.report_money', {
    revenueUsd: r.revenueUsd,
    powerUsd: r.powerCostUsd,
    rentUsd: r.rentUsd,
  })
  say('play.report_mined', {
    btc: coins(r.coinsMined.BTC),
    eth: coins(r.coinsMined.ETH),
  })
  say('play.report_cost', {
    btc: perCoin(r.costPerCoinUsd.BTC),
    eth: perCoin(r.costPerCoinUsd.ETH),
  })
  say('play.report_failures', { failures: r.failures, broken: r.brokenUnits })
  say('play.report_treasury', {
    btc: coins(r.treasury.BTC),
    eth: coins(r.treasury.ETH),
    treasuryUsd: r.treasuryValueUsd,
  })
  say('play.report_cash', { cashUsd: r.cash })
  if (r.gridCreditsUsd > 0)
    say('play.report_grid', { creditsUsd: r.gridCreditsUsd })
  if (r.rateHikeUsd > 0) say('play.report_rate_hike', { usd: r.rateHikeUsd })
  if (r.forcedSale) say('play.report_forced', r.forcedSale)
  showLeague(s)
}

/** The league table: you and the rivals, by value (market cap for rivals). */
function showLeague(s: GameState) {
  const i = s.reports.length - 1
  const { rank, of } = yourRank(s, i)
  console.log()
  say('play.league_header', { rank, of })
  for (const row of leagueTable(s, i)) {
    const r = row.rival
    say('play.league_line', {
      rank: row.rank === null ? ' -' : String(row.rank).padStart(2),
      name: (row.id === 'you'
        ? t('ui.report.you')
        : tDynamic(`rival.${row.id}`, row.id)
      ).padEnd(16),
      value: (row.valueUsd === null
        ? t('ui.report.private')
        : fmt.money(row.valueUsd)
      ).padStart(8),
      scale:
        row.id === 'you'
          ? `${hashOf('ETH', s.reports[i].hashrate.ETH)} · ${hashOf('BTC', s.reports[i].hashrate.BTC)}`
          : r && r.hashrateEhs !== null
            ? `${fmt.power((r.mw ?? 0) * 1000)} · ${fmt.hash(r.hashrateEhs * 1e6, 'TH')}`
            : t('ui.report.not_mining'),
    })
  }
}

// ---------- main loop ----------

console.log()
say('play.title')
say('play.seed', { seed: String(seed) })
say('play.intro')

let state = newGame(seed)
for (;;) {
  if (state.phase === 'plan') state = await planPhase(state)
  else if (state.phase === 'live') state = await livePhase(state)
  else if (state.phase === 'report') {
    showReport(state)
    if ((await ask(t('play.continue'))) === 'quit') bye()
    const r = applyAction(state, { type: 'NEXT_QUARTER' })
    if (r.ok) state = r.state
  } else {
    if (state.phase === 'gameover') {
      showReport(state)
      console.log()
      say('play.gameover', { cashUsd: state.cash })
    } else {
      console.log()
      say('play.ended')
    }
    const w = marketWeek(state.quarter, BALANCE.weeksPerQuarter - 1)
    say('play.final', {
      cashUsd: state.cash,
      treasuryUsd: treasuryValueUsd(state, w),
      machines: state.machines.reduce((n, l) => n + l.count, 0),
    })
    bye()
  }
}
