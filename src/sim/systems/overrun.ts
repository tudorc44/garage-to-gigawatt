// Cost overruns and schedule slips (M35, doc 38 §5.1): realised = budget × m, m lognormal by reference class (median,
// σ, capped). Built from + − × ÷ only: Math.exp and Math.log may differ between browsers and break replays (rng.ts).
import { ENERGY, type OverrunClass } from '../../content/energyContent.ts'
import { random, type RngHolder } from '../rng.ts'

/** A standard normal value: the sum of 12 uniform rolls minus 6 (as rng.ts's binomial approximation). */
export function normal(holder: RngHolder): number {
  let z = -6
  for (let i = 0; i < 12; i++) z += random(holder)
  return z
}

/** e^x from + − × ÷ only: x is halved 16 times, a Taylor series, then squared back 16 times. */
export function expDet(x: number): number {
  const y = x / 65536
  let term = 1
  let sum = 1
  for (let i = 1; i <= 8; i++) {
    term = (term * y) / i
    sum += term
  }
  for (let i = 0; i < 16; i++) sum *= sum
  return sum
}

/** A lognormal draw: median × e^(σ z), capped. */
export function lognormal(holder: RngHolder, median: number, sigma: number, cap = Infinity): number {
  return Math.min(cap, median * expDet(sigma * normal(holder)))
}

/**
 * A cost multiplier m for a reference class (energy.json overrun_classes; doc 38 §5.1's table). Refitted classes
 * (design thread, answer 6: nuclear, pumped hydro): with chance p_under m is uniform in `under` (at or under budget),
 * else 1 + X, X lognormal; this keeps both the fat tail and the stated under-budget share.
 */
export function drawOverrun(holder: RngHolder, cls: OverrunClass): number {
  const c = ENERGY.overrun_classes[cls]
  if (c.p_under !== undefined && c.under && c.x_median !== undefined && c.x_sigma !== undefined) {
    if (random(holder) < c.p_under) return c.under[0] + random(holder) * (c.under[1] - c.under[0])
    return Math.min(c.cap, 1 + lognormal(holder, c.x_median, c.x_sigma))
  }
  return lognormal(holder, c.median, c.sigma, c.cap)
}
