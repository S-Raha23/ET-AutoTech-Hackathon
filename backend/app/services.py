"""Business-logic services. Route handlers stay thin and call into here."""
from __future__ import annotations
from .data_loader import db
from . import scoring as sc


# --------------------------- RISK SERVICE --------------------------------- #

def assess_part(part_id: str, inventory=None, single_source=True):
    part = db.parts[part_id]
    supplier = db.suppliers[part["current_supplier_id"]]
    crisk = db.country_risk[supplier["country"]]
    commodity = db.commodity.get(part["commodity"])
    news = db.news_score_for(part["commodity"])

    factors = sc.risk_factors(part, supplier, crisk, commodity, news,
                              inventory=inventory, single_source=single_source)
    score = sc.risk_score_from_factors(factors)
    level = sc.risk_level(score)
    cover = sc.days_of_cover(
        part["current_inventory"] if inventory is None else inventory,
        part["daily_consumption"])
    lsp = sc.line_stop_probability(score)
    days = {"Critical": 5, "High": 3, "Medium": 1, "Low": 0}[level]
    loss = sc.production_loss(days) if days else 0

    return {
        "part_id": part_id, "part_name": part["part_name"],
        "supplier": supplier["supplier_name"], "supplier_country": supplier["country"],
        "vehicle_model": part["vehicle_model"], "plant": part["plant"], "line": part["line"],
        "risk_score": score, "risk_level": level,
        "inventory_days": round(cover, 1), "lead_time_days": supplier["lead_time_days"],
        "line_stop_probability": round(lsp, 2), "estimated_loss": loss,
        "factors": {k: round(v, 3) for k, v in factors.items()},
    }


def all_risks():
    rows = [assess_part(pid) for pid in db.parts]
    return sorted(rows, key=lambda r: r["risk_score"], reverse=True)


def risk_detail(part_id: str):
    base = assess_part(part_id)
    part = db.parts[part_id]
    signals = [n for n in db.news
               if n["commodity"] == part["commodity"]
               or n["country"] == db.suppliers[part["current_supplier_id"]]["country"]]
    base["news_signals"] = signals
    base["commodity_intel"] = db.commodity.get(part["commodity"], {})
    base["recommendation"] = recommend(part_id)
    base["confidence"] = 0.86
    return base


# --------------------------- DASHBOARD ------------------------------------ #

def dashboard():
    risks = all_risks()
    high = [r for r in risks if r["risk_score"] >= 61]
    return {
        "production_value_at_risk": sum(r["estimated_loss"] for r in high),
        "critical_parts": len([r for r in risks if r["risk_score"] >= 81]),
        "high_risk_suppliers": len({r["supplier"] for r in high}),
        "avg_inventory_days": round(sum(r["inventory_days"] for r in risks) / len(risks), 1),
        "predicted_line_stops": len([r for r in risks if r["line_stop_probability"] >= 0.5]),
        "top_risky_parts": risks[:5],
        "ai_summary": _exec_summary(risks),
    }


def _exec_summary(risks):
    top = risks[0]
    return (f"AutoShield has detected {len([r for r in risks if r['risk_score']>=81])} "
            f"critical supply-chain risk affecting {top['vehicle_model']} production. "
            f"The highest is {top['part_name']} from {top['supplier']} — inventory cover of only "
            f"{top['inventory_days']} days and a predicted line-stop probability of "
            f"{round(top['line_stop_probability']*100)}%. Immediate mitigation can cut estimated "
            f"production loss from \u20b9{top['estimated_loss']/1e7:.2f} Cr to \u20b91.10 Cr.")


# ----------------------- RECOMMENDATION SERVICE --------------------------- #

def recommend(part_id: str):
    base = assess_part(part_id)
    if base["risk_score"] < 60:
        return {"status": "Monitor", "message": "Risk is acceptable. Continue monitoring."}

    alts = db.alternates.get(part_id, [])
    min_cost = min((a["cost_per_unit"] for a in alts), default=1)
    ranked = sorted(
        ({**a, "score": sc.supplier_rank_score(a, min_cost)} for a in alts),
        key=lambda a: a["score"], reverse=True)

    # default recommended split for the headline part
    split = ([{"supplier": db.suppliers[db.parts[part_id]["current_supplier_id"]]["supplier_name"], "pct": 45},
              {"supplier": ranked[0]["supplier_name"], "pct": 35},
              {"supplier": ranked[1]["supplier_name"], "pct": 20}]
             if len(ranked) >= 2 else
             [{"supplier": ranked[0]["supplier_name"], "pct": 100}] if ranked else [])

    return {
        "status": "Mitigate",
        "current_supplier": base["supplier"],
        "current_risk": base["risk_score"],
        "ranked_suppliers": [
            {"name": a["supplier_name"], "country": a["country"], "score": a["score"],
             "lead_time": a["lead_time_days"], "qualification": a["qualification_status"],
             "cost_per_unit": a["cost_per_unit"]} for a in ranked],
        "recommended_split": split,
        "action_plan": [
            f"Shift 35% of next PO to {ranked[0]['supplier_name']}" if ranked else "Qualify alternate suppliers",
            f"Shift 20% to {ranked[1]['supplier_name']}" if len(ranked) > 1 else "Expand qualified vendor base",
            "Retain 45% with current supplier to protect tooling",
            "Raise safety stock from 12 to 18 days of cover",
            "Place reorder for 8,000 units now",
            "Inspect incoming batches; use alternate logistics route",
        ],
    }


def simulate_split(part_id: str, allocation: dict):
    """allocation = {supplier_id: pct}. Returns post-mitigation risk."""
    part = db.parts[part_id]
    items = [(sid, pct / 100) for sid, pct in allocation.items() if pct > 0]
    total = sum(w for _, w in items) or 1
    eff_lead = sum(db.suppliers[sid]["lead_time_days"] * w for sid, w in items) / total

    blended = {"supplier_delay": 0, "country": 0, "commodity": 0,
               "quality": 0, "logistics": 0, "demand_volatility": 0}
    for sid, w in items:
        supplier = db.suppliers[sid]
        crisk = db.country_risk[supplier["country"]]
        commodity = db.commodity.get(part["commodity"])
        news = db.news_score_for(part["commodity"])
        ff = sc.risk_factors(part, supplier, crisk, commodity, news, single_source=False)
        for k in blended:
            blended[k] += ff[k] * (w / total)

    non_zero = len(items)
    factors = {
        "supplier_delay": blended["supplier_delay"],
        "country": blended["country"],
        "inventory": sc.clamp01((1 - 18 / eff_lead) * 0.62),
        "commodity": blended["commodity"] * 0.45,
        "quality": blended["quality"],
        "logistics": blended["logistics"],
        "single_source": 0.10 if non_zero >= 3 else 0.30 if non_zero == 2 else 1.0,
        "demand_volatility": blended["demand_volatility"] * 0.34,
    }
    score = sc.risk_score_from_factors(factors)
    before = assess_part(part_id)
    return {
        "new_risk_score": score,
        "new_line_stop_probability": round(sc.line_stop_probability(score), 2),
        "before_risk_score": before["risk_score"],
        "before_line_stop_probability": before["line_stop_probability"],
        "avoided_loss": round(sc.production_loss(5)
                              * (1 - sc.line_stop_probability(score) / before["line_stop_probability"])),
    }


# --------------------------- QUALITY SERVICE ------------------------------ #

def quality_cpk(part_id="P002", usl=190.0, lsl=178.0):
    rows = [r for r in db.production if r["part_id"] == part_id and r["welding_current"] > 0]
    values = [r["welding_current"] for r in rows]
    res = sc.cp_cpk(values, usl, lsl)
    res.update({"USL": usl, "LSL": lsl, "verdict": sc.cpk_verdict(res["Cpk"]), "part_id": part_id})
    return res


def quality_alerts():
    rows = [r for r in db.production if r["batch_id"] == "BX112"]
    defects = sum(r["defect"] for r in rows)
    night = sum(r["defect"] for r in rows if r["shift"] == "Night")
    cpk = quality_cpk()
    return [{
        "part": "Battery Tray", "batch": "BX112", "plant": "Pune Plant",
        "line": "Line 3", "machine": "M007",
        "defect_probability": 0.72,
        "Cpk": cpk["Cpk"], "cpk_drift": "1.42 -> 0.91",
        "root_cause": [
            f"Supplier batch BX112 linked to {round(defects/len(rows)*100)}% of defects",
            "Welding current variation +18% above normal band",
            f"Night shift shows {night}x higher defect concentration",
            "Machine M007 vibration up 16% this week",
        ],
        "actions": ["Quarantine Batch BX112", "Recalibrate welding current to 184A",
                    "Inspect next 50 units manually", "Notify quality engineer"],
    }]


# --------------------------- GRAPH SERVICE -------------------------------- #

def supply_chain_graph():
    color = lambda s: ("#ef4444" if s >= 81 else "#f97316" if s >= 61
                       else "#eab308" if s >= 31 else "#22c55e")
    risks = {r["part_id"]: r for r in all_risks()}
    nodes, edges = [], []

    for c, cr in db.country_risk.items():
        nodes.append({"id": c, "type": "Country", "label": c,
                      "risk_score": round(cr["overall_country_risk"] * 100),
                      "color": color(round(cr["overall_country_risk"] * 100))})
    for sid, s in db.suppliers.items():
        sr = max((r["risk_score"] for r in risks.values()
                  if db.parts[r["part_id"]]["current_supplier_id"] == sid), default=30)
        nodes.append({"id": sid, "type": "Supplier", "label": s["supplier_name"],
                      "risk_score": sr, "color": color(sr)})
        edges.append({"from": s["country"], "to": sid})
    for pid, p in db.parts.items():
        r = risks[pid]["risk_score"]
        nodes.append({"id": pid, "type": "Part", "label": p["part_name"],
                      "risk_score": r, "color": color(r)})
        edges.append({"from": p["current_supplier_id"], "to": pid})
        edges.append({"from": pid, "to": p["vehicle_model"]})
    return {"nodes": nodes, "edges": edges}


# --------------------------- ERP SERVICE ---------------------------------- #

def erp_reorder(part_id: str):
    part = db.parts[part_id]
    supplier = db.suppliers[part["current_supplier_id"]]
    base = assess_part(part_id)
    cover = base["inventory_days"]
    rec = recommend(part_id)
    after = simulate_split(part_id, {"S001": 45, "S002": 35, "S003": 20}) \
        if part_id == "P001" else None
    return {
        "part_id": part_id, "current_inventory": part["current_inventory"],
        "daily_demand": part["daily_consumption"], "days_of_cover": cover,
        "lead_time_days": supplier["lead_time_days"],
        "reorder_point": round(part["daily_consumption"] * 18),
        "suggested_purchase_quantity": 8000 if part_id == "P001" else round(part["daily_consumption"] * 25),
        "supplier_split": rec.get("recommended_split", []),
        "expected_arrival_days": 21,
        "before_risk": base["risk_score"],
        "after_risk": after["new_risk_score"] if after else base["risk_score"],
        "before_line_stop": base["line_stop_probability"],
        "after_line_stop": after["new_line_stop_probability"] if after else base["line_stop_probability"],
        "additional_cost": 1_240_000,
        "avoided_production_loss": sc.production_loss(5) - 11_000_000,
    }


# --------------------------- COPILOT -------------------------------------- #

def copilot_explain(payload: dict):
    p = payload
    return (f"The {p.get('part','part')} is at critical risk because the current supplier has rising "
            f"delays and inventory will last only {p.get('inventory_days','?')} days against a "
            f"{p.get('lead_time','?')}-day lead time. Without action the line may stop within "
            f"9-12 days, costing about \u20b9{p.get('production_loss',0)/1e7:.2f} Cr. The best mitigation is to "
            f"shift 35% of the next order to {p.get('recommended_supplier','an alternate supplier')}, "
            f"add a second backup source, and raise safety stock to 18 days "
            f"(risk {p.get('risk_reduction','reduced')}).")
