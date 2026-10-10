# 32: Act IV concepts, "the race to orbit" (2031 onward). v0.1 draft, 5 Oct 2026

*Design thread. Built on the research dossier (doc 31, evidence to 5 Oct 2026, with its cost model) and on the game as built (CLAUDE.md, dev-notes through M26, done on branch m26 and not yet merged, doc 27 v1.2 and its §17). The recommended concept is designed in full in doc 33. Nothing here is approved: the owner decides with doc 33's decision list. Evidence tiers as in doc 31: [A] demonstrated or contracted, [B] announced and funded, [C] credible expert projection, [D] speculation or hype.*

## 0. What the research changes before any concept is chosen

Four findings from doc 31 shape every concept below. They are stated first so the concepts are judged against the evidence, not the other way round.

1. **Orbit sells time, not cheap power.** Independent models put orbital AI compute at about 2-4.4 times the ground's cost today [C]; the design thread's model narrows that to about 1.6x in 2031, 1.35x in 2033 and 1.2x in 2035 in the base case, and gets to about 0.9-1.0x only when cheap launch, light satellites, cheap satellite manufacturing, long GPU life in orbit and expensive or blocked ground power all arrive together (doc 31 §2.5). Orbit's real edge in 2031-2035 is speed: a block of satellites might be built and launched in roughly four to six quarters (a design estimate from the research's "about a year"; no orbital compute block has yet been built at scale), while new US ground power waits more than five years for a grid connection [A] and faces opposition polling at 75% [A]. A finance game can turn that into its central tension: **the ground is cheaper but slow and politically capped; orbit is dearer but fast, until launch slots, debris, regulators or physics cap it.**
2. **The GPU bill dominates both sides.** About three-quarters of the cost per MW is the chips, so launch price alone cannot make orbit win; how long GPUs survive in orbit, how many spares are needed and the cost of capital matter as much (doc 31 §2.5). There is no flight data for orbital GPU life yet [A, absence], which makes it a natural hidden variable.
3. **The Moon cannot supply orbital data centres before 2035.** The ice is real but unmeasured as a resource; nothing has been extracted on the Moon; the reference propellant plant is a $4B study needing 2.8 MW, and megawatt-scale power on the Moon before 2035 is speculation [D]; a production plant takes 5-8 years from investment decision to first tonnes (inference); commercial landers have fully succeeded once in seven missions [A/C]. Credible 2031-2035 lunar output is pilot plants of 1-100 tonnes a year of water or oxygen, used locally or around the Moon [C-D]. That is far too little to matter for orbit: lifting one 5 MW block to high orbit with lunar-fuelled tugs would need over a hundred tonnes of propellant (derived). After 2035, the model's ceiling is that lunar-made radiators, structure and shielding cut a low-orbit data centre's cost by about 0-4% at plausible volumes, and tugs plus lunar mass cut a high-orbit block's by about 3-11% on 2035 inputs; neither touches the GPU bill, and a high-orbit block still costs a little more than an Earth-only one in the busy low band (doc 31 §2.4-2.5 and its addendum).
4. **Lunar value in the 2030s is local and strategic.** Water and oxygen made on the Moon are worth most on and around the Moon, where delivering the same mass from Earth costs about $1M/kg today (NASA's CLPS planning figure [A]) and plausibly $10-50k/kg in the Starship era [inference]. The best polar sites are a handful of ridges a few hundred metres across, on both the US-led and China-led candidate lists, with no rule to settle overlaps [A/C]. So in a 2031-2035 act the Moon is a land race and a long-dated bet, not a supply line that feeds orbit at scale.

**What that means for the owner's direction.** The "race to build AI data centres in space, supplied and eventually built from the Moon" survives the evidence, with one honest adjustment: within 2031-2035, lunar mining is a land race and a bet on the future that the market can price and sovereign customers can pay for, plus small local sales on and around the Moon. It does not cut orbital costs inside the act, and it is not yet the thing that frees the player from Earth launch. The concepts differ mainly in how they handle that gap: by accepting it (A, C) or by stretching the act's time span (B), which narrows it but does not close it.

---

## Concept A: "The Race to Orbit" (2031Q1-2035Q4, 20 quarters, about 55-60 minutes), recommended

**Core fantasy.** "My campuses on the ground are boxed in by power queues and protests. I can put compute in orbit within a year, at a premium, on rockets owned by my biggest rival. Do I go up, how far, how fast, and do I stake a claim on the Moon before the good ridges are gone?"

**How it plays.** Three theatres share one company, one balance sheet and one Bandwidth pool:
- **Ground** (the existing Act II/III systems): the cash engine and the counterweight. Renewals, Heat, Anger, power deals and political capital continue. New ground power is slow (16-24 quarters for a grid connection in most futures).
- **Orbit** (new): orbital compute "blocks" built through the existing Deal Desk, with a Launch slot instead of a Power slot. Orbital shells (platform only, the tenant brings GPUs) or orbital clouds (you own the GPUs), like Act II's shells and clouds. Launch manifests, insurance capped by a tiny market, licences, three orbital shells, debris and storms.
- **Moon** (new, unlocks from the first quarter, pays off mid-to-late act): claim a polar site, prospect it (an uncertain grade revealed by your own surveys), arrange power, build a pilot plant, sell water and oxygen on and around the Moon, and late in the act take the investment decision on a production plant whose first output arrives years after 2035. What lunar supply could do for orbit after 2035 (tugs, lunar-made parts) is shown, not played, and the epilogue tells it.

**Main tension.** Fast and dear (orbit) against cheap and slow (ground), under a hidden future that decides which one the 2030s reward, while the Moon offers a long-dated option whose value depends on geology you have to pay to discover.

**Hidden future.** Act III's scenario engine, reused: one of four research-grounded futures drawn in secret (launch on schedule; the wall; a debris event closes a shell; cheap ground power), read through six authored Signals with one decoy, plus a separate hidden lunar grade (rich, patchy, dry) read through your own prospect reports. Revealed at the end.

**How a run ends.** 2035Q4: the Act IV chapter report (the reveal, the reading score, valuation, the lunar truth), then the **campaign finale**: the career ledger from the bedroom or garage to 2035, the career multiple, the megawatt line, and a short epilogue that lands the arc ("from mining bitcoin in a garage to mining the Moon", or "you never left the ground, and the ground was enough").

**Scoring.** Founder net worth at 2035Q4 and the growth multiple on the Act IV entry (as Act III), the reading title, a "frontier title" for where your megawatts ended up (ground, orbit, Moon), and the career multiple from the campaign start.

**Where lunar mining enters.** From the start as an option (claims open in 2031Q1), mid-act as operations (first landings 2031Q4-2032, pilot output from about 2033Q3), late-act as the big bet (a production plant decision that pays only after the act, valued at 2035Q4 on its resource estimate and mining's resource categories: inferred, indicated, measured).

**Pros.**
- Matches the owner's direction (orbit race, rivals, sovereigns, physics, the Moon) inside the five years doc 08 set aside, without stretching the evidence.
- Reuses the most of what is built: the Deal Desk (Act II), the scenario engine, Signals, decoy, reading score and leak guards (Act III), renewals, covenant, standby facility, political capital, presets, Scenario Mode.
- The central tension (speed vs price) is the one the research actually supports. Every future is built from published cases and labels its designed parts; F3's debris cascade is [D] by design.
- Keeps "energized megawatts" as the thread: ground MW, orbital MW and the scarcest megawatts of all, kilowatts of power on a lunar ridge.

**Cons.**
- The Moon's in-act cash effect is small; the player must feel its value through land, local contracts and valuation rather than through cheap orbital hardware. The design has to make that legible (doc 33 §9).
- Three theatres is the most complex act yet; screens and Bandwidth need care to avoid spreadsheet fatigue.
- Two hidden variables (future and lunar grade) are new; the lunar one is private and simpler, but still more to explain.

**Fit with Acts I-III.** Strong. Same loop and engine; the finance-first frame continues (project finance, insurance, valuation multiples, sovereign money, a story-driven equity window like 2021's); the Act III reading skill is reused on a new set of futures; the campaign closes on the 2035 end date the design brief has always had.

---

## Concept B: "Two Frontiers, the Long Game" (2031Q1-2038Q4, 32 quarters, about 60-70 minutes with auto-play)

**Core fantasy.** "I'm building a Moon-to-orbit supply chain. By the time I'm done, my data centres are built from lunar metal."

**How it plays.** Lunar mining is the spine from the first quarter, co-equal with orbit. The act runs eight years to give a production plant (5-8 years from investment decision to first tonnes [inference, doc 31 §2.4]) a chance to come online inside the act. Even so it is tight: on the dossier's full gate (prospect, then pilot, then megawatt power) the earliest decision is about 2034 and first output about 2039-42, after the act; a player reaches first tonnes by 2037-38 only by deciding on a plant before a pilot has proved the resource, at high risk. To keep the length tolerable it borrows the Prologue's mechanism: about 20 decision quarters with a full Plan phase and about 12 auto-played quarters shown as single summary cards (the Prologue does 13 and 19).

**Main tension.** Capital-intensive vertical integration against the risk that geology, landers, politics or cheap launch make the whole chain worthless.

**Hidden future.** The same futures as A, plus the lunar grade, but with more of the payoff landing inside the act.

**How a run ends.** 2038Q4, with a finale that can show a lunar plant's first output for the boldest players; lunar-made parts in orbit stay [D] even then.

**Where lunar mining enters.** From the start, as the main line.

**Pros.**
- The strongest echo of the garage (a company that mines again) and the fullest version of the owner's direction.
- Gives lunar supply more time to matter in the act itself, though only at its very end.

**Cons.**
- Moves the campaign's end from 2035 (doc 07, doc 08, the marketing page) to 2038, and pushes almost every number past the horizon of any published projection: 2036-2038 values would be [D] throughout. Doc 08 already treats everything after 2026 as speculative; this concept leans hardest on that.
- Long stretches of the act would be construction with little revenue unless the timeline is compressed, and a compressed lunar timeline is exactly the hype the dossier warns against.
- The most new content: lunar chain, orbit, eight years of futures, auto-play pacing.
- Weaker reuse of Act III's scenario timing (a 16-quarter design) and of the ground game, which would fade into the background.

**Fit with Acts I-III.** Medium. The engine fits (the Prologue already proves decision quarters plus auto-play), but the grounding standard of Acts I-III would slip furthest here.

---

## Concept C: "Powered Land Endgame" (2031Q1-2035Q4, 20 quarters, about 50 minutes)

**Core fantasy.** "Everyone is shouting about orbit and the Moon. I own the scarcest thing on Earth, firm powered megawatts. I can ride the space mania with the market's money, back the right rocket, or sell my land to the dreamers at the top."

**How it plays.** The ground remains the main business, and doc 08's original Act IV list (nuclear, a second hidden scenario such as Silicon Shock or Grid Crisis, the endgame) is the core. Orbit and the Moon are mainly a capital-markets frenzy (a 2021-style window): the player can raise cheap equity on a space story, take minority stakes in fictional orbital and lunar ventures, lease ground stations and land to them, or build a small orbital pilot. Lunar mining is a late-act bet: a stake in a consortium that claims a polar site.

**Main tension.** Riding a bubble without being caught in it: when to use the market's enthusiasm and when to step back.

**Hidden future.** Doc 08's S4 Silicon Shock and S5 Grid Crisis, plus a "space boom or bust" axis.

**How a run ends.** 2035Q4 with the same finale shape as A.

**Where lunar mining enters.** As a late-act bet, mostly financial.

**Pros.**
- The most grounded: it matches the evidence that ground campuses remain the dominant compute through 2035 (doc 31 §2.9).
- The cheapest to build: nearly all of Act III's systems carry over, and orbit and the Moon are mostly investment instruments.
- Strong finance-first fantasy, with an echo of Act I's 2021 IPO window.

**Cons.**
- Does not deliver the owner's direction: the player rarely builds in space or on the Moon.
- Risks feeling like Act III again with new labels.

**Fit with Acts I-III.** Very strong mechanically, weak against the stated ambition for the finale.

---

## Comparison

| | A: Race to Orbit | B: Two Frontiers | C: Powered Land Endgame |
|---|---|---|---|
| Span | 2031Q1-2035Q4, 20 quarters | 2031Q1-2038Q4, 32 quarters (about 12 auto-played) | 2031Q1-2035Q4, 20 quarters |
| Session | about 55-60 min ⚙ | about 60-70 min ⚙ | about 50 min ⚙ |
| Owner's direction | Delivered, with the Moon as a land race and a long-dated bet | Closer, but first lunar tonnes arrive only at the very end, and only by skipping the pilot gate | Mostly not |
| Evidence fit | Good: futures built on published cases; F3's cascade labelled [D] | Weak after 2035 | Best |
| Lunar enters | Start (claims), mid (operations), late (big bet) | From the start, as the spine | Late, as a financial stake |
| Reuse of built systems | High | Medium | Highest |
| New build cost | High | Highest | Medium |
| Campaign end | 2035 (unchanged) | 2038 (moved) | 2035 (unchanged) |

## Recommendation

**Concept A.** It is the only one that delivers the owner's race to orbit and the Moon while keeping its futures grounded (with the speculative parts labelled) and the campaign's end at 2035. It also turns the research's least comfortable finding, that the Moon cannot yet feed orbit at scale, into the act's best finance decision: how much to pay now, and in what order (claim, prospect, power, pilot, production), for an option whose value depends on geology you only learn by spending. Concept B is the fallback if the owner wants more of the lunar payoff inside the act and accepts that 2036-2038 would rest on speculation; even then lunar material reaches orbit only in a labelled acceleration, so its timeline should be presented to players as a scenario, not a forecast. Concept C is the right answer only if the build budget for Act IV is small.

⚙ marks values expected to change after playtests.
