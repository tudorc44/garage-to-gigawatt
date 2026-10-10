// M28.4 (doc 33 §16, §19 step 3): Act IV's event cards. `npm run content:act4-events` writes, into docs/act4-content/ and
// src/content/ (byte-identical copies):
// - events_iv.json: the authored cards (id, future, quarter, role, title, body, choices with effects, default, basis);
// - text_iv.en.json: their text keyed by the opaque engine id (event.a4_….title / .body / .choice.cN), which t() reads.
// Everything is designed (doc 33 ⚙): 8 cards per future around its trigger (the trigger card is iv_f*_c4, in the trigger
// quarter of tools/act4/futures.ts) and 8 shared cards from the known timeline (doc 33 §19). The 5 lunar cards come with
// M30's lunar systems. Fictional companies and blocs only (IV-D28); effects use only keys Act III's engine already maps.
import { mkdirSync, writeFileSync } from 'node:fs'
import { act4CardEngineId } from '../../src/content/act4Cards.ts'

const ROOT = new URL('../../', import.meta.url)

type Choice = { label: string; effect: Record<string, unknown> }
type Card = {
  id: string
  future: 'f1' | 'f2' | 'f3' | 'f4' | 'all'
  quarter: string
  role: string
  title: string
  body: string
  choices: Choice[]
  default: string
  basis: string
}

const CARDS: Card[] = [
  // ---------------------------------------------------------------- shared (every future, the known timeline) --
  {
    id: 'iv_sh_1', future: 'all', quarter: '2031Q1', role: 'intro',
    title: 'Act IV Opens',
    body: 'Ground power is booked years out, rockets fly every week, and a handful of companies are filing claims on lunar ridges. Nobody can tell you which way the next five years break. Read the signals.',
    choices: [{ label: 'Open the Signals panel', effect: {} }],
    default: 'Open the Signals panel',
    basis: 'Doc 33 §1-2',
  },
  {
    id: 'iv_sh_2', future: 'all', quarter: '2031Q3', role: 'shared',
    title: 'The Space Act Applies',
    body: 'A large market’s new space law takes effect: operators serving its customers must file debris plans and pay for compliance reviews.',
    choices: [
      { label: 'Comply for every tenant', effect: { cash: -500000 } },
      { label: 'Serve that market later', effect: {} },
    ],
    default: 'Comply for every tenant',
    basis: 'Doc 33 §7.3, §19 (an EU-analogue space act applying ~2031 [B/C]); designed cost',
  },
  {
    id: 'iv_sh_3', future: 'all', quarter: '2032Q2', role: 'shared',
    title: 'The Sixth Halving',
    body: 'The block subsidy halves again. Old miners that barely paid their power bill now lose money every hour they run.',
    choices: [
      { label: 'Switch off the old fleet', effect: { idle_mw: '+X' } },
      { label: 'Keep mining', effect: {} },
    ],
    default: 'Keep mining',
    basis: 'Doc 33 §10 (the 210,000-block schedule [A]); the market files halve the subsidy in 2032Q2',
  },
  {
    id: 'iv_sh_4', future: 'all', quarter: '2032Q4', role: 'shared',
    title: 'New Reactors on the Grid',
    body: 'The first new-build fission plants of the decade start feeding the grid. Their owners are taking calls about long power contracts.',
    choices: [
      { label: 'Spend goodwill for a place in the queue', effect: { pc_cost: 5, ratepayer_anger: -3 } },
      { label: 'Let it pass', effect: {} },
    ],
    default: 'Let it pass',
    basis: 'Doc 33 §19 (first new-build fission ~2032-33 [B]); designed effect',
  },
  {
    id: 'iv_sh_5', future: 'all', quarter: '2033Q2', role: 'shared',
    title: 'Boots on the Rim',
    body: 'A crewed landing near the lunar south pole plants a flag beside the ridges everyone wants. Landers with spare cargo space start calling resource companies.',
    choices: [{ label: 'Note it', effect: {} }],
    default: 'Note it',
    basis: 'Doc 33 §19 (crewed landings of this era [B/C]); flavour',
  },
  {
    id: 'iv_sh_6', future: 'all', quarter: '2033Q4', role: 'shared',
    title: 'A Lander Tips Over',
    body: 'A commercial lander touches down on a slope and tips onto its side. Its payloads are lost; its insurers settle in a week.',
    choices: [{ label: 'Note it', effect: {} }],
    default: 'Note it',
    basis: 'Doc 31 (lunar landings 2019-25: ~38% full success [A]); flavour',
  },
  {
    id: 'iv_sh_7', future: 'all', quarter: '2034Q3', role: 'shared',
    title: 'Milestone Deadlines Loom',
    body: 'Constellation licences filed under the 2026-era rules come due: a share of the filed capacity must be in orbit by set dates, or the licence shrinks.',
    choices: [
      { label: 'Spend goodwill on an extension', effect: { pc_cost: 5 } },
      { label: 'Let the rules run', effect: {} },
    ],
    default: 'Let the rules run',
    basis: 'Doc 33 §7.3, §19 (the FCC’s 2026 milestone rules, simplified [A]); designed',
  },
  {
    id: 'iv_sh_8', future: 'all', quarter: '2035Q1', role: 'shared',
    title: 'A Station at the Pole',
    body: 'The Station partnership opens a basic outpost near the south pole, on a ridge two other claimants had circled. Every lunar claim now has a neighbour.',
    choices: [{ label: 'Note it', effect: {} }],
    default: 'Note it',
    basis: 'Doc 33 §12.2, §19 (a basic south-polar station targeted by 2035 [B]); flavour',
  },

  // ---------------------------------------------------------------- F1 On Schedule (trigger 2032Q3) --
  {
    id: 'iv_f1_c1', future: 'f1', quarter: '2031Q3', role: 'signal',
    title: 'A Cheaper Ride',
    body: 'Carrack Heavy’s sales team calls with a third-party seat on a reused booster for late 2032, quoted under list. “Book early,” they say. “It only gets cheaper from here.”',
    choices: [
      { label: 'Note it', effect: {} },
      { label: 'Brief your lenders on an orbit plan', effect: { bandwidth: -1, debt_spread_bps: -25 } },
    ],
    default: 'Note it',
    basis: 'Designed: F1 launch quotes start falling from 2031Q3 (signals_iv_f1)',
  },
  {
    id: 'iv_f1_c2', future: 'f1', quarter: '2031Q4', role: 'decoy',
    title: 'Debris Alerts Spike',
    body: 'A spent upper stage breaks apart in a lower orbit and sets off a week of conjunction alerts. Insurance brokers start calling about cover.',
    choices: [
      { label: 'Hold your plans', effect: {} },
      { label: 'Retain a broker and pause orbit work', effect: { cash: -750000 } },
    ],
    default: 'Hold your plans',
    basis: 'Designed: F1’s decoy (an Orbital Congestion scare whose fragments decay in months)',
  },
  {
    id: 'iv_f1_c3', future: 'f1', quarter: '2032Q2', role: 'signal',
    title: 'Ten Flights, One Booster',
    body: 'The same Carrack booster flies its tenth mission in a quarter. Analysts redraw their launch-cost curves; two lenders ask for your orbit numbers.',
    choices: [
      { label: 'Keep watching', effect: {} },
      { label: 'Open talks with orbital tenants', effect: { bandwidth: -1, tenant_slots: 1 } },
    ],
    default: 'Keep watching',
    basis: 'Designed: F1’s signal window (doc 33 §6.2: reusable heavy lift delivers [C])',
  },
  {
    id: 'iv_f1_c4', future: 'f1', quarter: '2032Q3', role: 'trigger',
    title: 'The Booster Hits Its Price',
    body: 'Carrack Heavy posts a third-party price of $450 a kilogram and says the curve keeps bending. Space stocks jump, and lenders who wouldn’t take your call last year are asking about orbital capacity.',
    choices: [
      { label: 'Ride the wave: reprice your debt', effect: { bandwidth: -1, debt_spread_bps: -50 } },
      { label: 'Stay disciplined', effect: {} },
    ],
    default: 'Stay disciplined',
    basis: 'Designed: F1’s trigger; market_iv_f1 launch falls to $450/kg by 2032Q4 (doc 33 §6.2)',
  },
  {
    id: 'iv_f1_c5', future: 'f1', quarter: '2033Q2', role: 'aftermath',
    title: 'Everyone Wants a Shell',
    body: 'Frontier labs and inference platforms are queuing for orbital capacity they can have this year, not in five. Your phone doesn’t stop.',
    choices: [
      { label: 'Open your book to new tenants', effect: { bandwidth: -1, tenant_slots: 1 } },
      { label: 'Take only what you have', effect: {} },
    ],
    default: 'Take only what you have',
    basis: 'Designed: F1 orbital demand (doc 33 §6.2 "orbit nears parity")',
  },
  {
    id: 'iv_f1_c6', future: 'f1', quarter: '2034Q1', role: 'aftermath',
    title: 'Supply Catches Up',
    body: 'Three operators launch new blocks in a single quarter. Brokers start talking about a capacity glut in the busy shell.',
    choices: [
      { label: 'Presell next year’s capacity', effect: { bandwidth: -1, cash: 2000000 } },
      { label: 'Hold out for better rents', effect: {} },
    ],
    default: 'Hold out for better rents',
    basis: 'Designed: F1’s late flood (doc 33 §6.2: rents fall 2034-35)',
  },
  {
    id: 'iv_f1_c7', future: 'f1', quarter: '2034Q3', role: 'aftermath',
    title: 'Rents Slide',
    body: 'Orbital supply puts a ceiling on what tenants will pay on the ground. Your largest tenant asks to extend now, at a little less.',
    choices: [
      { label: 'Extend three years at a discount', effect: { rent_index: 0.95, term_add_years: 3 } },
      { label: 'Wait for the renewal', effect: {} },
    ],
    default: 'Wait for the renewal',
    basis: 'Designed: market_iv_f1 ground rents fall to 0.85 by 2035 (doc 33 §10)',
  },
  {
    id: 'iv_f1_c8', future: 'f1', quarter: '2035Q2', role: 'winner',
    title: 'The Early Builders',
    body: 'The operators who launched in 2032 and presold their capacity are the ones still smiling. The late arrivals are discounting.',
    choices: [{ label: 'Note it', effect: {} }],
    default: 'Note it',
    basis: 'Designed: F1 rewards early, fast orbit builders who don’t overbuild late (doc 33 §6.2)',
  },

  // ---------------------------------------------------------------- F2 The Wall (trigger 2033Q1) --
  {
    id: 'iv_f2_c1', future: 'f2', quarter: '2031Q4', role: 'signal',
    title: 'Heavier Than Promised',
    body: 'An engineering review of next-generation compute satellites finds the radiators can’t shrink as advertised: the new birds will weigh nearly as much per megawatt as the old.',
    choices: [
      { label: 'Note it', effect: {} },
      { label: 'Commission your own audit', effect: { cash: -500000, bandwidth: -1 } },
    ],
    default: 'Note it',
    basis: 'Designed: F2’s Gen 33 delivers at 16 t/MW (doc 33 §7.1)',
  },
  {
    id: 'iv_f2_c2', future: 'f2', quarter: '2032Q2', role: 'decoy',
    title: 'A Seat Sale',
    body: 'Carrack Heavy offers spare capacity on its next manifests at a promotional price. “Limited time,” says the email. The list price hasn’t moved.',
    choices: [
      { label: 'Ignore it', effect: {} },
      { label: 'Put down a deposit for a block', effect: { cash: -2000000 } },
    ],
    default: 'Ignore it',
    basis: 'Designed: F2’s decoy (a promotional price cut that doesn’t stick, doc 33 §6.3)',
  },
  {
    id: 'iv_f2_c3', future: 'f2', quarter: '2032Q3', role: 'signal',
    title: 'Brightness Complaints Pile Up',
    body: 'Astronomers and two satellite operators petition regulators to cap new constellations until the sky and the debris are studied.',
    choices: [
      { label: 'Lobby for a fair rule', effect: { pc_cost: 5 } },
      { label: 'Stay out of it', effect: {} },
    ],
    default: 'Stay out of it',
    basis: 'Designed: F2’s signal window (doc 33 §6.2: AAS and operator petitions [A])',
  },
  {
    id: 'iv_f2_c4', future: 'f2', quarter: '2033Q1', role: 'trigger',
    title: 'The Constellation Cap',
    body: 'Regulators freeze new constellation filings pending a brightness and debris review. Launch prices hold where they were. Orbit, for now, stays expensive.',
    choices: [
      { label: 'Accept the cap', effect: {} },
      { label: 'Fight it in court', effect: { legal_cost: 1500000, pc_cost: 5 } },
    ],
    default: 'Accept the cap',
    basis: 'Designed: F2’s trigger (doc 33 §6.2: regulators cap constellations; launch stalls)',
  },
  {
    id: 'iv_f2_c5', future: 'f2', quarter: '2033Q3', role: 'aftermath',
    title: 'Hot Chips, Cold Margins',
    body: 'Orbital operators report GPUs failing faster than planned. Tenants who signed for orbit ask about moving workloads back to the ground.',
    choices: [
      { label: 'Court them for your ground halls', effect: { bandwidth: -1, tenant_slots: 1 } },
      { label: 'Note it', effect: {} },
    ],
    default: 'Note it',
    basis: 'Designed: F2’s true failure rate 10%/yr (orbit_truth_iv), visible as industry reports',
  },
  {
    id: 'iv_f2_c6', future: 'f2', quarter: '2034Q1', role: 'aftermath',
    title: 'Ground Rents Firm',
    body: 'With orbit stalled, energized ground megawatts are the scarcest thing in the market. Your largest tenant wants to lock in now.',
    choices: [
      { label: 'Extend three years at a premium', effect: { rent_index: 1.05, term_add_years: 3 } },
      { label: 'Wait for the renewal', effect: {} },
    ],
    default: 'Wait for the renewal',
    basis: 'Designed: market_iv_f2 ground rents ×1.15 (doc 33 §10: ground MW the best asset)',
  },
  {
    id: 'iv_f2_c7', future: 'f2', quarter: '2034Q4', role: 'recovery',
    title: 'Orrery Compute Folds',
    body: 'The venture-backed orbital startup that raised at a record valuation in 2031 files for protection. Its operations team is looking for work.',
    choices: [
      { label: 'Hire its operators', effect: { cash: -500000, bandwidth: 1 } },
      { label: 'Let them go elsewhere', effect: {} },
    ],
    default: 'Let them go elsewhere',
    basis: 'Designed: doc 33 §12.1 (Orrery fails in F2 and F4); working name, fictional',
  },
  {
    id: 'iv_f2_c8', future: 'f2', quarter: '2035Q2', role: 'winner',
    title: 'Patience Pays',
    body: 'The companies that kept their ground megawatts and waited are the ones with cash to spend as orbit’s prices finally start to move.',
    choices: [{ label: 'Note it', effect: {} }],
    default: 'Note it',
    basis: 'Designed: F2 rewards ground holders and patience (doc 33 §6.2)',
  },

  // ---------------------------------------------------------------- F3 Closed Shell (trigger 2032Q4) --
  {
    id: 'iv_f3_c1', future: 'f3', quarter: '2031Q3', role: 'signal',
    title: 'Near Miss at 550',
    body: 'Two satellites in the dawn-dusk shell pass within a few metres of each other. Operators report a record month of avoidance manoeuvres.',
    choices: [
      { label: 'Note it', effect: {} },
      { label: 'Buy a debris-tracking feed', effect: { cash: -400000 } },
    ],
    default: 'Note it',
    basis: 'Designed: F3’s congestion rises from 2031Q3 (doc 33 §6.2; ESA’s 2026 report [A])',
  },
  {
    id: 'iv_f3_c2', future: 'f3', quarter: '2031Q4', role: 'decoy',
    title: 'A Rule Floats',
    body: 'Regulators publish a draft brightness-and-debris rule for large constellations. Comment letters flood in; nobody knows if it will survive.',
    choices: [
      { label: 'Wait and see', effect: {} },
      { label: 'Shelve your orbit plans', effect: { bandwidth: -1 } },
    ],
    default: 'Wait and see',
    basis: 'Designed: F3’s decoy (a rule proposal that dies, doc 33 §6.3)',
  },
  {
    id: 'iv_f3_c3', future: 'f3', quarter: '2032Q2', role: 'signal',
    title: 'Insurers Ask Questions',
    body: 'Space insurers start asking every applicant about collision avoidance in the busy shell. Two of them quietly cut their capacity.',
    choices: [
      { label: 'Note it', effect: {} },
      { label: 'Buy cover early, at today’s rates', effect: { cash: -1000000, credit_notch: 1 } },
    ],
    default: 'Note it',
    basis: 'Designed: F3’s signal window (doc 33 §8.3: insurance capacity is thin [A])',
  },
  {
    id: 'iv_f3_c4', future: 'f3', quarter: '2032Q4', role: 'trigger',
    title: 'The Cascade at 550',
    body: 'A fragmentation event in the dawn-dusk shell sets off a chain of collisions. Regulators close the shell to new launches; insurers stop writing cover there.',
    choices: [
      { label: 'Ride it out', effect: {} },
      { label: 'Draw a credit line while you can', effect: { debt: 10000000, debt_spread_bps: 400 } },
    ],
    default: 'Ride it out',
    basis: 'Designed: F3’s trigger (a shell-closing cascade by 2033 is [D], designed magnitude); market_iv_f3 sso_closed',
  },
  {
    id: 'iv_f3_c5', future: 'f3', quarter: '2033Q1', role: 'aftermath',
    title: 'Insurance Hardens',
    body: 'After the largest loss in the market’s history, premiums jump and capacity shrinks. Lenders ask every borrower how much of their orbit is insured.',
    choices: [
      { label: 'Pay up for cover', effect: { cash: -1500000 } },
      { label: 'Self-insure and take the hit to your rating', effect: { credit_notch: -1 } },
    ],
    default: 'Pay up for cover',
    basis: 'Designed: doc 33 §8.3 (a hard market after a loss over ~$400M [A])',
  },
  {
    id: 'iv_f3_c6', future: 'f3', quarter: '2033Q3', role: 'recovery',
    title: 'The Quiet Shells',
    body: 'Operators move their plans to higher, emptier orbits. Tenants who still want orbit now pay for safety more than for price.',
    choices: [
      { label: 'Explore the quiet shells', effect: { bandwidth: -1, tenant_slots: 1 } },
      { label: 'Note it', effect: {} },
    ],
    default: 'Note it',
    basis: 'Designed: F3 rewards diversified shells and high orbit (doc 33 §6.2)',
  },
  {
    id: 'iv_f3_c7', future: 'f3', quarter: '2034Q2', role: 'winner',
    title: 'Sovereigns Want Safety',
    body: 'A bloc defence agency wants dedicated compute in a quiet orbit and will prepay for it. It wants a say in where your satellites fly.',
    choices: [
      { label: 'Take the prepayment, accept the strings', effect: { cash: 3000000, pc_cost: 5 } },
      { label: 'Decline', effect: {} },
    ],
    default: 'Decline',
    basis: 'Designed: doc 33 §7.5 (sovereign compute: long contracts, prepayments, strings)',
  },
  {
    id: 'iv_f3_c8', future: 'f3', quarter: '2035Q1', role: 'aftermath',
    title: 'The Moon Looks Different Now',
    body: 'With the busy shell still crowded with debris, analysts re-rate anything that doesn’t depend on it: high orbit, ground stations, and lunar ridges.',
    choices: [{ label: 'Note it', effect: {} }],
    default: 'Note it',
    basis: 'Designed: F3 re-rates lunar sites as strategic (doc 33 §6.2, §11.3)',
  },

  // ---------------------------------------------------------------- F4 Cheap Ground (trigger 2033Q2) --
  {
    id: 'iv_f4_c1', future: 'f4', quarter: '2031Q4', role: 'decoy',
    title: 'Record Capacity Auction',
    body: 'The grid’s capacity auction clears at its price cap. Headlines call it the end of affordable power on the ground; orbit’s promoters send you their decks.',
    choices: [
      { label: 'Note it', effect: {} },
      { label: 'Rush an orbit plan', effect: { bandwidth: -1, cash: -500000 } },
    ],
    default: 'Note it',
    basis: 'Designed: F4’s decoy (a record capacity auction followed by relief, doc 33 §6.3)',
  },
  {
    id: 'iv_f4_c2', future: 'f4', quarter: '2032Q2', role: 'signal',
    title: 'Fast-Track Rules',
    body: 'Regulators adopt a large-load order that lets new data-centre connections skip parts of the queue if they bring their own firm power.',
    choices: [
      { label: 'Spend goodwill to speed a project', effect: { pc_cost: 5, delay_quarters: -1 } },
      { label: 'Note it', effect: {} },
    ],
    default: 'Note it',
    basis: 'Designed: F4’s signal window (doc 33 §6.2: FERC’s June 2026 large-load order [A] as shape)',
  },
  {
    id: 'iv_f4_c3', future: 'f4', quarter: '2032Q4', role: 'signal',
    title: 'Turbines Ship',
    body: 'Gas turbine makers clear their backlog early. On-site power that took three years to order now takes eighteen months.',
    choices: [{ label: 'Note it', effect: {} }],
    default: 'Note it',
    basis: 'Designed: F4 (doc 33 §6.2: turbine ramp [A/B]); market_iv_f4 gas wait falls',
  },
  {
    id: 'iv_f4_c4', future: 'f4', quarter: '2033Q2', role: 'trigger',
    title: 'The Queue Breaks',
    body: 'Fast-track connections, new firm power and an efficiency jump in the newest chips arrive together. Ground capacity unblocks, and orbit’s speed premium starts to fade.',
    choices: [
      { label: 'Build on the ground', effect: { capex_mw: 20 } },
      { label: 'Wait and see', effect: {} },
    ],
    default: 'Wait and see',
    basis: 'Designed: F4’s trigger (doc 33 §6.2: the ground unblocks [C]); market_iv_f4 grid wait falls to 8-12 quarters',
  },
  {
    id: 'iv_f4_c5', future: 'f4', quarter: '2033Q4', role: 'aftermath',
    title: 'More Work per Watt',
    body: 'The newest accelerators do twice the work for the same power. Tenants need fewer megawatts for the same job, wherever those megawatts are.',
    choices: [{ label: 'Note it', effect: {} }],
    default: 'Note it',
    basis: 'Designed: F4 (doc 33 §6.2: an efficiency jump; IEA high-efficiency case [C])',
  },
  {
    id: 'iv_f4_c6', future: 'f4', quarter: '2034Q2', role: 'aftermath',
    title: 'Orbital Rents Soften',
    body: 'With ground capacity easier to find, orbital tenants ask for shorter terms and lower prices. The ones on long contracts are glad they signed.',
    choices: [
      { label: 'Presell what you can', effect: { bandwidth: -1, cash: 1500000 } },
      { label: 'Wait for a better market', effect: {} },
    ],
    default: 'Wait for a better market',
    basis: 'Designed: market_iv_f4 orbital rents fall to $6M/MW-yr (doc 33 §6.2)',
  },
  {
    id: 'iv_f4_c7', future: 'f4', quarter: '2034Q4', role: 'winner',
    title: 'Ground Is King',
    body: 'Permitted, energized ground megawatts trade at a premium again. An infrastructure fund asks to buy into one of your sites.',
    choices: [
      { label: 'Sell a minority stake', effect: { cash: 4000000, credit_notch: 1 } },
      { label: 'Keep it all', effect: {} },
    ],
    default: 'Keep it all',
    basis: 'Designed: F4 rewards ground holders (doc 33 §6.2)',
  },
  {
    id: 'iv_f4_c8', future: 'f4', quarter: '2035Q2', role: 'aftermath',
    title: 'Orrery Compute Folds',
    body: 'The orbital startup that raised at a record valuation in 2031 files for protection, its blocks idle and its tenants gone to the ground.',
    choices: [{ label: 'Note it', effect: {} }],
    default: 'Note it',
    basis: 'Designed: doc 33 §12.1 (Orrery fails in F2 and F4); working name, fictional',
  },
]

const events = JSON.stringify({ _meta: { schema: 'events_iv/1', doc33: '§16', author: 'build, M28.4 (designed)' }, event_cards: CARDS }, null, 2) + '\n'
const text: Record<string, string> = {}
for (const c of CARDS) {
  const id = act4CardEngineId(c.id)
  text[`event.${id}.title`] = c.title
  text[`event.${id}.body`] = c.body
  c.choices.forEach((ch, i) => (text[`event.${id}.choice.c${i + 1}`] = ch.label))
}
const textJson = JSON.stringify(text, null, 2) + '\n'

mkdirSync(new URL('docs/act4-content/', ROOT), { recursive: true })
for (const dir of ['docs/act4-content/', 'src/content/']) {
  writeFileSync(new URL(`${dir}events_iv.json`, ROOT), events)
  writeFileSync(new URL(`${dir}text_iv.en.json`, ROOT), textJson)
}
console.log(`Act IV events: ${CARDS.length} cards, ${Object.keys(text).length} text keys, written to docs/act4-content/ and src/content/.`)
