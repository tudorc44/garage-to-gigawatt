# Garage to Gigawatt — audio notes

Files: `src/ui/audio/sounds.ts` (params, one-line description and tuning note per sound), `src/ui/audio/sfx.ts` (wrapper), `tools/soundboard.html` (open in a browser).

## ZzFX parameter cheat sheet
- **Softer:** lower the lowpass (make `filter`, index 20, closer to 0 but still negative, e.g. -3000 → -1800), or drop `volume` (0).
- **Shorter:** reduce `sustain` (4) and `release` (5).
- **Lower:** reduce `frequency` (2); for two-note sounds scale `pitchJump` (10) by the same ratio.
- **Brighter:** raise the lowpass cutoff or switch sine (6=0) to triangle (6=1).
- Keep `slide` (8) small: it's roughly Hz per second ÷ 500, so -1 over 0.5 s drops ~250 Hz.

Each sound's own tuning sentence is in `sounds.ts` (`tune`) and on the soundboard.

## Fallback list (sounds ZzFX can't make convincingly)
Audition these in the soundboard first; if they sound synthetic, swap in a Kenney CC0 sample (kenney.nl — *Interface Sounds* / *UI Audio*). Check exact file names in the pack; transcode to mono OGG ~48 kbps, trimmed, to stay under 30 KB.

| Sound | Why | Replacement to audition |
|---|---|---|
| ui-open / ui-close | noise synth reads as hiss, not paper | Interface Sounds: a `scroll_*` or `open_*` / `close_*` file (one file, reverse it for close) |
| deal-agreed (stamp) | lacks the rubber-and-wood body | Interface Sounds: a `drop_*` file |
| buy / sell (coins) | pure tones approximate but aren't metal | UI Audio: a coin-like `switch*` click layered 2–3× with small pitch offsets (one file) |
| walk-away (door) | latch is plausible, the door body isn't | Interface Sounds: a `close_*` file |

That's 4 files (paper, stamp, coins, door). Wire them by adding an optional `sample?: string` to `SoundDef` and preferring it in `play()`.

## Accessibility
- Every sound mirrors an on-screen event (toast, modal, number change, badge); nothing is audio-only.
- Settings: sound on/off (master mute = `enabled`), separate UI and Alerts volumes (game volume optional).
- Alerts play when UI volume is 0; only master mute silences them.
- week-tick is off by default.
