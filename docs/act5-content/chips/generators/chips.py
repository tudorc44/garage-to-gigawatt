"""Doc 49: the new-chips content (claude/act5-content/chips/). Generated, never hand-edited.
Usage: python3 -I chips.py <dir with market_v_v1.csv (doc 47)> <out dir>
Writes venture_accelerator.json, gpus_v.json, market_v_chips_v1..v4.csv, events_chips.json, text_chips.en.json, and
prints the calibration of the venture's draw (P(volume by 2038Q4) and the outcome shares)."""
import csv, json, math, random, statistics, sys

SRC, OUT = sys.argv[1], sys.argv[2]
QUARTERS = [f"{y}Q{q}" for y in range(2036, 2041) for q in range(1, 5)]
FUT = ["v1", "v2", "v3", "v4"]
TRIGGER = {"v1": 7, "v2": 8, "v3": 7, "v4": 9}  # doc 47
m47 = list(csv.DictReader(open(f"{SRC}/market_v_v1.csv")))


def path(anchors, t):
    anchors = sorted(anchors)
    if t <= anchors[0][0]:
        return anchors[0][1]
    for (t0, v0), (t1, v1) in zip(anchors, anchors[1:]):
        if t0 <= t <= t1:
            return v0 + (v1 - v0) * (t - t0) / (t1 - t0)
    return anchors[-1][1]


def fmt(x):
    if x is None:
        return ""
    ax = abs(x)
    s = str(int(round(x))) if ax >= 1000 else (f"{x:.1f}" if ax >= 100 else (f"{x:.4f}" if ax >= 10 else f"{x:.5f}"))
    return s.rstrip("0").rstrip(".") if "." in s else s


# ------------------------------------------------------------------ the two generations (Part A Q3, Q6)
RU = {"hyper": float(m47[0]["gpu_rubin_ultra_hyperscaler_usd_hr"]), "neo": float(m47[0]["gpu_rubin_ultra_neocloud_usd_hr"]),
      "rack": [float(r["rubin_ultra_nvl576_rack_usd"]) for r in m47]}
H100 = {"hyper": float(m47[0]["gpu_h100_hyperscaler_usd_hr"]), "spot": float(m47[0]["gpu_h100_spot_usd_hr"]),
        "yr1": float(m47[0]["gpu_h100_1yr_contract_usd_hr"])}
RU_GPUS_MW, RU_RACK_KW = 1050, 600
GEN_GPUS_MW, GEN_RACK_KW = 1150, 600
GEN_GAIN = 1.25      # revenue per MW at launch vs the 2036 newest generation (perf/W 1.4x per 2-year step after 2030, some passed to buyers)
ACCEL_GAIN = 1.20    # the accelerator's rent per GPU vs Gen 2037 (measured perf/W edge 1.0-1.9x; recommended 1.3x, priced to win)
RACK_TREND = (RU["rack"][-1] / RU["rack"][0]) ** (1 / 19)  # Rubin Ultra rack's own decline per quarter in doc 47's files
ru_unit0 = RU["rack"][0] / (RU_RACK_KW / 1000 * RU_GPUS_MW)
GEN_UNIT_2037 = ru_unit0 * GEN_GAIN * RU_GPUS_MW / GEN_GPUS_MW * RACK_TREND ** 4
GEN_FROM = 4  # 2037Q1
gen_hyper = RU["hyper"] * RU_GPUS_MW / GEN_GPUS_MW * GEN_GAIN
RATIO = {"neo": RU["neo"] / RU["hyper"], "spot": H100["spot"] / H100["hyper"], "yr1": H100["yr1"] / H100["hyper"]}
GPUS_PER_RACK = GEN_RACK_KW / 1000 * GEN_GPUS_MW

UNITS_BASE = 8000  # the developer's units a quarter at full ramp [D]: ~$1.0B a year of revenue (Cerebras 2025: $510M [A])


def units_mult(f, t):
    if t <= 3:
        return 1.0
    if f == "v1":
        return path([(3, 1.0), (19, 1.10)], t)
    if f == "v3":
        return path([(TRIGGER["v3"], 1.0), (TRIGGER["v3"] + 4, 0.60)], t)
    if f == "v4":
        return path([(11, 1.0), (15, 0.85)], t)
    return 1.0


def chip_mult(f, t):  # the chip-company EV/EBITDA: 20x [C/D]; V1/V2 22x by 2040, V3 15x from its trigger
    if f in ("v1", "v2"):
        return path([(3, 20), (19, 22)], t)
    if f == "v3":
        return path([(TRIGGER["v3"], 20), (TRIGGER["v3"] + 2, 15)], t)
    return 20.0


MATURE_EBITDA_SHARE = 0.25


def market():
    cols = ["quarter", "future",
            "gen2037_hyperscaler_usd_hr", "gen2037_neocloud_usd_hr", "gen2037_spot_usd_hr", "gen2037_1yr_contract_usd_hr",
            "gen2037_unit_purchase_usd", "gen2037_rack_usd",
            "accel_hyperscaler_usd_hr", "accel_neocloud_usd_hr", "accel_spot_usd_hr", "accel_1yr_contract_usd_hr",
            "accel_unit_purchase_usd", "accel_rack_usd", "accel_units_full_ramp_q", "accel_margin_usd_unit_mature",
            "chip_ev_ebitda_mult", "estimate"]
    for f in FUT:
        rows = []
        for t, q in enumerate(QUARTERS):
            gen_unit = GEN_UNIT_2037 * RACK_TREND ** (t - GEN_FROM)
            acc_unit = ACCEL_GAIN * GEN_UNIT_2037 * RACK_TREND ** max(0, t - GEN_FROM)
            live = t >= GEN_FROM
            r = {"quarter": q, "future": f,
                 "gen2037_hyperscaler_usd_hr": gen_hyper if live else None,
                 "gen2037_neocloud_usd_hr": gen_hyper * RATIO["neo"] if live else None,
                 "gen2037_spot_usd_hr": gen_hyper * RATIO["spot"] if live else None,
                 "gen2037_1yr_contract_usd_hr": gen_hyper * RATIO["yr1"] if live else None,
                 "gen2037_unit_purchase_usd": gen_unit if live else None,
                 "gen2037_rack_usd": gen_unit * GPUS_PER_RACK if live else None,
                 "accel_hyperscaler_usd_hr": gen_hyper * ACCEL_GAIN,
                 "accel_neocloud_usd_hr": gen_hyper * ACCEL_GAIN * RATIO["neo"],
                 "accel_spot_usd_hr": gen_hyper * ACCEL_GAIN * RATIO["spot"],
                 "accel_1yr_contract_usd_hr": gen_hyper * ACCEL_GAIN * RATIO["yr1"],
                 "accel_unit_purchase_usd": acc_unit,
                 "accel_rack_usd": acc_unit * GPUS_PER_RACK,
                 "accel_units_full_ramp_q": UNITS_BASE * units_mult(f, t),
                 "accel_margin_usd_unit_mature": acc_unit * MATURE_EBITDA_SHARE,
                 "chip_ev_ebitda_mult": chip_mult(f, t),
                 "estimate": "True"}
            rows.append({k: (v if isinstance(v, str) else fmt(v)) for k, v in r.items()})
        with open(f"{OUT}/market_v_chips_{f}.csv", "w", newline="") as fh:
            w = csv.DictWriter(fh, fieldnames=cols, lineterminator="\n")
            w.writeheader()
            w.writerows(rows)
    return cols


# ------------------------------------------------------------------ the venture (Part A Q1, Q2, Q4, Q5, Q6)
DRAW = {"slip": {"median": 1.30, "sigma": 0.30, "floor": 0.9, "cap": 2.5},
        "respin": {"chance": 0.5, "second_chance": 0.2, "delay_q": [1, 2]},
        "hazard_per_year_before_volume": {"cancel": 0.105, "acquired_gain": 0.055, "acquired_loss": 0.09}}
PITCH_Q = {"tape_out": 8, "first_silicon": 1, "qualification": 3, "volume": 2}  # quarters per phase from 2031Q1


def simulate(N=20000, seed=11):
    R = random.Random(seed)
    out = {"built": 0, "acquired_gain": 0, "acquired_loss": 0, "cancelled": 0, "still_building": 0}
    vq, respins = [], 0
    h = DRAW["hazard_per_year_before_volume"]
    for _ in range(N):
        s = DRAW["slip"]
        k = min(s["cap"], max(s["floor"], math.exp(math.log(s["median"]) + s["sigma"] * R.gauss(0, 1))))
        tape = round(PITCH_Q["tape_out"] * k)
        sil = tape + PITCH_Q["first_silicon"]
        res = 0
        if R.random() < DRAW["respin"]["chance"]:
            respins += 1
            res += R.choice([1, 2])
            if R.random() < DRAW["respin"]["second_chance"]:
                res += R.choice([1, 2])
        vol = sil + res + round((PITCH_Q["qualification"] + PITCH_Q["volume"]) * k)
        end = None
        for q in range(32):  # 2031Q1 .. 2038Q4
            if q >= vol:
                end = "built"
                vq.append(q)
                break
            r = R.random()
            if r < h["cancel"] / 4:
                end = "cancelled"; break
            if r < (h["cancel"] + h["acquired_gain"]) / 4:
                end = "acquired_gain"; break
            if r < (h["cancel"] + h["acquired_gain"] + h["acquired_loss"]) / 4:
                end = "acquired_loss"; break
        out[end or "still_building"] += 1
    lab = lambda i: f"{2031 + i // 4}Q{i % 4 + 1}"
    vq.sort()
    res = {k: round(v / N, 3) for k, v in out.items()}
    res["volume_quarter_p10_p50_p90"] = [lab(vq[len(vq) // 10]), lab(vq[len(vq) // 2]), lab(vq[9 * len(vq) // 10])]
    res["share_of_successes_in_act5"] = round(sum(1 for x in vq if x >= 20) / len(vq), 3)
    res["p_volume_by_2035Q4"] = round(sum(1 for x in vq if x < 20) / N, 3)
    res["respin_share"] = round(respins / N, 3)
    return res


def venture(cal):
    return {
        "_meta": {"schema": "ventures/1 (accelerator type)", "doc": "doc 43 §0.10 as corrected by doc 49 Part A",
                  "note": "Same mechanic as ventures.json (doc 38 §5): a calendar developer project, stakes paid in as a share of the pitched budget, cash calls in thirds, pay/dilute/walk, milestone marks. Every value carries its grade in `provenance`.",
                  "DO_NOT_EXPOSE": "demand_trim and the hazard split are rules the engine reads; the player sees only the pitch, the diligence estimate and the news."},
        "types": {"accelerator": {
            "developer": "Halyard Silicon", "chip": "Halyard Bowline", "from": "2031Q1",
            "pitch": {"budget_usd": 800000000, "volume": "2034Q3",
                      "line": "A purpose-built AI chip with a third more work per watt than the next mainstream generation, in volume by 2034."},
            "diligence": {"bandwidth": 1, "fee_usd": 2000000,
                          "shows": "pitch × the class median (cost ×1.25), P(volume by 2038Q4) ≈ 0.30, the industry's 14% first-silicon success rate"},
            "overrun_class": {"id": "semiconductor", "median": 1.25, "sigma": 0.35, "cap": 3.0},
            "equity_shares": [0.1, 0.2, 0.3, 0.49], "buy_in": "stake × pitched budget (as ventures.json)",
            "milestones": [
                {"id": "tape_out", "label": "Design sent to the factory", "pitched": "2033Q1", "pitch_q_from_start": 8},
                {"id": "first_silicon", "label": "First working silicon", "pitched": "2033Q2", "pitch_q_after_previous": 1},
                {"id": "qualification", "label": "Qualified with customers", "pitched": "2034Q1", "pitch_q_after_previous": 3},
                {"id": "volume", "label": "Volume", "pitched": "2034Q3", "pitch_q_after_previous": 2}],
            "slip": DRAW["slip"], "slip_note": "One draw per game (keyed by type, as M36.10) scales every phase's quarters.",
            "respin": {**DRAW["respin"], "cash_call_share_of_pitch": 0.05, "counts_as_slip": True},
            "hazard_per_year_before_volume": DRAW["hazard_per_year_before_volume"],
            "acquisition": {"gain": {"stake_paid_mark_mult": [1.5, 3.0], "player_can_block_with_stake_ge": 0.3, "card": "chips_c4"},
                            "loss": {"stake_paid_paid_in_mult": [0.3, 0.9]}},
            "cancel": {"stake_value": 0, "deposits": "lost"},
            "cash_calls": {"shares": [0.33, 0.66, 1.0], "at": ["tape_out", "first_silicon", "volume"],
                           "amount": "(m − 1) × pitch × stake, in thirds; plus each respin's call", "default": "dilute"},
            "debt": "none before volume",
            "allocation_reservation": {
                "menu": [{"deposit_share": 0.10, "discount": 0.10}, {"deposit_share": 0.20, "discount": 0.15}],
                "reserved_mw": [5, 10, 25], "deposit_base": "reserved MW × GPUs per MW (gpus_v.json) × accel_unit_purchase_usd at signing",
                "priority": "delivered in the first two quarters after volume, ahead of the foundry-allocation cap",
                "deposit_on": {"volume": "credited against the purchase", "cancelled": "lost", "acquired": "refunded at par (mine)"},
                "must_take_delivery_within_q": 4},
            "foundry_allocation": {"chance_at_volume": 0.35, "units_cap_share": 0.5, "quarters": 4,
                                   "note": "Reservation holders are served first; the cap falls on everyone else."},
            "after_volume": {
                "units_ramp_by_quarter_since_volume": [0.25, 0.5, 0.75, 1.0],
                "units_col": "accel_units_full_ramp_q",
                "ebitda_share_of_price_by_year_since_volume": [0.05, 0.15, 0.25],
                "margin_col": "accel_margin_usd_unit_mature (the year-3 level)",
                "ebitda": "units × unit price × the year's EBITDA share",
                "value": "stake × max(the mark at volume, quarter EBITDA × 4 × chip_ev_ebitda_mult) for the first 4 quarters; then stake × EBITDA × 4 × chip_ev_ebitda_mult",
                "chip_in_market": "a GPU class for everyone from max(volume + 1, 2036Q1): gpus_v.json 'bowline'; the market rows before that quarter are masked"},
            "marks": {"milestone_mult": 1.25, "slip_mult": 0.8, "milestones": ["tape_out", "first_silicon", "qualification", "volume"],
                      "slips": "each full year past the pitched volume quarter, and each respin"},
            "demand_trim": {"v1": 0, "v2": 0, "v3": 0.02, "v4": 0, "phase_in_q": 4,
                            "note": "On success, ai_demand_index_v × (1 − trim), phased in over 4 quarters from volume (doc 49 Q7)."},
            "reading_score": 0,
            "targets": {"p_volume_by_2038Q4": 0.30, "outcome_shares_by_2038Q4": {"built": 0.30, "acquired_gain": 0.15, "acquired_loss": 0.25, "cancelled": 0.30}},
            "calibration_check": cal,
            "provenance": {
                "budget": "[B/C → D] cost to volume $0.5-1.5B (startups raised $0.7-1.75B before material revenue; IBS design cost $449-725M at 5-2 nm [C]); pitch $800M, realised ×1.25 median",
                "overrun_class": "[D] designed: respins (mask sets $20-40M at 3 nm [C]) and burn; Graphcore spent ~$700M without volume [B]",
                "milestones": "[A/B → D] new team design-to-tape-out 18-30 months; tape-out to first silicon ~1 quarter; first silicon to volume 9-18 months for startups (doc 49 Q1)",
                "slip": "[D] fitted: founding to first volume 3.5-5 years for 2016-17 startups [B]; median realised volume 2035Q2",
                "respin": "[A/B → D] 14% of ASIC projects had first-silicon success in 2024 [A/B]; a usable first pass with workarounds ~40-50% [D]; a respin costs 1-2 quarters [C]",
                "hazards": "[C/D] JPR: 146 startups, ~75% expected gone by 2030 [C]; outcome shares from a 27-company sample (doc 49 Q2) [D]",
                "acquisition": "[B → D] gains 10-17x money raised before volume (Nervana, Habana) [B]; losses 0.3-0.9x (Wave, Graphcore) [B]",
                "reservation": "[A/B → D] deposits/loans ~5-10% of contract value (OpenAI-Cerebras $1B against $10-20B) [B]; no published discount; warrants ~10% equity as the equivalent [A/B]",
                "foundry": "[C → D] top four buyers took >90% of CoWoS and HBM in 2025 [C]; startups buy on purchase orders [A]",
                "after_volume": "[A → D] Cerebras gross margin 11.7% → 33.5% → 41.1% (2022-H1 2024) with large losses [A]; EBITDA shares designed",
                "multiple": "[A/C → D] Damodaran semiconductors EV/EBITDA ~35x (Jan 2026, boom) [A/C]; 20x chosen for a single-product newcomer [D]",
                "demand_trim": "[A/C → D] IEA High Efficiency case −15-20% by 2035 for the whole fleet with no rebound [A]; one chip's share ≤ ~2% (doc 49 Q7)"},
        }},
    }


def gpus():
    return {
        "_meta": {"schema": "gpus_act3/1 (Act V additions)", "note": "Two generations added to gpus_act3.json's list for Act V (doc 49). Rents and prices in market_v_chips_v*.csv.",
                  "conventions": "nominal USD; kW per rack; grounded flag per value"},
        "generations": [
            {"id": "gen2037", "name": "Gen 2037", "rack_kw": GEN_RACK_KW, "tier": "top", "kw_range": [600, 600],
             "available_from": "2037Q1", "every_game": True, "cooling": "liquid + 800V DC, purpose-built halls",
             "gpus_per_mw": GEN_GPUS_MW, "rack_usd_2037q1": round(GEN_UNIT_2037 * GPUS_PER_RACK), "unit_usd_2037q1": round(GEN_UNIT_2037),
             "perf_per_watt_vs_2036_newest": 1.4, "revenue_per_mw_vs_2036_newest": GEN_GAIN, "grounded": False,
             "reasoning": "Generic next generation (IV-D28). Perf/W 1.4x the game's 2036 newest class: a 2-year step after 2030 at 1.3-1.5x (measured gains 1.3-1.8x training, ~2x inference per step today [A/B]; Koomey's post-2000 2.6-year doubling [B]). GPUs/MW +10% (the doc 27 rule: GPUs/MW rises modestly); the rest is per-GPU throughput. Revenue/MW 1.25x at launch: part of the gain goes to buyers. Top tier: no denser tier exists after 600 kW racks (mine)."},
            {"id": "bowline", "name": "Halyard Bowline", "rack_kw": GEN_RACK_KW, "tier": "top", "kw_range": [600, 600],
             "available_from": "max(the venture's volume quarter + 1, 2036Q1), only if the venture succeeds", "every_game": False,
             "cooling": "liquid + 800V DC", "gpus_per_mw": GEN_GPUS_MW, "unit_usd_2037q1": round(ACCEL_GAIN * GEN_UNIT_2037),
             "rack_usd_2037q1": round(ACCEL_GAIN * GEN_UNIT_2037 * GPUS_PER_RACK),
             "perf_per_watt_vs_gen2037": 1.3, "rent_per_gpu_vs_gen2037": ACCEL_GAIN, "grounded": False,
             "reasoning": "A specialised accelerator's measured edge over the mainstream GPU of its time is 1.0-1.9x perf/W (TPU v4 vs A100 1.3-1.9x [A]); vendor claims of 10-20x are unmeasured [B]. 1.3x chosen; priced at 1.2x Gen 2037's rent and list price to win buyers (mine). Backers with a reservation pay list × (1 − discount)."},
        ],
        "density_rules": {"gpus_per_mw": {"gen2037": GEN_GPUS_MW, "bowline": GEN_GPUS_MW, "grounded": False,
                                          "reasoning": "Designed: +10% on the 2036 newest class (1,050), the +15-20%-per-generation rule tempered by post-2030 slowing"},
                          "retrofit": "Same top tier as the 2036 newest class: no retrofit needed to host either"},
        "depreciation_and_obsolescence": {"rule": "When Gen 2037 ships (2037Q1), the older classes' renewal_*_gpu_index applies at contract end, as gpus_act3.json", "grounded": False},
    }


EVENTS = [
    {"id": "chips_c1", "future": "all", "window": ["2032Q3", "2036Q4"], "trigger": "the developer's tape-out milestone (drawn)", "role": "venture",
     "title": "Design Sent to the Factory",
     "body": "Halyard Silicon has sent its first chip design to the foundry. If the first wafers work, it will have silicon in about a quarter; most first designs need at least one fix.",
     "choices": [{"label": "Note it", "effect": {}}, {"label": "Reserve chips from the first run", "effect": {"open": "accelerator_reservation"}}],
     "default": "Note it", "basis": "Doc 49 Q1: tape-out to first silicon ~1 quarter [B]; 14% first-silicon success [A/B]", "reading_sign": {"Note it": 0, "Reserve chips from the first run": 0}},
    {"id": "chips_c2", "future": "all", "window": ["2032Q4", "2037Q2"], "trigger": "first silicon (drawn): working, or a respin", "role": "venture",
     "title": "First Silicon",
     "variants": {
         "working": {"title": "First Silicon Works", "body": "Halyard's first chips boot and run real models. Qualification with customers starts now; volume is still a year or so away."},
         "respin": {"title": "Back to the Factory", "body": "Halyard's first chips have a flaw that software can't route around. A corrected design goes back to the factory: one or two quarters lost, and a cash call for the new masks."}},
     "choices": [{"label": "Pay your share", "effect": {"venture_call": "pay"}}, {"label": "Dilute", "effect": {"venture_call": "dilute"}},
                 {"label": "Walk", "effect": {"venture_call": "walk"}}],
     "choices_only_on": "respin", "default": "Dilute",
     "basis": "Doc 49 Q1: a respin costs 1-2 quarters and a mask set ($20-40M at 3 nm) plus burn [C]", "reading_sign": {"Pay your share": 0, "Dilute": 0, "Walk": 0}},
    {"id": "chips_c3", "future": "all", "window": ["2033Q4", "2038Q4"], "trigger": "volume or cancellation (drawn)", "role": "venture",
     "variants": {
         "volume": {"title": "Halyard Ships in Volume", "body": "Halyard Silicon's chip is in volume production. Backers with a reservation get the first deliveries at their discount; everyone else waits for whatever the foundry can make."},
         "volume_capped": {"title": "Volume, Rationed", "body": "Halyard is in production, but the foundry gave it half the wafers it asked for. Reservation holders are served first; the rest of the year's orders wait."},
         "cancelled": {"title": "Halyard Shuts Down", "body": "Halyard Silicon ran out of runway before its chip reached volume. The team is being hired away and the designs go to auction; stakes and deposits are lost."}},
     "choices": [{"label": "Note it", "effect": {}}], "default": "Note it",
     "basis": "Doc 49 Q2 (outcome shares) and Q4 (allocation: the top four buyers took >90% of advanced packaging in 2025 [C])", "reading_sign": {"Note it": 0}},
    {"id": "chips_c4", "future": "all", "window": ["2032Q1", "2038Q4"], "trigger": "the acquired_gain hazard (drawn), before volume", "role": "venture",
     "title": "A Buyer for Halyard",
     "body": "One of the largest cloud companies offers to buy Halyard Silicon outright, mostly for its team and designs. Your stake would be paid out now at well above its last mark.",
     "choices": [{"label": "Sell your stake", "effect": {"venture_sale": {"mark_mult": [1.5, 3.0]}}},
                 {"label": "Vote against the sale", "effect": {"venture_block": {"min_stake": 0.3}}}],
     "default": "Sell your stake",
     "basis": "Doc 49 Q2: pre-volume buyouts at 10-17x money raised (Nervana 2016, Habana 2019) [B]; licence-and-hire deals (Groq 2025, Enfabrica 2025) [B]",
     "reading_sign": {"Sell your stake": 0, "Vote against the sale": 0},
     "note": "Blocking needs a stake of 30% or more (mine); otherwise the other holders carry the vote and the stake is sold."},
]

TEXT = {
    "chips.venture.title": "Halyard Silicon: an AI chip",
    "chips.venture.pitch": "Halyard Silicon is designing a chip built only for AI work. It promises a third more work per watt than the next mainstream generation, in volume by 2034, for an $800M budget.",
    "chips.venture.how": "New chips go through four steps: the design is sent to a factory, the first chips come back and are tested, customers qualify them, then the factory makes them in volume.",
    "chips.venture.risk.respin": "Most first designs need at least one fix. A fix sends the design back to the factory for one or two quarters and costs new masks.",
    "chips.venture.risk.base_rate": "Most AI-chip start-ups never reach volume. Some are bought, a few for much more than they raised, more for less; many close.",
    "chips.venture.risk.foundry": "Even a working chip needs factory capacity, and the biggest buyers book most of it. A small maker may get half the wafers it asks for in its first year.",
    "chips.venture.role.stake": "Stake: buy 10-49% of Halyard. You pay your share of each cost overrun, or your stake shrinks, or you walk away.",
    "chips.venture.role.reservation": "Reservation: pay a deposit now to be first in line for Halyard's chips. Your deposit counts toward the price, and you pay 10% less (15% with a bigger deposit).",
    "chips.venture.reservation.plain": "Think of it as booking a table before the restaurant opens. If it opens, you get the first seats at a better price. If it never opens, the deposit is gone.",
    "chips.venture.reservation.deposit": "Deposit: {share}% of the reserved chips' price today: ${amount}.",
    "chips.venture.reservation.delivery": "Delivered in the first two quarters of volume, ahead of everyone else. Take delivery within a year or lose the deposit.",
    "chips.venture.value": "Until volume, your stake is marked like a funding round: up at each milestone, down for each slip. After volume, it is valued on what Halyard earns.",
    "chips.venture.diligence": "Diligence shows what chips like this usually cost and how often they ship.",
    "chips.report.tape_out": "Halyard Silicon sent its design to the factory.",
    "chips.report.first_silicon": "Halyard's first chips work. Qualification has started.",
    "chips.report.respin": "Halyard's first chips need a fix: {q} more quarters and a cash call.",
    "chips.report.qualified": "Customers have qualified Halyard's chip.",
    "chips.report.volume": "Halyard is shipping in volume: {units} chips this quarter.",
    "chips.report.capped": "The factory is rationing Halyard's wafers: half its orders ship this year.",
    "chips.report.delivered": "Your reserved Halyard chips arrived: {mw} MW at {discount}% off.",
    "chips.report.cancelled": "Halyard Silicon closed. Your stake and deposit are written off.",
    "chips.report.sold": "Halyard Silicon was sold. Your stake paid ${amount}.",
    "chips.report.gen2037": "A new mainstream chip generation, Gen 2037, is on sale: about 40% more work per watt than the last.",
    "glossary.tape_out": "Tape-out: the moment a chip design is final and sent to the factory to make the first wafers.",
    "glossary.first_silicon": "First silicon: the first chips back from the factory. Until they are tested, nobody knows if the design works.",
    "glossary.respin": "Respin: fixing a chip design that came back with a flaw and sending it to the factory again. It costs months and new masks.",
    "glossary.foundry_allocation": "Foundry allocation: how much of a factory's capacity a chip maker gets. When capacity is tight, the biggest customers come first.",
    "glossary.perf_per_watt": "Performance per watt: how much computing a chip does for each unit of power. Better chips earn more from the same megawatt.",
    "epilogue.chip.shipped": "The chip you backed in 2031 shipped. Somewhere a hall full of Halyard Bowlines is still running models.",
    "epilogue.chip.never": "Halyard never shipped. You learned what every chip investor learns: first silicon is the easy part.",
}


if __name__ == "__main__":
    market()
    cal = simulate()
    for name, obj in [("venture_accelerator.json", venture(cal)), ("gpus_v.json", gpus()),
                      ("events_chips.json", {"_meta": {"schema": "events_v/1", "doc": "doc 49 Part B", "note": "Venture cards fire on the developer's drawn milestones inside their windows; reading_sign as events_v.json (venture moves 0, doc 43 §0.10)."}, "event_cards": EVENTS}),
                      ("text_chips.en.json", TEXT)]:
        s = json.dumps(obj, indent=2, ensure_ascii=False)
        assert "—" not in s, name
        open(f"{OUT}/{name}", "w").write(s + "\n")
    print(json.dumps(cal))
    print("gen2037", round(gen_hyper, 4), "unit", round(GEN_UNIT_2037), "accel unit", round(ACCEL_GAIN * GEN_UNIT_2037))
