// Life after the Merge (M78.2; doc 58 v1.1 §3): what a GPU rig or a Larkspur unit earns once Ethereum mining has ended. A lot with a
// `use` (set from the Ventures screen) mines Ethereum Classic, Ravencoin or Ergo, or is rented out on RigShare; an LK unit moves
// to Ethereum Classic by itself at its memory wall. All income is gross dollars a day from the content tables, interpolated
// linearly by date; the power is charged as usual (rental: only for rented hours). Nothing here changes a game in which no lot has a
// `use` and no LK unit exists, so every golden stays byte-identical.
import { CONTENT, type Machine } from '../../content/index.ts'
import type { GameState, MachineLot } from '../state.ts'

export type AltCoinId = 'etc' | 'rvn' | 'erg'

/** Days since 1970-01-01 of an ISO date (pure arithmetic: no clock). */
export function dayNumber(iso: string): number {
  return Math.round(Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))) / 86400000)
}

/** Whether a Larkspur unit has hit its memory wall in the week starting on `weekIso` (the wall's own week counts). */
export function lkAtWall(modelId: string, weekIso: string): boolean {
  const wall = CONTENT.larkspur?.memory.walls[modelId as 'lk5' | 'lk6']
  return wall !== undefined && dayNumber(weekIso) + 6 >= dayNumber(wall)
}

export const isLkModel = (modelId: string): boolean => modelId === 'lk5' || modelId === 'lk6'

/** A value linearly interpolated by date between points (held at the ends); points without the key are skipped. */
function interpolate<P extends { date: string }>(points: P[], key: (p: P) => number | undefined, iso: string): number {
  const pts = points.filter((p) => key(p) !== undefined)
  const d = dayNumber(iso)
  if (pts.length === 0) return 0
  if (d <= dayNumber(pts[0].date)) return key(pts[0])!
  for (let i = 1; i < pts.length; i++) {
    const d1 = dayNumber(pts[i].date)
    if (d <= d1) {
      const d0 = dayNumber(pts[i - 1].date)
      const a = key(pts[i - 1])!
      return a + ((key(pts[i])! - a) * (d - d0)) / (d1 - d0)
    }
  }
  return key(pts.at(-1)!)!
}

/** Gross dollars a day per 60 MH/s of 3060 Ti-equivalent for a coin on a date. */
export function altCoinPer60(coin: AltCoinId, iso: string): number {
  const am = CONTENT.afterMerge
  return am ? interpolate(am.alt_coins.points, (p) => p[coin], iso) : 0
}

/** A Gen 2-class card's rental rate ($ per GPU-hour) and utilisation on a date (Gen 1: half of each). */
export function rentalOn(iso: string, gen1 = false): { rate: number; utilisation: number } {
  const am = CONTENT.afterMerge
  if (!am) return { rate: 0, utilisation: 0 }
  const m = gen1 ? am.rental.gen1_mult : 1
  return {
    rate: interpolate(am.rental.points, (p) => p.usd_per_gpu_hour, iso) * m,
    utilisation: interpolate(am.rental.points, (p) => p.utilisation, iso) * m,
  }
}

/** Whether a model can mine this coin (LK units and the 2015 rig: Ethash family only; GPU rigs: all three). */
export function canMineAlt(model: Machine, coin: AltCoinId): boolean {
  const am = CONTENT.afterMerge
  if (!am || model.coin !== 'ETH') return false
  return isLkModel(model.id) ? !am.alt_coins.gpu_only.includes(coin) : true
}

export const canRent = (model: Machine): boolean => !!CONTENT.afterMerge?.rental.rentable_models.includes(model.id)

/** The plan a lot follows this week instead of its machine's own coin, or undefined (the normal case). */
export interface LotPlan {
  kind: 'alt' | 'rent'
  /** Gross dollars one healthy unit earns a day. */
  revenuePerUnitDay: number
  /** The share of the hours the unit draws power (1 mining; the utilisation when rented). */
  powerShare: number
}

export function lotPlan(lot: MachineLot, model: Machine, weekIso: string): LotPlan | undefined {
  const am = CONTENT.afterMerge
  if (!am) return undefined
  if (isLkModel(model.id)) {
    // (the wall is in the unit's own week: from then on Ethereum Classic, whatever the lot's `use`)
    if (!lkAtWall(model.id, weekIso)) return undefined
    return { kind: 'alt', revenuePerUnitDay: (model.hashrate / am.alt_coins.per_mh) * altCoinPer60('etc', weekIso), powerShare: 1 }
  }
  if (!lot.use) return undefined
  if (lot.use === 'rent') {
    if (!canRent(model)) return undefined
    const r = rentalOn(weekIso, am.rental.gen1_models.includes(model.id))
    return { kind: 'rent', revenuePerUnitDay: am.rental.cards_per_rig * r.rate * 24 * r.utilisation, powerShare: r.utilisation }
  }
  if (!canMineAlt(model, lot.use)) return undefined
  return { kind: 'alt', revenuePerUnitDay: (model.hashrate / am.alt_coins.per_mh) * altCoinPer60(lot.use, weekIso), powerShare: 1 }
}

// ---------- the choice ----------

/** The first quarter the choice is open: the Merge's own quarter is Act I's last, so Act II (2022Q4) on. */
export function afterMergeOpen(state: GameState): boolean {
  return !!CONTENT.afterMerge && state.act >= 2
}

export function lotUseBlocker(state: GameState, lotId: string, use: string | null): { key: 'error.bad_choice' | 'error.unknown_lot' | 'error.wrong_phase' | 'error.use_closed' | 'error.use_not_for_model' } | undefined {
  const lot = state.machines.find((l) => l.id === lotId)
  if (!lot) return { key: 'error.unknown_lot' }
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  if (!afterMergeOpen(state)) return { key: 'error.use_closed' }
  if (use === null) return undefined
  if (use !== 'etc' && use !== 'rvn' && use !== 'erg' && use !== 'rent') return { key: 'error.bad_choice' }
  const model = CONTENT.machines.find((m) => m.id === lot.model) ?? CONTENT.larkspur?.models.find((m) => m.id === lot.model)
  if (!model || isLkModel(model.id)) return { key: 'error.use_not_for_model' }
  if (model.coin !== 'ETH') return { key: 'error.use_not_for_model' }
  if (use === 'rent' ? !canRent(model) : !canMineAlt(model, use)) return { key: 'error.use_not_for_model' }
  return undefined
}
