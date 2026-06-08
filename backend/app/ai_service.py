"""
AutoShield AI — OpenAI-powered intelligence layer.

All public functions are called from main.py route handlers.
Set OPENAI_API_KEY in the environment before starting the server.
"""
from __future__ import annotations
import json
import os
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

# Load .env from the backend directory
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from .data_loader import db

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

_SYSTEM = (
    "You are AutoShield AI, an expert automotive supply chain risk intelligence copilot. "
    "You help automotive OEMs and EV manufacturers prevent supply chain disruptions before they hit the production line. "
    "You analyse supplier risks, commodity prices, geopolitical factors, manufacturing quality data, and inventory positions. "
    "Always give specific, actionable recommendations with quantified impact — INR figures, day counts, percentage reductions. "
    "Use industry terminology naturally: Cpk, OTD rate, single-source risk, safety stock, days-of-cover, PPAP, JIT. "
    "Be concise, urgent where warranted, and data-driven. Never hedge with generic disclaimers."
)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _snapshot() -> str:
    """Build a compact live-data snapshot injected into every AI prompt."""
    from . import services as svc

    risks = svc.all_risks()
    critical = [r for r in risks if r["risk_score"] >= 81]
    high     = [r for r in risks if 61 <= r["risk_score"] < 81]
    total_at_risk = sum(r["estimated_loss"] for r in risks if r["risk_score"] >= 61)
    qa  = svc.quality_alerts()[0]
    cpk = svc.quality_cpk()

    lines = [
        "=== LIVE AUTOSHIELD SNAPSHOT ===",
        f"Parts monitored: {len(risks)}",
        f"Critical (≥81): {[r['part_name'] for r in critical]}",
        f"High-risk (61-80): {[r['part_name'] for r in high]}",
        f"Total production value at risk: ₹{total_at_risk/1e7:.2f} Cr",
        "",
        "TOP 3 RISKS:",
    ]
    for r in risks[:3]:
        lines.append(
            f"  • {r['part_name']} | {r['supplier']} ({r['supplier_country']}) "
            f"| score={r['risk_score']} ({r['risk_level']}) "
            f"| cover={r['inventory_days']}d vs lead={r['lead_time_days']}d "
            f"| line-stop={round(r['line_stop_probability']*100)}% "
            f"| est. loss=₹{r['estimated_loss']/1e7:.2f}Cr"
        )
    lines += ["", "NEWS SIGNALS:"]
    for n in db.news[:4]:
        lines.append(f"  [{n['risk_level']}] {n['title']} ({n['date']})")
    lines += [
        "",
        "QUALITY ALERT:",
        f"  {qa['part']} | batch {qa['batch']} | {qa['plant']} {qa['line']} | machine {qa['machine']}",
        f"  Cpk={cpk['Cpk']:.2f} (poor, degraded from 1.42) | defect_prob={qa['defect_probability']*100:.0f}%",
        f"  Root causes: {'; '.join(qa['root_cause'][:2])}",
    ]
    return "\n".join(lines)


def _chat(prompt: str, max_tokens: int = 600, temperature: float = 0.3) -> str:
    resp = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": _SYSTEM},
            {"role": "user",   "content": prompt},
        ],
        max_tokens=max_tokens,
        temperature=temperature,
    )
    return resp.choices[0].message.content


# ---------------------------------------------------------------------------
# 1. Executive Briefing
# ---------------------------------------------------------------------------

def generate_executive_briefing() -> str:
    """GPT-4o C-suite summary of live supply chain status."""
    from . import services as svc

    risks = svc.all_risks()
    critical = [r for r in risks if r["risk_score"] >= 81]
    high     = [r for r in risks if 61 <= r["risk_score"] < 81]
    total_at_risk = sum(r["estimated_loss"] for r in risks if r["risk_score"] >= 61)

    prompt = (
        "Generate a 3-paragraph executive briefing for the automotive OEM's supply chain status (today).\n\n"
        f"CRITICAL PARTS ({len(critical)}): "
        f"{[r['part_name']+' ('+r['supplier']+', '+r['supplier_country']+')' for r in critical]}\n"
        f"HIGH-RISK PARTS ({len(high)}): "
        f"{[r['part_name']+' ('+r['supplier']+')' for r in high]}\n"
        f"TOTAL PRODUCTION VALUE AT RISK: ₹{total_at_risk/1e7:.2f} Crore\n"
        f"LATEST RISK SIGNALS: {[n['title'] for n in db.news]}\n\n"
        f"TOP PART DETAIL:\n{json.dumps(risks[0], indent=2)}\n\n"
        "Paragraph 1 — Immediate threats and financial exposure.\n"
        "Paragraph 2 — Root causes and key risk drivers.\n"
        "Paragraph 3 — Priority actions for the next 48 hours.\n"
        "Tone: urgent, C-suite, specific numbers. Under 220 words total."
    )
    return _chat(prompt, max_tokens=500, temperature=0.3)


# ---------------------------------------------------------------------------
# 2. Deep Risk Analysis
# ---------------------------------------------------------------------------

def deep_risk_analysis(part_id: str) -> dict:
    """GPT-4o structured deep-dive on a specific part's risk."""
    from . import services as svc

    detail = svc.risk_detail(part_id)   # raises KeyError if unknown

    prompt = (
        f"Deep supply chain risk analysis for: {detail['part_name']}\n\n"
        f"LIVE DATA:\n{json.dumps(detail, indent=2)}\n\n"
        "Produce a structured analysis with exactly these sections:\n"
        "## ROOT CAUSE ANALYSIS\n"
        "Top 3 risk drivers with % contribution reasoning.\n\n"
        "## TIMELINE PROJECTION\n"
        "What happens at Day 7, Day 14, Day 30 if no action is taken.\n\n"
        "## MITIGATION PLAYBOOK\n"
        "5 specific actions, each with expected risk score reduction.\n\n"
        "## HIDDEN RISKS\n"
        "2 non-obvious risks hinted at by the data.\n\n"
        "## QUICK WIN\n"
        "The single most impactful action executable in the next 24 hours.\n\n"
        "Use supplier names, part names, INR figures, day counts throughout."
    )
    return {
        "analysis": _chat(prompt, max_tokens=900, temperature=0.4),
        "part_id": part_id,
        "part_name": detail["part_name"],
    }


# ---------------------------------------------------------------------------
# 3. Streaming Copilot Chat
# ---------------------------------------------------------------------------

def copilot_stream(messages: list[dict], part_context: dict | None = None):
    """Return a synchronous OpenAI stream for SSE delivery."""
    system_ctx = _SYSTEM + "\n\n" + _snapshot()
    if part_context:
        system_ctx += f"\n\nCURRENT PART IN FOCUS:\n{json.dumps(part_context, indent=2)}"

    all_msgs = [{"role": "system", "content": system_ctx}] + messages

    return client.chat.completions.create(
        model="gpt-4o",
        messages=all_msgs,
        stream=True,
        max_tokens=600,
        temperature=0.5,
    )


# ---------------------------------------------------------------------------
# 4. Quality Root-Cause Analysis
# ---------------------------------------------------------------------------

def analyze_quality_anomaly() -> dict:
    """GPT-4o expert analysis of the Battery Tray welding defect."""
    from . import services as svc

    qa  = svc.quality_alerts()[0]
    cpk = svc.quality_cpk()

    prompt = (
        "Expert manufacturing quality analysis for an automotive welding defect.\n\n"
        f"QUALITY ALERT:\n{json.dumps(qa, indent=2)}\n\n"
        f"CPK DATA:\n{json.dumps(cpk, indent=2)}\n\n"
        "OBSERVED PATTERN:\n"
        "  Day shift: welding current ~182 A → 0 defects\n"
        "  Night shift: welding current ~186-187 A (near USL 190 A) → 4/4 defects\n"
        "  USL=190 A, LSL=178 A, Target=184 A\n"
        "  Cpk degraded 1.42 → 0.91 over one week\n\n"
        "Provide:\n"
        "## PROBABLE ROOT CAUSES\n"
        "Ranked by probability (%) with physics reasoning.\n\n"
        "## NIGHT-SHIFT DRIFT EXPLANATION\n"
        "Why does current drift high specifically on night shift?\n\n"
        "## CORRECTIVE ACTIONS\n"
        "Step-by-step with expected Cpk improvement per step.\n\n"
        "## PREVENTIVE CONTROLS\n"
        "Systemic changes to prevent recurrence.\n\n"
        "## FAILURE WINDOW\n"
        "Days until catastrophic rejection spike if uncorrected.\n\n"
        "Be specific with technical detail."
    )
    return {"analysis": _chat(prompt, max_tokens=800, temperature=0.3)}


# ---------------------------------------------------------------------------
# 5. Scenario Planner
# ---------------------------------------------------------------------------

_SCENARIOS = {
    "china_ban":        "China imposes an immediate export ban on all semiconductor raw materials and finished chips",
    "taiwan_crisis":    "Taiwan Strait military crisis — cross-strait shipping lanes disrupted for 60 days, TSMC output cut 30%",
    "aluminium_spike":  "Global aluminium prices spike 40% within 30 days due to European smelter shutdowns from energy crisis",
    "supplier_failure": "ElectroChip Asia (primary MCU supplier, S001) files for bankruptcy — no new shipments, tooling locked",
    "custom":           "Custom supply chain disruption scenario",
}


def generate_scenario(scenario_type: str, parameters: dict) -> dict:
    """GPT-4o what-if scenario analysis."""
    from . import services as svc

    risks = svc.all_risks()
    desc  = _SCENARIOS.get(scenario_type, parameters.get("description", _SCENARIOS["custom"]))

    state = json.dumps(
        [
            {
                "part": r["part_name"], "supplier": r["supplier"],
                "country": r["supplier_country"], "risk_score": r["risk_score"],
                "inventory_days": r["inventory_days"], "lead_time_days": r["lead_time_days"],
            }
            for r in risks
        ],
        indent=2,
    )

    prompt = (
        f"SCENARIO: {desc}\n\n"
        f"CURRENT SUPPLY CHAIN STATE:\n{state}\n\n"
        "Analyse this scenario with these sections:\n"
        "## IMMEDIATE IMPACT (0–30 days)\n"
        "Which parts/lines are affected first, estimated INR production loss.\n\n"
        "## CASCADE EFFECTS\n"
        "Secondary impacts on other parts, downstream suppliers, vehicle models.\n\n"
        "## WORST CASE\n"
        "Full scenario impact on vehicle production — units stopped and total INR exposure.\n\n"
        "## EMERGENCY RESPONSE\n"
        "5 critical actions to execute within 72 hours.\n\n"
        "## RESILIENCE INVESTMENTS\n"
        "3 structural supply-chain changes to prevent this class of risk permanently.\n\n"
        "Use specific part names, supplier names, and financial figures throughout."
    )
    return {
        "scenario": desc,
        "scenario_type": scenario_type,
        "analysis": _chat(prompt, max_tokens=900, temperature=0.4),
    }


# ---------------------------------------------------------------------------
# 6. News Intelligence
# ---------------------------------------------------------------------------

def analyze_news_intel() -> dict:
    """GPT-4o structured risk extraction from live news signals."""
    news_text = "\n".join(
        f"- [{n['risk_level']}] {n['title']} | {n['country']} | commodity: {n['commodity']} | {n['date']}"
        for n in db.news
    )
    prompt = (
        "Analyse these automotive supply chain news items and extract structured risk intelligence.\n\n"
        f"NEWS:\n{news_text}\n\n"
        "For each news item output:\n"
        "  • Affected commodities/suppliers/regions\n"
        "  • Risk type (Supply / Demand / Logistics / Geopolitical / Quality / Financial)\n"
        "  • Severity 1–10 with one-line reasoning\n"
        "  • Timeline to automotive production impact\n"
        "  • Specific mitigation action\n\n"
        "Then write an OVERALL 30-DAY RISK INTELLIGENCE SUMMARY for the OEM's procurement team.\n"
        "Be specific and actionable."
    )
    return {"intelligence": _chat(prompt, max_tokens=700, temperature=0.3)}


# ---------------------------------------------------------------------------
# 7. Procurement Strategy
# ---------------------------------------------------------------------------

def generate_procurement_strategy(part_id: str) -> dict:
    """GPT-4o 90-day procurement playbook for a specific part."""
    from . import services as svc

    detail = svc.risk_detail(part_id)
    rec    = svc.recommend(part_id)

    prompt = (
        f"Create a 90-day procurement strategy for: {detail['part_name']}\n\n"
        f"CURRENT SITUATION:\n{json.dumps(detail, indent=2)}\n\n"
        f"RECOMMENDED ACTIONS:\n{json.dumps(rec, indent=2)}\n\n"
        "Sections:\n"
        "## WEEK 1–2 (EMERGENCY)\n"
        "Immediate steps to prevent line stop — specific PO actions, logistics, escalations.\n\n"
        "## MONTH 1 (STABILISATION)\n"
        "Supplier qualification, purchase order placement, safety stock build plan.\n\n"
        "## MONTH 2–3 (DIVERSIFICATION)\n"
        "Multi-source strategy, contract renegotiation points, dual-award split rationale.\n\n"
        "## KPIs\n"
        "5 specific metrics with target values and review cadence.\n\n"
        "## BUDGET IMPACT\n"
        "Cost of strategy vs cost of inaction (INR).\n\n"
        "## ESCALATION TRIGGERS\n"
        "Specific conditions that require CEO/Board escalation.\n\n"
        "Format as an actionable playbook. Include specific numbers and deadlines."
    )
    return {
        "strategy": _chat(prompt, max_tokens=1000, temperature=0.4),
        "part_id": part_id,
        "part_name": detail["part_name"],
    }


# ---------------------------------------------------------------------------
# 8. AI Copilot Explain (replaces the old hardcoded template)
# ---------------------------------------------------------------------------

def copilot_explain(payload: dict) -> str:
    """GPT-4o natural-language explanation for a specific risk payload."""
    prompt = (
        "Explain this supply chain risk situation in 3-4 sentences for a plant manager.\n\n"
        f"DATA: {json.dumps(payload)}\n\n"
        "Include: why the risk is high, what happens if no action is taken, and the single best mitigation step. "
        "Be specific with the numbers provided. No generic filler."
    )
    return _chat(prompt, max_tokens=200, temperature=0.4)
