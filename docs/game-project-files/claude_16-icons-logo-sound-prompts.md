# 16: Prompts for Phase 1, Step 7: Icons, Title & Logo, Sound

*26 Sep 2026. Four prompts. Prompts 1, 2B and 3 can be run from this project thread; prompt 2A needs web search, so run it in a chat thread.*

---

## What we already have

- **Logo:** the stacked "GARAGE TO / GIGAWATT" wordmark with a hazard stripe (Logo component) and a placeholder Steam capsule (StoreCapsule), both in the design system.
- **Icons:** 18 line icons (20px grid, 1.5px stroke, round caps, `ink`): cash, treasury, bandwidth, btc, eth, hashrate, power, heat, site, machine, loan, rival, news, settings, pause, speed, skip, warning.
- **Sound:** nothing yet. The tech stack (doc 06) chose **ZzFX**.

## A correction on sound

You don't buy or download ZzFX sounds. [ZzFX](https://github.com/KilledByAPixel/ZzFX) is a tiny (<1 KB) MIT-licensed JavaScript synth by Frank Force. Each sound is a short array of about 20 numbers, e.g. `zzfx(...[,,925,.04,.3,.6,1,.3,,6.27,-184,.09,.17])`, played by a function you install with `npm install zzfx`.

So the sounds are **written, not sourced**, and Claude can write them. The one limit is that Claude can't hear them. You audition and tweak them in the free [ZzFX designer](https://killedbyapixel.github.io/ZzFX/) (paste an array, press play, move sliders, copy the new array back). Prompt 3 asks for a small soundboard page so you can review all of them in one place.

**For the few sounds a synth does badly** (paper, a stamp, a cash register), there's a safe fallback: [Kenney's Interface Sounds](https://kenney.nl/assets/interface-sounds) and [UI Audio](https://kenney.nl/assets/ui-audio) packs are CC0 (public domain, free for commercial use, no credit needed). Use at most 3–5 of these files, so the game stays small.

**Music** is out of scope for the alpha. Later options are [ZzFXM](https://keithclark.github.io/ZzFXM/) (a tiny tracker made for ZzFX) or CC0 / licensed tracks.

---

## Icons: what we need

The 18 existing icons cover the top bar and core resources. The screens need about **40 more**. The alpha set comes first:

| Group | Icons | Used on |
|---|---|---|
| Navigation (6) | dashboard, fleet, capital, people, league, log | Left nav |
| Machines (2) | gpu-rig, asic | Fleet table, buy panel, auctions |
| Site ladder (5) | garage, small-unit, warehouse, own-site, texas-site | Site ladder, site cards |
| Actions (9) | buy, sell, scout, negotiate, pitch, hire, outreach, read-market, bid | Action rows, Fleet buy/sell |
| Alerts and status (8) | price-alert, curtail, failure, complaint, margin-call, locked, in-transit, degraded | Interrupt cards, toasts, tables |
| Capital (3) | seed, ipo, cap-table | Funding ladder |
| UI utility (10) | close, info, check, chevron-right, save, export, import, sound-on, sound-off, glossary | Modals, tooltips, settings |
| **Later, not alpha** | 5 hire portraits (abstract monogram badges, not faces), 4 Merge options, achievement badges | Act II and Steam |

Plus the **app icon / favicon**, covered in prompt 2B.

---

## Prompt 1: Complete the icon set (run in the design system)

*(Paste between the lines. If you run it from this project thread, Claude applies it to the "Garage to Gigawatt" design system.)*

---

Extend the **Icons** asset group of the "Garage to Gigawatt" design system from 18 to about 60 icons. Match the existing 18 exactly: 20×20 viewBox, 1.5px stroke, round caps and joins, no fills (except a small dot where a glyph needs one), single ink `#1E2A44`, optically centred with about 2px of padding.

**Draw these 43 new icons**, filenames in kebab-case:

- **Navigation:** dashboard, fleet, capital, people, league, log
- **Machines:**
  - gpu-rig: an open frame with 3 fan circles
  - asic: a box with a single fan and a vent slot, clearly different from gpu-rig
- **Site ladder:**
  - garage: a house with a roll-up door
  - small-unit: a single-bay unit
  - warehouse: a wide shed with a sawtooth roof
  - own-site: a fenced plot with a transformer
  - texas-site: a lattice pylon and a low shed
- **Actions:**
  - buy (plus in a tag), sell (minus in a tag), scout (binoculars), negotiate (two opposing arrows meeting)
  - pitch (an easel with a rising line), hire (a person silhouette with a plus, head and shoulders only, no face)
  - outreach (a speech bubble with three dots), read-market (a magnifier over a line chart), bid (a gavel)
- **Alerts and status:**
  - price-alert (a bell), curtail (a plug with a slash), failure (a chip with a jagged crack), complaint (a speech bubble with "!")
  - margin-call (a gauge with the needle in the red zone), locked (a padlock), in-transit (a container ship), degraded (a signal with one bar missing)
- **Capital:** seed (a sprout), ipo (a bell on a stand), cap-table (a pie split into three)
- **UI:** close, info, check, chevron-right, save, export, import, sound-on, sound-off, glossary (an open book)

**Rules:**
- Every icon must read at 16px as well as 20px. Test by eye at both sizes.
- **Never use** real logos, coin logos, national flags, faces, text inside icons (except the "!" in complaint), emoji shapes or filled blobs.
- Similar concepts must stay distinguishable in silhouette: gpu-rig vs asic, site vs warehouse, sell vs close, locked vs save.
- Upload each SVG as an asset in the Icons group, in the order listed after the existing 18.
- Update the Iconography section of the README with the full list and where each icon is used (nav, action rows, interrupt cards, tables).
- Add an **Icon** component to the bundle: `<Icon name="scout" size={20} />`. It renders the inline SVG with `stroke="currentColor"`, so icons follow the era's `ink` automatically. Add a preview showing every icon at 20px with its name, plus a 16px row.

---

## Prompt 2A: Name and logo availability check (run in a chat thread with web search)

*(Paste between the lines.)*

---

I'm making an indie business-sim game called **"Garage to Gigawatt"** (a crypto miner in 2017 grows into an AI data-centre developer by 2035). It's a browser game first, then Steam, and may be sold commercially. Before I finalise the logo, check whether the name is safe to use. Search the web and report:

1. **Existing games or apps** with the same or a confusingly similar name (Steam, itch.io, the App Store, Google Play, Poki, CrazyGames).
2. **Trademarks:** search the USPTO (TESS / trademark search), EUIPO (eSearch plus) and the WIPO Global Brand Database for "Garage to Gigawatt", "Gigawatt" and "G2G" in Nice classes 9 (software, games) and 41 (entertainment). List any live marks in those classes.
3. **Domains and handles:** whether garagetogigawatt.com / .gg / .game appear taken, and whether @garagetogigawatt is used on X, Instagram, TikTok and YouTube.
4. **Search clutter:** what a search for the name shows today, e.g. whether it's a common phrase in energy or data-centre marketing.
5. **Backup names:** 5 alternatives in the same spirit (from our earlier list: Take or Pay, Powered Land, Hash to Hyperscale), each with a quick conflict check.

Give a **traffic-light verdict** (green / amber / red) with reasons, and say what a lawyer would still need to check. I understand this is not legal advice.

---

## Prompt 2B: Title and logo kit (run in the design system)

*(Run after 2A comes back green or amber. Paste between the lines.)*

---

Finish the **logo and title kit** for "Garage to Gigawatt" in the design system. It's marketing only, in the brand style borrowed from direction C: Barlow Condensed 800 uppercase, `brand-black` #121212, `brand-yellow` #FFC400 and `brand-concrete` #E4E2DC, with the hazard stripe. The game UI stays in the ledger style.

**Deliver:**

1. **Logo lockups** as components with previews:
   - Stacked: the existing logo, refined. Check the kerning of "GIGAWATT", and make the stripe length match the longest line exactly.
   - Horizontal: one line, for headers and banners.
   - Reversed: yellow on black.
   - One-colour: black only, for print and embossing.
   - Minimum sizes and clear space for each.
2. **The mark:** a compact symbol for when the wordmark won't fit. Explore 3 options on one board, then pick one and justify it:
   - "G2G" condensed inside a square with a hazard stripe
   - A bolt cut out of a stacked "G"
   - A pylon silhouette formed from two Gs
   It must read at 16×16.
3. **App icon and favicon set** from the mark:
   - 16, 32, 48, 180 (Apple touch), 192 and 512 px PNG-ready SVGs
   - A maskable safe-zone version for PWA / Android
   Upload the SVGs to a new **Logos** asset group, with a README naming each file and its use.
4. **Steam library asset templates** at the exact sizes, logo placed, art area labelled as a placeholder:
   - Header capsule 920×430 (update StoreCapsule)
   - Small capsule 462×174
   - Vertical capsule 748×896
   - Library capsule 600×900
   - Library hero 3840×1240 (no logo on it)
   - Library logo 1280×720 with a transparent background
5. **Title screen:** a 1280×720 in-game title screen that joins the two worlds. The ledger paper and blueprint grid fill the screen, the C-style logo sits on it like a stencilled sign, and the menu (New career / Continue / Load save / Settings) uses the system's Buttons. Show it in both the Garage and Industrial eras.
6. **README:** a "Logo and title" section with usage do's and don'ts (never recolour, never stretch, never put the logo on busy art without a concrete or black plate), and where each file is used.

**Rules:** no real company marks or coin logos, no gradients, no drop shadows on the logo. Everything must fit both the Steam and itch.io specs.

---

## Prompt 3: ZzFX sound bank (run here or in Claude Code)

*(Paste between the lines. Before the repo exists (Phase 0, step 4), run it here and Claude builds the soundboard as an artifact. Once the repo exists, run it in Claude Code.)*

---

Create the **sound effects** for "Garage to Gigawatt" using **ZzFX** (MIT, `npm install zzfx`, https://github.com/KilledByAPixel/ZzFX). Each sound is a ZzFX parameter array.

**Sound direction:** warm, mechanical and analog, like a founder's workshop and an old trading floor: relays, fans, paper, coins, a desk bell. **Avoid** arcade bleeps, laser zaps, 8-bit jumps and anything shrill.
- Most sounds under 0.4 s.
- Alarms under 1.2 s.
- Only the milestone and finale stings may run longer, up to 2.5 s.
- Low-to-mid pitch; keep the high end soft.
- No sound should be unpleasant on its 50th play.

**The sound list** (name · when it plays · character):

| Group | Sound | When it plays | Character |
|---|---|---|---|
| UI | ui-click | any button | soft, woody tick |
| UI | ui-toggle | segmented control or HODL slider step | lighter tick |
| UI | ui-open | modal or event card opens | paper slide |
| UI | ui-close | modal closes | reverse paper slide |
| UI | ui-deny | disabled or unaffordable click | dull double thud |
| Turn | end-quarter | End Quarter pressed | relay clunk plus fan spin-up |
| Turn | week-tick | each live week (optional, off by default) | barely-there clock tick |
| Turn | quarter-report | report appears | ledger thump plus a small bell |
| Money | buy | machine or site bought | coins out |
| Money | sell | sold | coins in, slightly brighter than buy |
| Money | count-up | numbers counting at quarter end | fast soft ticks; needs a rate limit |
| Market | price-up | price alert, rising | two rising notes |
| Market | price-down | price alert, falling | two falling notes |
| Alerts | interrupt | toast, "interrupt incoming" | desk bell, single |
| Alerts | margin-call | margin call | insistent phone-like double ring, <1 s |
| Alerts | liquidation | collateral seized | heavy low drop |
| Alerts | failure | machine failure wave | electrical crackle, short |
| Alerts | complaint | neighbour complaint | muffled knock-knock |
| Alerts | heat-warning | Heat crosses 50 / 70 / 90 | low hum swell |
| Deals | auction-won | auction won | gavel plus a small rise |
| Deals | auction-lost | auction lost | gavel plus a small fall |
| Deals | deal-agreed | negotiation accepted | stamp thunk |
| Deals | walk-away | negotiation ends | door close |
| Deals | hire | new hire | soft two-note welcome |
| Power | energized | a site comes online | power-up hum rising to steady |
| Power | curtail | curtailment chosen | power-down slide |
| Milestones | halving | the 2020 halving | deep single thud |
| Milestones | ipo-bell | IPO completes | exchange bell, 3 strikes, ≤2.5 s |
| Milestones | merge | the Merge happens | long power-down with a final click, ≤2.5 s |
| Milestones | chapter-complete | the Act I report | short warm cadence, ≤2.5 s |
| Milestones | game-over | out of cash | slow falling tone, ≤2 s |

**Deliverables:**

1. `src/ui/audio/sounds.ts`: a typed map `{ name: { params: number[], group, volume, note } }`, with a one-line comment per sound describing it in words (so it can be tuned later without listening).
2. `src/ui/audio/sfx.ts`: a small wrapper.
   - `play(name)`, with group volumes (UI / game / alerts) and a master mute from Settings.
   - Rate limiting: count-up at most 20 per second; the same sound is not repeated within 60 ms.
   - The audio context starts only after the first user click (browser autoplay rules).
   - Silent in the headless sim-runner.
3. **A soundboard page** (`tools/soundboard.html`, or an artifact if there's no repo yet):
   - One button per sound, grouped as above, showing its parameters.
   - A "copy array" button, and a link to open each sound in the ZzFX designer for tweaking.
   - Master volume and "play all in a group".
4. **Tuning notes:** for each sound, one sentence on which parameter to change to make it softer, shorter, lower or brighter.
5. **Fallback list:** name any sound that ZzFX can't make convincingly (candidates: cash register, stamp, paper) and pick a replacement from Kenney's CC0 [Interface Sounds](https://kenney.nl/assets/interface-sounds) or [UI Audio](https://kenney.nl/assets/ui-audio). Keep this to at most 5 files, as short OGG/MP3 under 30 KB each.

**Accessibility:**
- Every sound has a visual equivalent already on screen. Sound never carries information alone.
- Settings has sound on/off, and separate volumes for UI and alerts.
- The alerts group plays even when UI sounds are muted, unless master mute is on.

---

## After step 7

- Icons: 60+ in the design system, with an `Icon` component.
- Logo kit: lockups, mark, app icons, Steam templates, the title screen.
- Sounds: a named ZzFX bank plus a soundboard for your review.
- Phase 1 is then done. Next are Phase 0 step 4 (tools setup and repo) and Phase 2 (build).

## Sources

- [ZzFX on GitHub (MIT, npm `zzfx`)](https://github.com/KilledByAPixel/ZzFX)
- [ZzFX sound designer](https://killedbyapixel.github.io/ZzFX/)
- [Frank Force: ZzFX announcement](https://frankforce.com/zzfx-zuper-zmall-zeeded-zound-zynth/)
- [ZzFXM music player](https://keithclark.github.io/ZzFXM/)
- [Kenney: Interface Sounds (CC0)](https://kenney.nl/assets/interface-sounds)
- [Kenney: UI Audio (CC0)](https://kenney.nl/assets/ui-audio)
