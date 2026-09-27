# 03–04: Comparable Games, Audience and Distribution

## 1. Direct competitors (same theme)

| Game | What it is | Overlap with our idea |
|---|---|---|
| [Data Center Simulator Game](https://store.steampowered.com/app/1917160) (Steam) | Hands-on server room sim | Low. Physical racking, no deals |
| [Datacenter Simulator](https://store.steampowered.com/app/4178810/Datacenter_Simulator/) (Steam, Jul 2026, $1.99) | First-person: carry boxes, cable racks, set up IPs | Low. Operations, not finance |
| [AI Data Center Tycoon](https://purplejelly.itch.io/ai-data-center-tycoon) (itch.io) | Idle clicker, from garage to hyperscaler | Low–medium. Same theme, but no financing or deal mechanics |

**Gap:** Nobody has made the **deal-maker / financier** version: power + tenant + capital + politics. The theme is crowded at the "build racks" level and empty at the "structure the $27B SPV" level. That is our positioning.

## 2. The closest model: Venture Capital Tycoon

[Venture Capital Tycoon](https://store.steampowered.com/app/4994070) (Grackle Industries, $9.99, Steam, 1 Sep 2026). It is menu-driven, uses web tech (NW.js), and was **openly built with Claude's help** (code, writing, 2D art, all pre-generated). The loop: weekly deal flow → due diligence → invest → manage the portfolio → most deals fail, a few pay off big. It adds hires with traits, several modes (Classic / Bootstrapper / Empire), New Game+, and an "anti-portfolio".

**Why this matters to you:** it proves that a solo developer can take a menu-driven, finance-themed tycoon built with AI help, on a web stack, to Steam. Your game is structurally its cousin, with *projects* instead of *startups*. Borrow its deal-flow cadence, its hire traits and its anti-portfolio idea ("the deals you passed on").

## 3. Teardown of reference games

| Game | Core loop | Session | What to borrow | What to avoid |
|---|---|---|---|---|
| **Game Dev Tycoon** | Pick topic and genre → develop → review score → money → bigger office | 2–6 h per run, 30-minute sessions work | Clear eras (console generations = GPU generations). A simple formula that feels deep | Grinding repetition in the late game |
| **Big Pharma** | Production chains + R&D + a market that changes | 1–3 h | Market saturation (spot GPU price falls as capacity grows) | Too much logistics puzzling for a light game |
| **Offworld Trading Company** | Real-time economic warfare, live prices, buyouts | 20–40 min matches | **Dynamic market prices** everyone affects. Hostile buyouts of rivals | Pace too fast and stressful for "light" |
| **Capitalism Lab** | Deep corporate sim | Many hours | Stock market and credit rating ideas | Complexity and UI density |
| **Universal Paperclips** | Numbers go up, new layers unlock | 3–6 h | **Revealing complexity over time.** Satire through mechanics | Pure idle play has little decision tension |
| **Reigns** | Swipe yes/no on characters; 4 meters must stay balanced | 5–30 min | **Event cards** with 2–3 choices and a trade-off between meters (Community, Regulators, Lenders, Tenants) | Being entirely random |
| **Papers, Please** | Desk job, checking documents | 5–10 h | "Review the term sheet" as a mini-game: spot the bad clause | Grim tone |
| **Mini Metro** | Minimal map, lines, growing pressure | 10–20 min | **Clean minimalist map UI.** Pressure builds until something breaks | Too minimal for finance |
| **Venture Capital Tycoon** | See §2 | 30–60 min | Deal-flow inbox. Hires with traits. Modes. NG+ | Spreadsheet fatigue |

## 4. Candidate core-loop patterns
1. **Deal Desk (turn-based, monthly ticks).** An inbox of site, tenant and lender offers. Assemble deals on a board and advance time. *Best fit for 30–60 minute sessions and for the theme.*
2. **Map Builder.** A US/EU map with regions (power, politics, land). Place campuses and watch them build. *Great visual hook, more art needed.*
3. **Idle/Incremental.** Numbers go up and eras unlock. *Easy to build, but the theme deserves more decisions.*
4. **Card/Negotiation.** Deals as card hands. *Neat, but a hard balancing problem for a first project.*

**Recommendation:** a hybrid of 1 and 2. A turn-based Deal Desk with a simple map, plus Reigns-style event cards. See Brief 07.

## 5. Audience
- **Primary:** tech, finance and startup people who follow the AI buildout (LinkedIn/X/HN crowd). "I read about this every day, now I can play it." They will enjoy the in-jokes: SPVs, force majeure, the GPU depreciation fight.
- **Secondary:** tycoon and management fans on Steam (the Game Dev Tycoon / Big Pharma / VC Tycoon audience) who like finance menus.
- **Tertiary:** the AI-curious public. They need onboarding and a glossary.

## 6. Distribution path (hobby → maybe Steam)
1. **Alpha 0.1:** play it yourself in the browser, local or on a free host (GitHub Pages / Netlify / Vercel).
2. **Alpha/Beta:** itch.io (free, easy, good for getting feedback). Share on LinkedIn, r/tycoon, r/incremental_games, HN "Show HN".
3. **Steam (later):** wrap the same web build with **NW.js or Electron** (the VC Tycoon approach). Steam Direct fee is $100 per game (≈, verify). Build a store page early to collect wishlists. Steam Next Fest for visibility. Price ~$7–12.
4. Portals (Poki / CrazyGames) are optional and need an ads SDK and short sessions. They are a weaker fit for 30–60 minute finance play.

## 7. Real names: the risk, stated plainly
You chose real names, with a few letters changed before launch. Game design generally survives using real names; **brand logos and trademarks** are the real risk, along with **false factual claims about real, named people** (e.g. showing a real CEO committing fraud). Steam reviews content but does not usually police parody names. Practical rules:
- In the build: use real names only in data files (`companies.json`), so you can swap them with one edit.
- **Never use logos.** Use generic colored icons.
- Keep real *people* out of it. Use companies only, and write events as game fiction ("NovaCloud invokes force majeure").
- **Decision (25 Sep 2026):** keep real names throughout, including 2027–2035, and review before any public release. The fallback is parody names (Orakle, Blu Owel, CoreWeeve...). This is a legal-adjacent call, not legal advice. Check with a lawyer if the game ever makes money.
