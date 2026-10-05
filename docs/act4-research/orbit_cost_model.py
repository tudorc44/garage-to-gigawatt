"""Orbit vs ground cost of AI compute, per MW of IT load per year, 2026-2035.

A deliberately simple, transparent levelised-cost model for the Garage to Gigawatt Act IV design (doc 31).
Every parameter carries its basis: S = sourced (research notes 02/03/04/08), I = inference from sourced values,
G = designed for the game (no source; to tune). Nothing here is a forecast; it is a calculator over ranges.

Method: each capex item is turned into an equal yearly payment over its life at the cost of capital
(capital recovery factor, CRF), then yearly opex is added. Output: $M per MW of IT load per year, the
orbit/ground ratio, and $ per GPU-hour at an assumed GPU density.

Run:  python3 orbit_cost_model.py  (writes results.md next to this file)
"""
from dataclasses import dataclass, replace
import itertools, json, os

def crf(r, n):
    """Capital recovery factor: yearly payment per $1 of capex over n years at rate r."""
    return r * (1 + r) ** n / ((1 + r) ** n - 1)

HOURS = 8760

# ---------------------------------------------------------------- ground ----
@dataclass
class Ground:
    facility_usd_mw: float = 12.5e6   # S: $11-15M/MW AI-ready (Axis/JLL/T&T); McCalip $12.5/W; Cushman $17.6M high case
    facility_life: int = 15           # S: Epoch/Axis 14-15 yr
    it_usd_mw: float = 33e6           # S/I: $22-33M/MW GPU servers (Epoch $37.2M/MW all-in minus facility; SemiAnalysis implied ~$33M)
    it_life: int = 5                  # S: Epoch/Axis base case 5 yr (tests 3 and 7)
    it_spares: float = 0.05           # S: SemiAnalysis 5% cold spares
    pue: float = 1.15                 # S: 1.14 (Axis) - 1.20 (McCalip)
    power_usd_mwh: float = 100.0      # I: 8.62 c/kWh 2025 industrial (EIA, S); 8-12 c/kWh 2031-35 band is inference
    opex_ex_energy_usd_mw_yr: float = 0.30e6  # S/I: total opex ~$0.9M/MW/yr, energy ~67% (Axis, Epoch)
    wacc: float = 0.103               # S: SemiAnalysis terrestrial 10.3%
    power_delay_years: float = 0.0    # S: median >5 yr to connect (LBNL); used as a sensitivity only

    def cost(self):
        fac = self.facility_usd_mw * crf(self.wacc, self.facility_life)
        # waiting for power: the facility capex sits idle, carrying capital cost (I)
        fac *= (1 + self.wacc) ** self.power_delay_years
        it = self.it_usd_mw * (1 + self.it_spares) * crf(self.wacc, self.it_life)
        energy = HOURS * self.pue * self.power_usd_mwh
        return {"facility": fac, "it": it, "energy": energy, "opex": self.opex_ex_energy_usd_mw_yr}

# ----------------------------------------------------------------- orbit ----
@dataclass
class Orbit:
    mass_t_mw: float = 20.0           # S/I: whole satellite per MW IT: Starlink V2 Mini heritage ~20 t/MW; credible 2030s 12-20; bull 5-8
    hw_usd_kg: float = 1000.0         # S: satellite hardware ~$1,000/kg ($22/W McCalip); SpaceX targets half (TechCrunch)
    launch_usd_kg: float = 3600.0     # S: Falcon 9 ~$3,250-4,230/kg list; Suncatcher uses $3,600
    it_usd_mw: float = 33e6           # same GPUs as the ground case (S/I)
    it_spares: float = 0.20           # S: SemiAnalysis 20% orbital redundancy (McCalip +19.6% for 9%/yr failures)
    life: int = 5                     # S: 5-yr design life (Google, SemiAnalysis); GPUs and satellite retire together
    launch_loss: float = 0.03         # S/I: 2023-25 global failure 6%/3%/2.4%; mature vehicle lower; self-insured expected loss
    ops_usd_mw_yr: float = 0.25e6     # G: mission ops, ground stations, optical links, collision avoidance (no sourced figure)
    wacc: float = 0.15                # S: SemiAnalysis orbital 15% falling to 10.3%
    # destination multiplier on Earth-launched delivery price: 1.0 = LEO/SSO; ~2.5 for GEO/high orbit (I: delta-v table, LEO->GEO ~+3.9 km/s)
    dest_mult: float = 1.0
    extra_shield_frac: float = 0.0    # G/I: extra mass for a harsher radiation environment (high orbit), as a share of base mass
    # lunar supply
    lunar_share: float = 0.0          # share of total satellite mass supplied from the Moon (passive mass only: radiators, structure, shielding)
    lunar_usd_kg: float = 0.0         # delivered, fabricated cost of lunar-sourced passive mass at the destination ($/kg)
    passive_hw_frac: float = 0.5      # G: passive panels/trusses cost ~half the satellite-average $/kg to build on Earth

    def cost(self):
        m = self.mass_t_mw * 1000 * (1 + self.extra_shield_frac)       # kg per MW of IT
        m_lunar = m * self.lunar_share
        m_earth = m - m_lunar
        # Earth-sourced mass: build + launch (delivery to destination)
        earth_hw = m_earth * self.hw_usd_kg
        # the lunar-replaced mass would have been cheaper-than-average passive hardware; remove only that
        # (the remaining Earth mass is weighted to electronics, so its $/kg would rise; we keep the
        #  average for simplicity and correct by charging the replaced share at passive cost)
        earth_hw = (m * self.hw_usd_kg) - m_lunar * self.hw_usd_kg * self.passive_hw_frac
        launch = m_earth * self.launch_usd_kg * self.dest_mult
        lunar = m_lunar * self.lunar_usd_kg
        it = self.it_usd_mw * (1 + self.it_spares)
        capex = (earth_hw + launch + lunar + it) / (1 - self.launch_loss)
        k = crf(self.wacc, self.life)
        return {"hardware": earth_hw / (1 - self.launch_loss) * k,
                "launch": launch / (1 - self.launch_loss) * k,
                "lunar": lunar / (1 - self.launch_loss) * k,
                "it": it / (1 - self.launch_loss) * k,
                "opex": self.ops_usd_mw_yr}

def total(d):
    return sum(d.values())

# --------------------------------------------------------------- scenarios ----
# Third-party launch price, LEO, $/kg (S/I: research note 03 suggested path; $90M/2029 Starlab contract; Google <$200 mid-2030s)
LAUNCH = {
    "base": {2026: 3600, 2028: 1200, 2031: 600, 2033: 450, 2035: 300},
    "bull": {2026: 3600, 2028: 900, 2031: 350, 2033: 220, 2035: 150},
    "bear": {2026: 3600, 2028: 1500, 2031: 900, 2033: 850, 2035: 800},
}
# Whole-satellite mass per MW IT, t (S/I: note 02 build-up: flown 25-50, credible 2030s 12-20, proponent 5-7)
MASS = {
    "base": {2026: 25, 2028: 22, 2031: 18, 2033: 15, 2035: 13},
    "bull": {2026: 25, 2028: 18, 2031: 12, 2033: 9, 2035: 7},
    "bear": {2026: 30, 2028: 28, 2031: 25, 2033: 23, 2035: 22},
}
# Satellite hardware $/kg (S: ~$1,000 today; SpaceX targets half; third party assumed slower)
HW = {
    "base": {2026: 1000, 2028: 900, 2031: 800, 2033: 700, 2035: 600},
    "bull": {2026: 1000, 2028: 800, 2031: 600, 2033: 500, 2035: 400},
    "bear": {2026: 1000, 2028: 1000, 2031: 1000, 2033: 950, 2035: 900},
}
WACC_ORBIT = {2026: 0.15, 2028: 0.15, 2031: 0.13, 2033: 0.12, 2035: 0.11}   # S/I: SemiAnalysis 15% falling toward 10.3%
LOSS = {"base": 0.03, "bull": 0.015, "bear": 0.06}                         # I: per-deployment expected loss
GROUND_POWER = {"base": 100.0, "orbit_friendly": 130.0, "ground_friendly": 75.0}  # I: $/MWh 2031-35 band
GPUS_PER_MW = 600   # S/I: 72 GPUs per 120-140 kW rack -> ~515-600 per MW (note 08); used only for $/GPU-hr display

YEARS = [2026, 2028, 2031, 2033, 2035]

def orbit_case(case, year, **kw):
    return Orbit(mass_t_mw=MASS[case][year], hw_usd_kg=HW[case][year], launch_usd_kg=LAUNCH[case][year],
                 wacc=WACC_ORBIT[year], launch_loss=LOSS[case], **kw)

def fmt(x):
    return f"{x/1e6:,.1f}"

def per_gpu_hr(usd_mw_yr):
    return usd_mw_yr / GPUS_PER_MW / HOURS

def main():
    out = []
    P = out.append
    P("# Orbit vs ground: cost-model results (doc 31 appendix)\n")
    P("Generated by `orbit_cost_model.py`. $M per MW of IT load per year, levelised (capex spread over its life at the cost of capital, plus yearly opex). "
      "GPUs are included on both sides at the same price; orbit carries 20% spares, a 5-year life and a 3% (1.5-6%) expected launch loss. "
      "S = sourced, I = inference, G = designed (see the script for each parameter's basis).\n")

    g = Ground()
    gb = g.cost()
    P("## 1. Ground reference (2031-35, central)\n")
    P("| Item | $M/MW/yr |\n|---|---|")
    for k, v in gb.items(): P(f"| {k} | {fmt(v)} |")
    P(f"| **total** | **{fmt(total(gb))}** (≈ ${per_gpu_hr(total(gb)):.2f}/GPU-hour at {GPUS_PER_MW} GPUs/MW) |\n")
    for name, pw in GROUND_POWER.items():
        gg = replace(g, power_usd_mwh=pw)
        P(f"- Ground at ${pw:.0f}/MWh: {fmt(total(gg.cost()))} $M/MW/yr")
    for d in (2, 5):
        gg = replace(g, power_delay_years=d)
        P(f"- Ground with a {d}-year wait for power (facility capital idle): {fmt(total(gg.cost()))} $M/MW/yr")
    P("")

    P("## 2. Orbit, everything launched from Earth (LEO / dawn-dusk SSO)\n")
    P("| Year | Case | t/MW | launch $/kg | hw $/kg | orbit $M/MW/yr | of which launch | ground $M/MW/yr | ratio orbit/ground | orbit $/GPU-hr |")
    P("|---|---|---|---|---|---|---|---|---|---|")
    ratios = {}
    for y in YEARS:
        for case in ("bull", "base", "bear"):
            o = orbit_case(case, y)
            ob = o.cost()
            gpow = {"bull": GROUND_POWER["orbit_friendly"], "base": GROUND_POWER["base"], "bear": GROUND_POWER["ground_friendly"]}[case]
            gt = total(replace(g, power_usd_mwh=gpow).cost())
            r = total(ob) / gt
            ratios[(y, case)] = r
            P(f"| {y} | {case} | {o.mass_t_mw} | {o.launch_usd_kg:,} | {o.hw_usd_kg:,} | {fmt(total(ob))} | {fmt(ob['launch'])} | {fmt(gt)} | {r:.2f}x | ${per_gpu_hr(total(ob)):.2f} |")
    P("\nBull pairs orbit-friendly inputs with expensive ground power ($130/MWh); bear pairs orbit-hostile inputs with cheap ground power ($75/MWh).\n")

    # composition in 2035 base
    o = orbit_case("base", 2035); ob = o.cost()
    P("### Where the orbital dollar goes (2035, base)\n")
    P("| Item | $M/MW/yr | share |\n|---|---|---|")
    for k, v in ob.items(): P(f"| {k} | {fmt(v)} | {v/total(ob):.0%} |")
    P("")

    # break-even launch price
    P("### Launch price at which orbit matches ground (other inputs held at each case)\n")
    P("| Year | Case | ground $M/MW/yr | break-even launch $/kg |")
    P("|---|---|---|---|")
    for y in (2031, 2033, 2035):
        for case in ("bull", "base", "bear"):
            gpow = {"bull": GROUND_POWER["orbit_friendly"], "base": GROUND_POWER["base"], "bear": GROUND_POWER["ground_friendly"]}[case]
            gt = total(replace(g, power_usd_mwh=gpow).cost())
            lo, hi = -5000.0, 20000.0
            for _ in range(80):
                mid = (lo + hi) / 2
                o = replace(orbit_case(case, y), launch_usd_kg=mid)
                if total(o.cost()) > gt: hi = mid
                else: lo = mid
            be = (lo + hi) / 2
            P(f"| {y} | {case} | {fmt(gt)} | {'none (orbit dearer even at $0/kg)' if be <= 0 else f'${be:,.0f}'} |")
    P("")

    P("## 3. Orbit with lunar-sourced passive mass (radiators, structure, shielding)\n")
    P("Lunar mass replaces Earth-built passive hardware (charged at half the satellite-average $/kg) and its launch. "
      "Electronics, GPUs and solar cells stay Earth-sourced. The lunar cost is the delivered, fabricated $/kg at the destination. All lunar inputs are [D]: no study prices lunar structure delivered to orbit (note 08).\n")
    P("| Year | Earth case | lunar share of mass | lunar $/kg delivered | orbit $M/MW/yr | change vs Earth-only | ratio orbit/ground |")
    P("|---|---|---|---|---|---|---|")
    LUNAR = [(0.0, 0), (0.05, 800), (0.15, 500), (0.30, 300), (0.30, 150), (0.60, 150)]
    for y in (2033, 2035):
        for case in ("base", "bull"):
            gpow = {"bull": GROUND_POWER["orbit_friendly"], "base": GROUND_POWER["base"]}[case]
            gt = total(replace(g, power_usd_mwh=gpow).cost())
            base_cost = total(orbit_case(case, y).cost())
            for share, lc in LUNAR:
                o = orbit_case(case, y, lunar_share=share, lunar_usd_kg=lc)
                c = total(o.cost())
                P(f"| {y} | {case} | {share:.0%} | {'-' if share == 0 else f'${lc:,}'} | {fmt(c)} | {(c/base_cost-1):+.1%} | {c/gt:.2f}x |")
    P("")
    # lunar break-even $/kg per year/case (what lunar passive mass must cost to beat Earth build+launch)
    P("### What lunar passive mass must cost to beat Earth-built + Earth-launched (LEO)\n")
    P("Break-even = Earth passive build cost ($/kg × 0.5) + Earth launch $/kg.\n")
    P("| Year | Case | Earth launch $/kg | Earth passive build $/kg | lunar must deliver below |")
    P("|---|---|---|---|---|")
    for y in (2031, 2033, 2035):
        for case in ("bull", "base", "bear"):
            p = LAUNCH[case][y]; h = HW[case][y] * 0.5
            P(f"| {y} | {case} | ${p:,} | ${h:,.0f} | ${p+h:,.0f}/kg |")
    P("")

    P("## 4. High orbit (GEO-class) variant: where lunar supply is advantaged\n")
    P("Earth-launched mass costs ~2.5x its LEO price to reach high orbit (I: delta-v table, LEO→GEO ≈ +3.9 km/s). A harsher radiation environment adds shielding (G: +30% mass). "
      "Lunar-sourced mass costs only ~1.2x its LEO-delivered price there (I: lunar surface→EML1 2.5 km/s, then down to high orbit). Gains: near-continuous sun, little drag, far less debris and traffic (qualitative, notes 02/06).\n")
    P("| Year | Case | lunar share | lunar $/kg (high orbit) | high-orbit $M/MW/yr | ratio vs LEO Earth-only | ratio vs ground |")
    P("|---|---|---|---|---|---|---|")
    for y in (2033, 2035):
        for case in ("base", "bull"):
            gpow = {"bull": GROUND_POWER["orbit_friendly"], "base": GROUND_POWER["base"]}[case]
            gt = total(replace(g, power_usd_mwh=gpow).cost())
            leo = total(orbit_case(case, y).cost())
            for share, lc in [(0.0, 0), (0.15, 600), (0.30, 360), (0.45, 180)]:
                o = orbit_case(case, y, dest_mult=2.5, extra_shield_frac=0.30, lunar_share=share, lunar_usd_kg=lc)
                c = total(o.cost())
                P(f"| {y} | {case} | {share:.0%} | {'-' if share == 0 else f'${lc:,}'} | {fmt(c)} | {c/leo:.2f}x | {c/gt:.2f}x |")
    P("")

    P("### High orbit with lunar-fuelled tugs (added for doc 33, IV-D7): a post-2035 ceiling\n")
    P("Lunar propellant in reusable tugs lowers the Earth-launched high-orbit delivery multiplier from ~2.5x toward ~1.5x (G/[D]: designed from the delta-v advantage; no costed tug architecture exists, doc 31 §2.4). Combined with 30% lunar passive mass at $360/kg. "
      "These volumes are not reachable in 2031-2035: lifting one 5 MW block (~50-75 t) from LEO to high orbit needs over 100 t of propellant (derived: +3.9 km/s at Isp ~450 s), against pilot plants delivering a few tonnes a year to lunar orbit. Read the table as what lunar supply could be worth after 2035, not as an in-act effect.\n")
    P("| Year | Case | high orbit, Earth only | with tugs | change | tugs + 30% lunar mass | change | vs SSO Earth-only | vs ground |")
    P("|---|---|---|---|---|---|---|---|---|")
    for y in (2033, 2035):
        for case in ("base", "bull"):
            gpow = {"bull": GROUND_POWER["orbit_friendly"], "base": GROUND_POWER["base"]}[case]
            gt = total(replace(g, power_usd_mwh=gpow).cost())
            leo = total(orbit_case(case, y).cost())
            a = total(orbit_case(case, y, dest_mult=2.5, extra_shield_frac=0.30).cost())
            b = total(orbit_case(case, y, dest_mult=1.5, extra_shield_frac=0.30).cost())
            c = total(orbit_case(case, y, dest_mult=1.5, extra_shield_frac=0.30, lunar_share=0.30, lunar_usd_kg=360).cost())
            P(f"| {y} | {case} | {fmt(a)} | {fmt(b)} | {b/a-1:+.1%} | {fmt(c)} | {c/a-1:+.1%} | {c/leo:.2f}x | {c/gt:.2f}x |")
    P("\nEven with tugs and lunar mass, a high-orbit block stays ~4-10% dearer than an Earth-only SSO block: high orbit's case is safety (debris, congestion), not price.\n")

    P("## 4b. Doc 33's four futures (added for doc 33's §6.2 and balance target B10)\n")
    P("Each future's designed 2035 inputs run through the same script (G = designed for the game). All four share the 2031 base inputs (launch $600/kg, 18 t/MW, hardware $800/kg, 5-year life, 3% loss, 13% WACC). "
      "Life stands in for the future's true orbital failure rate (more failures, shorter useful life). Ground at $75, $100 and $130/MWh.\n")
    P("| Future | 2035 inputs (launch $/kg, t/MW, hw $/kg, life, loss) | orbit $M/MW/yr | vs ground $100 | range over ground $75-130 |")
    P("|---|---|---|---|---|")
    FUT = [
        ("All, 2031 (common baseline)", dict(launch_usd_kg=600, mass_t_mw=18, hw_usd_kg=800, life=5, launch_loss=0.03, wacc=0.13)),
        ("F1 On Schedule", dict(launch_usd_kg=150, mass_t_mw=10, hw_usd_kg=500, life=6, launch_loss=0.015, wacc=0.11)),
        ("F1, dearer hardware and loss", dict(launch_usd_kg=150, mass_t_mw=10, hw_usd_kg=600, life=6, launch_loss=0.03, wacc=0.11)),
        ("F2 The Wall", dict(launch_usd_kg=600, mass_t_mw=16, hw_usd_kg=800, life=4, launch_loss=0.06, wacc=0.11)),
        ("F3 Closed Shell (SSO)", dict(launch_usd_kg=350, mass_t_mw=11, hw_usd_kg=600, life=5, launch_loss=0.03, wacc=0.11)),
        ("F3, high orbit (x2.5 delivery, +30% shielding)", dict(launch_usd_kg=350, mass_t_mw=11, hw_usd_kg=600, life=5, launch_loss=0.03, wacc=0.11, dest_mult=2.5, extra_shield_frac=0.30)),
        ("F4 Cheap Ground", dict(launch_usd_kg=350, mass_t_mw=11, hw_usd_kg=600, life=5, launch_loss=0.03, wacc=0.11)),
    ]
    for name, kw in FUT:
        o = total(Orbit(**kw).cost())
        rs = [o / total(replace(g, power_usd_mwh=p).cost()) for p in (75.0, 100.0, 130.0)]
        P(f"| {name} | {kw['launch_usd_kg']}, {kw['mass_t_mw']}, {kw['hw_usd_kg']}, {kw['life']} yr, {kw['launch_loss']:.1%} | {fmt(o)} | {rs[1]:.2f}x | {min(rs):.2f}-{max(rs):.2f}x |")
    P("\nF1's ~10 t/MW sits between the credible 2030s range (12-20) and proponents' 5-8 (doc 31 §2.2); F1 reaches 0.9-1.0x, not clear parity. F4's orbit cost matches F3's; F4 differs through falling ground rents, not orbital cost.\n")

    P("## 5. Sensitivities (2033, base)\n")
    o0 = orbit_case("base", 2033); t0 = total(o0.cost())
    gt = total(g.cost())
    sens = [
        ("mass 10 t/MW instead of 15", replace(o0, mass_t_mw=10)),
        ("mass 22 t/MW instead of 15", replace(o0, mass_t_mw=22)),
        ("launch $200/kg instead of $450", replace(o0, launch_usd_kg=200)),
        ("launch $900/kg instead of $450", replace(o0, launch_usd_kg=900)),
        ("hardware $400/kg instead of $700", replace(o0, hw_usd_kg=400)),
        ("life 7 years instead of 5", replace(o0, life=7)),
        ("life 3 years instead of 5 (GPU obsolescence)", replace(o0, life=3)),
        ("spares 10% instead of 20%", replace(o0, it_spares=0.10)),
        ("cost of capital 10.3% (ground parity)", replace(o0, wacc=0.103)),
        ("vertically integrated launcher: launch $60/kg, hw $400/kg", replace(o0, launch_usd_kg=60, hw_usd_kg=400)),
    ]
    P(f"Base 2033 orbit {fmt(t0)} vs ground {fmt(gt)} $M/MW/yr ({t0/gt:.2f}x).\n")
    P("| Change | orbit $M/MW/yr | ratio vs ground |\n|---|---|---|")
    for name, o in sens:
        t = total(o.cost()); P(f"| {name} | {fmt(t)} | {t/gt:.2f}x |")
    P("")
    P("## Reading the results\n")
    P("- GPUs dominate both sides. Once launch falls below a few hundred $/kg, the satellite's own build cost and the extra spares, shorter life and dearer capital matter more than launch.")
    P("- Everything-from-Earth orbit stays dearer than ground through 2035 in the base case; it nears parity only when cheap launch, light satellites, cheap hardware and expensive or blocked ground power all line up (the bull case), or for a company that owns its launcher.")
    P("- Lunar supply can only touch the passive-mass slice. In LEO it trims a few percent at plausible 2035 volumes; it matters more in high orbit, where Earth-launched mass is dearest. It never touches the GPU bill.")
    P("- Ground's real enemy in the model is not price but time: a multi-year wait for power is a capital carry that the per-MW figure hides, and in the game it is a hard cap on how fast ground can grow.")

    here = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(here, "results.md"), "w") as f:
        f.write("\n".join(out) + "\n")
    print("\n".join(out))

if __name__ == "__main__":
    main()
