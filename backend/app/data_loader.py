"""CSV data loader. Loads all datasets once into in-memory lookups."""
from __future__ import annotations
import csv
import os

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")

_NUMERIC = {
    "rating", "on_time_delivery_rate", "avg_delay_days", "defect_rate",
    "lead_time_days", "capacity_utilization", "daily_consumption",
    "current_inventory", "safety_stock", "demand_volatility", "price_index",
    "volatility_score", "geopolitical_risk", "trade_restriction_risk",
    "currency_risk", "logistics_risk", "overall_country_risk", "delay_days",
    "cost_per_unit", "capacity_available", "quality_score", "delivery_score",
    "sustainability_score", "risk_score", "temperature", "pressure", "torque",
    "welding_current", "cycle_time", "energy_kwh", "defect",
}


def _coerce(row: dict) -> dict:
    out = {}
    for k, v in row.items():
        if k in _NUMERIC:
            try:
                out[k] = float(v)
            except (ValueError, TypeError):
                out[k] = 0.0
        else:
            out[k] = v
    return out


def _read(name: str):
    path = os.path.join(DATA_DIR, name)
    if not os.path.exists(path):
        raise FileNotFoundError(f"Missing dataset: {path}. Ensure backend/data/ contains all CSVs.")
    with open(path, newline="", encoding="utf-8") as f:
        return [_coerce(r) for r in csv.DictReader(f)]


class DB:
    def __init__(self):
        self.suppliers = {r["supplier_id"]: r for r in _read("suppliers.csv")}
        self.parts = {r["part_id"]: r for r in _read("parts.csv")}
        self.shipments = _read("shipments.csv")
        self.commodity = {r["commodity"]: r for r in _read("commodity_prices.csv")}
        self.country_risk = {r["country"]: r for r in _read("country_risk.csv")}
        self.production = _read("production_data.csv")
        self.news = _read("news_risk_signals.csv")
        alts = _read("alternate_suppliers.csv")
        self.alternates = {}
        for a in alts:
            # attach supplier defect_rate for ranking
            s = self.suppliers.get(a["supplier_id"], {})
            a["defect_rate"] = s.get("defect_rate", 0.02)
            self.alternates.setdefault(a["part_id"], []).append(a)

    def news_score_for(self, commodity: str):
        hits = [n["risk_score"] for n in self.news if n["commodity"] == commodity]
        return max(hits) if hits else None


db = DB()
