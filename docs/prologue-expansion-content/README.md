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
