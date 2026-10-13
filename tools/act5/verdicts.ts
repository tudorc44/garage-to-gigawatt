// Verdict rules of the Act V sim table that tests also pin (reporting only: no bot or sim reads this).

/**
 * V-B8 as restated in doc 43 §0.21 decision 1: Perfect ÷ Passive above 1 in every future (reading pays) and
 * Over-reactor ÷ Passive at most 0.97 in every future (the decoy costs). The earlier form asked for 1.15 in 3 of 4 futures.
 */
export const vb8Passes = (perfectOverPassive: readonly number[], overreactorOverPassive: readonly number[]): boolean =>
  perfectOverPassive.length > 0 &&
  perfectOverPassive.every((x) => x > 1) &&
  overreactorOverPassive.length > 0 &&
  overreactorOverPassive.every((x) => x <= 0.97)
