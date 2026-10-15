"""Rebuilds Litecoin's and Dogecoin's weekly network difficulty from block headers (doc 51 v1.4 §14 decision 1, M71.6).

The nBits field of every block header is primary data [A] and licence-free; this tool reads it from public explorer APIs, converts it to
difficulty, takes the last block of each ISO week (the week is labelled by its Monday; the close is Sunday 23:59:59 UTC) and writes
docs/prologue-expansion-content/research-2/ltc_doge_difficulty_headers.csv with columns week,ltc_difficulty,doge_difficulty,source.
It is NOT wired into the game: the market files still read research-2/ltc_doge_weekly.csv (the reconstruction). Standard library only.

  Litecoin:  https://litecoinspace.org/api  (a mempool.space instance: block by timestamp, block by hash with bits and difficulty)
  Dogecoin:  https://api.blockcypher.com/v1/doge/main  (block by height with bits; no lookup by time, so the height is found by
             walking from an estimate; the free tier allows about 200 requests an hour, so a full run takes hours: the tool keeps a
             cache file next to the output and resumes)

Usage:
  python3 -I tools/prologue/headers_difficulty.py --checks     # only the four check weeks (a few dozen requests)
  python3 -I tools/prologue/headers_difficulty.py --all        # every week from 2011-10-24 to 2016-12-26 (resumes from the cache)
  python3 -I tools/prologue/headers_difficulty.py --write      # no requests: writes the CSV from what the cache holds (after a run that was cut short)
"""
import csv, datetime as dt, json, os, sys, time, urllib.request

ROOT = __file__.rsplit('/tools/', 1)[0]
OUT = f'{ROOT}/docs/prologue-expansion-content/research-2/ltc_doge_difficulty_headers.csv'
CACHE = f'{ROOT}/docs/prologue-expansion-content/research-2/.headers_cache.json'
LTC_API = 'https://litecoinspace.org/api'
DOGE_API = 'https://api.blockcypher.com/v1/doge/main'
FIRST_WEEK, LAST_WEEK = dt.date(2011, 10, 24), dt.date(2016, 12, 26)
DOGE_FIRST_WEEK = dt.date(2013, 12, 9)
# the sourced points the rebuild is checked against (doc 57): week, coin, expected difficulty, and how close counts as a match
CHECKS = [(dt.date(2013, 12, 16), 'ltc', 3150, 0.10), (dt.date(2014, 5, 26), 'ltc', 7000, 0.15),
          (dt.date(2014, 5, 26), 'doge', 700, 0.30), (dt.date(2014, 9, 15), 'ltc', 30000, 0.15)]
PAUSE = {'ltc': 0.4, 'doge': 20.0}  # seconds between requests (BlockCypher's free tier is 200 an hour)


def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'g2g-headers-tool/1.0'})
    for attempt in range(6):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read().decode())
        except Exception as e:  # rate limit or a blip: wait and try again, then give up with the exact error
            if attempt == 5: raise RuntimeError(f'{url}: {e}')
            time.sleep(30 * (attempt + 1))


def bits_to_difficulty(bits):
    """nBits (the compact target) to difficulty, as every bitcoin-derived coin's getdifficulty does (scrypt coins use the same shift rule)."""
    shift = (bits >> 24) & 0xff
    d = 0x0000ffff / float(bits & 0x00ffffff)
    while shift < 29: d *= 256.0; shift += 1
    while shift > 29: d /= 256.0; shift -= 1
    return d


def sunday_close(monday):
    return int(dt.datetime(monday.year, monday.month, monday.day, tzinfo=dt.timezone.utc).timestamp()) + 7 * 86400 - 1


def ltc_week(monday):
    ts = sunday_close(monday)
    b = get(f'{LTC_API}/v1/mining/blocks/timestamp/{ts}'); time.sleep(PAUSE['ltc'])
    blk = get(f'{LTC_API}/block/{b["hash"]}'); time.sleep(PAUSE['ltc'])
    return bits_to_difficulty(blk['bits']), f'litecoinspace block {blk["height"]}'


def doge_block(height):
    b = get(f'{DOGE_API}/blocks/{height}'); time.sleep(PAUSE['doge'])
    return b['bits'], int(dt.datetime.fromisoformat(b['time'].replace('Z', '+00:00')).timestamp())


def doge_week(monday, hint):
    """Walk from the height hint to the last block at or before the Sunday close (Dogecoin's blocks come about once a minute)."""
    target = sunday_close(monday)
    h = hint
    for _ in range(8):
        bits, ts = doge_block(h)
        gap = (target - ts) / 60.0
        if -1 < gap < 1.5: return bits_to_difficulty(bits), h, f'blockcypher block {h}'
        h += int(gap)
    return bits_to_difficulty(bits), h, f'blockcypher block {h} (within {abs(target - ts) // 60} min)'


def weeks(first, last):
    d = first
    while d <= last: yield d; d += dt.timedelta(days=7)


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--checks'
    cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
    todo = [] if mode == '--write' else sorted({w for w, _, _, _ in CHECKS}) if mode == '--checks' else list(weeks(FIRST_WEEK, LAST_WEEK))
    doge_hint = 28_000  # Dogecoin's first weeks: about 1,440 blocks a day from 6 Dec 2013 (the first walk corrects it)
    for w in todo:
        key = str(w)
        row = cache.setdefault(key, {})
        if 'ltc' not in row:
            row['ltc'], row['ltc_src'] = ltc_week(w)
        if w >= DOGE_FIRST_WEEK and 'doge' not in row and (mode != '--checks' or any(c[0] == w and c[1] == 'doge' for c in CHECKS)):
            est = doge_hint if doge_hint > 28_000 else int(28_000 + (dt.datetime(w.year, w.month, w.day, tzinfo=dt.timezone.utc) - dt.datetime(2013, 12, 12, tzinfo=dt.timezone.utc)).days * 1440)
            row['doge'], doge_hint, row['doge_src'] = doge_week(w, est)
        json.dump(cache, open(CACHE, 'w'))
    rows = []
    for w in weeks(FIRST_WEEK, LAST_WEEK):
        r = cache.get(str(w))
        if r: rows.append({'week': str(w), 'ltc_difficulty': round(r['ltc'], 4) if 'ltc' in r else '', 'doge_difficulty': round(r['doge'], 4) if 'doge' in r else '',
                           'source': '; '.join(x for x in (r.get('ltc_src'), r.get('doge_src')) if x)})
    with open(OUT, 'w', newline='') as f:
        wr = csv.DictWriter(f, ['week', 'ltc_difficulty', 'doge_difficulty', 'source'], lineterminator='\n'); wr.writeheader(); wr.writerows(rows)
    print(f'wrote {len(rows)} weeks to {OUT}')
    for w, coin, want, tol in CHECKS:
        r = cache.get(str(w), {})
        got = r.get(coin)
        if got is None: print(f'check {w} {coin}: not fetched'); continue
        print(f'check {w} {coin}: {got:,.1f} vs about {want:,} -> {"ok" if abs(got - want) <= tol * want else "OUTSIDE ±" + str(int(tol * 100)) + "%"}')


if __name__ == '__main__':
    main()
