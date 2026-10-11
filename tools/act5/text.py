"""Act V text (doc 47): text_v.en.json (UI, glossary, reveals, titles, exit) and epilogue_v.json.
Usage: python3 -I text.py <out dir>"""
import json, sys

OUT = sys.argv[1]

T = {
    # ---- A5-01 Act V intro
    "a5.intro.title": "Act V: Firm",
    "a5.intro.years": "2036 to 2040",
    "a5.intro.lead": "The plants you backed in the 2020s are switching on, or failing to. The grid queue runs years long. Your question now: what kind of megawatt will the late 2030s pay for, and when do you cash out?",
    "a5.intro.carry": "You bring in your sites, leases, plants and stakes, your orbital fleet, your debts and your standing with regulators. Your Moon programme becomes one holding.",
    "a5.intro.mw": "Your megawatts now come in four kinds: Firm, Flexible, Orbital and Lunar.",
    "a5.intro.new": "New this act: plants that earn on their output, a visible grid queue, plant finance and fund sales, follow-on units, an orbital replacement cycle, and in 2040 your exit.",
    "a5.intro.exposure": "The futures can move {share}% of your company: leases {leases}%, free megawatts {free}%, plants {plants}%.",
    "a5.intro.exposure_low": "Only {share}% of your company is exposed to this act's question. Most of your value sits in cash and orbit, so the futures will barely touch it.",
    "a5.intro.exposure_high": "{share}% of your company rides on what a ground megawatt is worth. This act's question is your question.",
    "a5.intro.scenarios": "Nobody knows the world after 2035. The four futures in this act are scenarios built on real evidence, not forecasts, and the game will say which numbers it invented.",
    "a5.intro.cta": "Start 2036",

    # ---- MW strip and dashboard (A5-02)
    "a5.mw.firm": "Firm",
    "a5.mw.flexible": "Flexible",
    "a5.mw.orbital": "Orbital",
    "a5.mw.lunar": "Lunar",
    "a5.mw.firm.tip": "Power on demand from your plants (your stake or offtake) and grid MW under firm contracts.",
    "a5.mw.flexible.tip": "Load you have enrolled as curtailable: it can be cut when the grid asks.",
    "a5.mw.orbital.tip": "IT megawatts on live satellites.",
    "a5.mw.lunar.tip": "Kilowatts on your lunar holding. Shown only; the Moon is offstage this act.",
    "a5.dash.signals": "Signals",
    "a5.dash.plants": "Plants at a glance",
    "a5.dash.queue": "Queue at a glance",
    "a5.dash.scarcity": "Scarcity index",
    "a5.dash.scarcity.tip": "What the market pays for ground megawatts against 2036 (1.00). New leases, renewals and the ground multiple follow it.",
    "a5.dash.powered": "Powered land",
    "a5.dash.powered.tip": "What a buyer pays for an energized megawatt you hold but don't use.",
    "a5.dash.exposure": "Exposure",

    # ---- A5-03 Plants board
    "a5.plants.title": "Plants",
    "a5.plants.col.stage": "Stage",
    "a5.plants.col.cf": "Capacity factor",
    "a5.plants.col.output": "Output this quarter",
    "a5.plants.col.contracts": "Contracted",
    "a5.plants.col.value": "Your stake's value",
    "a5.plants.col.debt": "Plant debt",
    "a5.plants.col.dscr": "Coverage",
    "a5.plants.stage.licensing": "Licensing",
    "a5.plants.stage.building": "Building",
    "a5.plants.stage.waiting": "Waiting for the grid",
    "a5.plants.stage.research": "Research",
    "a5.plants.stage.operating": "Operating",
    "a5.plants.stage.cancelled": "Cancelled",
    "a5.plants.stage.folded": "Folded",
    "a5.plants.lockup": "Locked up: coverage below 1.15, so the plant keeps its cash until it recovers.",
    "a5.plants.restructure": "Restructured: coverage stayed below 1.0 for a year; your stake was halved.",
    "a5.plants.taken": "Taken by lenders after two years below 1.0 coverage.",
    "a5.plants.first_power": "{plant} reaches first power. Its value now follows what it earns.",

    # ---- A5-04 Queue
    "a5.queue.title": "Queue",
    "a5.queue.col.site": "Site",
    "a5.queue.col.region": "Region",
    "a5.queue.col.mw": "MW",
    "a5.queue.col.requested": "Requested",
    "a5.queue.col.expected": "Expected",
    "a5.queue.col.bill": "Upgrade bill",
    "a5.queue.col.premium": "Position premium",
    "a5.queue.action.pay": "Pay the bill",
    "a5.queue.action.colocate": "Co-locate at a plant",
    "a5.queue.action.fast_lane": "Take the fast lane",
    "a5.queue.action.sell": "Sell with its site",
    "a5.queue.action.withdraw": "Withdraw",
    "a5.queue.study": "The study for {site} names a network upgrade bill of ${usd_kw}/kW. Pay it to keep your place, or withdraw. Paying does not make the wait shorter.",
    "a5.queue.fast_lane.terms": "Connect in about {q} quarters if you accept up to {h} hours of curtailment a year, on 24 hours' notice (about 0.5% of your output).",
    "a5.queue.security": "Holding a position costs ${usd_kw}/kW of security.",
    "a5.queue.colocate.note": "A site that takes power from one of your operating plants connects behind the plant, with no wait, up to the plant's delivered firm MW.",

    # ---- A5-05 Follow-on unit
    "a5.followon.title": "The next unit",
    "a5.followon.egs": "The developer offers the next geothermal block at ${usd_kw}/kW, about {q} quarters to first power.",
    "a5.followon.smr": "The developer offers unit 2 at 85% of what unit 1 really cost. Most second units can't finish before 2040; until then they're valued at their milestones.",
    "a5.followon.roles": "Take a stake, sign offtake, or prepay, as with the first unit.",

    # ---- A5-06 Capital additions
    "a5.capital.plant_debt": "Plant debt",
    "a5.capital.plant_debt.contracted": "Contracted plants (70%+ sold forward): up to 65% of value at SOFR + 2.00%, 15-18 years.",
    "a5.capital.plant_debt.merchant": "Merchant plants: up to 40% of value at SOFR + 2.75%, 7 years, half of spare cash swept to repay.",
    "a5.capital.fund_sale": "Sell to a fund",
    "a5.capital.fund_sale.terms": "A fund pays your stake's value × today's bid index ({index}).",
    "a5.capital.contract": "Contract output",
    "a5.capital.contract.terms": "Sell up to 80% of your share for {years} years at today's price minus {discount}%.",

    # ---- A5-07 Quarter report additions
    "a5.report.plants": "Plants",
    "a5.report.queue": "Queue",
    "a5.report.lease_offer": "{tenant}'s lease is up. Lock it for {years} years at today's rate, or roll it for 2 years and reprice at the market.",
    "a5.report.lease.long": "Lock it long",
    "a5.report.lease.short": "Roll it short",

    # ---- A5-08 Chapter report
    "a5.chapter.title": "Act V: the future revealed",
    "a5.chapter.future": "The future was: {name}",
    "a5.chapter.trigger": "The turn came in {quarter}: {title}.",
    "a5.chapter.decoy": "The decoy: {decoy}",
    "a5.chapter.tell": "The tell: {tell}",
    "a5.chapter.disclaimer": "This was one scenario of four, built on real evidence. It is not a forecast.",
    "a5.reveal.v1.name": "Queue is King",
    "a5.reveal.v1.line": "Demand kept climbing and reform stalled. Waits stayed above five years, and whoever held firm megawatts set the price.",
    "a5.reveal.v1.decoy": "The SMR wave: orderbooks for dozens of reactors in 2037, and a handful built by 2040.",
    "a5.reveal.v1.tell": "Firm Build-out jumped on announcements while the queue kept lengthening and auctions stayed at the cap. No orderbook named a funded unit.",
    "a5.reveal.v2.name": "Flexible Lane",
    "a5.reveal.v2.line": "Large-load reform worked. Loads that accepted curtailment connected in under two years, and flexibility earned more than firmness.",
    "a5.reveal.v2.decoy": "The SMR wave: reactor orderbooks promised cheap firm power, while the rulebook was what changed the market.",
    "a5.reveal.v2.tell": "The Reform Docket climbed every quarter from 2037Q2. The orderbooks delivered no megawatts.",
    "a5.reveal.v3.name": "Demand Plateau",
    "a5.reveal.v3.line": "AI demand flattened in 2037. Speculative positions withdrew, capacity prices halved and merchant power fell by a third.",
    "a5.reveal.v3.decoy": "The record auction of 2037: capacity cleared at the cap after a wave of plant retirements.",
    "a5.reveal.v3.tell": "The auction spiked while AI Demand slid and the queue started to shorten. A real squeeze needs new load.",
    "a5.reveal.v4.name": "Up and Out",
    "a5.reveal.v4.line": "Launch fell below $200 a kilogram in 2038. Orbit took the marginal gigawatt and ground prices softened from 2039.",
    "a5.reveal.v4.decoy": "The SMR wave: reactor orderbooks promised abundant ground power.",
    "a5.reveal.v4.tell": "Delivered firm MW stayed flat while Launch Cadence climbed every quarter. The pressure on the ground came from above.",
    "a5.chapter.ventures": "Your ventures",
    "a5.chapter.venture.built": "{venture}: built. First power in {quarter}.",
    "a5.chapter.venture.slipped": "{venture}: still building at the end of 2040.",
    "a5.chapter.venture.cancelled": "{venture}: cancelled in {quarter}.",
    "a5.chapter.venture.folded": "{venture}: folded in {quarter}.",
    "a5.chapter.rivals": "The rivals",
    "a5.chapter.mw_title": "Your megawatts: {title}",

    # ---- Megawatt titles (the largest share of the end-2040 MW decides; Landlord if leased grid MW lead)
    "a5.mwtitle.firm": "Firm",
    "a5.mwtitle.firm.line": "Most of your megawatts run whatever the weather, from plants you own or buy from.",
    "a5.mwtitle.flexible": "Flexible",
    "a5.mwtitle.flexible.line": "Most of your megawatts bend when the grid asks, and the grid pays you for it.",
    "a5.mwtitle.orbital": "Orbital",
    "a5.mwtitle.orbital.line": "Most of your megawatts are in orbit, on satellites you keep replacing.",
    "a5.mwtitle.landlord": "Landlord",
    "a5.mwtitle.landlord.line": "Most of your megawatts are grid power under your tenants' roofs.",

    # ---- A5-09 The founder's exit
    "a5.exit.title": "What is it worth, and who gets it?",
    "a5.exit.lead": "Buyers are at the door. Choose once, in 2040Q3 or 2040Q4.",
    "a5.exit.sell": "Sell the company",
    "a5.exit.sell.terms": "A strategic buyer bids {bid}× your valuation: ${amount} for your stake, today.",
    "a5.exit.plants": "Sell the plants, keep the platform",
    "a5.exit.plants.terms": "Funds buy your plant stakes at {index}× their value; you keep everything else.",
    "a5.exit.hold": "Hold",
    "a5.exit.hold.terms": "Keep the company. Its worth depends on what comes after 2040, which nobody can see from here.",
    "a5.exit.default": "If you don't choose, you hold.",
    "a5.exit.note": "The bid is known. The outlook is not. That is the decision.",
    "a5.exit.disclaimer": "The outlook after 2040 is the game's assumption for this future, not a forecast.",

    # ---- A5-10 Finale additions
    "a5.finale.row": "Act V, 2040",
    "a5.finale.retired": "Retired in 2035",
    "a5.finale.mwline": "From {start} in {year} to {firm} firm, {flexible} flexible and {orbital} orbital megawatts in 2040.",

    # ---- A5-11 Start at Act V, and Act IV's chapter report
    "a5.start.title": "Start at Act V",
    "a5.start.firm_builder": "Firm Builder",
    "a5.start.firm_builder.line": "A ground landlord whose first geothermal plant has just switched on.",
    "a5.start.orbital_landlord": "Orbital Landlord",
    "a5.start.orbital_landlord.line": "A ground-and-orbit company whose five orbital blocks all reach end of life inside the act: replacing them is its game.",
    "a5.start.small_grid": "Small Grid",
    "a5.start.small_grid.line": "One site, a battery and a place in the queue: the cheap seat.",
    "a5.start.scenario_mode": "Scenario Mode: pick the future openly (unlocked after one Act V finish).",
    "a4.chapter.continue_v": "Continue to Act V",
    "a4.chapter.retire": "Retire at 2035",

    # ---- Signals panel (labels; per-indicator text lives in signals_v_*.json)
    "a5.signals.read": "Read the market",
    "a5.signals.note": "Six indicators, 0-100 (50 = the 2036 level). One of them will mislead you this act.",

    # ---- Glossary
    "glossary.firm_mw": "Firm MW: power available on demand, whatever the weather. A plant that runs most of the year (nuclear, geothermal, gas), or renewables backed by long storage.",
    "glossary.flexible_load": "Flexible load: a load that agrees to cut its use when the grid asks, in exchange for a faster connection or payments.",
    "glossary.queue_position": "Queue position: your place in a grid operator's line of requests to connect. It moves only with its site.",
    "glossary.network_upgrades": "Network upgrades: the lines and substations a new connection needs. The study names the bill; you pay it to stay in line, or withdraw.",
    "glossary.merchant": "Merchant: selling power at the market price, with no long contract.",
    "glossary.cod": "COD (commercial operation date): the day a plant starts selling power.",
    "glossary.infrastructure_fund": "Infrastructure fund: an investor that buys operating plants for their long, steady cash flows.",
    "glossary.capacity_factor": "Capacity factor: a plant's actual output divided by what it would make at full power all year.",
    "glossary.scarcity_index": "Scarcity index: what the market pays for ground megawatts compared with 2036 (1.00). It sets new rents, renewals and the ground multiple.",
    "glossary.powered_value": "Powered value: what a buyer pays for a megawatt that is energized but unused.",
    "glossary.fast_lane": "Fast lane: a connection route for loads that accept curtailment. Faster than the firm queue, where reform allows it.",
    "glossary.lock_or_roll": "Lock or roll: at a renewal, lock the tenant in for 8-10 years at today's rate, or roll for 2 years and reprice at the market.",
    "glossary.capacity_market": "Capacity market: an auction where the grid pays plants to be available at peak. The cap is the most it will pay.",
    "glossary.dscr": "Coverage (DSCR): a plant's cash flow divided by its debt payments. Below 1.15 lenders lock its cash in; below 1.0 for long enough, they take over.",
    "glossary.plant_multiple": "Plant multiple: what buyers pay for a year of a plant's earnings. Contracted output earns a higher multiple than merchant output.",
    "glossary.follow_on_unit": "Follow-on unit: the next reactor or geothermal block from a developer whose first one worked, usually cheaper than the first.",
    "glossary.co_location": "Co-location: placing a load right next to a plant so it connects behind the plant, without the grid queue.",
    "glossary.exposure": "Exposure: the share of your company the futures can move this act: leases, free energized megawatts and plants.",
}

EPI = {
    "_meta": {"schema": "epilogue_v/1", "doc43": "§15.3 (the finale at 2040: pools for the futures, the exit, the ventures, the lunar plant, the bitcoin coda)",
              "author": "content pack (doc 47): text only, deterministic, no number after 2040, hyphens not em dashes",
              "choose": "3-5 lines: the arc line, the future, the exit, one line per venture held (at most two, the largest stakes first), then the lunar line if a production plant was decided, else the bitcoin coda. Within a pool, pick by seed (stream act5_epilogue)."},
    "arc": [
        "From {start_kw} in a {start_place} to {end_mw} megawatts of {mw_title} power.",
        "It started with {start_kw} and a fan that never stopped. It ended with {end_mw} megawatts.",
    ],
    "future": {
        "v1": ["The queue never cleared. Megawatts you could switch on were the scarcest thing you could own.",
               "By 2040 a place in line was worth more than the land under it."],
        "v2": ["The grid learned to bend. The loads that bent with it got in first.",
               "Firm power still mattered. Flexible power mattered more."],
        "v3": ["The boom flattened into a plateau. The careful kept what they had built.",
               "Demand stopped climbing, and the queue emptied as quickly as it had filled."],
        "v4": ["The marginal gigawatt went up, not out. Rockets set the price of compute.",
               "The ground stayed busy. The sky got busier."],
    },
    "exit": {
        "sold": ["You sold at the top of your own story. Someone else will write the next chapter.",
                 "You took the bid. Whatever comes after 2040 is their problem now."],
        "sold_plants": ["You sold the plants to people who wanted forty years of quiet cash, and kept the part you liked running.",
                        "The funds got the turbines and reactors. You kept the platform and your options."],
        "held": ["You didn't sell. The next decade will tell you if that was courage or habit.",
                 "You held on. The company is still yours, and so is the risk."],
    },
    "venture": {
        "built": ["{venture} came on line in {year} and has run ever since.",
                  "The {venture} bet you made back in the 2020s finally paid in power."],
        "slipped": ["{venture} is still being built. It may yet be the best thing you ever backed.",
                    "{venture} slipped past 2040. The crews are still on site."],
        "cancelled": ["{venture} never got its funding. The site is a field again.",
                      "{venture} was cancelled before it poured concrete."],
        "folded": ["{venture} folded. It got closer than most.",
                   "The fusion bet folded, as most of them did."],
    },
    "lunar": {
        "first_tonnes": ["Somewhere near the lunar south pole, the plant you decided on in the 2030s is producing its first tonnes of water.",
                         "Your lunar plant poured its first water as the decade turned."],
        "not_yet": ["Your lunar plant is still waiting for its first tonnes. The ridge isn't going anywhere.",
                    "The Moon is still a promise on your balance sheet."],
        "never": ["You never went to the Moon. The ground, and the sky, were enough."],
    },
    "bitcoin": [
        "In 2040 the block reward halved for the eighth time. Somewhere a rig is still mining.",
        "The eighth halving came and went. The coins from the bedroom are still in the treasury.",
        "Bitcoin halved again in 2040. The garage would have found that hard to believe.",
    ],
}

if __name__ == "__main__":
    for k, v in T.items():
        assert "—" not in v, k
    for pool in json.dumps(EPI, ensure_ascii=False):
        pass
    assert "—" not in json.dumps(EPI, ensure_ascii=False)
    with open(f"{OUT}/text_v.en.json", "w") as fh:
        json.dump(T, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    with open(f"{OUT}/epilogue_v.json", "w") as fh:
        json.dump(EPI, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    print(len(T), "strings")
