// M28.1 (doc 33 §6.1, §6.3; IV-D8, IV-D10): generates Act IV's four Signals files, signals_iv_f1–f4.json, into
// docs/act4-content/ and src/content/ (`npm run content:act4-signals`). Nothing in them is edited by hand.
//
// Like Act III's (docs/act3-content/signals_s*.json): six 0–100 indicators with a trend arrow, a displayed value per
// quarter (noisy), a sharp range per quarter (what "Read the market" reveals), and the hidden authoring fields the player
// never sees: the future's name, its trigger, its one decoy (reason and tell) and each indicator's true path (the latent).
// The game's runtime schema drops the hidden fields; only tests, tools and act4End (via signalsHiddenIv.ts) read them.
//
// Designed (doc 33 ⚙, labelled in docs/act4-content/README.md):
// - every indicator sits at 50 in 2031Q1–Q2 in every future, and the noise depends on the indicator and quarter only, so
//   day one reads the same whatever the future (B14's spirit; doc 33: Signals never move before 2031Q3);
// - each future's latent paths bend 2–4 quarters before its trigger (the market files' TRIGGER quarters);
// - each future has one decoy: an indicator that spikes for 2–3 quarters toward another future's reading, then falls back.
import { mkdirSync, writeFileSync } from 'node:fs'
import { TRIGGER } from './futures.ts'

const ROOT = new URL('../../', import.meta.url)
const QUARTERS = Array.from({ length: 20 }, (_, n) => `${2031 + Math.floor(n / 4)}Q${(n % 4) + 1}`)
type Future = 'f1' | 'f2' | 'f3' | 'f4'
type Ind =
  | 'launch_quotes'
  | 'fleet_reliability'
  | 'orbital_congestion'
  | 'ground_power_squeeze'
  | 'compute_demand_gap'
  | 'regulatory_climate'

const INDICATORS: { id: Ind; label: string; higher_means: string; note: (lo: number, hi: number) => string }[] = [
  {
    id: 'launch_quotes',
    label: 'Launch Quotes',
    higher_means: 'third-party launch quotes falling faster than planned (cheaper launch ahead; 50 = on plan)',
    note: (lo, hi) => `Quotes across the providers, read against plan: ${lo}–${hi}. Above 50, launch is getting cheaper faster than planned.`,
  },
  {
    id: 'fleet_reliability',
    label: 'Fleet Reliability',
    higher_means: 'industry-reported orbital GPU failures running worse than the 8%-a-year planning assumption (50 = on plan)',
    note: (lo, hi) => `Operators' and regulators' failure reports, read together: ${lo}–${hi}. Above 50, hardware in orbit is failing faster than planned.`,
  },
  {
    id: 'orbital_congestion',
    label: 'Orbital Congestion',
    higher_means: 'more conjunction alerts and avoidance manoeuvres in the busy shells (50 = 2031 levels)',
    note: (lo, hi) => `Conjunction alerts and manoeuvres in the busy shells: ${lo}–${hi}. Above 50, traffic is outgrowing 2031's.`,
  },
  {
    id: 'ground_power_squeeze',
    label: 'Ground Power Squeeze',
    higher_means: 'scarcer, dearer ground power: capacity prices, grid queues, moratoria (50 = 2031 levels)',
    note: (lo, hi) => `Capacity prices, queue lengths and moratoria, read together: ${lo}–${hi}. Above 50, ground power is getting scarcer.`,
  },
  {
    id: 'compute_demand_gap',
    label: 'Compute Demand Gap',
    higher_means: 'a wider gap between AI revenue and AI capex (bearish for rents; 50 = 2031 trend)',
    note: (lo, hi) => `AI revenue against AI capex: ${lo}–${hi}. Above 50, spending is running ahead of what it earns.`,
  },
  {
    id: 'regulatory_climate',
    label: 'Regulatory Climate',
    higher_means: 'tighter orbital regulation: licensing backlog, brightness and debris rule-making (50 = 2031 levels)',
    note: (lo, hi) => `Licensing backlog and the rules in the works: ${lo}–${hi}. Above 50, orbit is getting harder to license.`,
  },
]

type Anchors = [number, number][]
/** Each future's latent (true) path per indicator, as [act quarter, value] anchors (straight lines between). */
const LATENT: Record<Future, Record<Ind, Anchors>> = {
  // F1 On Schedule (trigger 2032Q3): launch prices fall on schedule, fleets prove reliable; the busy shell fills late.
  f1: {
    launch_quotes: [[1, 50], [3, 58], [6, 80], [19, 74]],
    fleet_reliability: [[1, 50], [4, 44], [8, 38], [19, 40]],
    orbital_congestion: [[1, 50], [8, 56], [14, 68], [19, 78]],
    ground_power_squeeze: [[1, 50], [6, 60], [12, 58], [19, 44]],
    compute_demand_gap: [[1, 50], [8, 46], [19, 48]],
    regulatory_climate: [[1, 50], [19, 52]],
  },
  // F2 The Wall (trigger 2033Q1): launch stalls, satellites stay heavy and fail early, regulators cap constellations.
  f2: {
    launch_quotes: [[1, 50], [5, 44], [8, 34], [19, 36]],
    fleet_reliability: [[1, 50], [5, 58], [8, 68], [19, 70]],
    orbital_congestion: [[1, 50], [19, 56]],
    ground_power_squeeze: [[1, 50], [6, 64], [19, 68]],
    compute_demand_gap: [[1, 50], [10, 56], [19, 56]],
    regulatory_climate: [[1, 50], [5, 60], [8, 78], [19, 74]],
  },
  // F3 Closed Shell (trigger 2032Q4): congestion climbs to a cascade that closes the busy shell; insurance hardens.
  f3: {
    launch_quotes: [[1, 50], [6, 54], [7, 40], [10, 42], [19, 56]],
    fleet_reliability: [[1, 50], [5, 56], [7, 66], [12, 58], [19, 54]],
    orbital_congestion: [[1, 50], [3, 58], [6, 76], [7, 88], [10, 76], [19, 70]],
    ground_power_squeeze: [[1, 50], [7, 58], [9, 64], [19, 60]],
    compute_demand_gap: [[1, 50], [7, 52], [9, 60], [19, 54]],
    regulatory_climate: [[1, 50], [7, 54], [9, 66], [19, 62]],
  },
  // F4 Cheap Ground (trigger 2033Q2): queues shorten, firm power arrives, efficiency jumps; the squeeze unwinds.
  f4: {
    launch_quotes: [[1, 50], [19, 56]],
    fleet_reliability: [[1, 50], [19, 52]],
    orbital_congestion: [[1, 50], [19, 58]],
    ground_power_squeeze: [[1, 50], [5, 52], [7, 44], [9, 30], [19, 24]],
    compute_demand_gap: [[1, 50], [9, 46], [19, 44]],
    regulatory_climate: [[1, 50], [19, 50]],
  },
}

/** Each future's decoy (doc 33 §6.3): an indicator that spikes toward another future's reading, then falls back. */
const DECOY: Record<
  Future,
  { indicator: Ind; from: number; to: number; peak: number; delta: number; reason: string; tell: string }
> = {
  f1: {
    indicator: 'orbital_congestion',
    from: 3,
    to: 5,
    peak: 4,
    delta: 22,
    reason:
      'A spent rocket stage breaks up in a lower orbit and sets off a run of conjunction alerts. The fragments are low enough to decay within months; nothing above them is touched.',
    tell:
      'Congestion jumps while Launch Quotes keep improving and Fleet Reliability holds: a real cascade would drag reliability and insurance down with it.',
  },
  f2: {
    indicator: 'launch_quotes',
    from: 4,
    to: 6,
    peak: 5,
    delta: 24,
    reason:
      'The dominant launcher sells spare capacity at a promotional price to fill a thin manifest. Its list price never moves, and the offer ends when the manifest fills.',
    tell:
      'Quotes jump while the Regulatory Climate tightens and Fleet Reliability worsens: a lasting price fall comes with more flights and calmer rules, not fewer.',
  },
  // (M28.3: two quarters, 2031Q4–2032Q1, so the decoy ends before F3's right move, hedging, begins in 2032Q2)
  f3: {
    indicator: 'regulatory_climate',
    from: 3,
    to: 4,
    peak: 4,
    delta: 22,
    reason:
      'A proposed brightness-and-debris rule for large constellations draws a storm of comment and is shelved before it takes effect.',
    tell:
      'Regulation tightens on paper while Launch Quotes stay steady; the real danger is in Orbital Congestion, which keeps climbing underneath.',
  },
  f4: {
    indicator: 'ground_power_squeeze',
    from: 3,
    to: 4,
    peak: 4,
    delta: 26,
    reason:
      'A record capacity auction clears at its price cap, and the headlines call it the end of cheap ground power. Queue reforms and new firm power are already on the way.',
    tell:
      'The squeeze spikes on one auction while grid waits are already shortening and the Demand Gap is easing: the trend underneath is relief.',
  },
}

/** The futures' names and triggers (hidden; shown only in the chapter report's reveal). */
const META: Record<Future, { name: string; trigger: { title: string; card_id: string }; reasoning: string }> = {
  f1: {
    name: 'On Schedule',
    trigger: { title: 'The Booster Hits Its Price', card_id: 'iv_f1_c4' },
    reasoning:
      'Reusable heavy lift delivers: launch quotes fall on the published path and orbital fleets prove reliable, so orbit nears cost parity; by 2034 everyone floods the busy shell and rents fall.',
  },
  f2: {
    name: 'The Wall',
    trigger: { title: 'The Constellation Cap', card_id: 'iv_f2_c4' },
    reasoning:
      'Orbit stays dear: launch prices stall at the next-best alternative, satellites stay heavy and fail early, and regulators cap constellations. Energized ground MW stay the best asset.',
  },
  f3: {
    name: 'Closed Shell',
    trigger: { title: 'The Cascade at 550', card_id: 'iv_f3_c4' },
    reasoning:
      'Traffic in the dawn-dusk shell outgrows avoidance; a fragmentation cascade closes it to new launches. Insurance hardens; diversified shells, high orbit and the Moon are re-rated.',
  },
  f4: {
    name: 'Cheap Ground',
    trigger: { title: 'The Queue Breaks', card_id: 'iv_f4_c4' },
    reasoning:
      'The ground unblocks: fast-track connections, new firm power and an efficiency jump cut the squeeze. Orbit’s speed premium evaporates; long contracts and ground MW win.',
  },
}

function path(anchors: Anchors, n: number): number {
  if (n <= anchors[0][0]) return anchors[0][1]
  for (let i = 1; i < anchors.length; i++) {
    const [n1, v1] = anchors[i]
    const [n0, v0] = anchors[i - 1]
    if (n <= n1) return v0 + ((v1 - v0) * (n - n0)) / (n1 - n0)
  }
  return anchors.at(-1)![1]
}

/** A deterministic noise in −6…+6 for an indicator and quarter (the same in every future). */
function noise(ind: Ind, n: number): number {
  let h = 2166136261
  for (const c of `${ind}:${n}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  h ^= h >>> 13
  h = Math.imul(h, 0x5bd1e995)
  h ^= h >>> 15
  return ((h >>> 0) % 13) - 6
}

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)))

function file(f: Future) {
  const decoy = DECOY[f]
  const trigger = TRIGGER[f]
  return {
    schema_version: 1,
    future: f,
    future_name: META[f].name,
    reasoning: META[f].reasoning,
    DO_NOT_EXPOSE:
      'future_name, reasoning, trigger, decoy, authoring_latent and role tags are hidden: only the chapter report reveals them.',
    trigger: {
      quarter: QUARTERS[trigger],
      title: META[f].trigger.title,
      card_id: META[f].trigger.card_id,
      signals_start_quarter: QUARTERS[Math.max(2, trigger - 4)],
      quarters_of_warning: trigger - Math.max(2, trigger - 4),
    },
    decoy: {
      indicator: decoy.indicator,
      quarters: QUARTERS.slice(decoy.from, decoy.to + 1),
      peak_quarter: QUARTERS[decoy.peak],
      reason: decoy.reason,
      tell: decoy.tell,
    },
    indicators: INDICATORS.map((ind) => {
      const latent = QUARTERS.map((_, n) => {
        let v = path(LATENT[f][ind.id], n)
        if (ind.id === decoy.indicator && n >= decoy.from && n <= decoy.to)
          v += decoy.delta * (1 - Math.abs(n - decoy.peak) / (decoy.to - decoy.from + 1))
        return clamp(v)
      })
      const displayed = latent.map((v, n) => (n < 2 ? 50 : clamp(v + noise(ind.id, n))))
      return {
        id: ind.id,
        label: ind.label,
        higher_means: ind.higher_means,
        authoring_latent: latent,
        series: QUARTERS.map((q, n) => {
          const d = displayed[n]
          const prev = n === 0 ? 50 : displayed[n - 1]
          const lo = clamp(latent[n] - 3)
          const hi = clamp(latent[n] + 3)
          return {
            quarter: q,
            displayed: d,
            arrow: d - prev >= 3 ? 'up' : prev - d >= 3 ? 'down' : 'flat',
            role_tag:
              ind.id === decoy.indicator && n >= decoy.from && n <= decoy.to
                ? 'decoy'
                : n >= trigger
                  ? 'aftermath'
                  : n >= trigger - 4 && n >= 2
                    ? 'signal_window'
                    : 'baseline',
            sharp: { low: lo, high: hi, note: ind.note(lo, hi) },
          }
        }),
      }
    }),
  }
}

mkdirSync(new URL('docs/act4-content/', ROOT), { recursive: true })
for (const f of ['f1', 'f2', 'f3', 'f4'] as const) {
  const text = JSON.stringify(file(f), null, 2) + '\n'
  writeFileSync(new URL(`docs/act4-content/signals_iv_${f}.json`, ROOT), text)
  writeFileSync(new URL(`src/content/signals_iv_${f}.json`, ROOT), text)
}
console.log('Act IV signals: 4 futures × 6 indicators × 20 quarters, written to docs/act4-content/ and src/content/.')
