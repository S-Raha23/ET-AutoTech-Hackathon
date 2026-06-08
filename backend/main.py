"""
AutoShield AI — FastAPI backend.
Run:  uvicorn main:app --reload --port 8000
Docs: http://localhost:8000/docs
"""
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Dict, Any, List, Optional

from app import services as svc

app = FastAPI(title="AutoShield AI", version="2.0",
              description="Supply Chain Resilience & Smart Manufacturing Copilot — AI-powered")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------------- request models --------------------------- #

class SplitRequest(BaseModel):
    part_id: str
    allocation: Dict[str, float]


class ReorderRequest(BaseModel):
    part_id: str


class ExplainRequest(BaseModel):
    payload: Dict[str, Any]


class ChatMessage(BaseModel):
    role: str       # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    part_context: Optional[Dict[str, Any]] = None


class ScenarioRequest(BaseModel):
    scenario_type: str   # china_ban | taiwan_crisis | aluminium_spike | supplier_failure | custom
    parameters: Dict[str, Any] = {}


# ------------------------------- core routes ------------------------------ #

@app.get("/")
def root():
    return {"service": "AutoShield AI", "version": "2.0", "status": "ok", "docs": "/docs"}


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
    from app import ai_service as ai
    try:
        explanation = ai.copilot_explain(req.payload)
    except Exception as e:
        explanation = svc.copilot_explain(req.payload)   # fallback to template
    return {"explanation": explanation}


# ------------------------------- AI routes -------------------------------- #

@app.get("/api/ai/executive-briefing")
def get_executive_briefing():
    """GPT-4o C-suite executive briefing from live risk data."""
    from app import ai_service as ai
    try:
        return {"briefing": ai.generate_executive_briefing()}
    except Exception as e:
        raise HTTPException(500, f"AI service error: {e}")


@app.post("/api/ai/deep-analysis/{part_id}")
def post_deep_analysis(part_id: str):
    """GPT-4o structured deep-dive risk analysis for a specific part."""
    from app import ai_service as ai
    try:
        return ai.deep_risk_analysis(part_id)
    except KeyError:
        raise HTTPException(404, f"Unknown part_id: {part_id}")
    except Exception as e:
        raise HTTPException(500, f"AI service error: {e}")


@app.post("/api/ai/chat")
def post_ai_chat(req: ChatRequest):
    """Streaming SSE copilot chat powered by GPT-4o."""
    from app import ai_service as ai

    messages = [{"role": m.role, "content": m.content} for m in req.messages]

    def generate():
        try:
            stream = ai.copilot_stream(messages, req.part_context)
            for chunk in stream:
                delta = chunk.choices[0].delta.content
                if delta:
                    yield f"data: {json.dumps({'content': delta})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@app.get("/api/ai/quality-rca")
def get_quality_rca():
    """GPT-4o root-cause analysis for the active manufacturing quality alert."""
    from app import ai_service as ai
    try:
        return ai.analyze_quality_anomaly()
    except Exception as e:
        raise HTTPException(500, f"AI service error: {e}")


@app.post("/api/ai/scenario")
def post_scenario(req: ScenarioRequest):
    """GPT-4o what-if scenario impact analysis."""
    from app import ai_service as ai
    try:
        return ai.generate_scenario(req.scenario_type, req.parameters)
    except Exception as e:
        raise HTTPException(500, f"AI service error: {e}")


@app.get("/api/ai/news-intel")
def get_news_intel():
    """GPT-4o structured risk intelligence extracted from live news signals."""
    from app import ai_service as ai
    try:
        return ai.analyze_news_intel()
    except Exception as e:
        raise HTTPException(500, f"AI service error: {e}")


@app.post("/api/ai/procurement-strategy/{part_id}")
def post_procurement_strategy(part_id: str):
    """GPT-4o 90-day procurement playbook for a specific part."""
    from app import ai_service as ai
    try:
        return ai.generate_procurement_strategy(part_id)
    except KeyError:
        raise HTTPException(404, f"Unknown part_id: {part_id}")
    except Exception as e:
        raise HTTPException(500, f"AI service error: {e}")
