"""
AutoShield AI — core scoring & manufacturing analytics.

All formulas are transparent and explainable (no black-box ML required for the
headline scenario). They are calibrated so the ElectroChip Asia -> Infotainment
MCU scenario lands at risk 87 / line-stop 78%, and the recommended 45/35/20
mitigation split brings it to risk 42 / line-stop 29%.
"""
from __future__ import annotations

DAILY_VEHICLE_OUTPUT = 120
VEHICLE_MARGIN = 80_000          # INR per vehicle
LINE_STOP_DAYS_CRITICAL = 5

RISK_WEIGHTS = {
    "supplier_delay": 0.20, "country": 0.15, "inventory": 0.15, "commodity": 0.10,
    "quality": 0.10, "logistics": 0.10, "single_source": 0.10, "demand_volatility": 0.10,
}

QUAL_MAP = {"Approved": 1.0, "Conditional": 0.7, "Under Review": 0.4, "Not Approved": 0.1}


def clamp01(x: float) -> float:
    return max(0.0, min(1.0, x))


def days_of_cover(inventory: float, daily_consumption: float) -> float:
    return inventory / daily_consumption if daily_consumption else 0.0


def risk_factors(part, supplier, country_risk, commodity, news_score,
                 inventory=None, single_source=True):
    """Derive the eight risk sub-factors (each 0..1) from real data rows."""
    inv = part["current_inventory"] if inventory is None else inventory
    cover = days_of_cover(inv, part["daily_consumption"])
    com_vol = commodity.get("volatility_score", 0.4) if commodity else 0.4
    return {
        "supplier_delay": clamp01((1 - supplier["on_time_delivery_rate"]) * 2.0
                                  + (supplier["avg_delay_days"] / 30) * 1.5),
        "country": country_risk["overall_country_risk"],
        "inventory": clamp01((1 - cover / supplier["lead_time_days"]) * 1.4),
        "commodity": clamp01(((com_vol + (news_score if news_score else 0.3)) / 2) * 1.27),
        "quality": clamp01(supplier["defect_rate"] * 18),
        "logistics": clamp01(country_risk["logistics_risk"] * 1.18),
        "single_source": 1.0 if single_source else 0.12,
        "demand_volatility": part["demand_volatility"],
    }


def risk_score_from_factors(factors: dict) -> int:
    s = sum(RISK_WEIGHTS[k] * factors[k] for k in RISK_WEIGHTS)
    return round(clamp01(s) * 100)


def risk_level(score: int) -> str:
    if score >= 81:
        return "Critical"
    if score >= 61:
        return "High"
    if score >= 31:
        return "Medium"
    return "Low"


def line_stop_probability(score: int) -> float:
    """Calibrated: 87 -> 0.78, 42 -> 0.29 (clamped)."""
    return clamp01(max(0.05, 0.010889 * score - 0.1667))


def production_loss(days: int = LINE_STOP_DAYS_CRITICAL) -> float:
    return DAILY_VEHICLE_OUTPUT * VEHICLE_MARGIN * days


def supplier_rank_score(alt: dict, min_cost: float) -> int:
    """Weighted alternate-supplier ranking score (0..100)."""
    cost_score = clamp01(min_cost / alt["cost_per_unit"]) if alt["cost_per_unit"] else 0
    inverse_risk = clamp01(1 - alt.get("defect_rate", 0.02) * 12)
    score = (0.25 * alt["quality_score"]
             + 0.20 * alt["delivery_score"]
             + 0.15 * cost_score
             + 0.15 * inverse_risk
             + 0.10 * clamp01(alt["capacity_available"] * 2.5)
             + 0.10 * QUAL_MAP.get(alt["qualification_status"], 0.4)
             + 0.05 * alt.get("sustainability_score", 0.6))
    return round(clamp01(score) * 100)


def cp_cpk(values, usl: float, lsl: float):
    n = len(values)
    mean = sum(values) / n
    sigma = (sum((v - mean) ** 2 for v in values) / n) ** 0.5
    cp = (usl - lsl) / (6 * sigma) if sigma else 0
    cpk = min((usl - mean) / (3 * sigma), (mean - lsl) / (3 * sigma)) if sigma else 0
    return {"mean": round(mean, 2), "sigma": round(sigma, 3),
            "Cp": round(cp, 2), "Cpk": round(cpk, 2)}


def cpk_verdict(cpk_val: float) -> str:
    if cpk_val < 1.00:
        return "Poor process — immediate correction needed"
    if cpk_val < 1.33:
        return "Needs improvement"
    if cpk_val < 1.67:
        return "Capable"
    return "Excellent"
