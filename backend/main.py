"""
AutoShield AI — FastAPI backend.
Run:  uvicorn main:app --reload --port 8000
Docs: http://localhost:8000/docs
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any

from app import services as svc

app = FastAPI(title="AutoShield AI", version="1.0",
              description="Supply Chain Resilience & Smart Manufacturing Copilot")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------------- models ----------------------------------- #

class SplitRequest(BaseModel):
    part_id: str
    allocation: Dict[str, float]   # {supplier_id: pct}


class ReorderRequest(BaseModel):
    part_id: str


class ExplainRequest(BaseModel):
    payload: Dict[str, Any]


# ------------------------------- routes ----------------------------------- #

@app.get("/")
def root():
    return {"service": "AutoShield AI", "status": "ok", "docs": "/docs"}


@app.get("/api/dashboard")
def get_dashboard():
    return svc.dashboard()


@app.get("/api/risks")
def get_risks():
    return svc.all_risks()


@app.get("/api/risks/{part_id}")
def get_risk_detail(part_id: str):
    try:
        return svc.risk_detail(part_id)
    except KeyError:
        raise HTTPException(404, f"Unknown part_id: {part_id}")


@app.get("/api/supply-chain-graph")
def get_graph():
    return svc.supply_chain_graph()


@app.get("/api/recommendations/{part_id}")
def get_recommendation(part_id: str):
    try:
        return svc.recommend(part_id)
    except KeyError:
        raise HTTPException(404, f"Unknown part_id: {part_id}")


@app.post("/api/simulate-supplier-split")
def post_simulate(req: SplitRequest):
    try:
        return svc.simulate_split(req.part_id, req.allocation)
    except KeyError:
        raise HTTPException(404, f"Unknown part_id: {req.part_id}")


@app.get("/api/quality/alerts")
def get_quality_alerts():
    return svc.quality_alerts()


@app.get("/api/quality/cpk/{part_id}")
def get_cpk(part_id: str):
    return svc.quality_cpk(part_id)


@app.post("/api/erp/reorder")
def post_reorder(req: ReorderRequest):
    try:
        return svc.erp_reorder(req.part_id)
    except KeyError:
        raise HTTPException(404, f"Unknown part_id: {req.part_id}")


@app.post("/api/copilot/explain")
def post_explain(req: ExplainRequest):
    return {"explanation": svc.copilot_explain(req.payload)}
