# Designed [D] weekly price path for the period with no licensed source.
# LTC: week 2011-10-10 to week 2013-04-22 (CoinMarketCap data starts 28 Apr 2013).
# DOGE: launch week 2013-12-02 (before CoinMarketCap listing).
# Method: log-space Brownian bridge between sourced anchors, seeded, high vol; caps keep
# 2012-Feb 2013 under $0.10 (Cointelegraph). Weekly high/low drawn around open/close.
import math, random, datetime as dt, csv
random.seed(20111013)
W = lambda s: dt.date.fromisoformat(s)
# anchors: week (Monday) -> (close, grade, note)
A = {
 "2011-10-10": (0.22, "D", "launch week; first trades"),
 "2011-10-17": (0.30, "C", "~$0.30 on early listings (CoinMarketCap profile)"),
 "2011-12-26": (0.03, "D", "post-listing collapse"),
 "2012-04-23": (0.0038, "C", "0.000758 BTC x ~$5 (Bitcointalk 28 Apr 2012)"),
 "2012-12-31": (0.07, "B", "7 cents on 1 Jan 2013 (Forbes)"),
 "2013-02-25": (0.08, "B", "$0.07-0.09 on 2-3 Mar 2013"),
 "2013-03-25": (0.10, "B", "under 10 cents before April (Cointelegraph)"),
 "2013-04-01": (1.20, "D", "April breakout"),
 "2013-04-08": (2.30, "D", "peak $4.49 on 10 Apr, then crash"),
 "2013-04-15": (2.60, "D", "rebound"),
 "2013-04-22": (4.31, "C", "28 Apr 2013 first CoinMarketCap close; hand-off"),
}
SIG = 0.32  # weekly log volatility (extreme)
keys = sorted(A)
rows = {}
for a, b in zip(keys, keys[1:]):
    wa, wb = W(a), W(b); n = (wb - wa).days // 7
    la, lb = math.log(A[a][0]), math.log(A[b][0])
    # Brownian bridge
    walk = [0.0]
    for _ in range(n): walk.append(walk[-1] + random.gauss(0, SIG))
    for i in range(n + 1):
        t = i / n
        v = la + (lb - la) * t + (walk[i] - t * walk[n])
        rows[wa + dt.timedelta(weeks=i)] = math.exp(v)
for k, (v, g, note) in A.items(): rows[W(k)] = v
out = []
prev = None
for d in sorted(rows):
    c = rows[d]
    if W("2012-01-02") <= d <= W("2013-03-25"): c = min(c, 0.095 if d < W("2013-03-25") else 0.10)
    if d < W("2012-12-31") and d >= W("2012-01-02"): c = max(c, 0.0025)
    if d < W("2012-01-02"): c = min(c, 0.29 if d != W("2011-10-17") else 0.30)
    c = round(c, 4 if c < 1 else 2) or 0.0001
    o = prev if prev else 0.10
    hi = max(o, c) * math.exp(abs(random.gauss(0, SIG * 0.6)))
    lo = min(o, c) * math.exp(-abs(random.gauss(0, SIG * 0.5)))
    if d == W("2013-04-08"): hi = 4.49
    if d < W("2012-01-02"): hi = min(hi, 0.30)
    if W("2012-01-02") <= d <= W("2013-03-18"): hi = min(hi, 0.099)
    k = d.isoformat()
    g, note = (A[k][1], A[k][2]) if k in A else ("D", "bridge")
    r = lambda x: round(x, 4 if x < 1 else 2)
    out.append(["LTC", k, r(o), r(hi), r(max(lo, 0.0001)), c, g, note, "true"])
    prev = c
out.append(["DOGE", "2013-12-02", "0.00020", "0.00062", "0.00009", "0.00031", "D",
            "launch Fri 6 Dec 2013; first exchange trades; hands off to CoinMarketCap", "true"])
with open("prices_weekly_missing_designed.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["coin","week","open_usd","high_usd","low_usd","close_usd","grade","note","estimate"])
    w.writerows(out)
print(len(out))
