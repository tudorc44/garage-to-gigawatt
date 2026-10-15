"""Rebuilds Litecoin's and Dogecoin's weekly network difficulty from block headers (doc 51 v1.4 §14 decision 1, M71.6; v1.5 §16 decision 7, M72.1).

The nBits field of every block header is primary data [A] and licence-free; this tool reads it from public explorer APIs, converts it to
difficulty, takes the last block of each ISO week (the week is labelled by its Monday; the close is Sunday 23:59:59 UTC) and writes
docs/prologue-expansion-content/research-2/ltc_doge_difficulty_headers.csv with columns week,ltc_difficulty,doge_difficulty,source.
M72.3 reads that file in tools/prologue/gen_alts.py. Standard library only.

  Litecoin:  https://litecoinspace.org/api  (a mempool.space instance: block by timestamp, block by hash with bits and difficulty)
  Dogecoin:  https://api.blockcypher.com/v1/doge/main  (block by height with bits; no lookup by time, so the height is found by
             walking from an estimate; the free tier allows about 200 requests an hour, with no API key)

It is slow on purpose and resumes (doc 51 v1.5 §16 decision 7): a fixed pause between calls (PAUSE_S, 1 s), exponential backoff on
HTTP 429 (30 s, doubling, capped at 15 min; once a wait at the cap fails too, this run stops cleanly), and a cache file next to the
output (git-ignored) that holds every finished week and every Dogecoin block already read, so the next run starts where this one
stopped and never asks for a block twice. Run it again after each clean stop.

Usage:
  python3 -I tools/prologue/headers_difficulty.py --checks     # only the four check weeks (a few dozen requests)
  python3 -I tools/prologue/headers_difficulty.py --all        # every week from 2011-10-24 to 2016-12-26 (resumes from the cache)
  python3 -I tools/prologue/headers_difficulty.py --write      # no requests: writes the CSV from what the cache holds
"""
import csv, datetime as dt, json, os, sys, time, urllib.error, urllib.request

ROOT = __file__.rsplit('/tools/', 1)[0]
OUT = f'{ROOT}/docs/prologue-expansion-content/research-2/ltc_doge_difficulty_headers.csv'
CACHE = f'{ROOT}/docs/prologue-expansion-content/research-2/.headers_cache.json'
LTC_API = 'https://litecoinspace.org/api'
DOGE_API = 'https://api.blockcypher.com/v1/doge/main'
FIRST_WEEK, LAST_WEEK = dt.date(2011, 10, 24), dt.date(2016, 12, 26)
DOGE_FIRST_WEEK = dt.date(2013, 12, 2)  # Dogecoin's first block is 6 Dec 2013; the first week with blocks closes 8 Dec
DOGE_GENESIS = int(dt.datetime(2013, 12, 6, tzinfo=dt.timezone.utc).timestamp())
# the sourced points the rebuild is checked against (doc 57; the 2014-05-26 Litecoin value is the headers' own, doc 51 v1.5 §16 decision 3):
# week, coin, expected difficulty, and how close counts as a match
CHECKS = [(dt.date(2013, 12, 16), 'ltc', 3150, 0.10), (dt.date(2014, 5, 26), 'ltc', 8900, 0.15),
          (dt.date(2014, 5, 26), 'doge', 700, 0.30), (dt.date(2014, 9, 15), 'ltc', 30000, 0.15)]
PAUSE_S = 1.0           # seconds between any two calls
BACKOFF_START_S, BACKOFF_CAP_S = 30.0, 900.0


class StopRun(Exception):
    """The rate limit would not lift within the backoff cap: this run ends cleanly, the cache keeps everything read."""


def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'g2g-headers-tool/1.0'})
    wait = BACKOFF_START_S
    while True:
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                body = json.loads(r.read().decode())
            time.sleep(PAUSE_S)
            return body
        except urllib.error.HTTPError as e:
            if e.code != 429: raise RuntimeError(f'{url}: {e}')
            if wait > BACKOFF_CAP_S:
                raise StopRun(f'{url}: HTTP Error 429: Too Many Requests (still limited after waiting {int(BACKOFF_CAP_S)} s)')
            print(f'429 from {url}; waiting {int(wait)} s', flush=True)
            time.sleep(wait)
            wait *= 2
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:  # a network blip: wait a little and try again, a few times
            if wait > 4 * BACKOFF_START_S: raise RuntimeError(f'{url}: {e}')
            time.sleep(wait)
            wait *= 2


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
    b = get(f'{LTC_API}/v1/mining/blocks/timestamp/{ts}')
    blk = get(f'{LTC_API}/block/{b["hash"]}')
    return bits_to_difficulty(blk['bits']), f'litecoinspace block {blk["height"]}'


def doge_block(blocks, height):
    """A Dogecoin block's (bits, time), from the cache when it has been read, else from BlockCypher (and cached)."""
    key = str(height)
    if key not in blocks:
        b = get(f'{DOGE_API}/blocks/{height}')
        blocks[key] = [b['bits'], int(dt.datetime.fromisoformat(b['time'].replace('Z', '+00:00')).timestamp())]
    return blocks[key]


def doge_week(blocks, monday, hint):
    """Walk from the height hint to the last block at or before the Sunday close (Dogecoin's blocks come about once a minute)."""
    target = sunday_close(monday)
    h = max(1, hint)
    for _ in range(10):
        bits, ts = doge_block(blocks, h)
        gap = (target - ts) / 60.0
        if -1 < gap < 1.5: return bits_to_difficulty(bits), h, f'blockcypher block {h}'
        h = max(1, h + int(gap))
    return bits_to_difficulty(bits), h, f'blockcypher block {h} (within {abs(target - ts) // 60} min)'


def weeks(first, last):
    d = first
    while d <= last: yield d; d += dt.timedelta(days=7)


def save(cache):
    tmp = CACHE + '.tmp'
    json.dump(cache, open(tmp, 'w'))
    os.replace(tmp, CACHE)


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--checks'
    cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
    blocks = cache.setdefault('doge_blocks', {})
    weeks_cache = cache.setdefault('weeks', {})
    for k in [k for k in cache if k[:2] == '20']:  # (the first M71 run kept its weeks at the top level: move them)
        weeks_cache[k] = cache.pop(k)
    todo = [] if mode == '--write' else sorted({w for w, _, _, _ in CHECKS}) if mode == '--checks' else list(weeks(FIRST_WEEK, LAST_WEEK))
    stopped = None
    try:
        for w in todo:
            row = weeks_cache.setdefault(str(w), {})
            if 'ltc' not in row:
                row['ltc'], row['ltc_src'] = ltc_week(w)
            if w >= DOGE_FIRST_WEEK and 'doge' not in row and (mode != '--checks' or any(c[0] == w and c[1] == 'doge' for c in CHECKS)):
                # the estimate: the last finished week's block plus a week of blocks, else the launch plus the minutes since it
                done = [(k, v) for k, v in sorted(weeks_cache.items()) if 'doge' in v and 'doge_h' in v and k < str(w)]
                est = done[-1][1]['doge_h'] + 7 * 1440 if done else int((sunday_close(w) - DOGE_GENESIS) / 60)
                row['doge'], row['doge_h'], row['doge_src'] = doge_week(blocks, w, est)
            save(cache)
    except StopRun as e:
        stopped = str(e)
    save(cache)
    rows = []
    for w in weeks(FIRST_WEEK, LAST_WEEK):
        r = weeks_cache.get(str(w))
        if r: rows.append({'week': str(w), 'ltc_difficulty': round(r['ltc'], 4) if 'ltc' in r else '', 'doge_difficulty': round(r['doge'], 4) if 'doge' in r else '',
                           'source': '; '.join(x for x in (r.get('ltc_src'), r.get('doge_src')) if x)})
    with open(OUT, 'w', newline='') as f:
        wr = csv.DictWriter(f, ['week', 'ltc_difficulty', 'doge_difficulty', 'source'], lineterminator='\n'); wr.writeheader(); wr.writerows(rows)
    ltc_n = sum(1 for r in rows if r['ltc_difficulty'] != '')
    doge_n = sum(1 for r in rows if r['doge_difficulty'] != '')
    ltc_all = sum(1 for _ in weeks(FIRST_WEEK, LAST_WEEK))
    doge_all = sum(1 for _ in weeks(DOGE_FIRST_WEEK, LAST_WEEK))
    print(f'wrote {len(rows)} weeks to {OUT}: Litecoin {ltc_n}/{ltc_all}, Dogecoin {doge_n}/{doge_all}')
    for w, coin, want, tol in CHECKS:
        got = weeks_cache.get(str(w), {}).get(coin)
        if got is None: print(f'check {w} {coin}: not fetched'); continue
        print(f'check {w} {coin}: {got:,.1f} vs about {want:,} -> {"ok" if abs(got - want) <= tol * want else "OUTSIDE ±" + str(int(tol * 100)) + "%"}')
    if stopped:
        print(f'STOPPED CLEANLY: {stopped}. Run it again to resume.')
        sys.exit(3)
    complete = ltc_n == ltc_all and doge_n == doge_all
    if mode == '--all': print('COMPLETE' if complete else 'INCOMPLETE')
    sys.exit(0)


if __name__ == '__main__':
    main()
