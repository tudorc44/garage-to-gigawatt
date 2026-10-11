"""Act V hand-authored content (doc 47): rivals, hidden reading score, plants, exit, wildcards, hires.
Generated from the dicts below so every file is valid JSON. Usage: python3 -I content.py <out dir>"""
import json, sys
sys.path.insert(0, __file__.rsplit("/", 1)[0])
from futures import QUARTERS, FUTURES, TRIGGER, NAMES, WEIGHTS

OUT = sys.argv[1]


def dump(name, obj):
    with open(f"{OUT}/{name}", "w") as fh:
        json.dump(obj, fh, indent=2, ensure_ascii=False)
        fh.write("\n")


# ------------------------------------------------------------------ rivals
RIVALS = {
    "_meta": {
        "schema": "rivals_v/1",
        "doc43": "§12 (Act IV's rivals carry; one new firm-power developer), §15.1 (fates in the chapter report)",
        "author": "content pack (doc 47): designed paths ($B value, orbital MW, firm MW) at anchor quarters, interpolated at load like rivals_iv.json; identical in every future through 2036Q2. 2036Q1 = the median of the four Act IV futures' 2035Q4 values (Orrery: of the two futures it survives).",
        "display_names": "Ids are kept from Act IV; display names follow the M34.3 and M41.2 renames: pallas_compute = Carrack Compute, jade_arc = Lantern Arc.",
    },
    "rivals": [
        {"id": "pallas_compute", "name": "Carrack Compute",
         "common": {"value": {"2036Q1": 90, "2036Q2": 92}, "orbitMw": {"2036Q1": 450, "2036Q2": 480}, "firmMw": {"2036Q1": 0, "2036Q2": 0}},
         "futures": {
             "v1": {"value": {"2038Q4": 130, "2040Q4": 170}, "orbitMw": {"2040Q4": 900}, "firmMw": {"2038Q4": 150, "2040Q4": 150},
                    "fate": "Carrack Compute paid record premiums for queue-holding campuses and ended the decade as the biggest landlord of firm ground power."},
             "v2": {"value": {"2038Q4": 110, "2040Q4": 120}, "orbitMw": {"2040Q4": 700}, "firmMw": {"2040Q4": 0},
                    "fate": "Carrack Compute moved its new halls into the fast lane and grew steadily, without the windfall it had hoped for."},
             "v3": {"value": {"2037Q4": 85, "2039Q4": 65, "2040Q4": 70}, "orbitMw": {"2040Q4": 500}, "firmMw": {"2040Q4": 0},
                    "fate": "Carrack Compute wrote down two campuses after the capex pause and spent 2039 selling ground it had bought in 2037."},
             "v4": {"value": {"2038Q2": 120, "2040Q4": 260}, "orbitMw": {"2038Q2": 900, "2040Q4": 2500}, "firmMw": {"2040Q4": 0},
                    "fate": "Carrack Compute launched its own price war and owned the marginal gigawatt by 2040."},
         }},
        {"id": "northgate", "name": "Northgate",
         "common": {"value": {"2036Q1": 36.5, "2036Q2": 37}, "orbitMw": {"2036Q1": 0, "2036Q2": 0}, "firmMw": {"2036Q1": 0, "2036Q2": 0}},
         "futures": {
             "v1": {"value": {"2040Q4": 50}, "orbitMw": {"2040Q4": 0}, "firmMw": {"2040Q4": 0}, "fate": "Northgate kept flying and kept slipping; steady, never spectacular."},
             "v2": {"value": {"2040Q4": 42}, "orbitMw": {"2040Q4": 0}, "firmMw": {"2040Q4": 0}, "fate": "Northgate's launch business grew with the decade, quietly."},
             "v3": {"value": {"2040Q4": 30}, "orbitMw": {"2040Q4": 0}, "firmMw": {"2040Q4": 0}, "fate": "Northgate cut its flight rate as orbital orders dried up."},
             "v4": {"value": {"2038Q1": 50, "2040Q4": 70}, "orbitMw": {"2040Q4": 0}, "firmMw": {"2040Q4": 0}, "fate": "Northgate matched Carrack's price in 2038 and rode the launch boom to record value."},
         }},
        {"id": "orrery_compute", "name": "Orrery Compute", "present_if_act4_future": ["f1", "f3"],
         "common": {"value": {"2036Q1": 13.5, "2036Q2": 14}, "orbitMw": {"2036Q1": 195, "2036Q2": 200}, "firmMw": {"2036Q1": 0, "2036Q2": 0}},
         "futures": {
             "v1": {"value": {"2040Q4": 18}, "orbitMw": {"2040Q4": 300}, "firmMw": {"2040Q4": 0}, "fate": "Orrery Compute stayed small and profitable, renting orbit to tenants who could not find ground."},
             "v2": {"value": {"2040Q4": 16}, "orbitMw": {"2040Q4": 260}, "firmMw": {"2040Q4": 0}, "fate": "Orrery Compute found a niche in batch work the fast lane could not serve."},
             "v3": {"value": {"2038Q2": 4}, "orbitMw": {"2038Q2": 120}, "firmMw": {"2038Q2": 0}, "fails": "2038Q3",
                    "fate": "Orrery Compute ran out of tenants after the capex pause and its blocks went to auction."},
             "v4": {"value": {"2040Q4": 30}, "orbitMw": {"2040Q4": 600}, "firmMw": {"2040Q4": 0}, "fate": "Orrery Compute tripled its fleet on cheap launch."},
         }},
        {"id": "jade_arc", "name": "Lantern Arc",
         "common": {"value": {"2036Q1": 24, "2036Q2": 24.5}, "orbitMw": {"2036Q1": 225, "2036Q2": 235}, "firmMw": {"2036Q1": 0, "2036Q2": 0}},
         "futures": {
             "v1": {"value": {"2040Q4": 30}, "orbitMw": {"2040Q4": 350}, "firmMw": {"2040Q4": 0}, "fate": "Lantern Arc grew on its bloc's own demand, untouched by the queue."},
             "v2": {"value": {"2040Q4": 28}, "orbitMw": {"2040Q4": 320}, "firmMw": {"2040Q4": 0}, "fate": "Lantern Arc kept to its bloc's market and its own pace."},
             "v3": {"value": {"2040Q4": 20}, "orbitMw": {"2040Q4": 280}, "firmMw": {"2040Q4": 0}, "fate": "Lantern Arc's state backers slowed its launches but never let it shrink."},
             "v4": {"value": {"2040Q4": 45}, "orbitMw": {"2040Q4": 900}, "firmMw": {"2040Q4": 0}, "fate": "Lantern Arc quadrupled its constellation in the launch boom."},
         }},
        {"id": "cratermark", "name": "Cratermark Resources",
         "common": {"value": {"2036Q1": 2.3, "2036Q2": 2.3}, "orbitMw": {"2036Q1": 0, "2036Q2": 0}, "firmMw": {"2036Q1": 0, "2036Q2": 0}},
         "futures": {
             "v1": {"value": {"2040Q4": 2.6}, "orbitMw": {"2040Q4": 0}, "firmMw": {"2040Q4": 0}, "fate": "Cratermark Resources is still waiting for its first tonnes."},
             "v2": {"value": {"2040Q4": 2.4}, "orbitMw": {"2040Q4": 0}, "firmMw": {"2040Q4": 0}, "fate": "Cratermark Resources is still waiting for its first tonnes."},
             "v3": {"value": {"2040Q4": 2.0}, "orbitMw": {"2040Q4": 0}, "firmMw": {"2040Q4": 0}, "fate": "Cratermark Resources cut staff and kept its claims."},
             "v4": {"value": {"2040Q4": 3.5}, "orbitMw": {"2040Q4": 0}, "firmMw": {"2040Q4": 0}, "fate": "Cratermark Resources raised again on cheaper lunar delivery."},
         }},
        {"id": "ironvale_power", "name": "Ironvale Power", "new_in_act5": True,
         "role": "The firm-power developer whose orderbook tells the SMR-wave story: dozens announced, a handful built.",
         "common": {"value": {"2036Q1": 6.0, "2036Q2": 6.2}, "orbitMw": {"2036Q1": 0, "2036Q2": 0}, "firmMw": {"2036Q1": 1200, "2036Q2": 1200},
                    "orderbookUnits": {"2036Q1": 0, "2036Q2": 0}, "deliveredUnits": {"2036Q1": 0, "2036Q2": 0}},
         "futures": {
             "v1": {"value": {"2037Q2": 14, "2038Q4": 10, "2040Q4": 11}, "orbitMw": {"2040Q4": 0}, "firmMw": {"2038Q4": 1500, "2040Q4": 1900},
                    "orderbookUnits": {"2037Q1": 24, "2040Q4": 24}, "deliveredUnits": {"2039Q3": 1, "2040Q4": 2},
                    "fate": "Ironvale Power announced 24 reactors in 2037 and delivered two by 2040. Its gas fleet made the money."},
             "v2": {"value": {"2037Q3": 12, "2040Q4": 7}, "orbitMw": {"2040Q4": 0}, "firmMw": {"2040Q4": 1500},
                    "orderbookUnits": {"2037Q2": 20, "2040Q4": 20}, "deliveredUnits": {"2040Q2": 1, "2040Q4": 1},
                    "fate": "Ironvale Power's twenty-reactor orderbook produced one unit by 2040; the fast lane made it matter less."},
             "v3": {"value": {"2037Q1": 8, "2038Q2": 5, "2040Q4": 3.5}, "orbitMw": {"2040Q4": 0}, "firmMw": {"2038Q4": 1100, "2040Q4": 1100},
                    "orderbookUnits": {"2037Q1": 6, "2038Q1": 0}, "deliveredUnits": {"2040Q4": 0},
                    "fate": "Ironvale Power shelved its reactor orderbook in 2038 and sold two gas plants to pay down debt."},
             "v4": {"value": {"2037Q4": 11, "2040Q4": 5}, "orbitMw": {"2040Q4": 0}, "firmMw": {"2040Q4": 1400},
                    "orderbookUnits": {"2037Q3": 20, "2040Q4": 20}, "deliveredUnits": {"2040Q4": 1},
                    "fate": "Ironvale Power built one reactor of twenty and found the new load had gone to orbit."},
         }},
    ],
    "orrery_auction_v3": {"quarter": "2038Q3", "mw": 120, "shell": "sso", "gen": "gen35", "life_left_quarters": 10,
                          "price_usd_per_mw": 4000000, "bandwidth": 1, "open_quarters": 2,
                          "basis": "As Act IV's Orrery auction (rivals_iv.json); price designed lower for a demand plateau"},
}

# ------------------------------------------------------------------ reading score (hidden)
MOVES = [
    # (move id, sign, source)
    ("pay_network_upgrade", 1, "doc 43 §14.1, §0.4 (paying stays +1)"),
    ("buy_site_with_position", 1, "doc 43 §6.7 (buying a queue position with a site)"),
    ("commit_follow_on_unit", 1, "doc 43 §7.4, §14.1"),
    ("commit_new_firm_asset", 1, "doc 43 §6.7 (gas, long storage)"),
    ("buy_plant_stake", 1, "doc 43 §6.7"),
    ("let_contract_roll_merchant", 1, "doc 43 §6.7"),
    ("arrange_plant_debt", 1, "doc 43 §14.1"),
    ("renew_short", 1, "doc 43 §0.2 (lock or roll: short = +1)"),
    ("sell_plant_stake_to_fund", -1, "doc 43 §14.1"),
    ("sell_site_with_position", -1, "doc 43 §14.1 (also selling free energized MW, §0.2)"),
    ("sell_site_free_mw", -1, "doc 43 §0.2 (sell a site: leases' value + free MW × powered value)"),
    ("contract_plant_output", -1, "doc 43 §14.1"),
    ("enrol_flexible", -1, "doc 43 §6.7 (enrolling load as curtailable)"),
    ("take_fast_lane", -1, "doc 43 §14.1"),
    ("renew_long", -1, "doc 43 §0.2 (lock or roll: long = −1)"),
    ("blend_and_extend_long", -1, "doc 43 §0.2"),
    ("equity_raise_unfollowed", 0, "doc 43 §6.7, the M41 rule (doc 43 §0.11 erratum 1): a raise takes the sign of the next scored move at any distance, 0 if none follows before the act ends"),
    ("request_grid_mw", 0, "doc 43 §14.1"),
    ("withdraw_position", 0, "doc 43 §0.9 item 7: withdrawing is usually a cost decision after a high study bill"),
    ("orbit_replace", 0, "doc 43 §9.1, §14.1"),
    ("orbit_extend", 0, "doc 43 §9.1"),
    ("orbit_bring_home", 0, "doc 43 §9.1"),
    ("sell_lunar_holding", 0, "doc 43 §14.1"),
    ("read_the_market", 0, "as Act III"),
    ("founder_exit", None, "doc 43 §15.2: not scored (the money judges it)"),
]


def stance(f):
    t0 = TRIGGER[f]
    if f == "v1":
        return [1] * 20
    if f == "v2":  # M60.4 (doc 43 §0.16 item 5): calm before the trigger; after it, -1 scored on flexibility moves only
        return [0 if t < t0 else -1 for t in range(20)]
    if f == "v3":
        return [0 if t < t0 else -1 for t in range(20)]
    return [0 if t < 12 else -1 for t in range(20)]  # V4: calm, defensive from 2039 (act quarter 12)


DECOYW = {
    "v1": (["2037Q1", "2037Q2", "2037Q3"], -1, "firm_buildout", "The SMR wave tempts selling scarcity (the Demand Plateau reading) just as the queue locks up."),
    "v2": (["2037Q2", "2037Q3", "2037Q4"], -1, "firm_buildout", "The SMR wave tempts selling scarcity early, before the trigger, when V2 still pays for exposure."),
    "v3": (["2037Q1", "2037Q2"], 1, "capacity_market", "A record auction tempts buying scarcity (the Queue is King reading) just before demand plateaus."),
    "v4": (["2037Q3", "2037Q4", "2038Q1"], -1, "firm_buildout", "The SMR wave tempts selling the ground early for the wrong reason; the softening comes in 2039, from orbit."),
}
WHY = {
    "v1": "Queue is King: add scarcity exposure throughout (short renewals, hold free MW, pay upgrades, keep plants merchant).",
    "v2": "Flexible Lane: calm before the trigger (a 7% scarcity rise can't pay a bet); from 2038Q1 flexibility pays, so enrol load and take the fast lane (lease moves score 0 here).",
    "v3": "Demand Plateau: calm before the trigger; defensive from 2037Q4 (lock leases long, contract output, sell to funds).",
    "v4": "Up and Out: calm while the ground holds; defensive from 2039 as orbit takes the marginal gigawatt.",
}

READING = {
    "_meta": {
        "schema": "reading_score_v/1",
        "doc43": "§6.7 as amended by §0.2 (scarcity exposure; long lease −1, short +1), §6.8 (hidden), V-D21",
        "author": "content pack (doc 47): designed per doc 43 §6.7's ideal stances; Act III/IV scoring rules unchanged; the oracle values are computed and asserted by the sim (V-B8, V-B9)",
        "DO_NOT_EXPOSE": "Hidden content: the ideal stance per quarter reveals the future. Read only by readingScore.ts and act5End.ts (plus tests/ and tools/); never by selectors, the UI during play, or player-like bots.",
        "quarters": QUARTERS,
        "stance": "scarcity exposure: +1 adds exposure (a bet that firm ground power stays scarce and dear), -1 sells or hedges it, 0 logged for the reveal timeline only",
    },
    "scoring": {"match": 1, "calm_and_quiet": 0.7, "one_neutral": 0.5, "opposite": 0, "decoy_penalty_per_move": 10,
                "decoy_penalty_cap": 30, "calm_in_decoy_window": 1,
                "low_exposure_quiet": {"value": 1, "threshold_share": 0.15,
                                       "why": "Mine (as Act IV's M36.11 quiet_no_exposure): a quarter with no scored move while the exposure line (leases + free MW + plants) is under 15% of act5Entry counts as a match in every future, so an orbit- or cash-heavy company is not punished for a question that barely touches it (doc 43 §0.8)."}},
    "moves": [{"id": m, "sign": s, "source": src} for m, s, src in MOVES],
    "rules": {
        "same_quarter_hedges": "A build's own hedges and debt count 0 in its quarter (M40-41 rule, carried).",
        "raise": "An equity raise takes the sign of the next scored move, at any distance; 0 if none follows before the act ends (M41).",
        "lease_offers": "Lock-or-roll applies at each renewal or blend-and-extend offer: long (8-10 years) −1, short (2 years) +1; letting a lease run on its existing term logs nothing.",
    },
    "futures": {},
}
for f in FUTURES:
    q, wrong, ind, why = DECOYW[f]
    READING["futures"][f] = {"why": WHY[f], "ideal": stance(f), "weight": [1] * 20,
                             "decoy": {"indicator": ind, "quarters": q, "wrong_stance": wrong, "why": why}}
    if f == "v2":  # M60.4 (doc 43 §0.16 item 5): from the trigger only flexibility moves are scored; other moves count 0
        READING["futures"][f]["scored_kinds"] = {"from_q": TRIGGER[f], "kinds": ["enrol_flexible", "take_fast_lane"]}

# ------------------------------------------------------------------ plants
PLANTS = {
    "_meta": {"schema": "plants_v/1",
              "doc43": "§0.4 (doc 45's corrections), §7 (plants), §11 (finance, valuation), §0.6 (gate rules)",
              "author": "content pack (doc 47). Grades: [A] primary, [B] reputable reporting, [C] analyst, [D] designed. Every value's source is in the README ('plants_v.json')."},
    "classes": {
        "smr": {"fixed_usd_kw_yr": 107, "single_unit_fixed_mult": 1.3, "var_usd_mwh": 9, "fuel": "in var",
                "cf": {"ramp_quarters": 8, "ramp_cf": 0.80, "mature_cf": 0.92}, "contracted_share_at_cod": 0.9,
                "capacity_rating_col": "capacity_rating_nuclear", "follow_on": {"cost_mult_of_unit1_realised": 0.85, "first_offer": "the quarter after unit 1's first power"}},
        "adv_fission": {"fixed_usd_kw_yr": 107, "single_unit_fixed_mult": 1.3, "var_usd_mwh": 9, "fuel": "in var",
                        "cf": {"ramp_quarters": 8, "ramp_cf": 0.80, "mature_cf": 0.92}, "contracted_share_at_cod": 0.9,
                        "capacity_rating_col": "capacity_rating_nuclear", "follow_on": None},
        "egs": {"fixed_usd_kw_yr": 0, "var_usd_mwh": 20, "fuel": None,
                "cf": {"normal": 0.90, "weak_field": 0.60, "weak_field_fix_usd_kw": 1500}, "contracted_share_at_cod": 0.9,
                "capacity_rating": 0.90, "follow_on": {"cost_usd_kw": 4000, "quarters": 7}},
        "fusion_pilot": {"fixed_usd_kw_yr": 107, "single_unit_fixed_mult": 1.3, "var_usd_mwh": 9, "fuel": "in var",
                         "cf": {"pilot": 0.30}, "contracted_share_at_cod": 0.9, "capacity_rating": 0.30,
                         "never_before": "2038Q1", "follow_on": None},
        "pumped": {"fixed_usd_kw_yr": 18, "var_usd_mwh": 0.5, "hours": 10, "round_trip": 0.80,
                   "revenue": "capacity price × capacity_rating_storage_10h × 365 / 1000 ($/kW-yr) + 10 h/day × 365 × peak_spread_10h_usd_mwh × 0.80",
                   "contracted_share_at_cod": 0.5, "capacity_rating_col": "capacity_rating_storage_10h",
                   "capacity_regions": ["pjm", "ohio"], "follow_on": None},
        "gas_cc": {"fixed_usd_kw_yr": 15, "var_usd_mwh": 2.5, "heat_rate_mmbtu_mwh": 6.4, "fuel_col": "gas_usd_mmbtu",
                   "cf": {"merchant_dispatch": 0.55, "on_site": "follows the site's load"}, "contracted_share_at_cod": 0,
                   "capacity_rating_col": "capacity_rating_cc"},
        "gas_ct": {"fixed_usd_kw_yr": 10, "var_usd_mwh": 5, "heat_rate_mmbtu_mwh": 9.9, "fuel_col": "gas_usd_mmbtu",
                   "cf": {"merchant_dispatch": 0.10, "on_site": "backup and peaks"}, "contracted_share_at_cod": 0,
                   "capacity_rating_col": "capacity_rating_ct"},
        "battery": {"as_energy_json": True, "capacity_rating": {"4h": "energy.json's derate path (0.25 from 2035)",
                                                                "8h": "capacity_rating_storage_8h"},
                    "contracted_share_at_cod": 0.8},
        "iron_air": {"as_energy_json": True, "capacity_rating_col": "capacity_rating_storage_10h", "contracted_share_at_cod": 0.8},
    },
    "sales": {
        "order": "offtake shares at their PPA prices → the developer's contracted share at its contract price → merchant at power_usd_kwh_<region> × 1000 ($/MWh)",
        "contract_price": "the PPA price the venture pitched (ventures.json) for the contracted share",
        "capacity_revenue": "pjm_capacity_price_usd_mwday × rating × nameplate MW × 91.25 a quarter, in PJM and Ohio only",
    },
    "valuation": {
        "multiple": "contracted share × plant_mult_contracted + merchant share × plant_mult_merchant (market columns)",
        "contract_tail": {"years_left_le": 8, "mult": 8, "years_left_ge": 15, "mult_long": 11},
        "formula": "stake × plant EBITDA × 4 × multiple − stake × plant debt",
        "before_first_power": "Act IV's milestone mark, unchanged",
    },
    "finance": {
        "debt_contracted": {"min_contracted_share": 0.70, "max_ltv": 0.65, "spread_bps": 200, "tenor_years": [15, 18], "sculpted_dscr": 1.30},
        "debt_merchant": {"max_ltv": 0.40, "spread_bps": 275, "tenor_years": 7, "amort_pct_yr": 1, "cash_sweep": 0.5},
        "covenants": {"lock_up_below_dscr": 1.15, "restructure_after_q_below_1": 4, "restructure_stake_mult": 0.5, "lenders_take_after_q_below_1": 8},
        "fund_sale": "stake × plant value × infra_bid_index",
        "contract_output": {"max_share": 0.8, "years": [10, 15], "price_vs_market": -0.10, "with_power_trader": -0.05},
        "no_debt_before_first_power": True,
        "fire_sale": {"plant_stake": 0.6, "site_with_position": 0.7},
    },
    "queue": {
        "security_usd_kw": 50, "security_source": "Texas: $50,000/MW to hold a large-load position (doc 45 §Q3) [B]; doc 43 §0.2",
        "upgrade_bill": {"median_col": {"pjm": "upgrade_usd_kw_median_pjm", "miso": "upgrade_usd_kw_median_pjm", "ercot": "upgrade_usd_kw_median_ercot", "spp": "upgrade_usd_kw_median_ercot", "other": "upgrade_usd_kw_median_pjm"},
                         "draw": "median × U(0.6, 1.4), or with 20% chance U(400, 600) $/kW", "pay_buys_speed": False,
                         "source": "doc 45 §Q3 [A]; the ×U(0.6, 1.4) spread is mine"},
        "wait_draw": "grid_wait_q_<region> × U(0.8, 1.2) at request (Act IV's rule)",
        "region_map": {"pjm": "pjm", "ohio": "pjm", "ercot": "ercot", "georgia": "other", "arizona": "other", "nordics": "other"},
        "fast_lane": {"col": "fast_lane_q", "curtail_h_yr_col": "fast_lane_curtail_h_yr", "output_loss": 0.005, "notice_hours": 24, "future_only": "v2"},
        "flex_payment": {"rating_col": "flex_capacity_rating", "price_col": "pjm_capacity_price_usd_mwday",
                         "rule": "enrolled curtailable MW earn the PJM capacity price × flex_capacity_rating each day (0.5 in V2 from its trigger, none otherwise)",
                         "source": "doc 43 §0.9 item 8: demand response already clears in PJM's capacity auctions [A]; the 0.5 rating is designed [D]"},
        "co_location": "a site taking offtake from an operating plant in its region connects behind it with no wait, up to the plant's delivered firm MW (doc 43 §8.2)",
        "transfer": "a position moves only with its site (doc 45 §Q3 [A/C])",
        "rival_withdrawal_col": "queue_withdrawal_pct_yr",
    },
    "clean_credit": {"modelled": False,
                     "rule": "None for any plant starting construction after 2035; plants started by 2033 keep their credit (2034: 75%, 2035: 50%)",
                     "note": "The game has never modelled the federal production credit (ventures.json has none). Recommended: keep it unmodelled so both sides of the cliff are treated alike; the v_sh_3 card tells the player. Open question 9."},
}

# ------------------------------------------------------------------ exit
EXIT = {
    "_meta": {"schema": "exit_v/1", "doc43": "§15.2 (V-D20), §6.8 (hidden), §0.4 (doc 45 §Q7 bid factors)",
              "author": "content pack (doc 47)",
              "DO_NOT_EXPOSE": "hidden.outlook_factor is read only by act5End.ts and the exit system after the choice; never shown before the reveal."},
    "window": ["2040Q3", "2040Q4"], "default": "hold",
    "public": {"draw": "uniform in the future's hidden range on substream act5_exit_bid, drawn once at 2040Q3; only the drawn bid is shown",
               "options": {"sell_company": "net worth = founder stake × valuation × bid factor",
                           "sell_plants": "plant stakes sold at stake × plant value × infra_bid_index; the rest held at valuation × outlook",
                           "hold": "net worth = founder stake × valuation × outlook factor"}},
    "hidden": {"bid_factor_range": {"v1": [1.15, 1.30], "v2": [1.05, 1.25], "v3": [0.95, 1.10], "v4": [1.05, 1.25]},
               "bid_source": "doc 43 §0.9 item 5: the bid ranges left the market files (they gave the future away)",
               "outlook_factor": {"v1": 1.15, "v2": 1.00, "v3": 0.85, "v4": 0.95}, "grade": "D",
               "basis": "Designed (doc 43 §15.2): nothing published bounds a post-2040 outlook (doc 45 §Q7)."},
    "disclaimer": "The outlook after 2040 is the game's assumption for this future, not a forecast.",
}

# ------------------------------------------------------------------ wildcards
WILD = {
    "_meta": {"schema": "wildcards_v/1", "doc43": "§6.6 as amended by §0.4 (V-D11)", "author": "content pack (doc 47): windows designed; magnitudes as labelled", "draw": 2},
    "wildcards": [
        {"id": "q_day_scare", "window": ["2036Q3", "2040Q2"],
         "effect": {"btc_price_mult": 0.6, "quarters": 2, "then": "post_quantum_migration",
                    "migration": {"mining_downtime_weeks": 1, "treasury_move_cost_usd": 250000}},
         "text": {"title": "A Quantum Scare", "body": "A lab demonstrates an attack on an old signature scheme. Bitcoin falls 40% while developers rush a migration to quantum-safe keys."},
         "basis": "Doc 40 §D6: NIST disallows pre-quantum schemes after 2035 [A/B]; experts put a CRQC at 28-49% within 10 years [C]; magnitude designed [D]"},
        {"id": "fusion_net_electric", "window": ["2038Q1", "2040Q2"],
         "effect": {"space_mult": 1.10, "ai_mult": 1.10, "quarters": 2, "then": {"space_mult": 0.95, "ai_mult": 0.95, "quarters": 2}, "fusion_output": 0},
         "text": {"title": "Net Electric, Briefly", "body": "A rival's fusion pilot reports net electricity for an afternoon. Multiples jump on the headline, then sag when the plant spends the next quarter offline."},
         "basis": "Doc 43 §6.6 [D]; doc 45 §Q9: no net electricity announced by Oct 2026, goals walked back [B]; no fusion output before 2038 (the honesty rule)"},
        {"id": "dry_year", "window": ["2036Q3", "2040Q1"],
         "effect": {"hydro_pumped_output_mult": 0.75, "quarters": 4, "region": "drawn among nordics, arizona"},
         "text": {"title": "A Dry Year", "body": "A dry winter leaves reservoirs low across one region. Hydro and pumped storage run at three-quarters for a year."},
         "basis": "Designed magnitude [D]; Iceland's Dec 2021 curtailment of interruptible supply on low reservoirs as the shape (doc 40 §Q2 [B])"},
        {"id": "large_load_moratorium", "window": ["2036Q3", "2040Q1"],
         "effect": {"region": "drawn among the regions with your sites", "min_load_mw": 50, "quarters": [2, 8], "applies_to": "new connections and expansions"},
         "text": {"title": "A Moratorium", "body": "One region pauses new connections for loads over 50 MW while it rewrites its rules. Positions already energised are safe; new ones wait."},
         "basis": "Doc 45 §Q8: 69+ local bans, statewide bills in 14 states, proposals of 3 months to 4 years [B]; 50 MW from FERC's suggested definition [B]; length drawn U{2..8} [D]"},
        {"id": "transformer_shortage", "window": ["2036Q2", "2039Q4"],
         "effect": {"delay_quarters": 2, "long_delay_quarters": 4, "long_delay_share": 0.4, "lasts_quarters": 4,
                    "applies_to": "new grid-connected assets and network upgrades started while it lasts"},
         "text": {"title": "Transformer Shortage", "body": "Large transformers are on allocation for a year. Anything new that needs a grid transformer takes two quarters longer, some four."},
         "basis": "Doc 45 §Q8: large transformers 128-144 weeks, a 30% supply deficit, up to four years for high-capacity units [B/C]; +2 q (40% of draws +4) designed"},
    ],
}

# ------------------------------------------------------------------ hires
HIRES = {
    "_meta": {"schema": "hires_v/1", "doc43": "§14.3 as amended by §0.4 (V-D18)", "author": "content pack (doc 47): effects from doc 43; salaries designed, in Act IV's band ($320-380K)"},
    "hires": [
        {"id": "head_of_grid_strategy", "salary_usd_yr": 330000, "hire_bandwidth": 1,
         "effect": {"upgrade_bill_mult": 0.75, "upgrade_tail_chance_mult": 0.5},
         "note": "\"The $400-600 tail halved\" read as the tail's chance (20% → 10%), not its size (mine, reversible)"},
        {"id": "head_of_power_trading", "salary_usd_yr": 360000, "hire_bandwidth": 1,
         "effect": {"merchant_sales_mult": 1.05, "contract_output_discount": 0.05}},
    ],
}

if __name__ == "__main__":
    dump("rivals_v.json", RIVALS)
    dump("reading_score_v.json", READING)
    dump("plants_v.json", PLANTS)
    dump("exit_v.json", EXIT)
    dump("wildcards_v.json", WILD)
    dump("hires_v.json", HIRES)
    print("ok")
