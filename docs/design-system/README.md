A founder's ledger that grows up with the company. Paper, navy ink and a blueprint grid for the game; concrete, black and safety yellow for the logo and store art. Built for a finance-first tycoon played at 1280×720 in a browser, then on Steam.

## The idea in one line

The screen is the founder's working notebook: calm, precise and a little wry. Numbers are set like a trading terminal (dense, monospaced, right-aligned). Everything else is set like a well-kept engineering ledger.

## Content fundamentals

- **Voice:** a sharp business-newsletter writer. Grounded, dry, occasionally funny, never cartoonish and never "crypto bro". Real copy: *"Your barber asks about wallets."* · *"Anything less efficient than the new S19 is now a space heater with opinions."*
- **Person:** address the player as "you". The game never says "we".
- **Casing:** sentence case for everything, including buttons, panel titles and card titles ("End Quarter →" is the one exception: it's the game's name for the action). Labels above numbers are uppercase through CSS, not typed in capitals.
- **Buttons:** verb first. Add "→" only when time moves forward or the screen changes.
- **Effects:** state what happens in numbers, never whether it's good: "+$6.3M · offline 1 week · Heat −5".
- **Disabled things say why:** "opens 2021", "Needs 100 kW running (you: 57 kW)".
- **Real names:** companies may appear by name in data (rivals, events). People never do. Company logos never do: rivals are monogram tiles (RI, MA, CS, BF).
- **No emoji, anywhere.** Arrows (▲ ▼ →), the multiplication sign (×) and the true minus (−) are the only symbols.

## Numbers

Always go through `G2G.fmt`; never format by hand. Numbers use the `num` family (DM Mono) with tabular figures and are right-aligned in tables.

| Kind | Rule | Examples |
|---|---|---|
| Money | Whole dollars under $1K; commas to $9,999; then one decimal with K / M / B. Cents only for per-unit values under $10 | $950 · $6,480 · $84.0K · $1.5M · $2.0B · $2.82/day |
| Negative money | True minus before the sign | −$0.33/day · −$10.4K |
| Signed change | + or − always shown | +$2.82 · −$0.33 |
| Delta vs last quarter | Arrow, then value, then "vs Qn" | ▲12% · ▼9% · ▼$10.4K vs Q2 · = flat |
| Crypto | No decimals from 100; one below 100; four below 1 | 850 BTC · 40 ETH · 1.2 BTC · 0.0269 BTC/day |
| Hashrate | Auto-scale: MH/s → GH/s → TH/s and TH/s → PH/s → EH/s, at most 3 significant digits | 720 MH/s · 13.5 TH/s · 3.24 PH/s · 5.6 EH/s |
| Power | kW below 1,000, then MW | 3.8 kW · 53 kW · 1 MW · 20 MW |
| Power price | Cents per kWh | 8¢/kWh · 3.5¢/kWh |
| Percent | Whole percent unless the decimal changes a decision | 60% · 64% LTV |
| Dates | Quarter first; week and turn after a middle dot | Q3 2018 · Q3 2018 · week 6 · Turn 7/23 |

## Visual foundations

### Colour

- **Ground:** screens sit on `paper` with the 24px blueprint grid (`paper-grid`, class `g-paper`). Panels are `panel` with a 1px `line` border and radius `radius-2`. Panels have no shadow.
- **Ink:** all text is `ink`; labels, units and captions are `ink-muted`. Both pass 4.5:1 on paper, panel and panel-sunk in every era.
- **Action:** the primary button is an `ink` fill with `on-action` text. There is one per screen. No coloured buttons.
- **Accent** is the era's stamp: hashprice, the active phase, the rule under a title, the player's series in charts. Never a button, never a gain or loss.
- **Gain and loss:** `gain` is teal-blue, `loss` is brick red, and every use also carries ▲▼ or +/−. They sit on the blue/orange axis so they separate for red-green colour blindness.
- **Warn** marks the margin-call zone and Heat 50–70. **Danger** reuses `loss` plus a hatch pattern.
- **Tape** (`tape`) is for the founder's handwritten notes and the player's row in league tables.
- **Heat** uses `heat-1` to `heat-5` by threshold (30 / 50 / 70 / 90). From 70 the fill is hatched.
- **Charts:** BTC solid `series-btc`, ETH dashed `series-eth`, hashprice `series-hashprice`, the player `series-you`. Rivals use `series-rival-1…4`, each with its own marker shape (circle, square, triangle, diamond) so they read in greyscale.
- **Marketing:** `brand-yellow`, `brand-black` and `brand-concrete` are for the logo and store art only. They never appear in the game UI.

### Eras (the themes)

Set the era with `data-theme` on the game root. Only a few tokens change; layouts never do.

| Era | Theme id | What changes |
|---|---|---|
| Bedroom, Prologue 2009–16 | `bedroom` | Beige graph-paper notebook (12px grid), dashed panel rules, muted phosphor-green accent, display titles one weight lighter, up to two tape notes per screen |
| Garage, 2017–19 | `garage` | Yellowed paper, rust accent, tape notes allowed (one per screen) |
| Industrial, 2020–22 | `industrial` | Crisp white panels, steel-grey paper, safety-orange accent, fewer notes |
| Campus, Act II (preview) | `campus` | Bound-report whites, deep green ink, ochre accent, the grid fades |
| Grid, Act III 2027–30 | `grid` | A control-room ledger: cool blue-grey paper and panels, slate ink, one muted violet accent |

Switch eras at the start of 2017Q1 (the Prologue hands over to Act I in the garage), at the start of 2020Q1 (the first quarter a Texas site can be bought), at the Merge, and at 2027Q1 (Act III).

**Bedroom (Prologue).** A student's desk in the early-forum years: the same notebook as garage, a few years younger. It overrides colour tokens only (`paper`, `paper-grid`, `panel`, `panel-sunk`, `line`, `line-soft`, `ink-disabled`, `on-action`, `accent`, `tape`, `heat-3`, `shadow-card`). `ink`, `ink-muted`, `gain`, `loss`, `warn`, `focus` and `series-eth` keep garage's values, so numbers and deltas look identical across the handover. Three treatments that tokens cannot carry live in `bundle.css` under `[data-theme="bedroom"]`: `--grid-pitch` drops to 12px (graph paper), `g-panel` and `MachineCard` borders are dashed (pencil rules), and `screen-title`, `card-title` and Merge titles drop from 700 to 600.

- The primary action stays an `ink` fill in bedroom too. The green accent is a stamp, never a button, exactly as in the other eras.
- `heat-3` is amber-brown (#9A4E1C) in bedroom rather than the accent, because a green meter fill would read as "fine" at Heat 50–69. In the other eras it still equals the accent.
- The green accent sits close to `series-rival-3`. The Prologue has no league table, so the two never share a chart. Revisit this if rivals ever appear before 2017.
- Grounded, not retro: no pixel fonts, no fake terminal screens, no neon, no CRT effects.

Bedroom contrast (WCAG ratio; text needs 4.5, marks and lines 3.0):

| Token | Value | on paper | on panel | on panel-sunk | Verdict |
|---|---|---|---|---|---|
| `ink` | #1E2A44 | 11.69 | 13.11 | 10.75 | Pass |
| `ink-muted` | #4F5870 | 5.80 | 6.50 | 5.34 | Pass |
| `ink-disabled` | #74777F | 3.66 | 4.11 | 3.37 | Pass (≥3.7 on panel, as in garage) |
| `accent` | #46602A | 5.79 | 6.49 | 5.33 | Pass |
| `gain` | #15646F | 5.57 | 6.25 | 5.13 | Pass |
| `loss` | #A8361A | 5.36 | 6.01 | 4.93 | Pass |
| `warn` | #7D5700 | 5.31 | 5.96 | 4.89 | Pass |
| `focus` | #1F5FBF | 4.98 | 5.59 | 4.59 | Pass (ring ≥3) |
| `series-eth` | #5F6E92 | 4.16 | 4.66 | 3.83 | Pass as a line |
| `series-benchmark` | #7F848D | 3.07 | 3.45 | 2.83 | Pass on paper and panel; never on panel-sunk, as in garage (2.99) |
| `heat-3` | #9A4E1C | 4.94 | 5.54 | 4.54 | Pass as a fill on the sunk track |
| `on-action` on `ink` | #FAF5E6 | | 13.11 | | Pass |

In greyscale, `accent` (hashprice) and `gain` share a tone. They never need to be told apart by colour alone: the hashprice series is always labelled, and gain always carries ▲ or +.

**Grid (Act III).** A control-room ledger: cooler than campus, with blue-grey paper and near-white panels, slate ink and one muted violet accent (#5B2E8C) for the era's stamp, the hashprice series and the player's line. It overrides colour tokens only, like bedroom: no stylesheet treatments, and the 24px grid stays.

- Violet is the one hue family the system didn't already use. Measured with ΔE2000 in normal vision and under protan, deutan and tritan simulation, the accent stays at least 8 apart from `gain`, `loss`, `warn`, every heat step, `focus` and all four rival series; its nearest neighbour, `series-rival-1`, is also clearly lighter (Y 0.10 vs 0.06), and rivals keep their marker shapes.
- `heat-3` is amber-brown (#9A4E1C), as in bedroom, so a violet meter never stands for Heat 50–69.
- The primary action stays an `ink` fill.

Grid contrast (WCAG ratio; text needs 4.5, marks and lines 3.0):

| Token | Value | on paper | on panel | on panel-sunk | Verdict |
|---|---|---|---|---|---|
| `ink` | #182434 | 13.67 | 14.99 | 12.58 | Pass |
| `ink-muted` | #465264 | 6.91 | 7.58 | 6.36 | Pass |
| `ink-disabled` | #6C7482 | 4.11 | 4.51 | 3.78 | Pass (≥3.7 on panel) |
| `accent` | #5B2E8C | 8.28 | 9.08 | 7.62 | Pass |
| `gain` | #15646F | 5.94 | 6.52 | 5.47 | Pass |
| `loss` | #A8361A | 5.71 | 6.26 | 5.26 | Pass |
| `warn` | #7D5700 | 5.66 | 6.21 | 5.21 | Pass |
| `focus` | #1F5FBF | 5.32 | 5.83 | 4.89 | Pass (ring ≥3) |
| `series-eth` | #5A6A8C | 4.73 | 5.19 | 4.35 | Pass as a line |
| `series-benchmark` | #7F848D | 3.28 | 3.60 | 3.02 | Pass (lines only, never text) |
| `heat-3` | #9A4E1C | 5.26 | 5.77 | 4.85 | Pass as a fill |
| `on-action` on `ink` | #F9FAFB | | 14.99 | | Pass |

### Type

- **Display** (`display`, Fraunces 600/700): screen titles (`screen-title`), card titles (`card-title`), panel titles (`panel-title`), site names. Never for numbers.
- **Interface** (`ui`, Public Sans): body, buttons, labels.
- **Numbers** (`num`, DM Mono): every figure, with tabular figures. `num-kpi` on the dashboard, `num-xl` on reports, `num` in tables and the top bar, `num-s` for costs and axes.
- **Notes** (`note`, Caveat): handwritten tape only, at most one per screen (two in `bedroom`, where the student's notebook does more of the talking), never for data or instructions.
- **Brand** (`brand`, Barlow Condensed 800, uppercase): the logo and store art only.

### Spacing, radii and borders

- 4px base: `space-1` (4) to `space-10` (40). Panels pad at `space-3`, screens at `space-4` (Plan) or `space-6` (reports), modals at `space-5`.
- Radii: `radius-1` tags, `radius-2` panels and buttons, `radius-3` modals and cards, `radius-pill` pips and meters.
- Borders: `border-hair` for panels, `border-strong` for buttons and choice cards, `border-rule` (2px `ink`) under the top bar and screen titles. Rows inside panels are divided by dashed `line-soft` rules, like a ledger.
- `shadow-card` belongs to event cards and modals only.

### Layout

- Minimum viewport `screen-min-w` × `screen-min-h` (1280×720). Top bar `topbar-h`, nav `nav-w`. On Steam Deck (1280×800) the extra 80px goes to the main area.
- Primary actions and choice buttons are at least `hit-min` (44px) tall.
- The Plan dashboard is a 6-tile KPI row over two columns. Reports are a 5-tile row over a 4/5/3 split of 12 columns.

### Motion

- Modal and event card: fade in with a 6px rise, 180ms, ease-out. Live-quarter weeks tick every ~1.5s at 1× (0.75s at 2×). Money counts up over 400ms at quarter end. Toasts stay 3s.
- Under `prefers-reduced-motion`, everything changes instantly. Nothing loops.

### States

- Focus-visible: a 2px `focus` ring with a 2px offset on every interactive element (≥3:1 on paper and panel).
- Hover: a `panel-sunk` fill on secondary buttons and choices.
- Disabled: `panel-sunk` fill, `ink-disabled` text, and a written reason.
- Selected: an `ink` border (or fill, for the default event choice).

## Iconography

- **89 line icons** on a 20px grid, 1.5px stroke, round caps and joins, no fills (small dots only). Use the **Icon** component (`<Icon name="scout" />`): it draws with `currentColor`, so icons follow each era's `ink`. The same drawings are in the Icons asset group as SVGs in `#1E2A44`. Icons 62–78 were added for the Prologue, 79–89 for Act III.
- **Where each group is used:**

| Group | Icons | Used on |
|---|---|---|
| Resources & top bar | cash, treasury, bandwidth, btc, eth, hashrate, power, heat, rival, news, loan | Top bar stats, KPI tiles, log entries |
| Navigation | dashboard, fleet, capital, people, league, log, settings | Left nav (in `ink-muted`; `ink` when active) |
| Machines & sites | machine, gpu-rig, asic, site, garage, small-unit, warehouse, own-site, texas-site | Fleet table, buy panel, site ladder, site cards, auctions |
| Actions | buy, sell, scout, negotiate, pitch, hire, outreach, read-market, bid | Action rows, buy/sell buttons |
| Alerts & status | warning, price-alert, curtail, failure, complaint, margin-call, locked, in-transit, degraded | Event cards, toasts, table status cells, locked ladder rungs |
| Capital | seed, ipo, cap-table | Funding ladder, Capital screen |
| Interface | pause, speed, skip, close, info, check, chevron-right, save, export, import, sound-on, sound-off, glossary | Live-quarter controls, modals, tooltips, Settings |
| Prologue machines | pc-tower, gpu-card, fpga-board, asic-early | Prologue Rig screen, buy dialog, machine rows, failure pop-ups |
| Mining & custody | solo, pool, wallet, exchange, backup, lost-key | Solo/pool toggle and block-found toast (solo, pool), Wallet screen and custody split (wallet, exchange), back-up action and keys KPI (backup), dead-drive and lost-wallet events (lost-key) |
| Prologue actions & life | pre-order, group-buy, move-out, conference, vanity, household, auto-play | Pre-order and group-buy cards, Life actions (move out, conference, vanity purchase), household power cards, the auto-play control in the top bar |
| Act III | signals, calendar-wall, renewal, walk, reopener, retrofit, density, nuclear-ppa, political-capital, wildcard, reveal | Signals panel and top-bar strip (signals; the read action reuses `read-market`), Contracts nav and the renewal wall (calendar-wall), renewal and walked-tenant modals (renewal, walk), the reopener modal (reopener), rack tiers and the retrofit project (density, retrofit), the Power slot's nuclear PPA (nuclear-ppa), Government nav and meter (political-capital), wildcard event stamps (wildcard), the chapter report's scenario reveal (reveal) |

- Pairs that must stay apart in silhouette: `gpu-card` (one slim card with a bracket and a single fan) vs `gpu-rig` (a closed frame with three fans); `asic-early` (a flat stick with a plug and fins, no fan) vs `asic` (a tall box with a fan); `wallet` (a closed billfold with a key tag) vs `exchange` (open arrows over ledger lines); `backup` (a round platter with a check) vs `save` (the square floppy); `pre-order` (a tag with a clock) vs `buy` (a tag with a plus); `signals` (six bars of mixed height) vs `degraded` (rising bars, the last dashed); `density` (three racks divided into 2, 3 and 4 slots) vs `fleet` (two units with a status dot); `political-capital` (a small three-column building beside a gauge) vs `treasury` (a wide four-column bank); `reopener` (a document with an open padlock) vs `locked` (a closed padlock alone).

- Use an icon next to a word. Icon-only buttons (close, pause, settings) need an `aria-label`.
- 20px everywhere; 16px only in dense tables.
- Colour with the parent's `color`: `ink` by default, `loss` or `warn` only on alert rows. Never fill an icon or put it on a coloured tile.
- BTC and ETH are neutral lettered and geometric glyphs, not coin logos. No company logos, flags, faces or emoji. The Prologue icons follow the same rule: no ₿ symbol, no exchange or maker marks, no text inside an icon, and `group-buy` shows head-and-shoulders outlines only.
- Not in the alpha: hire portraits (use monogram tiles), Merge option icons and achievement badges.

## Illustration

- Event cards use ink-and-wash sketches, like drawings from a field journal: navy ink lines with one wash in the era's accent, on paper. No people's faces, no logos, no text in the image.
- Framing: a wide 440×150 landscape, horizon low, one subject (pylons, a warehouse door, a container ship, a rack on fire).
- Consistency across 20+ cards comes from the same line weight, the same single wash and the same paper texture. Make them with AI assistance, but keep one prompt template and review each against the others.

## Machines

Machine spec drawings are the icon language scaled up: one line drawing per machine class, for the whole campaign. Use the **MachineCard** component (`<MachineCard name="gpu-card-2010" caption="Gaming GPU · 2010" />`). It draws in `currentColor` with one flat `panel-sunk` tint on the front face, on `paper` with the era's grid, so every era re-colours it. The same drawings are in the Machines asset group as 240×160 SVGs (ink #1E2A44, tint #EDE5CF).

- **Style:** a three-quarter oblique view drawn like an engineer's sketch: 1.75px strokes (2.25px for liquid pipes), round caps, hidden edges dashed, a dashed ground line. No shading, gradients, photos or 3D renders.
- **Size:** a 240×160 viewBox, with a caption strip below that the component fills in (model or class name on the left, era or year on the right). `compact` shows the drawing alone at 120px for tight rows.

| Name | Class | Used on |
|---|---|---|
| `pc-tower-2009` | A student's gaming tower, side panel off | Prologue start, Rig screen, dead-drive failure |
| `gpu-card-2010` | A 2010-era dual-slot card with a blower fan | Prologue buy dialog, burnt-card failure |
| `fpga-board-2011` | A bare FPGA board with a heatsink and USB cable | Pre-order and group-buy cards |
| `asic-preorder-2013` | A small, boxy early ASIC with one fan | Pre-order cards, late-delivery pop-up |
| `asic-box-2014` | An ASIC in a compact metal box, two fans | Prologue buy dialog, group-buy cards |
| `asic-box-2016` | A longer ASIC chassis with fans at both ends | Prologue finale, Act I buy dialog, failures |
| `gpu-rig-open-frame` | An open-frame rig with six cards | Act I fleet, buy dialog, failures |
| `asic-box-2020` | A heavier, taller ASIC chassis | Industrial-era buy dialog, failures |
| `gpu-server-8x` | An 8-GPU server tray | Act II procurement, tenant cards |
| `gpu-rack-liquid` | A liquid-cooled GPU rack with manifold pipes | Act II procurement, campus build-out |

- **No real products.** Draw the machine class, never a copy of a brand's case, fan layout or shroud. No logos, labels, model numbers or maker marks on a drawing. Captions name the class and year ("ASIC workhorse · 2016"), never a product. If a drawing starts to read as a specific product, change its proportions before shipping.

## Logo and title

The marketing identity is borrowed from direction C: Barlow Condensed 800 uppercase in `brand-black`, `brand-yellow` and `brand-concrete`, with the hazard stripe. It lives on marketing surfaces and on the title screen, and nowhere else in the game.

### Parts

- **Logo** (component): stacked (primary), horizontal, reversed (yellow on black) and one-colour (black only). Minimum 24px type stacked and 18px horizontal. Clear space of one cap height on every side.
- **Mark** (component + Logos assets): a squared G with a bolt cut out of its stem, on yellow, with a hazard band. Chosen over "G2G in a square" and "pylon from two Gs" because it's the only one that reads at 16×16 (see the Mark card).
- **App icons** (Logos assets): favicon 16/32/48, Apple touch 180, PWA 192/512 and a maskable 512.
- **Store and library templates:**

| Template | Size | Where it's used |
|---|---|---|
| Header capsule (StoreCapsule) | 920×430 | Store page header; also the library header |
| Small capsule (SmallCapsule) | 462×174 | Search results and lists |
| Main capsule (MainCapsule) | 1232×706 | Store front page, featured spots |
| Vertical capsule (VerticalCapsule) | 748×896 | Seasonal sales, some layouts |
| Library capsule (LibraryCapsule) | 600×900 | Player's library grid |
| Library hero (LibraryHero) | 3840×1240 | Library page banner: art only, no words |
| Library logo (LibraryLogo) | 1280×720, transparent | Laid over the library hero |
| itch.io cover (ItchCover) | 630×500 | itch.io page and browse grid |

- **Title screen** (TitleScreen): ledger paper, the logo as a bolted concrete sign, and the system's Buttons for the menu. It's shown in both Act I eras.

### Do

- Use the logo only on `brand-concrete`, white or `brand-black`, or on art that sits behind a concrete or black plate.
- Keep the stripe exactly as wide as the longest line (the component does this).
- Use the Mark below the logo's minimum size.
- Put only the logo and artwork on Steam capsules: no taglines, review quotes or awards.

### Don't

- Recolour the logo or the mark outside the three brand colours.
- Stretch, condense, skew, outline, rotate (except the title sign's fixed 1.2° tilt) or add shadows or gradients.
- Place the logo directly on busy art without a plate.
- Use the marketing palette inside the game UI, or the ledger palette on store art.
- Retype the logo in another font. Use the component, or the exported file.

### Where each file is used

| File (Logos group) | Use |
|---|---|
| mark.svg | Master mark with band: social avatars, loading screen, press kit |
| mark-plain.svg | Mark without band, for small or tight placements |
| favicon-16.svg, favicon-32.svg | Browser tab (`<link rel="icon">`) |
| favicon-48.svg | Windows and site icons |
| apple-touch-icon-180.svg | iOS home screen (`apple-touch-icon`) |
| icon-192.svg, icon-512.svg | Web manifest icons, itch.io game icon (512) |
| icon-maskable-512.svg | Web manifest `"purpose": "maskable"` (Android) |
| explore-a/b/c-*.svg | Record of the three mark explorations; not for use |

### Exporting files

The logo lockups and store templates are live components set in Barlow Condensed from Google Fonts. To make the PNG files Steam and itch.io need, render each template at its exact size in the repo with Playwright, and self-host Barlow Condensed there (OFL licence). Export the library logo with `omitBackground: true` so everything outside the plate is transparent. Convert the icon SVGs to PNG at 1× their size.

## Accessibility checklist

| Check | Rule | Status in this system |
|---|---|---|
| Text contrast | 4.5:1, or 3:1 at 24px+ | `ink` and `ink-muted` ≥5.6:1 on paper, panel and panel-sunk in all eras; `gain`, `loss`, `warn` ≥5.1:1 |
| Marks | 3:1 for meter fills, rings and icons | `focus` ≥5.1:1; chart series and heat fills ≥3:1 on panel |
| Focus | Visible on every control | `focus` ring, 2px + 2px offset |
| Hit targets | ≥44px for primary actions | `hit-min` |
| Colour alone | Never the only signal | ▲▼ and +/− on deltas; hatch on Heat ≥70 and LTV ≥70%; dashed ETH; marker shapes for rivals |
| Motion | Respect reduced motion | Instant changes, nothing loops |
| Zoom | Readable at 100% on 1280×720 | Smallest text 10.5px uppercase labels; body 13–15.5px |

## For the code

- Copy `tokens.css` into `src/ui/styles/tokens.css` and `components/bundle.css` alongside it. Use tokens only: no raw hex values in components.
- The bundle's `G2G.fmt` is the reference implementation of the Numbers table. Port it to `src/ui/format.ts` and use it everywhere.
- Components here are React (Preact-compatible through `preact/compat`); their props are in `components/index.d.ts`.
