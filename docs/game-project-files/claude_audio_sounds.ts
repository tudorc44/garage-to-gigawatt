// Garage to Gigawatt — sound map. ZzFX params (MIT, github.com/KilledByAPixel/ZzFX).
// Order: [volume, randomness, frequency, attack, sustain, release, shape, shapeCurve, slide, deltaSlide,
//  pitchJump, pitchJumpTime, repeatTime, noise, modulation, bitCrush, delay, sustainVolume, decay, tremolo, filter]
// shape: 0 sine, 1 triangle, 2 saw, 3 tan, 4 noise. filter: negative = lowpass cutoff (Hz), positive = highpass.
// Every sound has an on-screen visual equivalent; sound never carries information alone.

export type SoundGroup = 'ui' | 'game' | 'alerts';
export interface SoundDef { params: number[]; group: SoundGroup; volume: number; note: string; tune: string; when: string; category: string; }

export const SOUNDS = {
  // Soft woody tick: 30 ms triangle at 300 Hz, lowpassed at 2 kHz. (~0.03 s)
  'ui-click': { params: [0.4, 0.05, 300, 0, 0, 0.02, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0.005, 0, -2000], group: 'ui', volume: 1, category: 'UI', when: "any button", note: "Soft woody tick: 30 ms triangle at 300 Hz, lowpassed at 2 kHz.", tune: "Softer: lower filter (-1500); brighter: raise frequency to 380." },
  // Lighter, shorter tick than ui-click at 420 Hz. (~0.02 s)
  'ui-toggle': { params: [0.3, 0.05, 420, 0, 0, 0.015, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0.004, 0, -2500], group: 'ui', volume: 1, category: 'UI', when: "segmented control / HODL slider step", note: "Lighter, shorter tick than ui-click at 420 Hz.", tune: "Shorter: release .01; lower: frequency 350." },
  // Paper slide: filtered noise swelling in over 60 ms with a slight upward drift. (~0.24 s)
  'ui-open': { params: [0.25, 0, 900, 0.06, 0.04, 0.12, 4, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0.6, 0.02, 0, -3000], group: 'ui', volume: 1, category: 'UI', when: "modal or event card opens", note: "Paper slide: filtered noise swelling in over 60 ms with a slight upward drift.", tune: "Softer: filter -2000; shorter: release .08." },
  // Reverse paper slide: quick noise onset that fades and drifts down. (~0.22 s)
  'ui-close': { params: [0.25, 0, 900, 0.02, 0.03, 0.15, 4, 1, -2, 0, 0, 0, 0, 0, 0, 0, 0, 0.6, 0.02, 0, -2200], group: 'ui', volume: 1, category: 'UI', when: "modal closes", note: "Reverse paper slide: quick noise onset that fades and drifts down.", tune: "Softer: filter -1600; brighter: frequency 1100." },
  // Dull double thud: 110 Hz sine with full tremolo making two bumps. (~0.16 s)
  'ui-deny': { params: [0.5, 0, 110, 0, 0.06, 0.1, 0, 1, -1, 0, 0, 0, 0.07, 0, 0, 0, 0, 1, 0, 1, -800], group: 'ui', volume: 1, category: 'UI', when: "disabled or unaffordable click", note: "Dull double thud: 110 Hz sine with full tremolo making two bumps.", tune: "Lower: frequency 90; shorter: repeatTime .05 and sustain .04." },
  // Relay clunk (fast decay) into a lowpassed saw spinning up ~150 Hz like a fan. (~0.33 s)
  'end-quarter': { params: [0.4, 0.05, 60, 0.005, 0.12, 0.18, 2, 1.5, 1, 0, 0, 0, 0, 0.4, 0, 0, 0, 0.5, 0.03, 0, -900], group: 'game', volume: 1, category: 'Turn', when: "End Quarter pressed", note: "Relay clunk (fast decay) into a lowpassed saw spinning up ~150 Hz like a fan.", tune: "Softer: filter -600; shorter: sustain .06." },
  // Barely-there clock tick, 10 ms. (~0.01 s)
  'week-tick': { params: [0.12, 0, 600, 0, 0, 0.01, 1, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, -1500], group: 'game', volume: 1, category: 'Turn', when: "each live week (off by default)", note: "Barely-there clock tick, 10 ms.", tune: "Softer: volume .08; brighter: filter -2500." },
  // Ledger thump (90 Hz) that jumps to a small 790 Hz bell tail. (~0.35 s)
  'quarter-report': { params: [0.4, 0, 90, 0, 0.02, 0.3, 0, 1, 0, 0, 700, 0.04, 0, 0, 0, 0, 0, 0.4, 0.03, 0, 0], group: 'game', volume: 1, category: 'Turn', when: "report appears", note: "Ledger thump (90 Hz) that jumps to a small 790 Hz bell tail.", tune: "Softer bell: pitchJump 500; shorter: release .2." },
  // Coins out: jingling 1 kHz clinks that step down. (~0.17 s)
  'buy': { params: [0.25, 0.1, 1000, 0, 0.03, 0.12, 0, 1, 0, 0, -150, 0.03, 0.05, 0, 0, 0, 0, 0.5, 0.02, 0, -3000], group: 'game', volume: 1, category: 'Money', when: "machine or site bought", note: "Coins out: jingling 1 kHz clinks that step down.", tune: "Softer: filter -2200; lower: frequency 800." },
  // Coins in: same jingle, stepping up and a touch brighter. (~0.17 s)
  'sell': { params: [0.25, 0.1, 1100, 0, 0.03, 0.12, 0, 1, 0, 0, 200, 0.03, 0.05, 0, 0, 0, 0, 0.5, 0.02, 0, -3500], group: 'game', volume: 1, category: 'Money', when: "sold", note: "Coins in: same jingle, stepping up and a touch brighter.", tune: "Softer: filter -2500; shorter: release .08." },
  // Fast soft tick, 15 ms. (~0.01 s)
  'count-up': { params: [0.1, 0.1, 700, 0, 0, 0.015, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, -2500], group: 'game', volume: 1, category: 'Money', when: "numbers counting at quarter end (max 20/s)", note: "Fast soft tick, 15 ms.", tune: "Softer: volume .06; lower: frequency 550." },
  // Two rising notes, 440 then 550 Hz, triangle. (~0.19 s)
  'price-up': { params: [0.3, 0, 440, 0.01, 0.08, 0.1, 1, 1, 0, 0, 110, 0.09, 0, 0, 0, 0, 0, 1, 0, 0, -2500], group: 'game', volume: 1, category: 'Market', when: "price alert, rising", note: "Two rising notes, 440 then 550 Hz, triangle.", tune: "Shorter: sustain .05 and pitchJumpTime .06; brighter: filter -3500." },
  // Two falling notes, 550 then 440 Hz, triangle. (~0.19 s)
  'price-down': { params: [0.3, 0, 550, 0.01, 0.08, 0.1, 1, 1, 0, 0, -110, 0.09, 0, 0, 0, 0, 0, 1, 0, 0, -2500], group: 'game', volume: 1, category: 'Market', when: "price alert, falling", note: "Two falling notes, 550 then 440 Hz, triangle.", tune: "Shorter: sustain .05 and pitchJumpTime .06; lower: frequency 440 with pitchJump -88." },
  // Single desk bell: 880 Hz sine struck, 350 ms ring. (~0.36 s)
  'interrupt': { params: [0.3, 0, 880, 0, 0.01, 0.35, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], group: 'alerts', volume: 1, category: 'Alerts', when: "toast, \"interrupt incoming\"", note: "Single desk bell: 880 Hz sine struck, 350 ms ring.", tune: "Softer: add filter -2500; lower: frequency 660." },
  // Phone-like warbling triangle ring, echoed once 300 ms later (double ring, ~0.53 s). (~0.53 s)
  'margin-call': { params: [0.35, 0, 520, 0.01, 0.2, 0.02, 1, 1, 0, 0, 0, 0, 0.025, 0, 0, 0, 0.3, 1, 0, 0.7, -2500], group: 'alerts', volume: 1, category: 'Alerts', when: "margin call", note: "Phone-like warbling triangle ring, echoed once 300 ms later (double ring, ~0.53 s).", tune: "Less insistent: tremolo .4; shorter: delay .2." },
  // Heavy low drop: 160 Hz sine sinking with a gritty edge, ~0.6 s. (~0.65 s)
  'liquidation': { params: [0.6, 0, 160, 0, 0.15, 0.45, 0, 1, -0.2, 0, 0, 0, 0, 0.2, 0, 0, 0, 1, 0.05, 0, -700], group: 'alerts', volume: 1, category: 'Alerts', when: "collateral seized", note: "Heavy low drop: 160 Hz sine sinking with a gritty edge, ~0.6 s.", tune: "Softer: noise 0; lower: frequency 120." },
  // Short electrical crackle: bit-crushed noise with fast stutter. (~0.23 s)
  'failure': { params: [0.3, 0.2, 300, 0, 0.08, 0.15, 4, 1, 0, 0, 0, 0, 0.03, 1, 0, 0.4, 0, 0.7, 0, 0.6, -2500], group: 'alerts', volume: 1, category: 'Alerts', when: "machine failure wave", note: "Short electrical crackle: bit-crushed noise with fast stutter.", tune: "Softer: bitCrush .2 and filter -1800; shorter: sustain .04." },
  // Muffled knock-knock: a 140 Hz knock echoed once at 120 ms. (~0.16 s)
  'complaint': { params: [0.5, 0, 140, 0, 0, 0.04, 0, 1, -2, 0, 0, 0, 0, 0.5, 0, 0, 0.12, 1, 0, 0, -600], group: 'alerts', volume: 1, category: 'Alerts', when: "neighbour complaint", note: "Muffled knock-knock: a 140 Hz knock echoed once at 120 ms.", tune: "Brighter: filter -1000; faster knocks: delay .09." },
  // Low 70 Hz hum swelling in and out with slow tremolo, 0.8 s. (~0.80 s)
  'heat-warning': { params: [0.35, 0, 70, 0.3, 0.2, 0.3, 2, 1, 0, 0, 0, 0, 0.1, 0, 0, 0, 0, 1, 0, 0.3, -500], group: 'alerts', volume: 1, category: 'Alerts', when: "Heat crosses 50 / 70 / 90", note: "Low 70 Hz hum swelling in and out with slow tremolo, 0.8 s.", tune: "Softer: filter -350; for 70/90 raise frequency to 80/90 (tune in code)." },
  // Gavel knock then a small upward step. (~0.25 s)
  'auction-won': { params: [0.4, 0, 200, 0, 0.03, 0.2, 1, 1, 0.5, 0, 100, 0.06, 0, 0.3, 0, 0, 0, 0.5, 0.02, 0, -1800], group: 'game', volume: 1, category: 'Deals', when: "auction won", note: "Gavel knock then a small upward step.", tune: "Softer: noise 0; brighter: pitchJump 150." },
  // Gavel knock then a small downward step. (~0.25 s)
  'auction-lost': { params: [0.4, 0, 200, 0, 0.03, 0.2, 1, 1, -0.5, 0, -60, 0.06, 0, 0.3, 0, 0, 0, 0.5, 0.02, 0, -1800], group: 'game', volume: 1, category: 'Deals', when: "auction lost", note: "Gavel knock then a small downward step.", tune: "Softer: noise 0; lower: frequency 170." },
  // Stamp thunk: noisy 90 Hz hit, fast decay. (~0.14 s)
  'deal-agreed': { params: [0.5, 0, 90, 0, 0.01, 0.12, 0, 1, -0.5, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0.01, 0, -900], group: 'game', volume: 1, category: 'Deals', when: "negotiation accepted", note: "Stamp thunk: noisy 90 Hz hit, fast decay.", tune: "Crisper: filter -1400; softer: noise .5." },
  // Door close: low 70 Hz thud with a latch-like jump at 100 ms. (~0.19 s)
  'walk-away': { params: [0.45, 0, 70, 0, 0.05, 0.12, 1, 1, -0.2, 0, 300, 0.1, 0, 0.8, 0, 0, 0, 0.7, 0.02, 0, -1200], group: 'game', volume: 1, category: 'Deals', when: "negotiation ends", note: "Door close: low 70 Hz thud with a latch-like jump at 100 ms.", tune: "Softer latch: pitchJump 150; shorter: release .08." },
  // Soft two-note welcome, G4 to C5, sine. (~0.25 s)
  'hire': { params: [0.3, 0, 392, 0.02, 0.08, 0.15, 0, 1, 0, 0, 131, 0.1, 0, 0, 0, 0, 0, 1, 0, 0, -3000], group: 'game', volume: 1, category: 'Deals', when: "new hire", note: "Soft two-note welcome, G4 to C5, sine.", tune: "Lower: frequency 294 with pitchJump 98; shorter: release .1." },
  // Power-up: lowpassed saw rising from 55 Hz and settling, ~0.6 s. (~0.60 s)
  'energized': { params: [0.35, 0, 55, 0.15, 0.25, 0.2, 2, 1, 0.15, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, -800], group: 'game', volume: 1, category: 'Power', when: "a site comes online", note: "Power-up: lowpassed saw rising from 55 Hz and settling, ~0.6 s.", tune: "Softer: filter -550; shorter: sustain .15." },
  // Power-down slide: lowpassed saw sinking from 110 Hz. (~0.45 s)
  'curtail': { params: [0.35, 0, 110, 0, 0.2, 0.25, 2, 1, -0.15, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, -700], group: 'game', volume: 1, category: 'Power', when: "curtailment chosen", note: "Power-down slide: lowpassed saw sinking from 110 Hz.", tune: "Softer: filter -500; shorter: sustain .12." },
  // Deep single thud: 55 Hz sine, half-second tail. (~0.60 s)
  'halving': { params: [0.6, 0, 55, 0, 0.05, 0.5, 0, 1, -0.1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0.05, 0, -400], group: 'game', volume: 1, category: 'Milestones', when: "the 2020 halving", note: "Deep single thud: 55 Hz sine, half-second tail.", tune: "Brighter (audible on laptops): frequency 75." },
  // Exchange bell, 660 Hz, tremolo pulsing into ~3 strikes over 1.3 s. (~1.30 s)
  'ipo-bell': { params: [0.35, 0, 660, 0, 0.9, 0.4, 0, 1, 0, 0, 0, 0, 0.4, 0, 0, 0, 0, 1, 0, 1, -3000], group: 'game', volume: 1, category: 'Milestones', when: "IPO completes", note: "Exchange bell, 660 Hz, tremolo pulsing into ~3 strikes over 1.3 s.", tune: "Fewer/more strikes: repeatTime .5 / .3; softer: filter -2200." },
  // Long power-down: lowpassed saw falling 180 to ~100 Hz over 2.2 s. (~2.22 s)
  'merge': { params: [0.4, 0, 180, 0.02, 1, 0.9, 2, 1, -0.08, 0, 0, 0, 0, 0, 0, 0, 0, 0.8, 0.3, 0, -900], group: 'game', volume: 1, category: 'Milestones', when: "the Merge happens", note: "Long power-down: lowpassed saw falling 180 to ~100 Hz over 2.2 s.", tune: "Shorter: sustain .6; final click comes from ui-click played at the end (see sfx note)." },
  // Warm G3 to C4 cadence with a soft echo, ~1.5 s. (~1.48 s)
  'chapter-complete': { params: [0.35, 0, 196, 0.03, 0.5, 0.8, 1, 1, 0, 0, 65.4, 0.35, 0, 0, 0, 0, 0.15, 1, 0, 0, -2000], group: 'game', volume: 1, category: 'Milestones', when: "the Act I report", note: "Warm G3 to C4 cadence with a soft echo, ~1.5 s.", tune: "Brighter: filter -3000; shorter: release .5." },
  // Slow falling triangle, 220 to ~100 Hz, 1.75 s. (~1.75 s)
  'game-over': { params: [0.4, 0, 220, 0.05, 0.6, 0.9, 1, 1, -0.07, 0, 0, 0, 0, 0, 0, 0, 0, 0.8, 0.2, 0, -1500], group: 'game', volume: 1, category: 'Milestones', when: "out of cash", note: "Slow falling triangle, 220 to ~100 Hz, 1.75 s.", tune: "Softer: filter -1000; shorter: sustain .35." },
} satisfies Record<string, SoundDef>;

export type SoundName = keyof typeof SOUNDS;
