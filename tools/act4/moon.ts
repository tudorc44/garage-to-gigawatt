// M30.1 (doc 33 §9, §11.2-11.3, §12): Act IV's lunar content. `npm run content:act4-moon` writes, into docs/act4-content/
// and src/content/ (byte-identical copies): lunar_iv.json (the 8 polar sites and the rules of the lunar chain) and
// lunar_claims_iv.json (the rivals' and the blocs' scripted claims per future). Every value is designed inside doc 33's
// ⚙ ranges (basis in docs/act4-content/README.md); the place names are real lunar geography (allowed, IV-D28).
// The scripted claims are the same in every future through 2032Q2 (before any future's trigger): the map never tells
// the futures apart early.
import { mkdirSync, writeFileSync } from 'node:fs'

const ROOT = new URL('../../', import.meta.url)

type Claim = { claimant: string; site: string; claim: string; lands: string }
const common = (northgateLands: string): Claim[] => [
  { claimant: 'accords_bloc', site: 'shackleton_ridge', claim: '2031Q3', lands: '2032Q2' },
  { claimant: 'northgate', site: 'de_gerlache_ridge', claim: '2032Q1', lands: northgateLands },
]

const FILES: Record<string, unknown> = {
  'lunar_iv.json': {
    _meta: {
      schema: 'lunar_iv/1',
      doc33: '§9 (the lunar supply chain), §11.2 (offtake), §11.3 (the lunar unit), §14.2 (the lunar alerts)',
      author:
        'build, M30.1: designed inside doc 33’s ⚙ ranges; illumination per doc 33 §9.1 [C] where given; real lunar place names (geography)',
    },
    sites: [
      { id: 'shackleton_ridge', illumination: 0.94, ice_access: 1.0, max_kwe: 300, bloc_interest: 'both' },
      { id: 'de_gerlache_ridge', illumination: 0.85, ice_access: 0.9, max_kwe: 250, bloc_interest: 'both' },
      { id: 'malapert_massif', illumination: 0.8, ice_access: 0.6, max_kwe: 200, bloc_interest: 'accords' },
      { id: 'nobile_rim', illumination: 0.82, ice_access: 0.9, max_kwe: 200, bloc_interest: 'both' },
      { id: 'haworth_rim', illumination: 0.78, ice_access: 0.9, max_kwe: 150, bloc_interest: 'both' },
      { id: 'cabeus', illumination: 0.35, ice_access: 1.2, max_kwe: 100, bloc_interest: 'none' },
      { id: 'amundsen_rim', illumination: 0.75, ice_access: 0.7, max_kwe: 150, bloc_interest: 'station' },
      { id: 'leibnitz_beta', illumination: 0.72, ice_access: 0.5, max_kwe: 200, bloc_interest: 'none' },
    ],
    claim: { bandwidth: 1, fee_usd: 5000000, pc: 5, land_within_quarters: 6 },
    dispute: { pc_to_hold: 15, share_resource_share: 0.5 },
    inferred_t_per_site: 800000,
    category_confidence: { inferred: 0.2, indicated: 0.5, measured: 0.8 },
    stage_factor: { claim: 0.2, pilot: 0.3, production: 0.5 },
    presence_value_usd: 25000000,
    mission: {
      bandwidth: 1,
      payload_kg: 2000,
      rover_drill_usd: 60000000,
      lead_quarters: [3, 5],
      abort_delay_quarters: 1,
      abort_cost_usd: 10000000,
    },
    power: {
      solar: { sizes_kwe: [25, 50, 100, 200], kg_per_kwe: 60, hardware_usd_per_kwe: 1000000, build_quarters: 2, bandwidth: 1 },
      reactor: { kwe: 100, from: '2034Q1', setup_usd: 50000000, lease_usd_q: 15000000, bloc: 'accords', bandwidth: 1 },
      megawatt_contract: { mwe: 1, from: '2034Q1', fee_usd: 50000000, bandwidth: 1 },
    },
    pilot: {
      bandwidth: 2,
      min_kwe: 100,
      base_usd: 300000000,
      mass_t: 8,
      build_quarters: 7,
      t_water_per_kwe_yr: 1.2,
      efficiency: 0.3,
      llo_share: 0.2,
      measured_after_quarters: 2,
      dust_loss_share_q: 0.03,
      maintenance_usd_q: 5000000,
    },
    production: { bandwidth: 3, capex_usd: 4000000000, first_output_quarters: [20, 32], draw_quarters: 24 },
    offtake: {
      bandwidth: 2,
      volume_t_yr: [2, 10],
      term_quarters: 8,
      price_spread: [0.9, 1.1],
      prepay_share: 0.2,
      buyers: ['accords_programme', 'station_programme', 'lander_operator'],
      backlog_weight: 0.5,
    },
    alerts: { dust_fault_chance_q: 0.15, dust_repair_usd: 10000000, dust_accept_loss_share: 0.1 },
  },
  'lunar_claims_iv.json': {
    _meta: {
      schema: 'lunar_claims_iv/1',
      doc33: '§9.1 (rivals and the blocs claim sites on scripted schedules, authored per future; first to land holds), §12',
      author:
        'build, M30.1: designed; the same in every future through 2032Q2; fictional claimants (Northgate, Cratermark Resources, Lantern Arc, the two blocs)',
    },
    futures: {
      f1: [
        ...common('2032Q4'),
        { claimant: 'cratermark', site: 'malapert_massif', claim: '2032Q3', lands: '2033Q3' },
        { claimant: 'jade_arc', site: 'amundsen_rim', claim: '2033Q1', lands: '2034Q1' },
        { claimant: 'accords_bloc', site: 'nobile_rim', claim: '2033Q3', lands: '2034Q2' },
      ],
      f2: [
        ...common('2033Q4'),
        { claimant: 'cratermark', site: 'malapert_massif', claim: '2033Q1', lands: '2034Q3' },
        { claimant: 'jade_arc', site: 'amundsen_rim', claim: '2033Q3', lands: '2035Q1' },
      ],
      f3: [
        ...common('2033Q1'),
        { claimant: 'station_bloc', site: 'nobile_rim', claim: '2032Q3', lands: '2033Q2' },
        { claimant: 'cratermark', site: 'malapert_massif', claim: '2032Q3', lands: '2033Q3' },
        { claimant: 'jade_arc', site: 'haworth_rim', claim: '2032Q4', lands: '2033Q3' },
        { claimant: 'station_bloc', site: 'amundsen_rim', claim: '2033Q1', lands: '2034Q1' },
      ],
      f4: [
        ...common('2033Q2'),
        { claimant: 'cratermark', site: 'malapert_massif', claim: '2032Q4', lands: '2034Q1' },
        { claimant: 'jade_arc', site: 'amundsen_rim', claim: '2033Q2', lands: '2034Q3' },
      ],
    },
  },
}

mkdirSync(new URL('docs/act4-content/', ROOT), { recursive: true })
for (const [name, data] of Object.entries(FILES)) {
  const text = JSON.stringify(data, null, 2) + '\n'
  writeFileSync(new URL(`docs/act4-content/${name}`, ROOT), text)
  writeFileSync(new URL(`src/content/${name}`, ROOT), text)
}
console.log(`Act IV lunar content: ${Object.keys(FILES).join(', ')} written to docs/act4-content/ and src/content/.`)
