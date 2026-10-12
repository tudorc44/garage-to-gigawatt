"""Act V Signals files (doc 47): signals_v_v1..v4.json. Generated, never hand-edited. Everything is designed [D]
(doc 43 §6.3-6.4): Signals are authored per future, never derived from the market files.
Usage: python3 -I signals.py <out dir>"""
import json, sys, hashlib
sys.path.insert(0, __file__.rsplit("/", 1)[0])
from futures import QUARTERS, FUTURES, NAMES, TRIGGER, SIGNAL_START
from signal_paths import LATENT, IND

OUT = sys.argv[1]

META = {
    "grid_queue": ("Grid Queue", "longer waits to connect: median waits, fewer withdrawals, bigger upgrade bills (50 = 2036 levels)",
                   "Median waits, withdrawals and study bills across the big regions"),
    "capacity_market": ("Capacity Market", "capacity auctions clearing hotter: at or above the cap, with the uncapped price far above it (50 = 2036 levels)",
                        "Auction results read against the cap"),
    "ai_demand": ("AI Demand", "AI demand growing faster than the 2036 trend: hyperscaler capex and AI revenue (50 = 2036 trend)",
                  "Hyperscaler capex and AI revenue, read together"),
    "reform_docket": ("Reform Docket", "large-load connection reform moving forward: filed, approved, applied, energised (50 = 2036 status)",
                      "Large-load rules filed, approved and actually energised"),
    "launch_cadence": ("Launch Cadence", "launches a year rising and $/kg quotes falling faster than plan (50 = on plan)",
                       "Launch counts and third-party $/kg quotes against plan"),
    "firm_buildout": ("Firm Build-out", "more firm power coming: announced and delivered reactors, geothermal and gas (50 = 2036 pace)",
                      "Announced and delivered firm MW, read together"),
}
ABOVE = {
    "grid_queue": "Above 50, connecting to the grid is getting slower.",
    "capacity_market": "Above 50, firm capacity is getting scarcer.",
    "ai_demand": "Above 50, demand is beating the 2036 trend.",
    "reform_docket": "Above 50, the large-load rules are moving.",
    "launch_cadence": "Above 50, launch is getting cheaper faster than planned.",
    "firm_buildout": "Above 50, firm power looks set to get more plentiful.",
}

TRIG = {
    "v1": ("The Five-Year Line", "Every big region's grid queue passes five years for a firm connection, and the reform bills stall in committee. Whoever already holds firm megawatts sets the price."),
    "v2": ("The Flexible Lane Opens", "The first large-load fast lane goes live: loads that accept curtailment connect in under two years. Firm power stops being the only way in."),
    "v3": ("The Capex Pause", "Two of the largest AI buyers cut next year's data-centre spending and walk away from queued sites. Speculative requests start withdrawing by the hundred."),
    "v4": ("Launch Breaks $200", "Carrack Heavy posts a third-party price under $200 a kilogram and a weekly flight rate. Orbit starts taking the marginal gigawatt."),
}

DECOY = {
    "v1": {"indicator": "firm_buildout", "quarters": ["2037Q1", "2037Q2", "2037Q3"], "peak_quarter": "2037Q2",
           "name": "The SMR wave",
           "reason": "Ironvale Power and two utilities announce orderbooks for dozens of small reactors, and a fast-track licensing order follows. The orderbooks carry no funding; a handful of units ever get built.",
           "tell": "Firm Build-out jumps on announcements while the Grid Queue keeps lengthening and the Capacity Market stays at the cap. If firm power were really coming, auctions and queues would ease first; none of the orderbooks names a funded unit.",
           "wrong_reading": "v3"},
    "v2": {"indicator": "firm_buildout", "quarters": ["2037Q2", "2037Q3", "2037Q4"], "peak_quarter": "2037Q3",
           "name": "The SMR wave",
           "reason": "Ironvale Power's orderbook headlines promise firm power by the gigawatt. What actually changes the 2038 market is the large-load rulebook, not reactors.",
           "tell": "Firm Build-out spikes on announcements with no delivered megawatts, while the Reform Docket climbs quarter after quarter. The docket is the signal that moves connections; the orderbook is talk.",
           "wrong_reading": "v3"},
    "v3": {"indicator": "capacity_market", "quarters": ["2037Q1", "2037Q2"], "peak_quarter": "2037Q2",
           "name": "The record auction",
           "reason": "A capacity auction clears at the cap with a record uncapped price, after a run of old plant retirements. It looks like the squeeze of Queue is King; it is a one-off on the supply side.",
           "tell": "The Capacity Market spikes while AI Demand slides and the Grid Queue starts to shorten. A real squeeze needs new load; this auction was driven by plants retiring, and the next one clears lower.",
           "wrong_reading": "v1"},
    "v4": {"indicator": "capacity_market", "quarters": ["2037Q3", "2037Q4", "2038Q1"], "peak_quarter": "2037Q4",
           "name": "The capacity squeeze",
           "reason": "A hot summer and three emergency capacity filings send the auction to the cap. It looks like Queue is King, but it is weather and timing; the new load is already booking launches.",
           "tell": "The Capacity Market spikes while Launch Cadence climbs every quarter and AI Demand on the ground flattens. A real squeeze needs new ground load; this one fades as orbit takes the marginal gigawatt.",
           "wrong_reading": "v1"},
}

H = {  # one headline per quarter in which a series moves (|change| >= 3), the decoy quarters and the trigger quarter
    ("v1", "grid_queue"): {
        "2036Q4": "PJM's median wait for a firm connection ticks past twenty quarters.",
        "2037Q1": "Withdrawals dry up: almost nobody gives back a queue position this quarter.",
        "2037Q2": "Study bills climb as the network runs out of headroom in the data-centre zones.",
        "2037Q3": "ERCOT's large-load queue grows again despite batch studies.",
        "2037Q4": "The Five-Year Line: firm requests now wait more than five years in every big region.",
        "2038Q1": "Developers start paying premiums just to buy sites that hold a queue position.",
    },
    ("v1", "capacity_market"): {
        "2036Q4": "The auction clears at the cap again; the uncapped price would have been far higher.",
        "2037Q1": "Retirements outpace new firm capacity for a third straight year.",
        "2037Q2": "Utilities file to extend old plants rather than wait for new ones.",
        "2037Q3": "Capacity at the cap in every zone; the gap to the uncapped price widens.",
        "2037Q4": "Regulators signal the price cap will be lifted for the next auction.",
        "2038Q1": "The cap rises 30% and the auction clears at the new ceiling.",
    },
    ("v1", "ai_demand"): {
        "2036Q4": "Hyperscalers raise next year's capex guidance for the fourth time running.",
        "2037Q1": "AI revenue beats forecasts; the spending gap narrows instead of widening.",
        "2037Q2": "Labs book compute two years ahead and pay for it up front.",
        "2037Q4": "Data-centre power demand forecasts are revised up again.",
    },
    ("v1", "firm_buildout"): {
        "2037Q1": "Ironvale Power announces an orderbook for two dozen small reactors.",
        "2037Q2": "A fast-track licensing order and two utility orderbooks: \"dozens of reactors\" by 2045.",
        "2037Q3": "Analysts total the orderbooks at 9 GW; none of the announcements names its funding.",
        "2037Q4": "Ironvale delays its first site decision to 2039.",
        "2038Q1": "Delivered firm MW this year: one geothermal block and a gas plant.",
    },
    ("v2", "grid_queue"): {
        "2038Q1": "The first curtailable loads connect through the new fast lane.",
        "2038Q2": "Firm requests start leaving the queue for the flexible lane.",
        "2038Q3": "Median waits for firm connections fall for the first time in a decade.",
    },
    ("v2", "capacity_market"): {
        "2038Q1": "Flexible load bids into the auction as capacity and clears below the cap.",
        "2038Q2": "The capacity price falls again as curtailable demand counts as supply.",
        "2038Q3": "Auction results: comfortably below the cap in every zone.",
    },
    ("v2", "reform_docket"): {
        "2037Q2": "The federal regulator approves the first RTO's large-load filing.",
        "2037Q3": "PJM files its flexible connection rules: 180 hours of curtailment a year, 24-hour notice.",
        "2037Q4": "ERCOT's curtailment manager passes its trial; two more RTOs file.",
        "2038Q1": "The Flexible Lane Opens: curtailable loads connect in under two years.",
        "2038Q2": "Co-location rules finalised: loads behind a plant connect without the queue.",
    },
    ("v2", "firm_buildout"): {
        "2037Q2": "Ironvale Power unveils a twenty-reactor orderbook with three utilities.",
        "2037Q3": "\"Firm power for everyone by 2042\": the reactor orderbooks top 8 GW.",
        "2037Q4": "None of the new orderbooks has reached a final investment decision.",
        "2038Q1": "Ironvale's first site slips to 2040; the market barely notices.",
        "2038Q2": "Delivered firm MW: flat on last year.",
    },
    ("v3", "grid_queue"): {
        "2037Q2": "Queue withdrawals jump as speculative data-centre sites give back positions.",
        "2037Q3": "Study bills come in lower: the network has headroom again in two zones.",
        "2037Q4": "The Capex Pause: hundreds of queued sites withdraw in a quarter.",
        "2038Q1": "Median waits fall below four years in PJM for the first time since 2030.",
        "2038Q2": "ERCOT reports its large-load queue shrinking for the third straight quarter.",
    },
    ("v3", "capacity_market"): {
        "2037Q1": "Record auction: capacity clears at the cap after a wave of plant retirements.",
        "2037Q2": "The uncapped price would have been the highest ever; traders call it a squeeze.",
        "2037Q3": "The next auction clears below the cap as two retirements are deferred.",
        "2037Q4": "Load forecasts are cut and the auction clears well below the cap.",
        "2038Q1": "Capacity prices fall by a third in a year.",
        "2038Q2": "Merchant plants report their weakest capacity income since 2029.",
        "2038Q3": "Capacity clears at half the cap.",
    },
    ("v3", "ai_demand"): {
        "2037Q1": "AI revenue misses forecasts; two labs slow their training plans.",
        "2037Q2": "GPU rental rates slide on idle capacity.",
        "2037Q3": "A large AI buyer cancels two campuses before construction.",
        "2037Q4": "The Capex Pause: the biggest buyers cut next year's data-centre spending.",
        "2038Q1": "Analysts call it a plateau: demand flat, efficiency up.",
    },
    ("v3", "firm_buildout"): {
        "2037Q1": "A small reactor orderbook is announced for the 2040s.",
        "2037Q2": "Geothermal developers report record offtake interest.",
        "2037Q4": "The reactor orderbook is put on hold as load forecasts fall.",
        "2038Q1": "Two planned gas plants are cancelled.",
        "2038Q2": "Firm projects in development fall for the first time since 2029.",
    },
    ("v4", "capacity_market"): {
        "2037Q3": "Three utilities file for emergency capacity after a record heat wave.",
        "2037Q4": "The capacity auction clears at the cap; brokers call ground power the scarcest thing of the decade.",
        "2038Q1": "The next auction clears below the cap as summer demand fades.",
        "2038Q2": "Capacity prices settle back to their 2037 level.",
        "2039Q1": "Ground capacity prices ease as new compute load lands in orbit.",
        "2039Q2": "The capacity auction clears a quarter below the cap.",
    },
    ("v4", "launch_cadence"): {
        "2037Q2": "Carrack Heavy flies a booster for the twentieth time.",
        "2037Q3": "Third-party launch quotes fall below $250 a kilogram.",
        "2037Q4": "Weekly heavy launches become routine at two pads.",
        "2038Q1": "Northgate matches Carrack's price for the first time.",
        "2038Q2": "Launch Breaks $200: a third-party price under $200 a kilogram.",
        "2038Q3": "Orbital compute operators book a year of launches in a single quarter.",
    },
}

REASONING = {
    "v1": "Demand keeps climbing and reform stalls: waits stay above five years, capacity sits at the cap, and whoever already holds firm megawatts sets the price.",
    "v2": "Large-load reform works: curtailable and co-located loads connect in one to three years, so flexibility is paid and firmness less.",
    "v3": "AI demand flattens near the low case: speculative queue positions withdraw, capacity prices fall, and late plants and merchant megawatts strand.",
    "v4": "Launch falls below $200 a kilogram and toward $100: orbital compute takes the marginal gigawatt, and ground prices soften late.",
}


def noise(ind, t):
    h = hashlib.sha256(f"act5:{ind}:{t}".encode()).digest()
    return h[0] % 13 - 6  # -6..+6, the same in every future (as Act IV)


def build():
    for f in FUTURES:
        tq = TRIGGER[f]
        s0 = SIGNAL_START[f]
        dc = DECOY[f]
        inds = []
        for ind in IND:
            lat = LATENT[f][ind]
            label, higher, note_head = META[ind]
            series = []
            prev = None
            for t, q in enumerate(QUARTERS):
                disp = 50 if t <= 1 else max(0, min(100, lat[t] + noise(ind, t)))
                arrow = "flat" if prev is None or abs(disp - prev) < 3 else ("up" if disp > prev else "down")
                if t <= 1:
                    tag = "baseline"
                elif ind == dc["indicator"] and q in dc["quarters"]:
                    tag = "decoy"
                elif t < s0:
                    tag = "quiet"
                elif t < tq:
                    tag = "signal_window"
                else:
                    tag = "aftermath"
                lo, hi = max(0, lat[t] - 3), min(100, lat[t] + 3)
                e = {"quarter": q, "displayed": disp, "arrow": arrow, "role_tag": tag,
                     "sharp": {"low": lo, "high": hi, "note": f"{note_head}: {lo}-{hi}. {ABOVE[ind]}"}}
                hl = H.get((f, ind), {}).get(q)
                moved = t > 0 and abs(lat[t] - lat[t - 1]) >= 3
                if moved and not hl:
                    raise SystemExit(f"missing headline {f} {ind} {q}")
                if hl:
                    e["headline"] = hl
                series.append(e)
                prev = disp
            inds.append({"id": ind, "label": label, "higher_means": higher, "authoring_latent": lat, "series": series})
        title, body = TRIG[f]
        doc = {
            "schema_version": 1,
            "future": f,
            "future_name": NAMES[f],
            "reasoning": REASONING[f],
            "DO_NOT_EXPOSE": "future_name, reasoning, trigger, decoy, authoring_latent and role tags are hidden: only the chapter report reveals them. Headlines are shown in play (they are news, written to fit every reading until the trigger).",
            "trigger": {"quarter": QUARTERS[tq], "title": title, "body": body, "card_id": f"v_{f}_c4",
                        "signals_start_quarter": QUARTERS[s0], "quarters_of_warning": tq - s0},
            "decoy": {k: v for k, v in dc.items()},
            "indicators": inds,
        }
        json.dump(doc, open(f"{OUT}/signals_v_{f}.json", "w"), indent=2, ensure_ascii=False)
        open(f"{OUT}/signals_v_{f}.json", "a").write("\n")


if __name__ == "__main__":
    build()
    print("ok")
