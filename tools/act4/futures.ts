// Shared by Act IV's content generators (tools/act4/market.ts, signals.ts): facts about the four futures that both the
// market paths and the Signals are authored around. Designed (doc 33 §6.1 ⚙), recorded in docs/act4-content/README.md.

/**
 * Each future's trigger quarter as an act quarter (0 = 2031Q1; doc 33 §6.1: 2032Q2–2033Q3 = 5–10):
 * F1 On Schedule 2032Q3, F2 The Wall 2033Q1, F3 Closed Shell 2032Q4, F4 Cheap Ground 2033Q2.
 */
export const TRIGGER = { f1: 6, f2: 8, f3: 7, f4: 9 } as const
