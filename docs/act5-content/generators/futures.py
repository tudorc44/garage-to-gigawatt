"""Shared constants for the Act V content generators (doc 47). Designed values are labelled in the README."""

QUARTERS = [f"{y}Q{q}" for y in range(2036, 2041) for q in range(1, 5)]  # act quarters 0..19
Q = len(QUARTERS)
FUTURES = ["v1", "v2", "v3", "v4"]
NAMES = {"v1": "Queue is King", "v2": "Flexible Lane", "v3": "Demand Plateau", "v4": "Up and Out"}
WEIGHTS = {"v1": 0.30, "v2": 0.25, "v3": 0.25, "v4": 0.20}

# Trigger quarters (act quarter index), inside doc 43's 2037Q2-2038Q3 (act quarters 5-10).
# V1 and V3 at 2037Q4, as the M43.0 gate's stubs, so the gate's results carry over (mine, reversible).
TRIGGER = {"v1": 7, "v2": 8, "v3": 7, "v4": 9}
# Signals start 2-4 quarters before the trigger and never before 2036Q3 (act quarter 2).
SIGNAL_START = {"v1": 3, "v2": 5, "v3": 4, "v4": 5}
COMMON_UNTIL = 3  # every market value identical across the futures through 2036Q4 (act quarter 3)


def qi(label: str) -> int:
    return QUARTERS.index(label)


def path(anchors, t):
    """Piecewise-linear through (act quarter, value) anchors; flat before the first and after the last."""
    anchors = sorted(anchors)
    if t <= anchors[0][0]:
        return anchors[0][1]
    for (t0, v0), (t1, v1) in zip(anchors, anchors[1:]):
        if t0 <= t <= t1:
            return v0 + (v1 - v0) * (t - t0) / (t1 - t0)
    return anchors[-1][1]
