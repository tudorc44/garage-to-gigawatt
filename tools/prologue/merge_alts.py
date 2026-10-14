"""Merges the altcoin content of the Prologue expansion pack (docs/prologue-expansion-content/, doc 51 v1.0 §5, §7) into the
Prologue's own files, by inserting text so that nothing else in those files moves. Runs after gen_content.py in
`npm run content:prologue-expansion`; safe to run again (each insertion checks that it is not there yet).
Only doc 51 §11 item 1 (altcoins) is merged: the pool_ and club_ cards, pools_player.json, club.json and preorders_additions.json wait.

  docs/prologue-content/  (the pack's own format):  machines_prologue.json, custody.json, events_prologue.json, text_prologue.en.json
  src/content/ and src/i18n/ (the game's format):    machines_prologue.json, prologue.json, events_prologue.json, content.en.json
"""
import csv, json, re
ROOT = __file__.rsplit('/tools/', 1)[0]
PACK = f'{ROOT}/docs/prologue-expansion-content'
DOCS = f'{ROOT}/docs/prologue-content'
GAME = f'{ROOT}/src/content'
TEXT = f'{ROOT}/src/i18n/content.en.json'

def read(p): return open(p, encoding='utf-8').read()
def write(p, s): open(p, 'w', encoding='utf-8', newline='\n').write(s)
def jl(x): return json.dumps(x, ensure_ascii=False)  # one line

scrypt = json.load(open(f'{PACK}/machines_scrypt.json'))['models']
custody = json.load(open(f'{PACK}/custody_additions.json'))
cards = [c for c in json.load(open(f'{PACK}/events_prologue_expansion.json'))['events'] if not c['id'].startswith(('pool_', 'club_'))]
text = json.load(open(f'{PACK}/text_prologue_expansion.en.json'))
assert len(cards) == 17, len(cards)
ALT_TEXT = ['tooltip.p0.coin_choice', 'tooltip.p0.alt_selling', 'glossary.scrypt', 'glossary.litecoin', 'glossary.dogecoin',
            'glossary.merged_mining', 'chapter.p0.alts_sold']
FOCUS_2014Q3 = 'Scrypt ASIC boxes ship; GPU scrypt income collapses.'

# the first week of each quarter, for a card the pack gives no week (display only)
first_week, week_quarter = {}, {}
for r in csv.DictReader(open(f'{DOCS}/market_weekly_prologue.csv')):
    first_week.setdefault(r['quarter'], r['week']); week_quarter[r['week']] = r['quarter']

def insert_before_line(s, after_id, needle, new_lines):
    """Inserts new_lines before the first line containing `needle` that follows the line containing after_id."""
    lines = s.split('\n')
    i = next(k for k, l in enumerate(lines) if after_id in l)
    j = next(k for k in range(i, len(lines)) if needle in lines[k])
    return '\n'.join(lines[:j] + new_lines + lines[j:])

# ---- docs/prologue-content/machines_prologue.json (the pack's format)
p = f'{DOCS}/machines_prologue.json'; s = read(p)
def model_block(s, mid):
    """The text of one model: from its id to the next model's id (or the end)."""
    i = s.index(f'"id": "{mid}"')
    j = s.find('"id": "', i + 10)
    return s[i:j if j >= 0 else len(s)]
for mid, m in scrypt.items():
    if '"scrypt_khs"' not in model_block(s, mid):
        s = insert_before_line(s, f'"id": "{mid}"', '"power_kw"',
                               [f'   "scrypt_khs": {jl(m["scrypt_khs"])},', f'   "available_scrypt_from": "{m["available_scrypt_from"]}",'])
write(p, s)

# ---- docs/prologue-content/custody.json
p = f'{DOCS}/custody.json'; s = read(p)
if 'altcoin_selling_limits' not in s:
    body = s.rstrip()
    assert body.endswith('\n}')
    add = {k: custody[k] for k in ('altcoin_selling_limits', 'pools_reference_fees', 'handover')}
    extra = ',\n'.join(f' {json.dumps(k)}: {json.dumps(v, ensure_ascii=False, indent=1).replace(chr(10), chr(10) + " ")}' for k, v in add.items())
    write(p, body[:-2] + ',\n' + extra + '\n}\n')

# ---- docs/prologue-content/events_prologue.json
p = f'{DOCS}/events_prologue.json'; s = read(p)
if '"news_ltc_launch"' not in s:
    s = s.replace('  { "quarter": "2014Q1", "focus": "Mt Gox collapse (Feb 2014)." },\n',
                  '  { "quarter": "2014Q1", "focus": "Mt Gox collapse (Feb 2014)." },\n'
                  f'  {{ "quarter": "2014Q3", "focus": "{FOCUS_2014Q3}" }},\n', 1)
    assert FOCUS_2014Q3 in s
    k = s.index('\n ],\n "offers"')
    s = s[:k] + ',\n' + ',\n'.join('  ' + jl(c) for c in cards) + s[k:]
    write(p, s)

# ---- docs/prologue-content/text_prologue.en.json
p = f'{DOCS}/text_prologue.en.json'; d = json.loads(read(p))
for k in ALT_TEXT: d.setdefault(k, text[k])
write(p, json.dumps(d, indent=1, ensure_ascii=False) + '\n')

# ---- src/content/machines_prologue.json (the game's format: plain sourced numbers)
p = f'{GAME}/machines_prologue.json'; s = read(p)
for mid, m in scrypt.items():
    i = s.index(f'"id": "{mid}"')
    if '"scrypt_khs"' in model_block(s, mid): continue
    sv = m['scrypt_khs']
    j = s.index('"power_kw"', i)
    line_start = s.rindex('\n', 0, j) + 1
    s = (s[:line_start] + f'   "scrypt_khs": {{"value": {sv["value"]}, "source": {json.dumps(sv["source"])}, "estimate": {str(sv["grade"] != "B").lower()}}},\n'
         f'   "available_scrypt_from": "{m["available_scrypt_from"]}",\n' + s[line_start:])
write(p, s)

# ---- src/content/prologue.json: the 2014Q3 decision quarter, the altcoin selling limits, the handover rule
p = f'{GAME}/prologue.json'; s = read(p)
if 'altcoin_selling_limits' not in s:
    # 2014Q3 is a decision quarter only for a player with a GPU on scrypt (opt-in), so a game that never switches a GPU keeps
    # its 13 Plan phases and every golden stays byte-identical (mine, reversible; doc 51 v1.0 §2.2 says 13 to 14)
    s = s.replace(' "offers": [', ' "opt_in_decision_quarters": {"2014Q3": "scrypt_gpus"},\n "offers": [', 1)
    lim = custody['altcoin_selling_limits']
    vol = {coin: {y: v['value'] for y, v in ys.items()} for coin, ys in lim['avg_daily_volume_usd'].items()}
    block = (
        ' "altcoin_selling_limits": ' + jl({
            'designed': True,
            'note': 'Doc 51 v1.0 §5, doc 53 A6: a sale is free up to free_share of the year\'s average daily volume (USD); each further step_share of it moves the price down by slippage_per_step; hard_cap_share is the most one week may sell. Altcoins sit in your own wallet (an exchange collapse moves price only).',
            'free_share': lim['free_share_of_avg_daily_volume']['value'],
            'step_share': lim['free_share_of_avg_daily_volume']['value'],
            'slippage_per_step': 0.01,
            'hard_cap_share': lim['hard_cap_share_of_avg_daily_volume']['value'],
            'avg_daily_volume_usd': vol}) + ',\n'
        ' "altcoin_handover": ' + jl({
            'sell_quarter': '2016Q4',
            'left_over_close_mult': 0.9,
            'note': 'Doc 51 v1.0 §5: altcoins are sold over 2016Q4 within the selling limits at the weekly prices; whatever is left converts at the 2016Q4 close x this; no altcoin enters Act I.'}) + ',\n')
    s = s.replace(' "career_markers_note"', block + ' "career_markers_note"', 1)
    write(p, s)

# ---- src/content/events_prologue.json and src/i18n/content.en.json (the game's cards and their text)
def game_card(c):
    q = c['trigger'].split(':')[1]
    # a card with no week (or a week the market file puts in the quarter before, e.g. 30 Dec 2013 for the 3 Jan 2014 news) gets its quarter's first week
    wk = c['week'] if c['week'] and week_quarter.get(c['week']) == q else first_week[q]
    if c['id'] == 'scrypt_boxes_ship':
        return ({'id': c['id'], 'type': 'scripted', 'quarter': q, 'week_of': wk, 'requires': ['scrypt_gpus'], 'default': 'keep',
                 'choices': [{'id': 'sell_gpus', 'effects': {'sell_scrypt_gpus': True}}, {'id': 'keep', 'effects': {}}]},
                {'choice.sell_gpus': c['choices'][0]['label'], 'choice.keep': c['choices'][1]['label']})
    # every other card is a headline: display only, no pause, nothing recorded (news_ltc_launch too: its one flag was read by nothing)
    return ({'id': c['id'], 'type': 'news', 'quarter': q, 'week_of': wk, 'default': 'noted', 'choices': [{'id': 'noted', 'effects': {}}]}, {})

p = f'{GAME}/events_prologue.json'; s = read(p)
game = [game_card(c) for c in cards]
if '"news_ltc_launch"' not in s:
    body = s.rstrip(); tail = '\n ]\n}'
    assert body.endswith(tail)
    write(p, body[:-len(tail)] + ',\n' + ',\n'.join('  ' + jl(g[0]) for g in game) + tail + '\n')

d = json.loads(read(TEXT))
new = {}
for c, (g, ch) in zip(cards, game):
    new[f'p0.event.{c["id"]}.title'] = c['title']
    new[f'p0.event.{c["id"]}.body'] = c['body']
    for k, v in ch.items(): new[f'p0.event.{c["id"]}.{k}'] = v
for k in ALT_TEXT: new[k] = text[k]
out = {}
last_event = max(i for i, k in enumerate(d) if k.startswith('p0.event.'))
for i, (k, v) in enumerate(d.items()):
    out[k] = v
    if i == last_event:
        for nk, nv in new.items():
            if nk.startswith('p0.event.') and nk not in d: out[nk] = nv
for nk, nv in new.items():
    if not nk.startswith('p0.event.') and nk not in out: out[nk] = nv
write(TEXT, json.dumps(out, indent=2, ensure_ascii=False) + '\n')

# ---- M69.2 (doc 51 v1.1 §11 item 2): the pool's 5 cards and 8 text keys, the same way (docs in the pack's format, the game in its own)
POOL_TEXT = ['tooltip.p0.own_pool', 'tooltip.p0.pool_pps', 'tooltip.p0.pool_pplns', 'tooltip.p0.cold_storage', 'glossary.hot_wallet',
             'glossary.ddos', 'chapter.p0.pool_sold', 'chapter.p0.pool_sold_handover', 'chapter.p0.pool_insolvent']
pool_cards = [c for c in json.load(open(f'{PACK}/events_prologue_expansion.json'))['events'] if c['id'].startswith('pool_')]
assert len(pool_cards) == 5, len(pool_cards)
POOL_GAME = {  # id: (type, extra fields, default, [(choice id, effects)])
    'pool_ddos': ('trigger', {'requires': ['pool_open']}, 'ride',
                  [('protect', {'pool': {'outage': True, 'buy_ddos_protection': True}, 'bandwidth_next': -1}), ('ride', {'pool': {'outage': True}})]),
    'pool_theft': ('trigger', {'requires': ['pool_open']}, 'repay',
                   [('repay', {'pool': {'theft': True, 'repay_from_cash': True}}),
                    ('explain', {'pool': {'theft': True, 'repay_from_cash': False, 'reputation': -30}})]),
    'pool_pps_crunch': ('trigger', {'requires': ['pool_open']}, 'keep', [('to_pplns', {'pool': {'set_method': 'PPLNS'}, 'bandwidth_next': -1}), ('keep', {})]),
    'pool_boycott_2014': ('scripted', {'quarter': '2014Q2', 'week_of': '2014-06-09', 'requires': ['pool_open']}, 'keep_fee',
                          [('cut_fee', {'pool': {'fee_override': 0.0, 'duration_quarters': 2, 'boycott_eligible': True}}),
                           ('keep_fee', {'pool': {'boycott_eligible': 'if_fee_at_or_below_median'}})]),
    'pool_sale_offer': ('random', {'requires': ['pool_open'], 'from': '2013Q1', 'weight': 0.5}, 'keep', [('sell', {'pool': {'sell': True}}), ('keep', {})]),
}
p = f'{DOCS}/events_prologue.json'; s = read(p)
if '"pool_ddos"' not in s:
    k = s.index('\n ],\n "offers"')
    write(p, s[:k] + ',\n' + ',\n'.join('  ' + jl(c) for c in pool_cards) + s[k:])
p = f'{DOCS}/text_prologue.en.json'; d = json.loads(read(p))
for k in POOL_TEXT: d.setdefault(k, text[k])
write(p, json.dumps(d, indent=1, ensure_ascii=False) + '\n')
p = f'{GAME}/events_prologue.json'; s = read(p)
if '"pool_ddos"' not in s:
    lines_ = []
    for c in pool_cards:
        typ, extra, default, choices = POOL_GAME[c['id']]
        card_ = {'id': c['id'], 'type': typ, **extra, 'default': default, 'choices': [{'id': i, 'effects': e} for i, e in choices]}
        lines_.append('  ' + jl(card_))
    body = s.rstrip(); tail = '\n ]\n}'
    assert body.endswith(tail)
    write(p, body[:-len(tail)] + ',\n' + ',\n'.join(lines_) + tail + '\n')
d = json.loads(read(TEXT))
new = {}
for c in pool_cards:
    new[f'p0.event.{c["id"]}.title'] = c['title']
    new[f'p0.event.{c["id"]}.body'] = c['body']
    for (cid, _), pc in zip(POOL_GAME[c['id']][3], c['choices']): new[f'p0.event.{c["id"]}.choice.{cid}'] = pc['label']
for k in POOL_TEXT: new[k] = text[k]
out = {}
last_event = max(i for i, k in enumerate(d) if k.startswith('p0.event.'))
for i, (k, v) in enumerate(d.items()):
    out[k] = v
    if i == last_event:
        for nk, nv in new.items():
            if nk.startswith('p0.event.') and nk not in d: out[nk] = nv
for nk, nv in new.items():
    if not nk.startswith('p0.event.') and nk not in out: out[nk] = nv
write(TEXT, json.dumps(out, indent=2, ensure_ascii=False) + '\n')

# ---- M70.3 (doc 51 v1.2 §11 item 3): the club's 7 cards and 3 text keys, the same way
CLUB_TEXT = ['tooltip.p0.club', 'chapter.p0.club_buyout', 'chapter.p0.club_dissolved']
club_cards = [c for c in json.load(open(f'{PACK}/events_prologue_expansion.json'))['events'] if c['id'].startswith('club_')]
assert len(club_cards) == 7, len(club_cards)
CLUB_GAME = {  # id: (type, extra fields, default, [(choice id, effects)])
    # club_form is the offer: in the game it is a headline (type 'news': display only, so a game that never joins is unchanged);
    # the joining itself is the action P0_JOIN_CLUB in 2013Q1's Plan phase, from the Ventures screen (mine, reversible)
    'club_form': ('news', {'quarter': '2013Q1'}, 'noted', [('noted', {})]),
    'club_power_bill': ('random', {'requires': ['club_member'], 'from': '2013Q2', 'weight': 1, 'pauses_autoplay': True}, 'argue',
                        [('split', {'club': {'cost_split': 'shares'}}), ('pay', {'cash': 'club_power_quarter'}), ('argue', {'club': {'dispute': True}})]),
    'club_peak_cashout': ('scripted', {'quarter': '2013Q4', 'week_of': '2013-12-02', 'requires': ['club_member']}, 'wait',
                          [('buy_out', {'club': {'buy_out': 'teo'}}), ('let_sell', {'club': {'member_sells': 'teo'}}),
                           ('wait', {'club': {'refuse': 'teo', 'friendship': -1}})]),
    'club_gpu_flip': ('scripted', {'quarter': '2014Q1', 'week_of': '2014-03-03', 'requires': ['club_member']}, 'keep',
                      [('sell', {'club': {'sell_gpus_mult': 1.5}}), ('keep', {})]),
    'club_scrypt_box': ('scripted', {'quarter': '2014Q2', 'requires': ['club_member']}, 'pass',
                        [('buy', {'club': {'preorder': 'scrypt_box_share'}}), ('pass', {})]),
    'club_cloud_contract': ('random', {'requires': ['club_member'], 'quarters': ['2014Q3', '2014Q4'], 'weight': 1, 'pauses_autoplay': True}, 'pass',
                            [('invest', {'club': {'cloud_contract': True}}), ('pass', {})]),
    'club_breakup': ('scripted', {'quarter': '2015Q1', 'requires': ['club_member']}, 'carry_on',
                     [('buy_out', {'club': {'end': 'buy_out'}}), ('dissolve', {'club': {'end': 'dissolve'}}), ('carry_on', {})]),
}
p = f'{DOCS}/events_prologue.json'; s = read(p)
if '"club_form"' not in s:
    k = s.index('\n ],\n "offers"')
    write(p, s[:k] + ',\n' + ',\n'.join('  ' + jl(c) for c in club_cards) + s[k:])
p = f'{DOCS}/text_prologue.en.json'; d = json.loads(read(p))
for k in CLUB_TEXT: d.setdefault(k, text[k])
write(p, json.dumps(d, indent=1, ensure_ascii=False) + '\n')
p = f'{GAME}/events_prologue.json'; s = read(p)
if '"club_form"' not in s:
    lines_ = []
    for c in club_cards:
        typ, extra, default, choices = CLUB_GAME[c['id']]
        extra = dict(extra)
        if typ in ('scripted', 'news') and 'week_of' not in extra:
            extra['week_of'] = first_week[extra['quarter']]  # a card with no week takes its quarter's first
        lines_.append('  ' + jl({'id': c['id'], 'type': typ, **extra, 'default': default, 'choices': [{'id': i, 'effects': e} for i, e in choices]}))
    body = s.rstrip(); tail = '\n ]\n}'
    assert body.endswith(tail)
    write(p, body[:-len(tail)] + ',\n' + ',\n'.join(lines_) + tail + '\n')
d = json.loads(read(TEXT))
new = {}
for c in club_cards:
    new[f'p0.event.{c["id"]}.title'] = c['title']
    new[f'p0.event.{c["id"]}.body'] = c['body']
    if CLUB_GAME[c['id']][0] != 'news':
        for (cid, _), pc in zip(CLUB_GAME[c['id']][3], c['choices']): new[f'p0.event.{c["id"]}.choice.{cid}'] = pc['label']
for k in CLUB_TEXT: new[k] = text[k]
out = {}
last_event = max(i for i, k in enumerate(d) if k.startswith('p0.event.'))
for i, (k, v) in enumerate(d.items()):
    out[k] = v
    if i == last_event:
        for nk, nv in new.items():
            if nk.startswith('p0.event.') and nk not in d: out[nk] = nv
for nk, nv in new.items():
    if not nk.startswith('p0.event.') and nk not in out: out[nk] = nv
write(TEXT, json.dumps(out, indent=2, ensure_ascii=False) + '\n')

# ---- the README's log
p = f'{PACK}/README.md'; s = read(p)
if '## Merge log (M68.3:' not in s:
    write(p, s.rstrip('\n') + '''

## Merge log (M68.3: doc 51 §11 item 1, altcoins only; `tools/prologue/merge_alts.py`)
- `docs/prologue-content/`: `machines_prologue.json` (`scrypt_khs`, `available_scrypt_from` on the two GPU models), `custody.json` (`altcoin_selling_limits`, `pools_reference_fees`, `handover`), `events_prologue.json` (17 cards, the 2014Q3 decision quarter), `text_prologue.en.json` (7 keys).
- The game's copies are not byte copies of the pack's files (they hold the game's own schema, as before), so the same data went in in the game's format: `src/content/machines_prologue.json`, `src/content/prologue.json` (`decision_quarters`, `altcoin_selling_limits`, `altcoin_handover`), `src/content/events_prologue.json`, `src/i18n/content.en.json`.
- The pool_ and club_ cards, `pools_player.json`, `club.json` and `preorders_additions.json` are not merged yet (milestones after M68).
- Cards: 15 headlines become the game's display-only type `news` (no pause, no choice, nothing recorded). `news_ltc_launch` is a `news` card too: the pack's one choice only set a flag (`tried_ltc`) that nothing reads (mine, reversible). `scrypt_boxes_ship` stays a choice card, shown only to a player with a GPU on scrypt (`requires: scrypt_gpus`), so a game that never switches a GPU is unchanged (opt-out invariance). A card with no week gets its quarter's first week (mine, reversible).
''')
s = read(p)
if '## Merge log (M69.2' not in s:
    write(p, s.rstrip('\n') + '''

## Merge log (M69.2: doc 51 v1.1 §11 item 2, your own pool; `tools/prologue/gen_content.py` and `merge_alts.py`)
- `pools_player.json` is also written to `src/content/` (identical; the game reads it through `poolsPlayerFileSchema`).
- `docs/prologue-content/`: `events_prologue.json` (the 5 pool_ cards), `text_prologue.en.json` (8 keys: tooltip.p0.own_pool, pool_pps, pool_pplns, cold_storage, glossary.hot_wallet, glossary.ddos, chapter.p0.pool_sold, pool_sold_handover).
- The game's copies carry the same in the game's format: `src/content/events_prologue.json` and `src/i18n/content.en.json`. New card type `trigger` (a card the pool system queues itself when its rule fires: pool_ddos, pool_theft, pool_pps_crunch); pool_boycott_2014 is a scripted card and pool_sale_offer a random one, both with `requires: pool_open` (mine, reversible: the pack's trigger strings became fields). New effect key `pool{...}`. Defaults: ride the DDoS out, repay the miners after a theft, keep paying under a PPS crunch, keep your fee in the boycott, keep the pool on a sale offer (mine, reversible).
- `glossary.hot_wallet` already existed in both text files with its own wording, so the merge kept it (it never replaces); the other 7 keys are the pack's.
- The club_ cards, `club.json` and `preorders_additions.json` are still not merged.
''')
s = read(p)
if '## Merge log (M70.3' not in s:
    write(p, s.rstrip('\n') + '''

## Merge log (M70.3: doc 51 v1.2 §11 item 3, the mining club; `tools/prologue/gen_content.py` and `merge_alts.py`)
- `club.json` and `preorders_additions.json` are also written to `src/content/` (identical; the game reads them through `clubFileSchema` and `preordersAdditionsFileSchema`).
- `docs/prologue-content/`: `events_prologue.json` (the 7 club_ cards), `text_prologue.en.json` (3 keys: tooltip.p0.club, chapter.p0.club_buyout, chapter.p0.club_dissolved).
- The game's copies carry the same in the game's format: `src/content/events_prologue.json` and `src/i18n/content.en.json`. The cards: `club_form` (the offer: a headline of type `news` in the game, display only, so a game that never joins is unchanged; the joining itself is the action `P0_JOIN_CLUB` in 2013Q1's Plan phase, from the Ventures screen), `club_power_bill` (random, from 2013Q2), `club_peak_cashout`, `club_gpu_flip`, `club_scrypt_box`, `club_breakup` (scripted, `requires: club_member`, a card with no week takes its quarter's first) and `club_cloud_contract` (random in 2014Q3-Q4). New effect key `club{}`; `cash` may be the named amount `club_power_quarter` (mine, reversible). The default answers are the cautious ones: argue, wait, keep, pass, pass, carry on (mine, reversible).
''')
print('merge ok')
