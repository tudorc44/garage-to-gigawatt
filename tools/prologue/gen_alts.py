"""Generates the Prologue's Litecoin and Dogecoin market files (doc 51 v1.4 §14-§15; data: doc 55 research-2/ltc_doge_weekly.csv, doc 57 research-3/ltc_doge_prices_weekly.csv).
The weekly series is a reconstruction (every row estimate=true) until difficulty is rebuilt from block headers (doc 51 §14 decision 1).
Usage: npm run content:prologue-expansion  (python3 -I tools/prologue/gen_alts.py <path to docs/prologue-content>)
In the repo (M68.2) it lives in tools/prologue/ and writes into docs/prologue-expansion-content/ and src/content/; the CSVs use LF line endings."""
import csv, os, sys, datetime as dt
SRC = sys.argv[1]
OUT = __file__.rsplit('/tools/', 1)[0] + '/docs/prologue-expansion-content'
LIVE = __file__.rsplit('/tools/', 1)[0] + '/src/content'  # the game reads its copies here (a test checks they stay identical)
SERIES = f'{OUT}/research-2/ltc_doge_weekly.csv'   # difficulty and hashrate (reconstruction until the header rebuild)
HEADERS = f'{OUT}/research-2/ltc_doge_difficulty_headers.csv'  # difficulty from block headers [A] (M72.3, doc 51 v1.5 §16 decision 4): beats the reconstruction wherever it has a value
PRICES = f'{OUT}/research-3/ltc_doge_prices_weekly.csv'  # prices and volume: CoinMarketCap [A] from 2013-04-29 (LTC) and 2013-12-15 (DOGE), licensed; designed [D] before

LTC_OPEN = dt.date(2011, 10, 24)  # [D] doc 51 §14 decision 2: the first two reconstructed weeks (D 0.000244, 0.05) are launch artefacts
MERGED = dt.date(2014, 9, 11)     # [A/B] block 371,337
DERIVED_FROM = dt.date(2014, 10, 6)  # after the four-week merged-mining ramp in the series (doc 55 §1)
LTC_BLOCKS_DAY, DOGE_BLOCKS_DAY = 576, 1440
DOGE_GHS_PER_D, LTC_GHS_PER_D = 0.0715828, 0.0286331

def merge_share(d):  # f: share of LTC hashrate also merge-mining DOGE [D], doc 55 §1 (from Binance Research 2019: 91%, ratio 0.39)
    return 0.70 if d.year == 2014 else 0.82 if d.year == 2015 else 0.89

def ltc_reward(d): return 50.0 if d < dt.date(2015, 8, 25) else 25.0
DOGE_STEPS = [(dt.date(2014, 2, 14), 500000), (dt.date(2014, 3, 17), 250000), (dt.date(2014, 4, 28), 250000), (dt.date(2014, 7, 15), 125000),
              (dt.date(2014, 10, 2), 62500), (dt.date(2014, 12, 14), 31250), (dt.date(2015, 2, 25), 15625)]
def doge_reward(d):
    for until, r in DOGE_STEPS:
        if d < until: return float(r)
    return 10000.0

series = {r['week']: r for r in csv.DictReader(open(SERIES))}
headers = {r['week']: r for r in csv.DictReader(open(HEADERS))} if os.path.exists(HEADERS) else {}
prices = {}
for r in csv.DictReader(open(PRICES)): prices[(r['coin'], r['week'])] = r
weeks = list(csv.DictReader(open(f'{SRC}/market_weekly_prologue.csv')))
rows = []
for w in weeks:
    d = dt.date.fromisoformat(w['week']); s = series.get(w['week']); r = {'week': w['week'], 'quarter': w['quarter']}; hd = None
    if s and d >= LTC_OPEN:
        pr = prices.get(('LTC', w['week']))
        hd = headers.get(w['week'], {}).get('ltc_difficulty')  # header difficulty where there is one; the hashrate follows from it
        ltc_d, ltc_h = (float(hd), float(hd) * LTC_GHS_PER_D) if hd else (float(s['ltc_difficulty']), float(s['ltc_hashrate_GHs']))
        p, h, R = float(pr['close_usd']) if pr else float(s['ltc_usd_close']), ltc_h, ltc_reward(d)
        r.update(ltc_usd=p, ltc_usd_high=float(pr['high_usd']) if pr else '', ltc_usd_low=float(pr['low_usd']) if pr else '',
                 ltc_volume_usd_day=round(float(pr['volume_usd']) / 7, 2) if pr and pr['volume_usd'] else '', ltc_price_grade=pr['grade'] if pr else 'D', ltc_difficulty=ltc_d, ltc_hashrate_GHs=h, ltc_block_reward=R,
                 ltc_rev_usd_khs_day=f'{LTC_BLOCKS_DAY * R / (h * 1e6) * p:.8g}')
    hdd = headers.get(w['week'], {}).get('doge_difficulty')
    if s and (s['doge_hashrate_GHs'] or hdd):
        if hdd:  # block-header difficulty [A]
            dd = float(hdd); h = dd * DOGE_GHS_PER_D
        elif d >= DERIVED_FROM:  # DOGE difficulty derived from LTC's after merged mining (doc 55 §1)
            dd = merge_share(d) * 0.4 * float(s['ltc_difficulty']); h = dd * DOGE_GHS_PER_D
        else:
            dd, h = float(s['doge_difficulty']), float(s['doge_hashrate_GHs'])
        pr = prices.get(('DOGE', w['week']))
        p, R = (float(pr['close_usd']) if pr else float(s['doge_usd_close'] or 0)), doge_reward(d)
        if p > 0:
            r.update(doge_usd=p, doge_usd_high=float(pr['high_usd']) if pr else '', doge_usd_low=float(pr['low_usd']) if pr else '',
                     doge_volume_usd_day=round(float(pr['volume_usd']) / 7, 2) if pr and pr['volume_usd'] else '', doge_price_grade=pr['grade'] if pr else 'D', doge_difficulty=round(dd, 2), doge_hashrate_GHs=round(h, 3), doge_block_reward_expected=R,
                     doge_rev_usd_khs_day=f'{DOGE_BLOCKS_DAY * R / (h * 1e6) * p:.8g}', doge_merged_mining=d + dt.timedelta(days=6) >= MERGED)
    if len(r) > 2:
        # the grade string reads ltc difficulty / ltc price / doge difficulty / doge price; a difficulty from block headers is grade A
        g = s['grade'].split('/')
        if hd and g[0] != '-': g[0] = 'A'
        if hdd and len(g) > 2 and g[2] != '-': g[2] = 'A'
        r['grade'] = '/'.join(g); r['estimate'] = True
    rows.append(r)
cols = ['week', 'quarter', 'ltc_usd', 'ltc_usd_high', 'ltc_usd_low', 'ltc_volume_usd_day', 'ltc_price_grade', 'ltc_difficulty', 'ltc_hashrate_GHs', 'ltc_block_reward', 'ltc_rev_usd_khs_day', 'doge_usd', 'doge_usd_high', 'doge_usd_low', 'doge_volume_usd_day', 'doge_price_grade', 'doge_difficulty',
        'doge_hashrate_GHs', 'doge_block_reward_expected', 'doge_rev_usd_khs_day', 'doge_merged_mining', 'grade', 'estimate']
for d_ in (OUT, LIVE):
    with open(f'{d_}/market_weekly_prologue_alts.csv', 'w', newline='') as f:
        wr = csv.DictWriter(f, cols, lineterminator='\n'); wr.writeheader(); wr.writerows(rows)

# Quarterly file: derived from the weekly closes (open = first week, close = last, high/low/avg of weekly closes).
qcols = ['quarter', 'weeks'] + [f'{c}_{k}' for c in ('ltc', 'doge') for k in ('usd_open', 'usd_close', 'usd_high', 'usd_low', 'usd_avg', 'hashrate_GHs_avg', 'block_reward_q_start')] + ['estimate']
by_q = {}
for r in rows: by_q.setdefault(r['quarter'], []).append(r)
qrows = []
for qq in csv.DictReader(open(f'{SRC}/market_quarterly_prologue.csv')):
    q = qq['quarter']; out = {'quarter': q, 'weeks': qq['weeks']}; any_ = False
    for c in ('ltc', 'doge'):
        ws = [r for r in by_q.get(q, []) if f'{c}_usd' in r]
        if not ws: continue
        any_ = True; ps = [r[f'{c}_usd'] for r in ws]
        his = [r[f'{c}_usd_high'] or r[f'{c}_usd'] for r in ws]; los = [r[f'{c}_usd_low'] or r[f'{c}_usd'] for r in ws]
        out.update({f'{c}_usd_open': ps[0], f'{c}_usd_close': ps[-1], f'{c}_usd_high': max(his), f'{c}_usd_low': min(los), f'{c}_usd_avg': round(sum(ps) / len(ps), 6),
                    f'{c}_hashrate_GHs_avg': round(sum(r[f'{c}_hashrate_GHs'] for r in ws) / len(ws), 4),
                    f'{c}_block_reward_q_start': ws[0][f'{c}_block_reward' if c == 'ltc' else 'doge_block_reward_expected']})
    if any_: out['estimate'] = True
    qrows.append(out)
for d_ in (OUT, LIVE):
    with open(f'{d_}/market_quarterly_prologue_alts.csv', 'w', newline='') as f:
        wr = csv.DictWriter(f, qcols, lineterminator='\n'); wr.writeheader(); wr.writerows(qrows)

# X-B6 check on the game's own BTC series: a 2010 GPU, 390 MH/s on BTC vs 400 kH/s on scrypt.
gw = {w['week']: w for w in weeks}
acc = {}
for r in rows:
    a = acc.setdefault(r['quarter'], [0.0, 0.0, 0.0])
    a[0] += float(r.get('ltc_rev_usd_khs_day', 0) or 0) * 400 * 7
    a[1] += float(r.get('doge_rev_usd_khs_day', 0) or 0) * 400 * 7
    a[2] += float(gw[r['week']]['btc_hashprice_usd_th_day'] or 0) * 0.000390 * 7
print('quarter, GPU $ on LTC, on DOGE, on BTC, best scrypt / BTC')
for q, (l, dg, b) in acc.items():
    if l or dg: print(f'{q}, {l:.2f}, {dg:.2f}, {b:.2f}, {max(l, dg) / b if b else 0:.1f}')
