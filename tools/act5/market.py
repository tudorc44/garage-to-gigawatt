"""Act V market files (doc 47): market_v_v1..v4.csv (20 quarters) and market_weekly_v_v1..v4.csv (260 weeks).

Generated, never hand-edited. Inputs: the four Act IV market files (their 2035Q4 rows set the common baseline where
doc 43 / doc 45 give no 2036 value) and the anchors below. Every anchor is labelled in claude/act5-content/README.md.
Usage: python3 -I market.py <dir with market_iv_f*.csv and market_weekly_iv_f1.csv> <out dir>
"""
import csv, math, sys, statistics, datetime
sys.path.insert(0, __file__.rsplit("/", 1)[0])
from futures import QUARTERS, Q, FUTURES, TRIGGER, COMMON_UNTIL, path

SRC, OUT = sys.argv[1], sys.argv[2]
iv = {f: list(csv.DictReader(open(f"{SRC}/market_iv_f{f[-1]}.csv"))) for f in ["f1", "f2", "f3", "f4"]}
IV_COLS = list(iv["f1"][0].keys())


def med35(col):
    vals = [float(iv[f][-1][col]) for f in iv if iv[f][-1][col] != ""]
    return statistics.median(vals) if vals else None


def trend35(col):
    """The column's own 2035 trend: the futures' mean change 2034Q4 -> 2035Q4, per quarter, clamped -3%..+2%."""
    ch = []
    for f in iv:
        a, b = iv[f][-5][col], iv[f][-1][col]
        if a and b and float(a) > 0:
            ch.append((float(b) / float(a)) ** 0.25 - 1)
    g = sum(ch) / len(ch)
    return max(-0.03, min(0.02, g))


def fmt(x):
    if x is None or x == "":
        return ""
    if isinstance(x, str):
        return x
    if x in (0.390625, 0.1953125):
        return repr(x)
    ax = abs(x)
    if ax >= 1000:
        s = str(int(round(x)))
    elif ax >= 100:
        s = f"{x:.1f}"
    elif ax >= 10:
        s = f"{x:.4f}"
    else:
        s = f"{x:.5f}"
    if "." in s:
        s = s.rstrip("0").rstrip(".")
    return s


def common(t, v):
    """Hold the common baseline through 2036Q4 (act quarters 0-3)."""
    return t <= COMMON_UNTIL


T = TRIGGER

# ---------------------------------------------------------------- bitcoin (one path for every future)
BTC0 = 165683.0  # 2035Q4 close, identical in all Act IV futures


def btc_close(t):  # +2% a quarter, Act IV's designed drift continued
    return BTC0 * 1.02 ** (t + 1)


def subsidy(t):  # halvings 2036Q1 (block 1,470,000) and 2040Q1 (1,680,000): doc 45 §Q9
    return 0.1953125 if t >= 16 else 0.390625


def diff_growth(t):  # designed: +0.5%/q in 2036 (the halving squeeze), +1.5%/q 2037-39, 0 in 2040 (the next halving)
    return 0.005 if t <= 3 else (0.0 if t >= 16 else 0.015)


DIFF = []
d = 227.0
for t in range(Q):
    d *= 1 + diff_growth(t)
    DIFF.append(d)


def fee_share(t):  # designed: 2% (2036Q1) -> 5% (2040Q4), doc 40 §D5 (fees 1-2% today; a maturing fee market)
    return 0.02 + 0.03 * t / (Q - 1)


def eh(tera):
    return tera * 1e12 * 2 ** 32 / 600 / 1e18


def hashprice_th(btc, sub, ehs, fee):
    return btc * 144 * sub / (1 - fee) / (ehs * 1e6)


# ---------------------------------------------------------------- future factors (designed; README "Futures")
def f_power(f, t):  # merchant power vs 2036: V1 +25%, V2 +5%, V3 -30% after the trigger, V4 -10% late (doc 43 §6.2)
    if t <= COMMON_UNTIL:
        return 1.0
    if f == "v1":
        return path([(3, 1.0), (19, 1.25)], t)
    if f == "v2":
        return path([(3, 1.0), (19, 1.05)], t)
    if f == "v3":
        return path([(T["v3"] - 1, 1.0), (T["v3"], 0.80), (T["v3"] + 1, 0.70)], t)
    return path([(11, 1.0), (15, 0.90)], t)


CAP0 = med35("pjm_capacity_price_usd_mwday")  # 432.7: the game's cap level in 2036 (median rule)


def capacity(f, t):  # V1 at the cap, lifted 30% after the trigger; V2 -20%; V3 -50%; V4 -25% late (doc 43 §6.2)
    if f == "v1":
        return path([(T["v1"], CAP0), (T["v1"] + 2, CAP0 * 1.3)], t)
    if f == "v2":
        return path([(T["v2"], CAP0), (T["v2"] + 2, CAP0 * 0.8)], t)
    if f == "v3":
        return path([(T["v3"], CAP0), (T["v3"] + 1, CAP0 * 0.75), (T["v3"] + 2, CAP0 * 0.5)], t)
    return path([(11, CAP0), (13, CAP0 * 0.75)], t)


def demand_v(f, t):  # ai_demand_index_v, 2036Q1 = 100 (doc 43 §0.4: V1 145, V2 135, V3 105 then flat [D], V4 125)
    if t <= COMMON_UNTIL:
        return 100 + 1.5 * t
    end = {"v1": 145, "v2": 135, "v4": 125}
    if f == "v3":
        return 105.0
    return path([(3, 104.5), (19, end[f])], t)


def scarcity(f, t):  # doc 43 §0.2 / §0.6; common 1.0 through 2036Q4 (V-B14)
    if f == "v1":
        return path([(3, 1.0), (T["v1"], 1.10), (19, 1.5)], t)
    if f == "v2":
        return path([(3, 1.0), (T["v2"], 1.07), (T["v2"] + 3, 1.05), (19, 1.10)], t)
    if f == "v3":
        return path([(T["v3"], 1.0), (15, 0.75)], t)  # M59.3 (§0.11 lever b): 0.80 → 0.75
    return path([(3, 1.0), (T["v4"], 1.03), (10, 1.0), (11, 0.95), (12, 0.90)], t)


def powered(f, t):  # $/MW: $300K in 2036 [C, doc 45 §Q3]; V1 500K, V2 150K, V3 100K, V4 200K by 2040 (paths designed)
    if f == "v1":
        return path([(3, 300000), (19, 500000)], t)
    if f == "v2":
        return path([(3, 300000), (T["v2"], 320000), (12, 180000), (19, 150000)], t)
    if f == "v3":
        return path([(T["v3"], 300000), (19, 100000)], t)
    return path([(11, 300000), (19, 200000)], t)


def queue_premium(f, t):  # $/kW: 100 in 2036; V1 300; V2, V3 25 [doc 45 §Q3]; V4 60 (designed)
    if f == "v1":
        return path([(3, 100), (19, 300)], t)
    if f == "v2":
        return path([(3, 100), (T["v2"], 110), (12, 25)], t)
    if f == "v3":
        return path([(T["v3"], 100), (11, 25)], t)
    return path([(11, 100), (19, 60)], t)


WAITS = {  # quarters; 2036: PJM 20, ERCOT 12, other 16 (doc 45 §Q3); 2040 ends designed from doc 43 §6.2's directions
    "pjm": {"v1": 24, "v2": 17, "v3": 12, "v4": 19, "start": 20},
    "ercot": {"v1": 14, "v2": 10, "v3": 8, "v4": 11, "start": 12},
    "other": {"v1": 19, "v2": 14, "v3": 10, "v4": 15, "start": 16},
}


def wait(region, f, t):
    w = WAITS[region]
    s, e = w["start"], w[f]
    if f == "v1":
        v = path([(3, s), (19, e)], t)
    elif f == "v2":  # firm waits ease ~15% once the fast lane drains the firm queue
        v = path([(T["v2"], s), (T["v2"] + 4, e)], t)
    elif f == "v3":  # speculative requests withdraw from the trigger
        v = path([(T["v3"], s), (19, e)], t)
    else:
        v = path([(11, s), (19, e)], t)
    return float(math.floor(v + 0.5))


def fast_lane(f, t):  # V2 only, from the trigger: 4-8 quarters (doc 45 §Q3); the expected wait, tightening as rules bed in
    if f != "v2" or t < T["v2"]:
        return None
    return float(max(4, 7 - (t - T["v2"]) // 2))


def upgrade(region, f, t):  # medians drawn at study: $150 PJM/MISO, $100 ERCOT/SPP (doc 45 §Q3); drift designed
    base = 150 if region == "pjm" else 100
    end = {"v1": 1.30, "v2": 0.95, "v3": 0.80, "v4": 1.0}[f]
    if f == "v3":
        return base * path([(T["v3"], 1.0), (19, end)], t)
    return base * path([(3, 1.0), (19, end)], t)


def withdrawal(f, t):  # rivals' positions withdraw 15%/yr (V3 30%) (doc 45 §Q3); V1 10, V2 20 after the trigger (designed)
    tgt = {"v1": 10, "v2": 20, "v3": 30, "v4": 15}[f]
    return path([(T[f], 15), (T[f] + 2, tgt)], t)


def merch_mult(f, t):  # 7.5x; V1 8.5x and V3 6x from the trigger (doc 43 §0.4)
    if f == "v1" and t >= T["v1"]:
        return 8.5
    if f == "v3" and t >= T["v3"]:
        return 6.0
    return 7.5


def infra_bid(f, t):  # 1.0 in 2036; 0.95-1.15 band; V3 0.85-1.00 after the trigger (doc 43 §0.4); paths designed
    if f == "v1":
        return path([(T["v1"] - 1, 1.0), (T["v1"] + 3, 1.15)], t)
    if f == "v2":
        return path([(T["v2"], 1.0), (19, 1.03)], t)
    if f == "v3":
        return path([(T["v3"] - 1, 1.0), (T["v3"] + 3, 0.88)], t)
    return path([(11, 1.0), (13, 0.95)], t)


def spread10(f, t):  # $30 in 2036; V1 $45, V3 $20 (doc 43 §0.4 [D]); V2 $35 (flexibility paid, designed); V4 $30
    if f == "v1":
        return path([(T["v1"] - 1, 30), (T["v1"] + 3, 45)], t)
    if f == "v2":
        return path([(T["v2"] - 1, 30), (T["v2"] + 3, 35)], t)
    if f == "v3":
        return path([(T["v3"] - 1, 30), (T["v3"] + 2, 20)], t)
    return 30.0


def launch(f, t):  # $300/kg (2036, doc 43 §0.4); V1, V2 250; V3 280; V4 below 200 at its trigger, 100 by 2040
    if f == "v4":
        return path([(3, 300), (T["v4"], 200), (19, 100)], t)
    return path([(3, 300), (19, {"v1": 250, "v2": 250, "v3": 280}[f])], t)


def lin_end(f, t, start, ends, from_t=3):
    return path([(from_t, start), (19, ends[f])], t)


# ---------------------------------------------------------------- build the quarterly files
NEW_COLS = [
    "ai_demand_index_v", "scarcity_index", "powered_value_usd_mw", "queue_premium_usd_kw",
    "grid_wait_q_pjm", "grid_wait_q_ercot", "grid_wait_q_other", "fast_lane_q", "fast_lane_curtail_h_yr",
    "upgrade_usd_kw_median_pjm", "upgrade_usd_kw_median_ercot", "queue_withdrawal_pct_yr",
    "plant_mult_contracted", "plant_mult_merchant", "infra_bid_index", "peak_spread_10h_usd_mwh",
    "capacity_rating_nuclear", "capacity_rating_cc", "capacity_rating_ct", "capacity_rating_storage_8h",
    "capacity_rating_storage_10h", "flex_capacity_rating", "lunar_value_index", "btc_fee_share_pct",
    "gas_usd_mmbtu", "gen38_t_mw",
]
COLS = [c for c in IV_COLS if c != "estimate"] + NEW_COLS + ["estimate"]

FLAT = {  # carried columns held at the common baseline in every future (scarcity-neutral; the engine applies
    # scarcity_index to rents and the ground multiple, doc 43 §0.6-0.7), or levels with no Act V meaning
    "ai_infra_ev_ebitda_mult", "ev_per_mw_ai_announced_usd_m", "ev_per_mw_ai_stabilized_usd_m",
    "ev_per_mw_mining_usd_m", "mining_ev_ebitda_mult", "sofr_pct",
    "renewal_shell_index_low", "renewal_shell_index_high", "renewal_h100_gpu_index_vs_2025q4",
    "renewal_b200_gpu_index_vs_2025q4", "rfp_new_lease_index_low", "rfp_new_lease_index_high",
    "renewal_offer_term_years_shell", "renewal_offer_term_years_gpu", "ai_demand_index_0_100",
    "lunar_delivery_usd_kg", "lunar_llo_usd_kg", "landing_success_pct", "lunar_offtake_surface_usd_kg",
    "lunar_offtake_llo_usd_kg", "lunar_value_usd_t", "gen33_t_mw", "gen35_t_mw", "sso_closed",
}
GPU_RENT = [c for c in IV_COLS if c.startswith("gpu_") and c.endswith("_usd_hr")]
PURCHASE = ["h100_unit_purchase_usd", "h100_hgx8_system_usd", "h200_unit_purchase_usd", "b200_unit_purchase_usd",
            "gb200_nvl72_rack_usd", "rubin_unit_purchase_usd", "rubin_nvl144_rack_usd", "rubin_ultra_nvl576_rack_usd"]
CAPEX = ["capex_hosting_usd_mw", "capex_retrofit_shell_usd_mw", "capex_greenfield_shell_usd_mw",
         "capex_fullstack_incremental_usd_mw", "capex_retrofit_density_mid_to_top_usd_mw"]
POWER = [c for c in IV_COLS if c.startswith("power_usd_kwh_")]


def capex_factor(f, t):  # designed: V1 +10% by 2040 (transformers, labour), V3 -5%, V4 -3% late, V2 flat
    if f == "v1":
        return path([(T["v1"], 1.0), (19, 1.10)], t)
    if f == "v3":
        return path([(T["v3"], 1.0), (19, 0.95)], t)
    if f == "v4":
        return path([(11, 1.0), (19, 0.97)], t)
    return 1.0


def credit_add(f, t):  # bp added to HY and DDTL spreads (designed)
    if f == "v3":
        return path([(T["v3"], 0), (T["v3"] + 2, 75)], t)
    if f == "v1":
        return path([(T["v1"], 0), (T["v1"] + 2, -20)], t)
    if f == "v4":
        return path([(12, 0), (14, 25)], t)
    return 0.0


def default_mult(f, t):
    if f == "v3":
        return path([(T["v3"], 1.0), (T["v3"] + 2, 1.5)], t)
    if f == "v1":
        return path([(T["v1"], 1.0), (T["v1"] + 2, 0.9)], t)
    if f == "v4":
        return path([(12, 1.0), (14, 1.1)], t)
    return 1.0


def walk_mult(f, t):
    if f == "v3":
        return path([(T["v3"], 1.0), (T["v3"] + 2, 1.6)], t)
    if f == "v1":
        return path([(T["v1"], 1.0), (T["v1"] + 2, 0.6)], t)
    if f == "v4":
        return path([(12, 1.0), (14, 1.2)], t)
    return 1.0


def value(col, f, t):
    if col == "quarter":
        return QUARTERS[t]
    if col == "future":
        return f
    if col == "estimate":
        return "True"
    m = med35(col) if col in IV_COLS and col not in ("quarter", "future", "estimate") else None
    # bitcoin
    if col == "btc_usd_close":
        return round(btc_close(t))
    if col == "btc_difficulty_T":
        return DIFF[t]
    if col == "btc_hashrate_EHs":
        return eh(DIFF[t])
    if col == "btc_block_subsidy":
        return subsidy(t)
    if col == "btc_hashprice_usd_ph_day":
        return hashprice_th(btc_close(t), subsidy(t), eh(DIFF[t]), fee_share(t)) * 1000
    if col == "btc_fee_share_pct":
        return fee_share(t) * 100
    if col in GPU_RENT:
        return m  # flat (blank stays blank): spot rents move by the engine's ground factor (doc 43 §0.7)
    if col in PURCHASE:
        return m * (1 + trend35(col)) ** t
    if col in CAPEX:
        return m * (1 + trend35(col)) ** t * capex_factor(f, t)
    if col in FLAT:
        return m
    if col in ("hy_spread_bps", "ddtl_spread_bps"):
        return m + credit_add(f, t)
    if col == "cap_rate_hyperscale_pct":
        add = {"v1": path([(T["v1"], 0), (T["v1"] + 2, -0.25)], t), "v3": path([(T["v3"], 0), (T["v3"] + 2, 0.5)], t)}
        return m + add.get(f, 0.0)
    if col in POWER:
        return m * f_power(f, t)
    if col == "pjm_capacity_price_usd_mwday":
        return capacity(f, t)
    if col == "hyperscaler_capex_usd_bn_q":
        k = demand_v(f, t) / 100
        if f == "v3":
            k *= path([(T["v3"], 1.0), (T["v3"] + 4, 0.85)], t)
        return m * k
    if col == "newest_gen_lead_time_weeks":
        return {"v1": path([(T["v1"], 14), (T["v1"] + 2, 20)], t), "v3": path([(T["v3"], 14), (T["v3"] + 2, 8)], t)}.get(f, 14.0)
    if col == "nuclear_ppa_usd_mwh":
        if f == "v1":
            return m * path([(3, 1.0), (19, 1.15)], t)
        if f == "v2":
            return m * path([(3, 1.0), (19, 0.97)], t)
        if f == "v3":
            return m * path([(T["v3"], 1.0), (T["v3"] + 3, 0.80)], t)
        return m * path([(11, 1.0), (15, 0.95)], t)
    if col.startswith("tenant_default_prob"):
        return m * default_mult(f, t)
    if col.startswith("tenant_walk_prob"):
        return m * walk_mult(f, t)
    if col == "launch_usd_kg_leo":
        return launch(f, t)
    if col == "launch_slots_t_q":
        if f == "v4":
            return path([(3, 1200), (T["v4"], 4800), (19, 8000)], t)
        return lin_end(f, t, 1200, {"v1": 2000, "v2": 2000, "v3": 1600})
    if col == "sat_build_usd_kg":
        return lin_end(f, t, 600, {"v1": 550, "v2": 550, "v3": 580, "v4": 400})
    if col == "insurance_capacity_usd_m":
        return lin_end(f, t, 600, {"v1": 750, "v2": 750, "v3": 750, "v4": 1000})
    if col.startswith("insurance_rate"):
        return m * (path([(T["v4"], 1.0), (19, 0.8)], t) if f == "v4" else 1.0)
    if col == "congestion_sso":
        return lin_end(f, t, 75, {"v1": 80, "v2": 80, "v3": 80, "v4": 92})
    if col == "congestion_high_leo":
        return lin_end(f, t, 42.5, {"v1": 47, "v2": 47, "v3": 47, "v4": 60})
    if col == "congestion_high_orbit":
        return lin_end(f, t, 12.5, {"v1": 14, "v2": 14, "v3": 14, "v4": 18})
    if col == "orbital_shell_rent_usd_mw_yr":
        return lin_end(f, t, m, {"v1": 3600000, "v2": 3000000, "v3": 2600000, "v4": 3300000})
    if col == "orbital_gpu_usd_hr":
        return lin_end(f, t, m, {"v1": 2.1, "v2": 1.7, "v3": 1.5, "v4": 2.0})
    if col == "sovereign_premium_pct":
        return lin_end(f, t, m, {"v1": 17.5, "v2": 17.5, "v3": 17.5, "v4": 20})
    if col == "grid_wait_q":
        return wait("other", f, t)
    if col == "gas_wait_q":
        return float(math.floor(lin_end(f, t, 8, {"v1": 10, "v2": 8, "v3": 6, "v4": 7}) + 0.5))
    if col == "space_ev_ebitda_mult":
        if f == "v4":
            return path([(5, m), (19, 20)], t)
        return lin_end(f, t, m, {"v1": 9, "v2": 7.5, "v3": 6})
    # ---- new Act V columns
    if col == "ai_demand_index_v":
        return demand_v(f, t)
    if col == "scarcity_index":
        return scarcity(f, t)
    if col == "powered_value_usd_mw":
        return powered(f, t)
    if col == "queue_premium_usd_kw":
        return queue_premium(f, t)
    if col.startswith("grid_wait_q_"):
        return wait(col.split("_")[-1], f, t)
    if col == "fast_lane_q":
        return fast_lane(f, t)
    if col == "fast_lane_curtail_h_yr":
        return 180.0 if fast_lane(f, t) is not None else None
    if col == "upgrade_usd_kw_median_pjm":
        return upgrade("pjm", f, t)
    if col == "upgrade_usd_kw_median_ercot":
        return upgrade("ercot", f, t)
    if col == "queue_withdrawal_pct_yr":
        return withdrawal(f, t)
    if col == "plant_mult_contracted":
        return 10.0
    if col == "plant_mult_merchant":
        return merch_mult(f, t)
    if col == "infra_bid_index":
        return infra_bid(f, t)
    if col == "peak_spread_10h_usd_mwh":
        return spread10(f, t)
    if col == "capacity_rating_nuclear":
        return 0.95
    if col == "capacity_rating_cc":  # doc 43 §0.9 item 6: flat at PJM's sourced value (the ramp was a misreading)
        return 0.78
    if col == "capacity_rating_ct":
        return 0.70
    if col == "capacity_rating_storage_8h":
        return 0.62
    if col == "capacity_rating_storage_10h":
        return 0.72
    if col == "flex_capacity_rating":  # doc 43 §0.9 item 8: V2 pays enrolled curtailable MW from its trigger [D]
        return 0.5 if f == "v2" and t >= TRIGGER["v2"] else None  # (M63.2, doc 43 §0.19 item 2: M61.3's 0.75 reverted)
    if col == "lunar_value_index":
        return lin_end(f, t, 1.0, {"v1": 1.0, "v2": 0.95, "v3": 0.90, "v4": 1.10})
    if col == "gas_usd_mmbtu":  # AEO2025 Henry Hub ref ($2.19 2024 -> $4.80 2050, 2024$) interpolated + $0.35 basis
        base = 3.75 + 0.40 * t / 19
        k = {"v1": path([(T["v1"], 1.0), (19, 1.10)], t), "v3": path([(T["v3"], 1.0), (T["v3"] + 4, 0.90)], t)}.get(f, 1.0)
        return base * k
    if col == "gen38_t_mw":
        ship = {"v1": (11, 9.0), "v2": (11, 9.0), "v3": (13, 10.0), "v4": (T["v4"], 7.0)}[f]
        return ship[1] if t >= ship[0] else None
    raise KeyError(col)


def build():
    out = {}
    for f in FUTURES:
        rows = []
        for t in range(Q):
            rows.append({c: fmt(value(c, f, t)) for c in COLS})
        out[f] = rows
        with open(f"{OUT}/market_v_{f}.csv", "w", newline="") as fh:
            w = csv.DictWriter(fh, fieldnames=COLS, lineterminator="\n")
            w.writeheader()
            w.writerows(rows)
    return out


# ---------------------------------------------------------------- weekly files
WK = list(csv.DictReader(open(f"{SRC}/market_weekly_iv_f1.csv")))
WK_COLS = [c for c in WK[0].keys() if c not in ("future", "estimate")]
WK_GPU = [c for c in WK_COLS if c.startswith("gpu_")]
ASIC = [c for c in WK_COLS if c.startswith("asic_")]
WCOLS = WK_COLS + POWER + ["future", "estimate"]
START = datetime.date(2036, 1, 7)  # the first Monday of 2036; 13 Mondays a quarter, as Act IV


def wiggle(col_i, k):
    """Designed weekly noise for power: depends only on the column and week number (so 2036 is identical across the
    futures) and is 0 at each quarter's close."""
    frac = (k + 1) / 13
    return 0.03 * math.sin(frac * 2 * math.pi) * math.cos(1.7 * col_i + 0.9 * k)


def build_weekly(quarterly):
    last = WK[-1]
    for f in FUTURES:
        rows = []
        prev_btc = BTC0
        prev_pw = {c: float(quarterly[f][0][c]) for c in POWER}
        asic = {c: float(last[c]) for c in ASIC}
        n = 0
        for t in range(Q):
            qrow = quarterly[f][t]
            close = btc_close(t)
            for c in ASIC:
                asic[c] *= 0.97  # -3%/q, Act IV's designed ASIC drift continued
            for k in range(13):
                frac = (k + 1) / 13
                btc = close if k == 12 else prev_btc * (close / prev_btc) ** frac * (1 + 0.02 * math.sin(frac * 2 * math.pi))
                fee = fee_share(t)
                th = hashprice_th(btc, subsidy(t), eh(DIFF[t]), fee)
                r = {
                    "week": (START + datetime.timedelta(days=7 * n)).isoformat(),
                    "quarter": QUARTERS[t],
                    "btc_usd": fmt(round(btc * 100) / 100 if k < 12 else round(btc)),
                    "btc_difficulty_T": fmt(DIFF[t]),
                    "btc_hashrate_EHs": fmt(eh(DIFF[t])),
                    "btc_block_subsidy": fmt(subsidy(t)),
                    "btc_fee_share": fmt(fee),
                    "btc_hashprice_usd_th_day": fmt(th),
                    "btc_hashprice_usd_ph_day": qrow["btc_hashprice_usd_ph_day"] if k == 12 else fmt(th * 1000),
                }
                for c in ASIC:
                    r[c] = fmt(asic[c])
                for c in WK_GPU:
                    r[c] = qrow[c]
                for i, c in enumerate(POWER):
                    tgt = float(qrow[c])
                    if k == 12:
                        r[c] = qrow[c]
                    else:
                        base = prev_pw[c] + (tgt - prev_pw[c]) * frac
                        r[c] = fmt(base * (1 + wiggle(i, k)))
                r["future"] = f
                r["estimate"] = "True"
                rows.append(r)
                n += 1
            prev_btc = close
            prev_pw = {c: float(qrow[c]) for c in POWER}
        with open(f"{OUT}/market_weekly_v_{f}.csv", "w", newline="") as fh:
            w = csv.DictWriter(fh, fieldnames=WCOLS, lineterminator="\n")
            w.writeheader()
            w.writerows(rows)


if __name__ == "__main__":
    qd = build()
    build_weekly(qd)
    print("columns", len(COLS), "weekly columns", len(WCOLS))
