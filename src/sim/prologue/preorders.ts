// Pre-orders (Alpha 0.3 §2.9; prologue.json › preorders): pay a vendor up front in its window; the
// delivery is rolled at order time on the order's own seeded stream: on time (after the promised
// quarters), late (+2–3 quarters), very late (+4–6) or never (a part refund when the vendor folds,
// at the end of the very-late range: Prologue choice). A conference contact moves 10 points into
// on time, taken from very late first, then never. The unit arrives at the start of its quarter and,
// like any machine, earns from the next one; with no site room it waits in its box.
import { CONTENT } from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import { randomInt, substream, uniform } from '../rng.ts'
import { logEntry, roundCents, type GameState } from '../state.ts'
import { addMachines } from '../systems/machines.ts'
import { getModel } from '../systems/market.ts'
import { P, siteCapacityKw, siteLoadKw } from './setup.ts'
import type { Preorder } from './types.ts'

const label = (q: number) => CONTENT.quarters[q] ?? ''
const fail = (key: Message['key'], params?: Message['params']): Message => ({
  key,
  ...(params ? { params } : {}),
})

export const vendor = (id: string) =>
  P().preorders.vendors.find((v) => v.id === id)

/** The vendors taking orders this quarter. */
export function openVendors(s: GameState) {
  const q = label(s.quarter)
  return P().preorders.vendors.filter(
    (v) => v.window[0] <= q && q <= v.window[1],
  )
}

/** The delivery odds for an order placed now (with a conference contact's edge). */
export function preorderOdds(s: GameState, vendorId: string) {
  const v = vendor(vendorId)!
  const odds = { ...v.odds }
  if (s.prologue!.conferences.length > 0) {
    let shift = P().conference_effect.preorder_on_time_pp
    for (const k of ['severe', 'never'] as const) {
      const take = Math.min(shift, odds[k])
      odds[k] -= take
      odds.on_time += take
      shift -= take
    }
  }
  return odds
}

export function preorderBlocker(
  s: GameState,
  vendorId: string,
): Message | undefined {
  const v = vendor(vendorId)
  if (!v || !openVendors(s).includes(v)) return fail('error.p0_no_preorder')
  if (s.cash < v.price_usd)
    return fail('error.no_cash', { costUsd: v.price_usd, cashUsd: s.cash })
  return undefined
}

/** Places a pre-order: pays now and rolls its fate. */
export function placePreorder(
  s: GameState,
  vendorId: string,
): Message | undefined {
  const blocked = preorderBlocker(s, vendorId)
  if (blocked) return blocked
  const v = vendor(vendorId)!
  const id = `po-${s.nextId++}`
  const r = substream(s.seed, `preorder:${id}`)
  const odds = preorderOdds(s, vendorId)
  const due = s.quarter + v.promised_quarters
  let roll = uniform(r, 0, 1)
  let order: Pick<Preorder, 'outcome' | 'deliverQuarter'>
  if ((roll -= odds.on_time) < 0)
    order = { outcome: 'on_time', deliverQuarter: due }
  else if ((roll -= odds.moderate) < 0)
    order = {
      outcome: 'late',
      deliverQuarter: due + randomInt(r, ...v.moderate_quarters),
    }
  else if (roll - odds.severe < 0)
    order = {
      outcome: 'very_late',
      deliverQuarter: due + randomInt(r, ...v.severe_quarters),
    }
  else order = { outcome: 'never', deliverQuarter: null }
  s.cash = roundCents(s.cash - v.price_usd)
  s.prologue!.preorders.push({
    id,
    vendor: v.id,
    unitShare: v.unit_share,
    paidUsd: v.price_usd,
    orderedQuarter: s.quarter,
    ...order,
    delivered: false,
  })
  logEntry(s, 'log.p0_preorder', { vendor: v.id, costUsd: v.price_usd })
  return undefined
}

/** When a vendor that never delivers folds (and refunds a share). */
export function refundQuarter(o: Preorder): number {
  const v = vendor(o.vendor)!
  return o.orderedQuarter + v.promised_quarters + v.severe_quarters[1]
}

/** At the start of a quarter: units due arrive (into a site with room), folded vendors refund. */
export function deliverPreorders(s: GameState): void {
  for (const o of s.prologue!.preorders) {
    if (o.delivered) continue
    const v = vendor(o.vendor)!
    if (o.outcome === 'never') {
      if (s.quarter >= refundQuarter(o)) {
        const refund = roundCents(o.paidUsd * v.refund_share)
        s.cash = roundCents(s.cash + refund)
        o.delivered = true
        logEntry(s, 'log.p0_preorder_refund', { vendor: v.id, refundUsd: refund })
      }
      continue
    }
    if (o.deliverQuarter === null || s.quarter < o.deliverQuarter) continue
    const kw = getModel(v.model)!.power_kw
    const site = [...s.sites]
      .filter((x) => x.readyQuarter <= s.quarter)
      .sort(
        (a, b) =>
          siteCapacityKw(b) - siteLoadKw(s, b.id) -
          (siteCapacityKw(a) - siteLoadKw(s, a.id)),
      )[0]
    if (!site || siteCapacityKw(site) - siteLoadKw(s, site.id) < kw - 1e-9) {
      if (s.quarter === o.deliverQuarter)
        logEntry(s, 'log.p0_preorder_boxed', { vendor: v.id })
      continue
    }
    addMachines(s, v.model, 'new', 1, site.id)
    o.delivered = true
    logEntry(s, 'log.p0_preorder_arrived', {
      vendor: v.id,
      late: o.deliverQuarter - (o.orderedQuarter + v.promised_quarters),
    })
  }
}

/** Units that arrived but never found room (sold at the used price at the handover). */
export function boxedPreorders(s: GameState): Preorder[] {
  return s.prologue!.preorders.filter(
    (o) =>
      !o.delivered &&
      o.outcome !== 'never' &&
      o.deliverQuarter !== null &&
      s.quarter >= o.deliverQuarter,
  )
}
