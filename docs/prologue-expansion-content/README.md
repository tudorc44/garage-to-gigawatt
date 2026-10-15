# Prologue expansion content pack (doc 51 v1.0)

Draft content for the three Prologue additions: your own pool, the mining club, and altcoins for old GPUs. Built by the design thread from the research dossier (doc 53) and reconciled with `docs/prologue-content/`. Every value carries a grade: [A] primary, [B] reputable reporting, [C] estimate or aggregate, [D] designed.

**Status: draft.** The structure is final for the build to code against. Values marked placeholder change after the second research pass (doc 51 v1.0 §10); re-run the generators and nothing else changes shape.

## Generators (never hand-edit their outputs)
- The generators live in `tools/prologue/` (moved there in M68.2; the pack's copy was identical): `gen_alts.py <path to docs/prologue-content>` writes the two market files from the anchors at its top and prints the X-B6 check on the game's own BTC series; `gen_content.py` writes every JSON file below.
- Run both with `npm run content:prologue-expansion` (it runs them with `python3 -I`). They write into this folder only.
- Change log (M68.2): the two moved generators write into `docs/prologue-expansion-content/` by an explicit path, and the CSVs now end their lines with LF (the repo keeps LF everywhere; the delivered copies had CRLF, which git normalised). No value changed.

## Files
| File | What it is | Goes where |
|---|---|---|
| `market_quarterly_prologue_alts.csv` | LTC and DOGE per quarter: open, close, high, low, average (prices [C] from Apr 2013 for LTC and Dec 2013 for DOGE, [D] before); network hashrate (quarter average, designed placeholder); block reward at quarter start [A]; price grade | New file beside `market_quarterly_prologue.csv`, same `quarter` and `weeks` keys |
| `market_weekly_prologue_alts.csv` | Every week from LTC's launch: price and hashrate interpolated log-linearly between quarter anchors, block reward by date [A], revenue per kH/s per day (derived), merged-mining flag from 11 Sep 2014. All rows `estimate: True` | New file beside `market_weekly_prologue.csv`, same `week` and `quarter` keys |
| `machines_scrypt.json` | Scrypt kH/s for `gpu_gaming_2010` (400) and `gpu_eth_2015` (3,400); power stays the existing `power_kw` | Merge into `machines_prologue.json` as a `scrypt_khs` field |
| `pools_player.json` | Your own pool: unlock, costs, PPS and PPLNS, the outside-miners model, risks, the 2014 boycott, the sale | New file |
| `club.json` | The club: cast, money, keys, hosting, endings | New file |
| `custody_additions.json` | Real pools' reference fee rows (no repeat of `fee_pct_by_year`), altcoin selling limits and volumes, the handover rule for altcoins | Merge into `custody.json` |
| `events_prologue_expansion.json` | 29 cards: 15 news headlines, 5 pool cards, 7 club cards, 2 altcoin decision cards. New type, trigger predicates and effect keys are listed in its `notes` | Merge into `events_prologue.json` |
| `preorders_additions.json` | The club-only quarter share of a scrypt box (ScryptBox Ltd, invented): price, hashrate share, delay roll | Merge into `preorders.json` vendors |
| `text_prologue_expansion.en.json` | Tooltips, glossary, chapter-report lines | Merge into `text_prologue.en.json` |

## Reconciled against doc 53
- The research guessed formats; these files follow the repo's (`week`/`quarter` keys, `estimate` flag, `{value, grade, source}` values, the events card shape).
- `custody.json`'s fee table and its GHash.IO note are not repeated. There was no GHash.IO card in `events_prologue.json`, so `pool_boycott_2014` is new, not a duplicate.
- The 2010 GPU keeps the existing 0.35 kW (the existing file wins over doc 53's 200 W).
- Doc 53's dorm-based club, its fourth friend, the breaker card and the DOGE tipping card are cut: the player lives at home (household patience), and the card budget is tight. The cloud-contract card keeps its sourced backdrop with an invented seller.
- Doc 53's PROP and SCORE payout methods are cut; the game has PPS and PPLNS (custody.json).
- Doc 53's BTC earnings column is replaced by the game's own BTC series in the X-B6 check.
- Invented names to clash-check before shipping: Halfblock Pool, OreLoop, CopperHash, ScryptBox Ltd, Mara Ilves, Teo Brandt, Jun Okafor. Note that "Northgate" (an existing Prologue vendor) is also a launch rival's name in Act V.

## Merge log (M68.3: doc 51 §11 item 1, altcoins only; `tools/prologue/merge_alts.py`)
- `docs/prologue-content/`: `machines_prologue.json` (`scrypt_khs`, `available_scrypt_from` on the two GPU models), `custody.json` (`altcoin_selling_limits`, `pools_reference_fees`, `handover`), `events_prologue.json` (17 cards, the 2014Q3 decision quarter), `text_prologue.en.json` (7 keys).
- The game's copies are not byte copies of the pack's files (they hold the game's own schema, as before), so the same data went in in the game's format: `src/content/machines_prologue.json`, `src/content/prologue.json` (`decision_quarters`, `altcoin_selling_limits`, `altcoin_handover`), `src/content/events_prologue.json`, `src/i18n/content.en.json`.
- The pool_ and club_ cards, `pools_player.json`, `club.json` and `preorders_additions.json` are not merged yet (milestones after M68).
- Cards: 15 headlines become the game's display-only type `news` (no pause, no choice, nothing recorded). `news_ltc_launch` is a `news` card too: the pack's one choice only set a flag (`tried_ltc`) that nothing reads (mine, reversible). `scrypt_boxes_ship` stays a choice card, shown only to a player with a GPU on scrypt (`requires: scrypt_gpus`), so a game that never switches a GPU is unchanged (opt-out invariance). A card with no week gets its quarter's first week (mine, reversible).

## Merge log (M69.2: doc 51 v1.1 §11 item 2, your own pool; `tools/prologue/gen_content.py` and `merge_alts.py`)
- `pools_player.json` is also written to `src/content/` (identical; the game reads it through `poolsPlayerFileSchema`).
- `docs/prologue-content/`: `events_prologue.json` (the 5 pool_ cards), `text_prologue.en.json` (8 keys: tooltip.p0.own_pool, pool_pps, pool_pplns, cold_storage, glossary.hot_wallet, glossary.ddos, chapter.p0.pool_sold, pool_sold_handover).
- The game's copies carry the same in the game's format: `src/content/events_prologue.json` and `src/i18n/content.en.json`. New card type `trigger` (a card the pool system queues itself when its rule fires: pool_ddos, pool_theft, pool_pps_crunch); pool_boycott_2014 is a scripted card and pool_sale_offer a random one, both with `requires: pool_open` (mine, reversible: the pack's trigger strings became fields). New effect key `pool{...}`. Defaults: ride the DDoS out, repay the miners after a theft, keep paying under a PPS crunch, keep your fee in the boycott, keep the pool on a sale offer (mine, reversible).
- `glossary.hot_wallet` already existed in both text files with its own wording, so the merge kept it (it never replaces); the other 7 keys are the pack's.
- The club_ cards, `club.json` and `preorders_additions.json` are still not merged.

## Note (M70.1)
- The README log used to gain a second copy of the M68.3 block on every run of `npm run content:prologue-expansion` (its guard looked for a string the heading doesn't contain). Fixed in `merge_alts.py`; the duplicates are gone.

## Merge log (M70.3: doc 51 v1.2 §11 item 3, the mining club; `tools/prologue/gen_content.py` and `merge_alts.py`)
- `club.json` and `preorders_additions.json` are also written to `src/content/` (identical; the game reads them through `clubFileSchema` and `preordersAdditionsFileSchema`).
- `docs/prologue-content/`: `events_prologue.json` (the 7 club_ cards), `text_prologue.en.json` (3 keys: tooltip.p0.club, chapter.p0.club_buyout, chapter.p0.club_dissolved).
- The game's copies carry the same in the game's format: `src/content/events_prologue.json` and `src/i18n/content.en.json`. The cards: `club_form` (the offer: a headline of type `news` in the game, display only, so a game that never joins is unchanged; the joining itself is the action `P0_JOIN_CLUB` in 2013Q1's Plan phase, from the Ventures screen), `club_power_bill` (random, from 2013Q2), `club_peak_cashout`, `club_gpu_flip`, `club_scrypt_box`, `club_breakup` (scripted, `requires: club_member`, a card with no week takes its quarter's first) and `club_cloud_contract` (random in 2014Q3-Q4). New effect key `club{}`; `cash` may be the named amount `club_power_quarter` (mine, reversible). The default answers are the cautious ones: argue, wait, keep, pass, pass, carry on (mine, reversible).

## Rename log (M71.1: doc 51 v1.4 §14 decision 8 and §15 decision 2; `tools/prologue/gen_content.py` and `merge_alts.py`)
- ScryptBox Ltd is now **Kestrel Foundry** (it was a real 2014 scrypt-mining share offering), Mara Ilves is **Nell Hartigan** (id `nell`; association risk) and OreLoop is **Slagwheel** (a Swedish gold-mining technology company uses it). The generator writes the new names; `merge_alts.py` renames the already-merged card and text copies in `docs/prologue-content/`, `src/content/` and `src/i18n/content.en.json`. Formal USPTO and EUIPO searches on every invented name are the owner's task before ship (doc 51 §15 decision 2).

## Header difficulty (M72.3: doc 51 v1.5 §16 decision 4; `tools/prologue/headers_difficulty.py` and `gen_alts.py`)
- `research-2/ltc_doge_difficulty_headers.csv` (block-header nBits, last block of each week: Litecoin 271 weeks from 2011-10-24, Dogecoin 161 from 2013-12-02, to 2016-12-26) now feeds the market files: `gen_alts.py` takes each coin's difficulty from it wherever it has a value, derives the hashrate from it, and uses the reconstruction (`ltc_doge_weekly.csv`) only for gaps; DOGE's derived rule (f x 0.4 x LTC D) is kept for weeks with no header value (none now). The weekly file's `grade` string (ltc difficulty / ltc price / doge difficulty / doge price) shows A in a difficulty slot that came from headers.
- The tool's cache (`research-2/.headers_cache.json`) is git-ignored; the CSV is the shipped result.
