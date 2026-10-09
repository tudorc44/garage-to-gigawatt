// M29.1 (doc 33 §7-8, §16): Act IV's orbit content. `npm run content:act4-orbit` writes, into docs/act4-content/ and
// src/content/ (byte-identical copies): satellites_iv.json, shells_iv.json, insurance_iv.json, licences_iv.json and
// tenants_iv.json. (launch_providers.json is hand-written.) Each value's basis is in its file's notes and in
// docs/act4-content/README.md: sourced (doc 31), derived (the cost model) or designed (doc 33 ⚙).
import { mkdirSync, writeFileSync } from 'node:fs'

const ROOT = new URL('../../', import.meta.url)

const FILES: Record<string, unknown> = {
  'satellites_iv.json': {
    _meta: {
      schema: 'satellites_iv/1',
      doc33: '§7.1 (the orbital block: sizes, generations, build time, capex, life)',
      author:
        'build, M29.1: masses from the cost model’s paths (doc 31 §2.5); GPUs $33M/MW and 20% spares sourced (cost model); build time and opex designed',
    },
    sizes_mw: [5, 10, 25, 50, 100],
    generations: [
      { id: 'gen31', from: '2031Q1', t_mw: 18, market_column: null, note: 'Gen 31: ships in every future (~18 t per MW IT)' },
      { id: 'gen33', from: '2033Q1', t_mw: null, market_column: 'gen33_t_mw', note: 'Gen 33: announced at 13-15 t/MW in every future; delivered at 14 (16 in one future)' },
      { id: 'gen35', from: '2034Q3', t_mw: null, market_column: 'gen35_t_mw', note: 'Gen 35 ("hot radiators", ~10-11 t/MW): arrives in only some futures' },
    ],
    gpus: { usd_per_mw: 33000000, spares_share: 0.2, gpus_per_mw: 600 },
    build_quarters: 2,
    ops_usd_mw_yr: 250000,
    design_life_years: 5,
    utilisation: { contracted: 0.85, spot: 0.7 },
    spot_shell_rent_share: 0.8,
    sale_share_of_value: 0.8,
  },
  'shells_iv.json': {
    _meta: {
      schema: 'shells_iv/1',
      doc33: '§7.2 (the three shells), IV-D13',
      author:
        'build, M29.1: delivery multipliers and shielding designed from the delta-v table (doc 31 [A]/inference); debris rates designed',
    },
    shells: [
      { id: 'sso', launch_mult: 1.0, shielding_share: 0, interactive_ok: true, congestion_column: 'congestion_sso', closed_column: 'sso_closed' },
      { id: 'high_leo', launch_mult: 1.3, shielding_share: 0.1, interactive_ok: true, congestion_column: 'congestion_high_leo', closed_column: null },
      { id: 'high_orbit', launch_mult: 2.5, shielding_share: 0.3, interactive_ok: false, congestion_column: 'congestion_high_orbit', closed_column: null },
    ],
    debris: {
      base_loss_pct_q: 0.2,
      reference_congestion: 50,
      exponent: 3,
      loss_capacity_share: 0.25,
      // (M32.6 balance round 2: 0.7, was 0.4: the cascade destroys most of a busy-shell block, doc 33 §7.2;
      // M34.1, the owner's answer 1c: 0.6, the top of the owner's 40–60% range)
      cascade_capacity_loss_share: 0.6,
      manoeuvre_life_quarters: 1,
      conjunction_alert_chance_per_congestion_point: 0.0025,
      conjunction_accept_hit_share: 0.25,
    },
  },
  'insurance_iv.json': {
    _meta: {
      schema: 'insurance_iv/1',
      doc33: '§8.3 (insurance), §13 (the exposure rule), IV-D15',
      author:
        'build, M29.1: capacity and the loss-driven hard market sourced in shape [A]; the rates are market lore (doc 31 §3, research gap) carried in the market files; the multipliers designed',
    },
    covers: 'launch and the first year in orbit; then a yearly in-orbit renewal while you keep it',
    young_vehicle_failure_pct_at_least: 3,
    hard_market: { trigger_loss_usd: 400000000, rate_mult: 1.75, capacity_mult: 0.7, quarters: 4 },
    lender_cover_min_share: 0.5,
    exposure_warning_share_of_equity: 0.15,
  },
  'licences_iv.json': {
    _meta: {
      schema: 'licences_iv/1',
      doc33: '§7.3 (licences and registries), IV-D17',
      author:
        'build, M29.1: milestones from the FCC’s 2026 rules, simplified [A]; approval times, fees and the fast track designed',
    },
    filing: {
      bandwidth: 1,
      fee_usd: 1000000,
      filed_mw: 200,
      approval_quarters: 2,
      approval_extra_quarters_after_trigger: { f1: 0, f2: 2, f3: 0, f4: 0 },
      approval_extra_from: '2033Q1',
      fast_track_pc: 10,
    },
    registries: [
      { id: 'accords', approval_extra_quarters: 0, sovereign_premium_add_pct: 0, clampdown_exempt: false, note: 'the Accords bloc home state: permissive, the dominant launcher’s home' },
      { id: 'neutral', approval_extra_quarters: 1, sovereign_premium_add_pct: 5, clampdown_exempt: true, note: 'a smaller space-law state: slower, neutral, attractive to some sovereign tenants' },
    ],
    registry_change_bandwidth: 1,
    milestones: { due: '2035Q2', share_live: 0.25, shrink_share: 0.5 },
    clampdown: { cloud_capex_mult: 1.15 },
  },
  'tenants_iv.json': {
    _meta: {
      schema: 'tenants_iv/1',
      doc33: '§7.4 (workloads and links), §7.5 (orbital tenants), IV-D18',
      author:
        'build, M29.1: the shapes from doc 33 (sovereign anchors likeliest [inference]); terms, multipliers and link costs designed; fictional names',
    },
    offers_per_block: 2,
    late_penalty_share_of_acv: 0.03,
    // (M34.2, the owner's answer 2a ⚙: the quarters late a rebuild after a failed launch costs, for the exposure line)
    rebuild_late_quarters_est: 3,
    types: [
      { id: 'sovereign', name: 'Ironwall Sovereign Compute', term_years: 5, rent_mult: 1.0, add_sovereign_premium: true, prepay_share: 0.2, workload: 'batch', max_mw: null },
      { id: 'frontier_lab', name: 'Tessellate Labs', term_years: 3, rent_mult: 0.95, add_sovereign_premium: false, prepay_share: 0, workload: 'batch', max_mw: null },
      { id: 'inference_platform', name: 'Kite Inference', term_years: 3, rent_mult: 1.05, add_sovereign_premium: false, prepay_share: 0, workload: 'interactive', max_mw: null },
      { id: 'eo_processor', name: 'Cormorant Earth Imaging', term_years: 4, rent_mult: 0.9, add_sovereign_premium: false, prepay_share: 0, workload: 'batch', max_mw: 10 },
    ],
    links: {
      units_per_mw_interactive: 0.2,
      rent_unit_usd_yr: 800000,
      ground_station: { capex_usd: 15000000, units: 4, heat: 3, build_quarters: 1, bandwidth: 1 },
    },
  },
}

mkdirSync(new URL('docs/act4-content/', ROOT), { recursive: true })
for (const [name, data] of Object.entries(FILES)) {
  const text = JSON.stringify(data, null, 2) + '\n'
  writeFileSync(new URL(`docs/act4-content/${name}`, ROOT), text)
  writeFileSync(new URL(`src/content/${name}`, ROOT), text)
}
console.log(`Act IV orbit content: ${Object.keys(FILES).join(', ')} written to docs/act4-content/ and src/content/.`)
