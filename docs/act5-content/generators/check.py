"""Checks before hand-back: baseline equality and ±3% band, weekly closes, JSON validity, no em dashes, no hidden values in market files."""
import csv, json, glob, sys, os
D = sys.argv[1]
F = ['v1','v2','v3','v4']
m = {f: list(csv.DictReader(open(f'{D}/market_v_{f}.csv'))) for f in F}
cols = [c for c in m['v1'][0] if c not in ('quarter','future','estimate')]
bad = []
maxdev = 0
for t in range(4):
    for c in cols:
        vals = [m[f][t][c] for f in F]
        if t <= 1:
            if len(set(vals)) != 1: bad.append((m['v1'][t]['quarter'], c, vals))
        else:
            nums = [float(v) for v in vals if v != '']
            if len(nums) not in (0,4): bad.append((m['v1'][t]['quarter'], c, vals)); continue
            if nums:
                lo, hi = min(nums), max(nums)
                dev = 0 if hi == 0 else (hi-lo)/abs(hi)
                maxdev = max(maxdev, dev)
                if dev > 0.03: bad.append((m['v1'][t]['quarter'], c, vals))
print('baseline 2036Q1-Q2 identical & 2036Q3-Q4 within ±3%:', 'PASS' if not bad else bad[:10], '| max spread 2036:', round(maxdev,5))
# weekly
wk_ok = True
for f in F:
    w = list(csv.DictReader(open(f'{D}/market_weekly_v_{f}.csv')))
    assert len(w) == 260
    for t, q in enumerate(m[f]):
        last = [r for r in w if r['quarter'] == q['quarter']][-1]
        if float(last['btc_usd']) != float(q['btc_usd_close']) or last['btc_hashprice_usd_ph_day'] != q['btc_hashprice_usd_ph_day']: wk_ok = False; print('btc', f, q['quarter'])
        for c in [k for k in last if k.startswith('power_usd_kwh_')]:
            if last[c] != q[c]: wk_ok = False; print('pw', f, q['quarter'], c)
# weekly identical across futures in 2036
w = {f: list(csv.DictReader(open(f'{D}/market_weekly_v_{f}.csv'))) for f in F}
same = all({k: v for k, v in w[f][i].items() if k != 'future'} == {k: v for k, v in w['v1'][i].items() if k != 'future'} for f in F for i in range(52))
print('weekly closes equal quarterly values:', 'PASS' if wk_ok else 'FAIL', '| weekly 2036 identical across futures:', 'PASS' if same else 'FAIL')
# hidden values never in market files
hdr = open(f'{D}/market_v_v1.csv').readline()
print('no hidden columns in market files:', 'PASS' if not any(x in hdr for x in ['outlook', 'ideal', 'stance']) else 'FAIL')
# JSON + em dash
for p in sorted(glob.glob(f'{D}/*.json')):
    s = open(p).read(); json.loads(s)
    if '—' in s: print('EM DASH in', os.path.basename(p))
print('JSON valid:', len(glob.glob(f'{D}/*.json')), 'files')
# waits within bands; fusion; triggers
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from futures import TRIGGER, SIGNAL_START, QUARTERS
for f in F:
    s = json.load(open(f'{D}/signals_v_{f}.json'))
    tq = QUARTERS.index(s['trigger']['quarter']); s0 = QUARTERS.index(s['trigger']['signals_start_quarter'])
    assert 5 <= tq <= 10 and s0 >= 2 and 2 <= tq - s0 <= 4, f
    for ind in s['indicators']:
        assert all(x['displayed'] == 50 for x in ind['series'][:2])
print('triggers 2037Q2-2038Q3, signals 2-4 q before and not before 2036Q3, day-one signals 50: PASS')
