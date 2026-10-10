// M31.1 (doc 33 §11, §12, §14.3): Act IV's money and rivals content. `npm run content:act4-money` writes, into
// docs/act4-content/ and src/content/ (byte-identical copies): capital_iv.json (export credit, orbital project debt, the
// insurance covenant's cure, sovereign co-funding, the space-equity window, lunar task orders, fire-sale haircuts),
// hires_iv.json (the four new hires) and rivals_iv.json (the five fictional rivals' paths per future, Orrery's failure
// and its auction). Every value is designed inside doc 33's ⚙ ranges or sourced in shape (basis in the README). The
// rivals' anchors are the same in every future through 2032Q2: the league never tells the futures apart early (B14).
import { mkdirSync, writeFileSync } from 'node:fs'

const ROOT = new URL('../../', import.meta.url)

/** A rival's path: values at anchor quarters, interpolated at load (common anchors first, then the future's). */
type Path = Record<string, number>
const rival = (
  id: string,
  common: { value: Path; orbitMw: Path },
  futures: Record<'f1' | 'f2' | 'f3' | 'f4', { value: Path; orbitMw: Path; fails?: string }>,
) => ({ id, common, futures })

const FILES: Record<string, unknown> = {
  'capital_iv.json': {
    _meta: {
      schema: 'capital_iv/1',
      doc33: '§11.1 (instruments, IV-D23), §11.4 (the insurance covenant), §11.5 (fire-sale haircuts), §9 (lunar funding)',
      author:
        'build, M31.1: export credit ~5% fixed with interest paid in kind during the build (Iridium NEXT, Telesat [A]); project debt SOFR + 450-650 bp by tenant (designed from CoreWeave’s ladder [A] plus a hardware premium); co-funding 30% (IRIS² / OneWeb shape [A], terms designed); the rest designed',
    },
    export_credit: {
      bandwidth: 1,
      apr: 0.05,
      share_of_build: 0.8,
      build_cost_mult: 1.1,
      tenor_quarters: 28,
      registry: 'accords',
    },
    project_debt: {
      bandwidth: 1,
      share_of_capex: 0.6,
      spread_bps: { sovereign: 450, frontier_lab: 550, inference_platform: 600, eo_processor: 650 },
      cure_quarters: 2,
    },
    co_funding: { bandwidth: 1, share_of_capex: 0.3, revenue_share: 0.3 },
    space_equity: { window_min_mult: 12, story_ref_mult: 20 },
    task_orders: { chance_q: 0.3, usd: [50000000, 200000000], max_share_of_mission: 0.6, bloc: 'accords' },
    fire_sale: { orbital: 0.4, lunar: 0.2, lunar_to_bloc: 0.5 },
  },
  'hires_iv.json': {
    _meta: {
      schema: 'hires_iv/1',
      doc33: '§14.3 (Bandwidth and hires, IV-D27)',
      author: 'build, M31.1: the four roles and effects from doc 33 §14.3 ⚙; salaries designed (senior space-industry roles)',
    },
    hires: [
      { id: 'launch_procurement_lead', salary_usd_yr: 320000, effect: { launch_price_mult: 0.9, no_bumps: true } },
      { id: 'space_ops_chief', salary_usd_yr: 380000, effect: { orbit_failure_mult: 0.75, telemetry_noise_mult: 0.5 } },
      { id: 'lunar_programme_director', salary_usd_yr: 350000, effect: { landing_bonus_pts: 10, pilot_quarters_cut: 1, bandwidth: 1 } },
      { id: 'chief_risk_officer', salary_usd_yr: 340000, effect: { insurance_premium_mult: 0.8, insurance_capacity_mult: 1.25 } },
    ],
  },
  'rivals_iv.json': {
    _meta: {
      schema: 'rivals_iv/1',
      doc33: '§12.1 (the five fictional rivals, IV-D21), §11.5 (Orrery’s failure: the vulture buyer’s opportunity)',
      author:
        'build, M31.1: designed paths ($B and orbital MW) per future around doc 33 §12.1’s roles; fictional names (for the owner’s name check); identical through 2032Q2',
    },
    rivals: [
      rival(
        'pallas_compute',
        { value: { '2031Q1': 60, '2032Q2': 75 }, orbitMw: { '2031Q1': 20, '2032Q2': 80 } },
        {
          f1: { value: { '2033Q4': 140, '2035Q4': 260 }, orbitMw: { '2033Q4': 600, '2035Q4': 2000 } },
          f2: { value: { '2033Q4': 90, '2035Q4': 95 }, orbitMw: { '2033Q4': 200, '2035Q4': 350 } },
          f3: { value: { '2033Q1': 55, '2035Q4': 85 }, orbitMw: { '2033Q1': 120, '2035Q4': 400 } },
          f4: { value: { '2033Q4': 100, '2035Q4': 80 }, orbitMw: { '2033Q4': 400, '2035Q4': 500 } },
        },
      ),
      rival(
        'northgate',
        { value: { '2031Q1': 18, '2032Q2': 22 }, orbitMw: { '2031Q1': 0, '2032Q2': 0 } },
        {
          f1: { value: { '2033Q4': 35, '2035Q4': 50 }, orbitMw: { '2035Q4': 0 } },
          f2: { value: { '2033Q4': 25, '2035Q4': 28 }, orbitMw: { '2035Q4': 0 } },
          f3: { value: { '2033Q4': 30, '2035Q4': 45 }, orbitMw: { '2035Q4': 0 } },
          f4: { value: { '2033Q4': 24, '2035Q4': 26 }, orbitMw: { '2035Q4': 0 } },
        },
      ),
      rival(
        'orrery_compute',
        { value: { '2031Q1': 3, '2032Q2': 6 }, orbitMw: { '2031Q1': 5, '2032Q2': 20 } },
        {
          f1: { value: { '2033Q4': 12, '2035Q4': 20 }, orbitMw: { '2033Q4': 150, '2035Q4': 300 } },
          f2: { value: { '2033Q2': 4 }, orbitMw: { '2033Q2': 60 }, fails: '2033Q3' },
          f3: { value: { '2033Q4': 5, '2035Q4': 7 }, orbitMw: { '2033Q4': 50, '2035Q4': 90 } },
          f4: { value: { '2034Q1': 5 }, orbitMw: { '2034Q1': 120 }, fails: '2034Q2' },
        },
      ),
      rival(
        'jade_arc',
        { value: { '2031Q1': 8, '2032Q2': 12 }, orbitMw: { '2031Q1': 10, '2032Q2': 40 } },
        {
          f1: { value: { '2033Q4': 20, '2035Q4': 30 }, orbitMw: { '2033Q4': 200, '2035Q4': 400 } },
          f2: { value: { '2033Q4': 15, '2035Q4': 18 }, orbitMw: { '2033Q4': 80, '2035Q4': 120 } },
          f3: { value: { '2033Q4': 25, '2035Q4': 40 }, orbitMw: { '2033Q4': 120, '2035Q4': 250 } },
          f4: { value: { '2033Q4': 14, '2035Q4': 16 }, orbitMw: { '2033Q4': 150, '2035Q4': 200 } },
        },
      ),
      rival(
        'cratermark',
        { value: { '2031Q1': 0.8, '2032Q2': 1.2 }, orbitMw: { '2031Q1': 0, '2032Q2': 0 } },
        {
          f1: { value: { '2033Q4': 2, '2035Q4': 3 }, orbitMw: { '2035Q4': 0 } },
          f2: { value: { '2033Q4': 1.5, '2035Q4': 1.6 }, orbitMw: { '2035Q4': 0 } },
          f3: { value: { '2033Q4': 4, '2035Q4': 7 }, orbitMw: { '2035Q4': 0 } },
          f4: { value: { '2033Q4': 1.4, '2035Q4': 1.5 }, orbitMw: { '2035Q4': 0 } },
        },
      ),
    ],
    orrery_auction: { mw: 50, shell: 'sso', gen: 'gen31', life_left_quarters: 12, price_usd_per_mw: 6000000, bandwidth: 1, open_quarters: 2 },
  },
}

mkdirSync(new URL('docs/act4-content/', ROOT), { recursive: true })
for (const [name, data] of Object.entries(FILES)) {
  const text = JSON.stringify(data, null, 2) + '\n'
  writeFileSync(new URL(`docs/act4-content/${name}`, ROOT), text)
  writeFileSync(new URL(`src/content/${name}`, ROOT), text)
}
console.log(`Act IV money content: ${Object.keys(FILES).join(', ')} written to docs/act4-content/ and src/content/.`)
