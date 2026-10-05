// Act IV's orbital blocks (M29.2; doc 33 §7, IV-D12, IV-D13, IV-D17, IV-D18): a block is a project card with three slots
// (Launch, Tenant, Capital) in one of three shells; it needs an approved constellation licence in its shell before its
// build starts. This file holds the cards, the Tenant slot's offers, the Capital slot (own cash in M29; M31 adds the
// rest), licences, the registry and the link units. The launch manifests and insurance are in orbitLaunch.ts; live
// operation (revenue, telemetry, debris, the alerts) in orbitOps.ts. All values come from the orbit content (ORBIT) and
// the Act IV market rows.
import { CONTENT, act4Row, type MarketQuarterAct4Row } from '../../content/index.ts'
import {
  ORBIT,
  GENERATION_IDS,
  ORBITAL_TENANT_IDS,
  SHELL_IDS,
  registry,
  shell,
  tenantType,
  type GenerationId,
  type OrbitalTenantId,
  type RegistryId,
  type ShellId,
} from '../../content/orbitContent.ts'
import type { Message } from '../../i18n/t.ts'
import { pick, substream } from '../rng.ts'
import {
  act4SeedOf,
  inActIV,
  logEntry,
  type Act4Orbit,
  type GameState,
  type OrbitalBlock,
} from '../state.ts'
import { addGrievance } from './heat.ts'
import { CAPITAL_KINDS, capitalBlocker, setCapital, type CapitalKind } from './orbitCapital.ts'
import { addPc, politicalCapital } from './pcState.ts'
import { scenarioOf } from './market.ts'

const SAT = ORBIT.satellites
const LIC = ORBIT.licences
const TEN = ORBIT.tenants

/** The current quarter's Act IV market row (launch, rents, congestion …). */
export function orbitRow(state: GameState, quarter = state.quarter): MarketQuarterAct4Row {
  return act4Row(quarter, scenarioOf(state))
}

/** The act's orbit record, created on first use. */
export function orbitOf(state: GameState): Act4Orbit {
  state.act4Orbit ??= {
    blocks: [],
    licences: [],
    registry: 'accords',
    linksRented: 0,
    stations: [],
    hardMarketUntil: null,
    cascadeDone: false,
    planned: [],
    safeModeQuarter: null,
    nextN: 1,
    debts: [],
  }
  return state.act4Orbit
}

export const orbitBlock = (state: GameState, id: string): OrbitalBlock | undefined =>
  state.act4Orbit?.blocks.find((b) => b.id === id)

/** A generation's tonnes per MW this quarter, or null while it isn't available. */
export function generationTMw(state: GameState, gen: GenerationId, quarter = state.quarter): number | null {
  const g = SAT.generations.find((x) => x.id === gen)!
  if (g.t_mw !== null) return g.t_mw
  return orbitRow(state, quarter)[g.market_column!] ?? null
}

/** The generations you can open a block with now. */
export const availableGenerations = (state: GameState): GenerationId[] =>
  GENERATION_IDS.filter((g) => generationTMw(state, g) !== null)

/** A block's whole mass to launch: t/MW × MW × (1 + the shell's shielding). */
export function blockMassT(tMw: number, mw: number, shellId: ShellId): number {
  return tMw * mw * (1 + shell(shellId).shielding_share)
}

/** The orbital tenant types that can take this block (an EO processor only small blocks; interactive work low orbits). */
export function eligibleTenants(block: Pick<OrbitalBlock, 'mw' | 'shell'>): OrbitalTenantId[] {
  return ORBITAL_TENANT_IDS.filter((id) => {
    const t = tenantType(id)
    if (t.max_mw !== null && block.mw > t.max_mw) return false
    if (t.workload === 'interactive' && !shell(block.shell).interactive_ok) return false
    return true
  })
}

/** An offer's price: the market's orbital shell rent ($/MW-yr) or GPU-hour price, × the type, + any sovereign premium. */
export function offerPrice(state: GameState, kind: OrbitalBlock['kind'], type: OrbitalTenantId): number {
  const row = orbitRow(state)
  const t = tenantType(type)
  const base = kind === 'shell' ? row.orbital_shell_rent_usd_mw_yr : row.orbital_gpu_usd_hr
  const premiumPct = t.add_sovereign_premium
    ? row.sovereign_premium_pct + registry(orbitOf(state).registry).sovereign_premium_add_pct
    : 0
  return base * t.rent_mult * (1 + premiumPct / 100)
}

/** A year's contract value at this price (shell: rent × MW; cloud: GPU-hours sold at contracted utilisation). */
export function annualValueUsd(kind: OrbitalBlock['kind'], mw: number, price: number): number {
  return kind === 'shell' ? price * mw : price * SAT.gpus.gpus_per_mw * mw * 8760 * SAT.utilisation.contracted
}

/** Draws this quarter's tenant offers for a block whose Tenant slot is empty (own stream per block and quarter). */
export function drawOrbitalOffers(state: GameState, block: OrbitalBlock): void {
  const r = substream(act4SeedOf(state), `orbit_offers:${block.id}:${state.quarter}`)
  const left = eligibleTenants(block)
  block.offers = []
  for (let i = 0; i < TEN.offers_per_block && left.length > 0; i++) {
    const type = pick(r, left)
    left.splice(left.indexOf(type), 1)
    block.offers.push({
      type,
      price: offerPrice(state, block.kind, type),
      termQuarters: Math.round(tenantType(type).term_years * 4),
    })
  }
}

// ---------- opening a block (0 Bandwidth) ----------

export interface OpenBlock {
  kind: OrbitalBlock['kind']
  mw: number
  shell: ShellId
  gen: GenerationId
}

function orbitPlanBlocker(state: GameState): Message | undefined {
  if (!inActIV(state)) return { key: 'error.orbit_unavailable' }
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
}

const bandwidthShort = (state: GameState, needed: number): Message | undefined =>
  state.bandwidth < needed ? { key: 'error.no_bandwidth', params: { needed, have: state.bandwidth } } : undefined

const cashShort = (state: GameState, costUsd: number): Message | undefined =>
  state.cash < costUsd ? { key: 'error.no_cash', params: { costUsd, cashUsd: state.cash } } : undefined

export function openOrbitalBlockBlocker(state: GameState, o: OpenBlock): Message | undefined {
  const blocked = orbitPlanBlocker(state)
  if (blocked) return blocked
  if (!SAT.sizes_mw.includes(o.mw) || !SHELL_IDS.includes(o.shell) || (o.kind !== 'shell' && o.kind !== 'cloud'))
    return { key: 'error.orbit_bad_block' }
  if (!availableGenerations(state).includes(o.gen)) return { key: 'error.orbit_gen_unavailable' }
}

/** Opens a block card (stage proposed) with this quarter's tenant offers. */
export function openOrbitalBlock(state: GameState, o: OpenBlock): OrbitalBlock {
  const orbit = orbitOf(state)
  const n = orbit.nextN++
  const block: OrbitalBlock = {
    id: `ob${n}`,
    n,
    kind: o.kind,
    mw: o.mw,
    shell: o.shell,
    gen: o.gen,
    stage: 'proposed',
    openedQuarter: state.quarter,
    massT: blockMassT(generationTMw(state, o.gen)!, o.mw, o.shell),
    launch: null,
    tenant: null,
    offers: [],
    capital: null,
    buildDoneQuarter: null,
    liveQuarter: null,
    retireQuarter: null,
    capacity: 1,
    gpuHealth: o.kind === 'cloud' ? 1 + SAT.gpus.spares_share : 1,
    insured: null,
    capexSpentUsd: 0,
    telemetry: [],
    lostLaunches: 0,
  }
  drawOrbitalOffers(state, block)
  orbit.blocks.push(block)
  logEntry(state, 'log.orbit.opened', { n, mw: o.mw })
  return block
}

/** A block in the planning stage (proposed) that's yours to change. */
function proposedBlock(state: GameState, blockId: string): OrbitalBlock | Message {
  const block = orbitBlock(state, blockId)
  if (!block) return { key: 'error.orbit_bad_block' }
  return block
}

// ---------- the Tenant slot (0 Bandwidth to accept an offer; the negotiation is cut, mine, reversible) ----------

export function signOrbitalTenantBlocker(state: GameState, blockId: string, offer: number | 'spot'): Message | undefined {
  const blocked = orbitPlanBlocker(state)
  if (blocked) return blocked
  const block = proposedBlock(state, blockId)
  if ('key' in block) return block
  if (block.tenant !== null) return { key: 'error.orbit_slot_filled' }
  if (block.stage === 'retired' || block.stage === 'sold') return { key: 'error.orbit_bad_block' }
  if (offer !== 'spot' && !block.offers[offer]) return { key: 'error.orbit_offer_unknown' }
}

/** Signs an offer (its price locked; any prepayment comes in now, credited against its rent) or takes spot. */
export function signOrbitalTenant(state: GameState, blockId: string, offer: number | 'spot'): void {
  const block = orbitBlock(state, blockId)!
  if (offer === 'spot') {
    block.tenant = 'spot'
    block.offers = []
    logEntry(state, 'log.orbit.spot', { n: block.n })
    return
  }
  const o = block.offers[offer]
  const prepaidUsd = tenantType(o.type).prepay_share * annualValueUsd(block.kind, block.mw, o.price)
  state.cash += prepaidUsd
  block.tenant = {
    type: o.type,
    price: o.price,
    termQuarters: o.termQuarters,
    signedQuarter: state.quarter,
    // (the quarter it should go live: two after its launch quarter, orbitLaunch.ts)
    dueQuarter: block.launch ? block.launch.quarter + 2 : null,
    endQuarter: null,
    prepaidLeftUsd: prepaidUsd,
  }
  block.offers = []
  logEntry(state, 'log.orbit.tenant_signed', { n: block.n, tenantName: tenantType(o.type).name, prepaidUsd })
}

// ---------- the Capital slot (1 Bandwidth; M31.2: cash, export credit, project debt, co-funding: orbitCapital.ts) ----------

export const ORBIT_CAPITAL_BANDWIDTH = 1

export function arrangeOrbitalCapitalBlocker(
  state: GameState,
  blockId: string,
  kind: CapitalKind = 'cash',
): Message | undefined {
  const blocked = orbitPlanBlocker(state)
  if (blocked) return blocked
  const block = proposedBlock(state, blockId)
  if ('key' in block) return block
  if (block.capital !== null) return { key: 'error.orbit_slot_filled' }
  if (block.stage !== 'proposed') return { key: 'error.orbit_not_proposed' }
  if (!CAPITAL_KINDS.includes(kind)) return { key: 'error.orbit_bad_block' }
  return capitalBlocker(state, block, kind) ?? bandwidthShort(state, ORBIT_CAPITAL_BANDWIDTH)
}

export function arrangeOrbitalCapital(state: GameState, blockId: string, kind: CapitalKind = 'cash'): void {
  state.bandwidth -= ORBIT_CAPITAL_BANDWIDTH
  setCapital(state, orbitBlock(state, blockId)!, kind)
}

// ---------- licences and the registry ----------

/** The quarter a licence filed now would be approved (base + the registry's extra + a future's regulators' extra). */
export function licenceApprovalQuarter(state: GameState): number {
  const f = LIC.filing
  const from = CONTENT.quarters.indexOf(f.approval_extra_from)
  const extra =
    state.futureId && state.quarter >= from ? f.approval_extra_quarters_after_trigger[state.futureId] : 0
  return state.quarter + f.approval_quarters + registry(orbitOf(state).registry).approval_extra_quarters + extra
}

export function fileLicenceBlocker(state: GameState, shellId: ShellId): Message | undefined {
  const blocked = orbitPlanBlocker(state)
  if (blocked) return blocked
  if (!SHELL_IDS.includes(shellId)) return { key: 'error.orbit_bad_block' }
  return bandwidthShort(state, LIC.filing.bandwidth) ?? cashShort(state, LIC.filing.fee_usd)
}

/** Files a constellation licence in a shell (another filing in the same shell adds its MW). */
export function fileLicence(state: GameState, shellId: ShellId): void {
  state.bandwidth -= LIC.filing.bandwidth
  state.cash -= LIC.filing.fee_usd
  const approvedQuarter = licenceApprovalQuarter(state)
  orbitOf(state).licences.push({
    shell: shellId,
    filedQuarter: state.quarter,
    approvedQuarter,
    filedMw: LIC.filing.filed_mw,
  })
  logEntry(state, 'log.orbit.licence_filed', {
    shellName: shellId,
    quarter: CONTENT.quarters[approvedQuarter] ?? '—',
  })
}

export function fastTrackLicenceBlocker(state: GameState, shellId: ShellId): Message | undefined {
  const blocked = orbitPlanBlocker(state)
  if (blocked) return blocked
  const lic = pendingLicence(state, shellId)
  if (!lic) return { key: 'error.orbit_no_pending_licence' }
  const needed = LIC.filing.fast_track_pc
  if (politicalCapital(state) < needed)
    return { key: 'error.pc_short', params: { needed, have: politicalCapital(state) } }
}

const pendingLicence = (state: GameState, shellId: ShellId) =>
  state.act4Orbit?.licences.find(
    (l) => l.shell === shellId && l.approvedQuarter > state.quarter && !l.fastTracked && l.approvedQuarter > l.filedQuarter + 1,
  )

/** Political capital takes a quarter off a pending filing (once per licence, never below a quarter after filing). */
export function fastTrackLicence(state: GameState, shellId: ShellId): void {
  const lic = pendingLicence(state, shellId)!
  addPc(state, -LIC.filing.fast_track_pc)
  lic.approvedQuarter--
  lic.fastTracked = true
  logEntry(state, 'log.orbit.licence_fast_tracked', { shellName: shellId, quarter: CONTENT.quarters[lic.approvedQuarter] })
}

/** The MW your approved licences allow in a shell. */
export function licensedMw(state: GameState, shellId: ShellId, quarter = state.quarter): number {
  return (state.act4Orbit?.licences ?? [])
    .filter((l) => l.shell === shellId && l.approvedQuarter <= quarter)
    .reduce((mw, l) => mw + l.filedMw, 0)
}

/** The MW of your blocks that use a shell's licence (from the start of their build until they leave orbit). */
export function usedLicenceMw(state: GameState, shellId: ShellId): number {
  return (state.act4Orbit?.blocks ?? [])
    .filter((b) => b.shell === shellId && ['building', 'awaiting_launch', 'climbing', 'live'].includes(b.stage))
    .reduce((mw, b) => mw + b.mw, 0)
}

/** Whether there's licence room for this block's build to start now. */
export const licenceRoom = (state: GameState, block: OrbitalBlock): boolean =>
  usedLicenceMw(state, block.shell) + block.mw <= licensedMw(state, block.shell)

export function setRegistryBlocker(state: GameState, id: RegistryId): Message | undefined {
  const blocked = orbitPlanBlocker(state)
  if (blocked) return blocked
  if (id !== 'accords' && id !== 'neutral') return { key: 'error.orbit_bad_block' }
  if (orbitOf(state).registry === id) return { key: 'error.orbit_registry_same' }
  return bandwidthShort(state, registryChangeBandwidth(state))
}

/** Free before your first filing; a change afterwards costs Bandwidth. */
export const registryChangeBandwidth = (state: GameState): number =>
  (state.act4Orbit?.licences.length ?? 0) > 0 ? LIC.registry_change_bandwidth : 0

export function setRegistry(state: GameState, id: RegistryId): void {
  state.bandwidth -= registryChangeBandwidth(state)
  orbitOf(state).registry = id
  logEntry(state, 'log.orbit.registry', { registryName: id })
}

// ---------- links (link units rented; optical ground stations at your sites) ----------

export function rentLinkUnitsBlocker(state: GameState, units: number): Message | undefined {
  const blocked = orbitPlanBlocker(state)
  if (blocked) return blocked
  if (!Number.isInteger(units) || units < 0) return { key: 'error.orbit_bad_block' }
}

/** Sets how many link units you rent (paid each quarter at a quarter of the yearly rate). */
export function rentLinkUnits(state: GameState, units: number): void {
  orbitOf(state).linksRented = units
}

export function buildGroundStationBlocker(state: GameState, siteId: string): Message | undefined {
  const blocked = orbitPlanBlocker(state)
  if (blocked) return blocked
  if (!state.sites.some((s) => s.id === siteId)) return { key: 'error.orbit_no_site' }
  if (state.act4Orbit?.stations.some((s) => s.siteId === siteId)) return { key: 'error.orbit_station_exists' }
  const g = TEN.links.ground_station
  return bandwidthShort(state, g.bandwidth) ?? cashShort(state, g.capex_usd)
}

/** An optical ground station at one of your sites: capex, a little Heat there, its link units from next quarter. */
export function buildGroundStation(state: GameState, siteId: string): void {
  const g = TEN.links.ground_station
  state.bandwidth -= g.bandwidth
  state.cash -= g.capex_usd
  const orbit = orbitOf(state)
  orbit.stations.push({
    id: `gs${orbit.stations.length + 1}`,
    siteId,
    readyQuarter: state.quarter + g.build_quarters,
    units: g.units,
  })
  addGrievance(state, siteId, g.heat)
  logEntry(state, 'log.orbit.station', { costUsd: g.capex_usd })
}

/** Link units you have this quarter: rented plus your ready ground stations'. */
export function linkUnits(state: GameState, quarter = state.quarter): number {
  const o = state.act4Orbit
  if (!o) return 0
  return o.linksRented + o.stations.filter((s) => s.readyQuarter <= quarter).reduce((n, s) => n + s.units, 0)
}

// ---------- cancelling a block that hasn't started building ----------

export function cancelOrbitalBlockBlocker(state: GameState, blockId: string): Message | undefined {
  const blocked = orbitPlanBlocker(state)
  if (blocked) return blocked
  const block = proposedBlock(state, blockId)
  if ('key' in block) return block
  if (block.stage !== 'proposed') return { key: 'error.orbit_not_proposed' }
}

/** Drops a proposed block: its launch deposit comes back only if the provider slipped it. */
export function cancelOrbitalBlock(state: GameState, blockId: string): void {
  const orbit = orbitOf(state)
  const block = orbitBlock(state, blockId)!
  if (block.launch && block.launch.slips > 0) state.cash += block.launch.depositUsd
  orbit.blocks = orbit.blocks.filter((b) => b.id !== blockId)
  logEntry(state, 'log.orbit.cancelled', { n: block.n })
}

/** At the start of an Act IV quarter: open blocks without a tenant get fresh offers. */
export function startQuarterOrbitOffers(state: GameState): void {
  for (const b of state.act4Orbit?.blocks ?? [])
    if (b.tenant === null && (b.stage === 'proposed' || b.stage === 'building' || b.stage === 'awaiting_launch'))
      drawOrbitalOffers(state, b)
}
