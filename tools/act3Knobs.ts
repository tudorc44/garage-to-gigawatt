// The M18.6 tuning knobs, settable for one harness run (tools only): `--knobs K1.rubin=0.9,K2=0.875`. Each knob
// sets the value the game reads in this process (BALANCE, or the parsed card / market content), so a candidate can be
// tried before it's written down in balance.ts or the content files. The list is the spec's, nothing more:
// K1 Rubin / Rubin Ultra rent factors (C2); K2 the low shell tier's rent multiple (C1); K3 the reopener fee and the
// tenant's trigger (A4); K4 s1_c2's premium, s2_c2's delay, s0_c2's refinance spread (A6); K5 the standby's size and
// spread (F7, A1); K6 the nuclear PPA prices, a shift in $/MWh (C3).
import { BALANCE, CONTENT, SCENARIO_IDS } from '../src/content/index.ts'
import { act3CardEngineId } from '../src/content/act3Cards.ts'
import { getCard } from '../src/sim/systems/events.ts'

/** A BALANCE object whose numbers a knob sets (its `as const` types are literal). */
const nums = (o: object) => o as Record<string, number>
const B = BALANCE.act3

/** A card choice's engine effects (c1 …), to set one of its numbers. */
function choiceEffects(card: string, choice: string): Record<string, unknown> {
  const c = getCard(act3CardEngineId(card))!.choices.find((x) => x.id === choice)!
  return c.effects as Record<string, unknown>
}

const KNOBS: Record<string, (v: number) => void> = {
  'K1.rubin': (v) => (nums(B.rubinRentFactor).rubin_nvl144 = v),
  'K1.ultra': (v) => (nums(B.rubinRentFactor).rubin_ultra = v),
  K2: (v) => (nums(B.density.shellTierRentMult).low = v),
  'K3.fee': (v) => (nums(B.reopener).feeShareOfQuarterRent = v),
  'K3.trigger': (v) => (nums(B.reopener).tenantTriggerBandHigh = v),
  'K4.s1c2': (v) => {
    const e = choiceEffects('s1_c2', 'c1').accelerate_project as { capexShare: number }
    e.capexShare = v
  },
  'K4.s2c2': (v) => (choiceEffects('s2_c2', 'c1').delay_marginal_project = v),
  'K4.s0c2': (v) => (choiceEffects('s0_c2', 'c1').debt_spread_add = v),
  'K5.size': (v) => (nums(B.standby).valuationShare = v),
  'K5.spread': (v) => (nums(B.standby).spreadBps = v),
  K6: (v) => {
    for (const id of SCENARIO_IDS)
      for (const q of CONTENT.act3Scenarios[id].inputs)
        if (q.act3 && q.act3.nuclearPpaUsdMwh !== null) q.act3.nuclearPpaUsdMwh += v
  },
}

/** Applies `spec` (comma-separated name=value); returns the knobs set, for the report. */
export function applyKnobs(spec: string): string[] {
  if (spec.trim() === '') return []
  return spec.split(',').map((pair) => {
    const [name, value] = pair.split('=')
    const set = KNOBS[name.trim()]
    if (!set) throw new Error(`Unknown knob "${name}" (known: ${Object.keys(KNOBS).join(', ')})`)
    set(Number(value))
    return `${name.trim()}=${Number(value)}`
  })
}
