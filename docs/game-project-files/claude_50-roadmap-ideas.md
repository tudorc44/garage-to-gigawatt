# 50: Roadmap ideas (parking lot). v0.1, 13 Oct 2026

*Design thread. Ideas raised but not scheduled. Nothing here is approved or scoped; an idea becomes work only through its own design doc and the owner's go. Ordered by act, then by how cheap it looks. "Overlap" says what already exists in the game so a later design doesn't build it twice.*

## Prologue (2009-2016)
*Three ideas from the same brainstorm are being designed now in doc 51: running your own pool, a mining club with friends, and altcoins for old GPUs.*

| Idea | What it adds | Overlap / notes | Rough size |
|---|---|---|---|
| **Friends' gaming PCs after a LAN party** | Cheap extra hashrate, split with friends; story cards (one wants out, a parent sees the bill, one asks for his share at the 2013 peak) | Pairs naturally with doc 51's club; could be the club's first step | Small |
| **Office or university lab mining** | Big free hashrate, with a chance of getting caught: coins confiscated, a "suspended" or "fired" beat, the job income lost | Uses `job_offer` and the household patience pattern; the game prices the risk, it doesn't moralise | Small |
| **The botnet offer** | A forum stranger offers rented hashrate from infected machines; always refusable; taking it is a game-over-level risk and the chapter report remembers it | Flavour mostly; a dark door the player sees and walks past. Keep mechanics minimal | Very small |
| **Faucet days (2010)** | Give coins away for reputation; the chapter report prices what you gave | Pairs with forum reputation | Very small |
| **Forum reputation** | A meter built by posting guides, helping newbies, writing mining software; unlocks pre-order odds, group-buy invitations, scam warnings | The conference contact effect already does a slice of this; reputation would generalise it. doc 51's pool and club both read a reputation if it exists | Medium |
| **Merged mining (from about 2011)** | A free side coin mined alongside BTC, mostly worthless; one line of upside | Small add-on to doc 51's altcoins | Very small |
| **The 2014 Ethereum crowdsale** | Buy ETH with BTC at the crowdsale rate; a pre-order with a different payoff that feeds Act I's ETH mining | ETH exists from 2015Q3 in the market; needs the sale's rate and dates sourced | Small |
| **Pulling coins off the big exchange early** | A visible withdrawal slowdown in 2013 before the 2014 collapse; pull out early at a fee | **Mostly exists:** custody, `mtgox_collapse`, the `gox-hodler` bot. Only the early warning and the withdrawal friction are new | Very small |
| **Selling locally for cash** | Slips past the selling limits; a small chance of a bad meeting (a news line, not violence) | **Partly exists:** `offer_local_trade` | Very small |
| **Reselling ASIC pre-order slots** | A trader's path: flip slots or imported machines to other miners | Uses pre-orders and the conference contact | Small |
| **A bitcoin ATM in a café (2014)** | A tiny venture with its own regulation scare; previews Act III's ventures | Needs a small venture mechanic in Act 0 | Medium |
| **The household as characters** | A parent or roommate with opinions; household patience gets a face and a payoff ("your dad asks if he should buy some") | Text and cards over the existing patience meter | Small |
| **Cheap power hunting** | A friend's farm or a cousin's shop with spare power, an alternative to moving out | Teaches the whole game's theme (power is the business); a new site type | Medium |
| **Hardware tinkering** | 1 Bandwidth for a few percent efficiency (undervolting, custom cooling, flashing FPGAs), with a small chance of breaking the machine | Uses machines and failure pop-ups | Small |

## Acts I-V (carried here so they aren't lost)
| Idea | Source | Status |
|---|---|---|
| Visual layer: event-card illustrations, story plates, site art, Signals as gauges | doc 38 handover | Ideation; not decided |
| Act IV and Act V era themes (`firm` for Act V) | doc 15, doc 43 §2 | Owed; Act V wears Act IV's theme |
| Scenario Mode carry-over into Act V; standalone Act V; session length; bitcoin's weight | doc 43 §22 Q3-6, now §0.25 | Open; to answer before Act V ships |
| Queue position sales separate from sites | doc 43 §22 Q8 | Parked until a research pass finds RTOs that allow it |
| Marketing page: campaign ends in 2040, not 2035 | doc 43 §22 Q7 | After Act V ships |
| A lazy loader for Act V content | doc 43 §0.20-§0.22 | Declined unless the first load passes 1 MB |
| Making Act IV's ground link a cost that bites | doc 43 §0.22 | Declined (no source; moves public play) |

## How an idea leaves this list
1. The owner picks it.
2. The design thread writes it into the act's design (or a new doc), with ⚙ values and what research must verify.
3. Research, if any number or fact is real-world.
4. A content pack, then a build milestone with its gates.
