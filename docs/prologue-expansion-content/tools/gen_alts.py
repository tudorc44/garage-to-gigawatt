"""Generates the Prologue's Litecoin and Dogecoin market files (doc 51 v1.0, doc 53).
Inputs are the anchors below; outputs are written next to this folder. Re-run after the second research pass replaces anchors.
Usage: python3 -I tools/gen_alts.py <path to docs/prologue-content>"""
import csv, math, sys, datetime as dt
SRC = sys.argv[1]
OUT = __file__.rsplit('/tools/', 1)[0]

# Quarterly price anchors (doc 53 content pack; CoinLore [C] from 28 Apr 2013 for LTC and Dec 2013 for DOGE; earlier LTC [D]).
# quarter: (open, close, high, low, avg, estimate, grade)
LTC_Q = {
 '2011Q4': (0.30, 0.05, 0.30, 0.03, 0.08, True, 'D'), '2012Q1': (0.05, 0.05, 0.08, 0.03, 0.06, True, 'D'),
 '2012Q2': (0.05, 0.04, 0.06, 0.03, 0.04, True, 'D'), '2012Q3': (0.04, 0.05, 0.07, 0.03, 0.05, True, 'D'),
 '2012Q4': (0.05, 0.06, 0.08, 0.04, 0.06, True, 'D'), '2013Q1': (0.06, 1.00, 1.20, 0.05, 0.15, True, 'D'),
 '2013Q2': (1.00, 2.98, 4.49, 1.00, 3.00, True, 'C'), '2013Q3': (3.01, 2.35, 3.10, 2.30, 2.70, False, 'C'),
 '2013Q4': (2.34, 24.35, 53.15, 2.30, 15.00, False, 'C'), '2014Q1': (24.35, 12.75, 32.06, 12.00, 18.00, False, 'C'),
 '2014Q2': (12.77, 8.95, 13.50, 8.46, 10.80, False, 'C'), '2014Q3': (8.96, 4.47, 9.00, 4.30, 6.60, False, 'C'),
 '2014Q4': (4.47, 2.72, 4.60, 2.67, 3.70, False, 'C'), '2015Q1': (2.72, 1.65, 2.80, 1.11, 2.00, False, 'C'),
 '2015Q2': (1.65, 4.09, 4.20, 1.30, 2.00, True, 'C'), '2015Q3': (4.09, 3.01, 8.73, 2.70, 3.90, True, 'C'),
 '2015Q4': (3.01, 3.48, 4.50, 2.90, 3.50, True, 'C'), '2016Q1': (3.48, 3.20, 3.70, 2.92, 3.30, True, 'C'),
 '2016Q2': (3.20, 4.20, 5.95, 3.10, 4.20, True, 'C'), '2016Q3': (4.20, 3.80, 4.30, 3.40, 3.80, True, 'D'),
 '2016Q4': (3.80, 4.33, 4.40, 3.50, 3.80, True, 'C')}
DOGE_Q = {
 '2013Q4': (0.000231, 0.000422, 0.00152, 0.000116, 0.000512, False, 'C'), '2014Q1': (0.000423, 0.00060, 0.00234, 0.00040, 0.00110, True, 'C'),
 '2014Q2': (0.00060, 0.00028, 0.00065, 0.00025, 0.00045, True, 'D'), '2014Q3': (0.00028, 0.00022, 0.00030, 0.000103, 0.00022, True, 'C'),
 '2014Q4': (0.00022, 0.000187, 0.00026, 0.00018, 0.00021, True, 'C'), '2015Q1': (0.000186, 0.00015, 0.000247, 0.00013, 0.00017, True, 'C'),
 '2015Q2': (0.00015, 0.00012, 0.00016, 0.0000850, 0.00012, True, 'C'), '2015Q3': (0.00012, 0.00014, 0.00018, 0.00011, 0.00014, True, 'D'),
 '2015Q4': (0.00014, 0.000151, 0.00018, 0.00013, 0.00015, True, 'C'), '2016Q1': (0.000151, 0.00021, 0.00025, 0.000134, 0.00021, True, 'C'),
 '2016Q2': (0.00021, 0.00030, 0.000500, 0.00020, 0.00028, True, 'C'), '2016Q3': (0.00030, 0.00023, 0.00031, 0.00021, 0.00023, True, 'D'),
 '2016Q4': (0.00023, 0.000223, 0.00025, 0.00020, 0.00022, True, 'C')}
# Network hashrate, quarter averages in GH/s: designed [D] (doc 53 A5), to be replaced by chart-read difficulty [C] in the second pass.
LTC_H = {'2011Q4': 0.3, '2012Q1': 0.5, '2012Q2': 0.8, '2012Q3': 1.2, '2012Q4': 2.0, '2013Q1': 4, '2013Q2': 10, '2013Q3': 20, '2013Q4': 55,
 '2014Q1': 110, '2014Q2': 200, '2014Q3': 500, '2014Q4': 900, '2015Q1': 1200, '2015Q2': 1400, '2015Q3': 1400, '2015Q4': 1450,
 '2016Q1': 1700, '2016Q2': 1900, '2016Q3': 2100, '2016Q4': 2400}
DOGE_H = {'2013Q4': 20, '2014Q1': 80, '2014Q2': 50, '2014Q3': 150, '2014Q4': 750, '2015Q1': 1080, '2015Q2': 1260, '2015Q3': 1260,
 '2015Q4': 1305, '2016Q1': 1530, '2016Q2': 1710, '2016Q3': 1890, '2016Q4': 2160}
LTC_LIVE, DOGE_LIVE, MERGED = dt.date(2011, 10, 13), dt.date(2013, 12, 6), dt.date(2014, 9, 11)  # [B], [B], [A]
LTC_BLOCKS_DAY, DOGE_BLOCKS_DAY = 576, 1440  # 150 s and 60 s blocks [A]

def ltc_reward(d): return 50.0 if d < dt.date(2015, 8, 25) else 25.0  # block 840,000 [A]
DOGE_STEPS = [(dt.date(2014, 2, 14), 500000), (dt.date(2014, 3, 17), 250000), (dt.date(2014, 4, 28), 250000), (dt.date(2014, 7, 15), 125000),
              (dt.date(2014, 10, 2), 62500), (dt.date(2014, 12, 14), 31250), (dt.date(2015, 2, 25), 15625)]
def doge_reward(d):  # expected reward per block [A]: random 0-1M (mean 500k), 0-500k (mean 250k) from block 100,000, then fixed
    for until, r in DOGE_STEPS:
        if d < until: return float(r)
    return 10000.0

def qmid(q):
    y, n = int(q[:4]), int(q[5])
    return dt.date(y, 3 * n - 1, 15)
def interp(series, d, log=True):
    pts = sorted((qmid(q), v) for q, v in series.items())
    if d <= pts[0][0]: return pts[0][1]
    if d >= pts[-1][0]: return pts[-1][1]
    for (d0, v0), (d1, v1) in zip(pts, pts[1:]):
        if d0 <= d <= d1:
            f = (d - d0).days / (d1 - d0).days
            return math.exp(math.log(v0) + f * (math.log(v1) - math.log(v0))) if log else v0 + f * (v1 - v0)

weeks = list(csv.DictReader(open(f'{SRC}/market_weekly_prologue.csv')))
quarters = list(csv.DictReader(open(f'{SRC}/market_quarterly_prologue.csv')))
rows = []
for w in weeks:
    d = dt.date.fromisoformat(w['week']); end = d + dt.timedelta(days=6); q = w['quarter']
    r = {'week': w['week'], 'quarter': q}
    if end >= LTC_LIVE and q in LTC_Q:
        p, h, R = interp({k: v[4] for k, v in LTC_Q.items()}, d), interp(LTC_H, d), ltc_reward(d)
        r.update(ltc_usd=round(p, 6), ltc_hashrate_GHs=round(h, 4), ltc_block_reward=R,
                 ltc_rev_usd_khs_day=f'{LTC_BLOCKS_DAY * R / (h * 1e6) * p:.8g}')
    if end >= DOGE_LIVE and q in DOGE_Q:
        p, h, R = interp({k: v[4] for k, v in DOGE_Q.items()}, d), interp(DOGE_H, d), doge_reward(d)
        r.update(doge_usd=f'{p:.6g}', doge_hashrate_GHs=round(h, 4), doge_block_reward_expected=R,
                 doge_rev_usd_khs_day=f'{DOGE_BLOCKS_DAY * R / (h * 1e6) * p:.8g}', doge_merged_mining=end >= MERGED)
    r['estimate'] = True  # every weekly value is interpolated from quarter anchors
    rows.append(r)
cols = ['week', 'quarter', 'ltc_usd', 'ltc_hashrate_GHs', 'ltc_block_reward', 'ltc_rev_usd_khs_day', 'doge_usd', 'doge_hashrate_GHs',
        'doge_block_reward_expected', 'doge_rev_usd_khs_day', 'doge_merged_mining', 'estimate']
with open(f'{OUT}/market_weekly_prologue_alts.csv', 'w', newline='') as f:
    wr = csv.DictWriter(f, cols); wr.writeheader(); wr.writerows(rows)

qcols = ['quarter', 'weeks'] + [f'{c}_{k}' for c in ('ltc', 'doge') for k in ('usd_open', 'usd_close', 'usd_high', 'usd_low', 'usd_avg', 'hashrate_GHs_avg', 'block_reward_q_start', 'price_grade')] + ['estimate']
qrows = []
for qq in quarters:
    q = qq['quarter']; r = {'quarter': q, 'weeks': qq['weeks']}; est = False
    for c, P, H, rw in (('ltc', LTC_Q, LTC_H, ltc_reward), ('doge', DOGE_Q, DOGE_H, doge_reward)):
        if q in P:
            o, cl, hi, lo, av, e, g = P[q]; est |= e or True  # hashrate is designed in every quarter
            r.update({f'{c}_usd_open': o, f'{c}_usd_close': cl, f'{c}_usd_high': hi, f'{c}_usd_low': lo, f'{c}_usd_avg': av,
                      f'{c}_hashrate_GHs_avg': H[q], f'{c}_block_reward_q_start': rw(dt.date(int(q[:4]), 3 * int(q[5]) - 2, 1)), f'{c}_price_grade': g})
    r['estimate'] = est
    qrows.append(r)
with open(f'{OUT}/market_quarterly_prologue_alts.csv', 'w', newline='') as f:
    wr = csv.DictWriter(f, qcols); wr.writeheader(); wr.writerows(qrows)

# X-B6 check on the game's own BTC series: a 2010 gaming GPU, 390 MH/s on BTC (machines_prologue.json) vs 400 kH/s on scrypt [B/D].
print('quarter, GPU $/day on LTC, on DOGE, on BTC (game series), LTC/BTC ratio')
for qq in quarters:
    q = qq['quarter']
    if q not in LTC_Q: continue
    btc = (float(qq['btc_hashprice_usd_th_day_open'] or 0) + float(qq['btc_hashprice_usd_th_day_close'] or 0)) / 2 * 0.000390  # 390 MH/s in TH/s
    ltc = LTC_BLOCKS_DAY * ltc_reward(qmid(q)) / (LTC_H[q] * 1e6) * LTC_Q[q][4] * 400
    doge = DOGE_BLOCKS_DAY * doge_reward(qmid(q)) / (DOGE_H[q] * 1e6) * DOGE_Q[q][4] * 400 if q in DOGE_Q else 0
    print(f'{q}, {ltc:.4f}, {doge:.4f}, {btc:.4f}, {ltc / btc if btc else float("inf"):.1f}')
