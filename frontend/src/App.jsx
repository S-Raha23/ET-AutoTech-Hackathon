import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, ReferenceLine, Area, AreaChart, Cell,
} from "recharts";
import {
  Shield, LayoutDashboard, Share2, AlertTriangle, GitBranch, Activity,
  PackageSearch, Cpu, TrendingDown, TrendingUp, ChevronRight, Circle,
  Factory, Truck, Globe2, Zap, IndianRupee,
  MessageSquare, FlaskConical, Send, Loader2, Sparkles, Bot, Brain,
  ChevronDown, ChevronUp, RefreshCw,
} from "lucide-react";

/* ============================================================================
   AI API client — calls the FastAPI backend's AI endpoints
   ========================================================================== */

const API_BASE = "http://localhost:8000";

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

/* ============================================================================
   AutoShield AI — Supply Chain Resilience & Smart Manufacturing Copilot
   ET AutoTech Hackathon 2026 · Theme 1
   Self-contained prototype. All intelligence computes live in-browser.
   ========================================================================== */

/* ----------------------------- DATA LAYER --------------------------------- */

const COUNTRY_RISK = {
  China:        { geo: 0.72, trade: 0.68, currency: 0.42, logistics: 0.61, overall: 0.66 },
  India:        { geo: 0.22, trade: 0.18, currency: 0.24, logistics: 0.31, overall: 0.24 },
  "South Korea":{ geo: 0.38, trade: 0.31, currency: 0.28, logistics: 0.34, overall: 0.33 },
  Vietnam:      { geo: 0.41, trade: 0.35, currency: 0.33, logistics: 0.48, overall: 0.39 },
  Taiwan:       { geo: 0.58, trade: 0.49, currency: 0.30, logistics: 0.40, overall: 0.49 },
  Germany:      { geo: 0.25, trade: 0.22, currency: 0.21, logistics: 0.28, overall: 0.24 },
};

const SUPPLIERS = {
  S001: { id:"S001", name:"ElectroChip Asia",       country:"China",      rating:3.8, otd:0.72, delay:8.5, defect:0.038, lead:42, util:0.91, terms:"Net 60" },
  S002: { id:"S002", name:"Bharat Semi Components", country:"India",      rating:4.5, otd:0.91, delay:2.1, defect:0.014, lead:21, util:0.73, terms:"Net 45" },
  S003: { id:"S003", name:"Korea MicroSystems",     country:"South Korea",rating:4.2, otd:0.87, delay:3.4, defect:0.018, lead:26, util:0.78, terms:"Net 45" },
  S004: { id:"S004", name:"Precision Alloy Works",  country:"India",      rating:4.1, otd:0.86, delay:3.0, defect:0.021, lead:18, util:0.82, terms:"Net 30" },
  S005: { id:"S005", name:"Global Connectors Ltd",  country:"Vietnam",    rating:3.9, otd:0.80, delay:5.1, defect:0.026, lead:31, util:0.88, terms:"Net 60" },
  S006: { id:"S006", name:"Taiwan AutoChips",       country:"Taiwan",     rating:3.7, otd:0.79, delay:6.2, defect:0.029, lead:34, util:0.85, terms:"Net 60" },
};

const PARTS = [
  { id:"P001", name:"Infotainment MCU",        cat:"Semiconductor", material:"Silicon",          crit:"High",   supplier:"S001", model:"EV SUV X",       plant:"Pune Plant",    line:"Line 2", daily:420, inv:4500, ss:5000, commodity:"Semiconductor Memory", demandVol:0.95 },
  { id:"P004", name:"Body Control Unit Chip",  cat:"Semiconductor", material:"Silicon",          crit:"High",   supplier:"S001", model:"Premium Sedan Y", plant:"Chennai Plant", line:"Line 2", daily:260, inv:3200, ss:4000, commodity:"Semiconductor Memory", demandVol:0.71 },
  { id:"P002", name:"Battery Tray",            cat:"EV Component",  material:"Aluminium",        crit:"High",   supplier:"S004", model:"EV SUV X",       plant:"Pune Plant",    line:"Line 3", daily:180, inv:2900, ss:2500, commodity:"Aluminium",           demandVol:0.52 },
  { id:"P005", name:"Motor Controller Housing",cat:"EV Component",  material:"Aluminium Alloy",  crit:"Medium", supplier:"S004", model:"EV SUV X",       plant:"Pune Plant",    line:"Line 3", daily:120, inv:2100, ss:1800, commodity:"Aluminium",           demandVol:0.40 },
  { id:"P003", name:"Wiring Harness Connector",cat:"Electrical",    material:"Copper Plastic",   crit:"Medium", supplier:"S005", model:"Hatchback Z",    plant:"Chennai Plant", line:"Line 1", daily:650, inv:12000,ss:8000, commodity:"Copper",              demandVol:0.46 },
];

// Alternate suppliers qualified per part
const ALTERNATES = {
  P001: [
    { id:"S002", qual:"Approved",     cost:2140, lead:21, capacity:0.35, quality:0.92, delivery:0.91, sustain:0.78 },
    { id:"S003", qual:"Conditional",  cost:2195, lead:26, capacity:0.20, quality:0.89, delivery:0.87, sustain:0.71 },
    { id:"S006", qual:"Under Review", cost:2110, lead:34, capacity:0.15, quality:0.84, delivery:0.79, sustain:0.55 },
  ],
  P004: [
    { id:"S002", qual:"Approved",    cost:1980, lead:22, capacity:0.30, quality:0.90, delivery:0.90, sustain:0.76 },
    { id:"S003", qual:"Conditional", cost:2050, lead:27, capacity:0.18, quality:0.88, delivery:0.86, sustain:0.70 },
  ],
  P002: [
    { id:"S004", qual:"Approved",    cost:3400, lead:18, capacity:0.40, quality:0.88, delivery:0.86, sustain:0.74 },
  ],
};

const NEWS = [
  { date:"2026-06-02", title:"Memory chip shortage warning hits automotive electronics", cat:"Semiconductor", country:"Global", commodity:"Semiconductor Memory", level:"High",   score:0.78 },
  { date:"2026-06-03", title:"Port congestion increases shipment delay risk",            cat:"Logistics",     country:"China",  commodity:"NA",                  level:"Medium", score:0.55 },
  { date:"2026-06-04", title:"Aluminium price volatility impacts EV component sourcing",  cat:"Commodity",     country:"Global", commodity:"Aluminium",           level:"Medium", score:0.46 },
  { date:"2026-06-05", title:"Domestic EV battery localization receives policy support",  cat:"Policy",        country:"India",  commodity:"Lithium",             level:"Medium", score:0.40 },
];

const COMMODITY = {
  "Semiconductor Memory": { index:121, vol:0.66 },
  Aluminium:              { index:107, vol:0.38 },
  Copper:                 { index:112, vol:0.44 },
  Lithium:                { index:129, vol:0.71 },
};

// Production telemetry for Battery Tray welding (Line 3, M007, Batch BX112)
// Centered at 184A target but wide variation (sigma~2.2) -> Cp/Cpk 0.91 (not capable).
// Night shift drifts high toward USL and correlates with defects.
const WELD = [
  { t:"06-01 D", shift:"Day",   batch:"BX112", current:181,   defect:0 },
  { t:"06-01 N", shift:"Night", batch:"BX112", current:187,   defect:1 },
  { t:"06-02 D", shift:"Day",   batch:"BX112", current:182,   defect:0 },
  { t:"06-02 N", shift:"Night", batch:"BX112", current:186,   defect:1 },
  { t:"06-03 D", shift:"Day",   batch:"BX112", current:182.5, defect:0 },
  { t:"06-03 N", shift:"Night", batch:"BX112", current:185.5, defect:1 },
  { t:"06-04 D", shift:"Day",   batch:"BX112", current:182,   defect:0 },
  { t:"06-04 N", shift:"Night", batch:"BX112", current:186,   defect:1 },
];

const DAILY_VEHICLE_OUTPUT = 120;
const VEHICLE_MARGIN = 80000;          // INR
const LINE_STOP_DAYS_CRITICAL = 5;

/* --------------------------- COMPUTATION CORE ----------------------------- */

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const fmtCr = (inr) => `₹${(inr / 1e7).toFixed(2)} Cr`;
const fmtLakh = (inr) => `₹${(inr / 1e5).toFixed(1)} L`;

function daysOfCover(part, invOverride) {
  const inv = invOverride ?? part.inv;
  return inv / part.daily;
}

// Per-factor risk derivations from real supplier/country/commodity data.
// Calibrated so the headline ElectroChip→MCU scenario lands at ~87.
function riskFactors(part, supplier, opts = {}) {
  const inv = opts.inv ?? part.inv;
  const cover = inv / part.daily;
  const cr = COUNTRY_RISK[supplier.country].overall;
  const com = COMMODITY[part.commodity] || { vol: 0.4 };
  const newsHit = NEWS.find(n => n.commodity === part.commodity);
  const singleSource = opts.singleSource ?? true;

  return {
    supplier_delay:   clamp01((1 - supplier.otd) * 2.0 + (supplier.delay / 30) * 1.5),
    country:          cr,
    inventory:        clamp01((1 - cover / supplier.lead) * 1.4),
    commodity:        clamp01(((com.vol + (newsHit ? newsHit.score : 0.3)) / 2) * 1.27),
    quality:          clamp01(supplier.defect * 18),
    logistics:        clamp01(COUNTRY_RISK[supplier.country].logistics * 1.18),
    single_source:    singleSource ? 1.0 : 0.12,
    demand_volatility:part.demandVol,
  };
}

const RISK_WEIGHTS = {
  supplier_delay: 0.20, country: 0.15, inventory: 0.15, commodity: 0.10,
  quality: 0.10, logistics: 0.10, single_source: 0.10, demand_volatility: 0.10,
};

function riskScoreFromFactors(f) {
  let s = 0;
  for (const k in RISK_WEIGHTS) s += RISK_WEIGHTS[k] * f[k];
  return Math.round(clamp01(s) * 100);
}

function partRisk(part, opts = {}) {
  const supplier = SUPPLIERS[part.supplier];
  const f = riskFactors(part, supplier, opts);
  return { score: riskScoreFromFactors(f), factors: f };
}

function riskLevel(score) {
  if (score >= 81) return { label: "Critical", color: "#ef4444", ring: "#7f1d1d" };
  if (score >= 61) return { label: "High",     color: "#f97316", ring: "#7c2d12" };
  if (score >= 31) return { label: "Medium",   color: "#eab308", ring: "#713f12" };
  return { label: "Low", color: "#22c55e", ring: "#14532d" };
}

// Smooth line-stop probability: 87→0.78, 42→0.29 (linear, clamped).
function lineStopProb(score) {
  return clamp01(Math.max(0.05, 0.010889 * score - 0.1667));
}

function productionLoss(days = LINE_STOP_DAYS_CRITICAL) {
  return DAILY_VEHICLE_OUTPUT * VEHICLE_MARGIN * days;
}

// Weighted supplier score for ranking alternates.
function supplierScore(alt) {
  const s = SUPPLIERS[alt.id];
  const qualMap = { Approved: 1.0, Conditional: 0.7, "Under Review": 0.4, "Not Approved": 0.1 };
  const minCost = 2110; // lowest among MCU alternates, used for cost_score reference
  const cost_score = minCost / alt.cost;
  const inverse_risk = 1 - s.defect * 12; // proxy from supplier defect/reliability
  const score =
    0.25 * alt.quality +
    0.20 * alt.delivery +
    0.15 * clamp01(cost_score) +
    0.15 * clamp01(inverse_risk) +
    0.10 * alt.capacity * 2.5 +
    0.10 * qualMap[alt.qual] +
    0.05 * alt.sustain;
  return Math.round(clamp01(score) * 100);
}

// Cp / Cpk for a measurement column with given spec limits.
function cpk(values, USL, LSL) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  const sigma = Math.sqrt(variance);
  const Cp = (USL - LSL) / (6 * sigma);
  const Cpk = Math.min((USL - mean) / (3 * sigma), (mean - LSL) / (3 * sigma));
  return { mean, sigma, Cp, Cpk };
}

function cpkVerdict(v) {
  if (v < 1.0) return { t: "Poor — not capable", c: "#ef4444" };
  if (v < 1.33) return { t: "Needs improvement", c: "#f97316" };
  if (v < 1.67) return { t: "Capable", c: "#22c55e" };
  return { t: "Excellent", c: "#22c55e" };
}

/* ----------------------- DERIVED DEMO QUANTITIES -------------------------- */

const PART_RISK = PARTS.map(p => {
  const r = partRisk(p);
  const cover = daysOfCover(p);
  const lsp = lineStopProb(r.score);
  const lvl = riskLevel(r.score);
  const loss = lvl.label === "Critical" ? productionLoss(5)
            : lvl.label === "High" ? productionLoss(3)
            : lvl.label === "Medium" ? productionLoss(1) : 0;
  return { ...p, risk: r.score, factors: r.factors, cover, lsp, level: lvl, loss };
}).sort((a, b) => b.risk - a.risk);

const TOTAL_VALUE_AT_RISK = PART_RISK.filter(p => p.risk >= 61).reduce((a, p) => a + p.loss, 0);
const CRITICAL_COUNT = PART_RISK.filter(p => p.risk >= 81).length;
const HIGH_RISK_SUPPLIERS = [...new Set(PART_RISK.filter(p => p.risk >= 61).map(p => p.supplier))].length;
const AVG_COVER = (PART_RISK.reduce((a, p) => a + p.cover, 0) / PART_RISK.length).toFixed(1);
const LINE_STOP_EVENTS = PART_RISK.filter(p => p.lsp >= 0.5).length;

const RISK_TREND = [
  { d:"May 22", risk:54 }, { d:"May 25", risk:58 }, { d:"May 28", risk:61 },
  { d:"Jun 01", risk:69 }, { d:"Jun 03", risk:76 }, { d:"Jun 05", risk:87 },
];

/* ------------------------------ UI ATOMS ---------------------------------- */

const C = {
  bg: "#070b16", panel: "#0d1424", panel2: "#111a2e", border: "#1e293b",
  text: "#e2e8f0", dim: "#94a3b8", faint: "#64748b",
  accent: "#38bdf8", amber: "#f59e0b", red: "#ef4444", green: "#22c55e", orange:"#f97316",
};

function Badge({ level }) {
  const lvl = typeof level === "string" ? { label: level, color: C.dim } : level;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider"
      style={{ color: lvl.color, background: `${lvl.color}1a`, border: `1px solid ${lvl.color}55` }}>
      <Circle size={7} fill={lvl.color} stroke="none" />{lvl.label}
    </span>
  );
}

function Stat({ icon: Icon, label, value, sub, tone = C.text }) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-1" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider" style={{ color: C.faint }}>
        <Icon size={13} />{label}
      </div>
      <div className="font-mono text-2xl font-bold leading-none mt-1" style={{ color: tone }}>{value}</div>
      {sub && <div className="text-xs" style={{ color: C.dim }}>{sub}</div>}
    </div>
  );
}

function Panel({ title, children, right, glow }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{
      background: C.panel, border: `1px solid ${glow ? C.red + "66" : C.border}`,
      boxShadow: glow ? `0 0 0 1px ${C.red}22, 0 8px 40px -12px ${C.red}55` : "none",
    }}>
      {title && (
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${C.border}` }}>
          <h3 className="text-sm font-semibold tracking-wide" style={{ color: C.text }}>{title}</h3>
          {right}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

const RiskMeter = ({ score }) => {
  const lvl = riskLevel(score);
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-2 flex-1 rounded-full" style={{ background: C.border }}>
        <div className="absolute h-2 rounded-full" style={{ width: `${score}%`, background: lvl.color }} />
      </div>
      <span className="font-mono text-sm font-bold" style={{ color: lvl.color }}>{score}</span>
    </div>
  );
};

/* ------------------------------ SIDEBAR ----------------------------------- */

const NAV = [
  { id:"dash",     label:"Command Dashboard",  icon: LayoutDashboard },
  { id:"graph",    label:"Supply Chain Twin",  icon: Share2 },
  { id:"risk",     label:"Risk Detail",        icon: AlertTriangle },
  { id:"sim",      label:"Sourcing Simulator", icon: GitBranch },
  { id:"qual",     label:"Quality Copilot",    icon: Activity },
  { id:"erp",      label:"ERP Reorder",        icon: PackageSearch },
  { id:"copilot",  label:"AI Copilot",         icon: MessageSquare, ai: true },
  { id:"scenario", label:"Scenario Planner",   icon: FlaskConical,  ai: true },
];

function Sidebar({ page, setPage }) {
  return (
    <aside className="w-60 shrink-0 flex flex-col" style={{ background: C.panel, borderRight: `1px solid ${C.border}` }}>
      <div className="flex items-center gap-2.5 px-5 py-5" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div className="rounded-lg p-1.5" style={{ background: `${C.accent}1a`, border: `1px solid ${C.accent}44` }}>
          <Shield size={20} style={{ color: C.accent }} />
        </div>
        <div>
          <div className="font-bold text-sm tracking-tight" style={{ color: C.text }}>AutoShield <span style={{ color: C.accent }}>AI</span></div>
          <div className="text-[10px] uppercase tracking-widest" style={{ color: C.faint }}>Resilience Copilot</div>
        </div>
      </div>
      <nav className="flex-1 py-3">
        {NAV.map((n, i) => {
          const active = page === n.id;
          const isFirst = i > 0 && NAV[i - 1].ai !== n.ai && n.ai;
          return (
            <React.Fragment key={n.id}>
              {isFirst && (
                <div className="mx-5 my-2 flex items-center gap-2">
                  <div style={{ flex:1, height:1, background: C.border }} />
                  <span className="text-[9px] uppercase tracking-widest font-bold" style={{ color: C.accent }}>AI</span>
                  <div style={{ flex:1, height:1, background: C.border }} />
                </div>
              )}
              <button onClick={() => setPage(n.id)}
                className="w-full flex items-center gap-3 px-5 py-2.5 text-sm transition-colors"
                style={{
                  color: active ? C.text : C.dim,
                  background: active ? (n.ai ? `${C.accent}1e` : `${C.accent}14`) : "transparent",
                  borderLeft: `2px solid ${active ? C.accent : "transparent"}`,
                }}>
                <n.icon size={16} style={{ color: active ? C.accent : n.ai ? `${C.accent}88` : C.faint }} />
                {n.label}
                {n.ai && !active && (
                  <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded font-bold uppercase"
                    style={{ background:`${C.accent}22`, color: C.accent }}>AI</span>
                )}
              </button>
            </React.Fragment>
          );
        })}
      </nav>
      <div className="px-5 py-4 text-[10px] leading-relaxed" style={{ color: C.faint, borderTop: `1px solid ${C.border}` }}>
        ET AutoTech Hackathon 2026<br />Theme 1 · Supply Chain & Smart Mfg
      </div>
    </aside>
  );
}

function TopBar({ title }) {
  return (
    <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${C.border}`, background: C.bg }}>
      <div>
        <h1 className="text-lg font-bold tracking-tight" style={{ color: C.text }}>{title}</h1>
        <div className="text-xs" style={{ color: C.faint }}>EV SUV X · Pune Plant · Live operational view</div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: `${C.green}14`, border: `1px solid ${C.green}44` }}>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute h-2 w-2 rounded-full opacity-75" style={{ background: C.green }} />
            <span className="relative rounded-full h-2 w-2" style={{ background: C.green }} />
          </span>
          <span className="text-xs font-medium" style={{ color: C.green }}>Live · 05 Jun 2026</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ DASHBOARD --------------------------------- */

function Dashboard({ go }) {
  const mcu = PART_RISK.find(p => p.id === "P001");
  const summary = `AutoShield has detected ${CRITICAL_COUNT} critical supply-chain risk affecting EV SUV X production. The highest is Infotainment MCU from ElectroChip Asia — inventory cover of only ${mcu.cover.toFixed(1)} days and a predicted line-stop probability of ${Math.round(mcu.lsp*100)}%. Immediate mitigation can cut estimated production loss from ${fmtCr(mcu.loss)} to ₹1.10 Cr.`;

  const [briefing, setBriefing] = useState(null);
  const [briefingLoading, setBriefingLoading] = useState(false);

  async function fetchBriefing() {
    if (briefingLoading) return;
    setBriefingLoading(true);
    try {
      const d = await apiFetch("/api/ai/executive-briefing");
      setBriefing(d.briefing);
    } catch {
      setBriefing("⚠️ AI service unreachable. Ensure backend is running on port 8000 with OPENAI_API_KEY set.");
    }
    setBriefingLoading(false);
  }

  const topSuppliers = Object.values(SUPPLIERS)
    .map(s => {
      const parts = PART_RISK.filter(p => p.supplier === s.id);
      const maxRisk = parts.length ? Math.max(...parts.map(p => p.risk)) : 0;
      const rev = parts.reduce((a, p) => a + p.loss, 0);
      return { ...s, maxRisk, rev, parts: parts.length };
    })
    .filter(s => s.parts > 0).sort((a, b) => b.maxRisk - a.maxRisk).slice(0, 5);

  return (
    <div className="p-6 space-y-5">
      <div className="grid grid-cols-5 gap-4">
        <Stat icon={IndianRupee} label="Production Value at Risk" value={fmtCr(TOTAL_VALUE_AT_RISK)} sub="Across high+critical parts" tone={C.red} />
        <Stat icon={AlertTriangle} label="Critical Parts" value={CRITICAL_COUNT} sub="Risk score ≥ 81" tone={C.orange} />
        <Stat icon={Factory} label="High-Risk Suppliers" value={HIGH_RISK_SUPPLIERS} sub="Need mitigation" tone={C.amber} />
        <Stat icon={PackageSearch} label="Avg Inventory Cover" value={`${AVG_COVER}d`} sub="Days of supply" />
        <Stat icon={Zap} label="Predicted Line-Stops" value={LINE_STOP_EVENTS} sub="Probability ≥ 50%" tone={C.red} />
      </div>

      {/* AI exec summary */}
      <div className="rounded-xl p-5 flex gap-4" style={{ background: `linear-gradient(135deg, ${C.panel2}, ${C.panel})`, border: `1px solid ${C.accent}33` }}>
        <div className="rounded-lg p-2 h-fit" style={{ background: `${C.accent}1a` }}><Cpu size={18} style={{ color: C.accent }} /></div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs uppercase tracking-widest font-semibold" style={{ color: C.accent }}>AI Executive Summary</div>
            <button
              onClick={fetchBriefing}
              disabled={briefingLoading}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-opacity"
              style={{ background: `${C.accent}22`, color: C.accent, border: `1px solid ${C.accent}44`, opacity: briefingLoading ? 0.6 : 1 }}
            >
              {briefingLoading ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
              {briefingLoading ? "Generating…" : briefing ? "Regenerate GPT-4o" : "Generate GPT-4o Briefing"}
            </button>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: C.text }}>
            {briefing || summary}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-5">
          <Panel title="Top Risk-Ranked Parts" right={<span className="text-xs" style={{ color: C.faint }}>click to inspect →</span>}>
            <div className="space-y-2">
              {PART_RISK.map(p => (
                <button key={p.id} onClick={() => go("risk", p.id)}
                  className="w-full flex items-center gap-4 px-3 py-2.5 rounded-lg transition-colors text-left hover:brightness-125"
                  style={{ background: C.panel2, border: `1px solid ${C.border}` }}>
                  <div className="w-40 shrink-0">
                    <div className="text-sm font-semibold" style={{ color: C.text }}>{p.name}</div>
                    <div className="text-xs" style={{ color: C.faint }}>{SUPPLIERS[p.supplier].name}</div>
                  </div>
                  <div className="flex-1"><RiskMeter score={p.risk} /></div>
                  <Badge level={p.level} />
                  <div className="w-20 text-right font-mono text-xs" style={{ color: C.dim }}>{p.cover.toFixed(1)}d cover</div>
                  <div className="w-20 text-right font-mono text-xs font-bold" style={{ color: p.loss ? C.red : C.faint }}>{p.loss ? fmtCr(p.loss) : "—"}</div>
                  <ChevronRight size={15} style={{ color: C.faint }} />
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Aggregate Supply-Chain Risk Trend">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={RISK_TREND} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.red} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={C.red} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="d" stroke={C.faint} fontSize={11} />
                <YAxis domain={[40, 100]} stroke={C.faint} fontSize={11} />
                <Tooltip contentStyle={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }} />
                <ReferenceLine y={81} stroke={C.red} strokeDasharray="4 4" label={{ value: "Critical", fill: C.red, fontSize: 10 }} />
                <Area type="monotone" dataKey="risk" stroke={C.red} strokeWidth={2} fill="url(#rg)" />
              </AreaChart>
            </ResponsiveContainer>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Top Risky Suppliers">
            <div className="space-y-2">
              {topSuppliers.map(s => (
                <div key={s.id} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: C.panel2, border: `1px solid ${C.border}` }}>
                  <div>
                    <div className="text-sm font-medium" style={{ color: C.text }}>{s.name}</div>
                    <div className="text-xs flex items-center gap-1" style={{ color: C.faint }}><Globe2 size={10} />{s.country}</div>
                  </div>
                  <Badge level={riskLevel(s.maxRisk)} />
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Country Dependency Exposure">
            <div className="space-y-2.5">
              {["China", "India", "South Korea", "Vietnam"].map(c => {
                const r = COUNTRY_RISK[c].overall;
                const lvl = riskLevel(Math.round(r * 100));
                return (
                  <div key={c}>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: C.text }}>{c}</span>
                      <span className="font-mono" style={{ color: lvl.color }}>{(r * 100).toFixed(0)}</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: C.border }}>
                      <div className="h-1.5 rounded-full" style={{ width: `${r * 100}%`, background: lvl.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- SUPPLY CHAIN GRAPH --------------------------- */

function GraphView({ go }) {
  const [sel, setSel] = useState("S001");

  // Layered layout: country → supplier → part → model → line/plant
  const nodes = [
    { id:"China",  type:"Country", label:"China",      x:80,  y:80,  risk:66 },
    { id:"India",  type:"Country", label:"India",      x:80,  y:300, risk:24 },
    { id:"S001",   type:"Supplier",label:"ElectroChip Asia", x:280, y:80,  risk:87 },
    { id:"S004",   type:"Supplier",label:"Precision Alloy",  x:280, y:300, risk:46 },
    { id:"P001",   type:"Part",    label:"Infotainment MCU", x:500, y:60,  risk:87 },
    { id:"P004",   type:"Part",    label:"BCU Chip",         x:500, y:170, risk:64 },
    { id:"P002",   type:"Part",    label:"Battery Tray",     x:500, y:300, risk:42 },
    { id:"EVX",    type:"Model",   label:"EV SUV X",         x:720, y:120, risk:87 },
    { id:"SEDY",   type:"Model",   label:"Premium Sedan Y",  x:720, y:240, risk:64 },
    { id:"L2",     type:"Line",    label:"Pune · Line 2",    x:920, y:120, risk:87 },
    { id:"L3",     type:"Line",    label:"Pune · Line 3",    x:920, y:300, risk:42 },
  ];
  const edges = [
    ["China","S001"],["India","S004"],
    ["S001","P001"],["S001","P004"],["S004","P002"],
    ["P001","EVX"],["P004","SEDY"],["P002","EVX"],
    ["EVX","L2"],["SEDY","L2"],["P002","L3"],["EVX","L3"],
  ];
  const N = Object.fromEntries(nodes.map(n => [n.id, n]));
  const selNode = N[sel];

  const typeIcon = { Country: Globe2, Supplier: Factory, Part: Cpu, Model: Truck, Line: Activity };

  // Highlight path from selected node downstream/upstream
  const litEdges = new Set();
  if (sel) {
    const adj = {};
    edges.forEach(([a, b]) => { (adj[a] = adj[a] || []).push(b); (adj[b] = adj[b] || []).push(a); });
    const seen = new Set([sel]); const q = [sel];
    while (q.length) { const cur = q.shift(); (adj[cur] || []).forEach(nx => { if (!seen.has(nx)) { seen.add(nx); q.push(nx); litEdges.add([cur, nx].sort().join("|")); litEdges.add([nx, cur].sort().join("|")); } }); }
  }

  return (
    <div className="p-6 grid grid-cols-4 gap-5">
      <div className="col-span-3">
        <Panel title="Digital-Twin Dependency Graph" right={<span className="text-xs" style={{ color: C.faint }}>click any node to trace blast radius</span>}>
          <svg viewBox="0 0 1020 400" className="w-full" style={{ height: 420 }}>
            {edges.map(([a, b], i) => {
              const lit = litEdges.has([a, b].sort().join("|"));
              return <line key={i} x1={N[a].x} y1={N[a].y} x2={N[b].x} y2={N[b].y}
                stroke={lit ? C.accent : C.border} strokeWidth={lit ? 2 : 1} opacity={lit ? 0.9 : 0.4} />;
            })}
            {nodes.map(n => {
              const lvl = riskLevel(n.risk);
              const Icon = typeIcon[n.type];
              const active = sel === n.id;
              return (
                <g key={n.id} onClick={() => setSel(n.id)} style={{ cursor: "pointer" }}>
                  <circle cx={n.x} cy={n.y} r={active ? 26 : 22} fill={C.panel} stroke={lvl.color}
                    strokeWidth={active ? 3 : 2} style={{ filter: active ? `drop-shadow(0 0 8px ${lvl.color})` : "none" }} />
                  <foreignObject x={n.x - 9} y={n.y - 9} width={18} height={18}>
                    <Icon size={18} style={{ color: lvl.color }} />
                  </foreignObject>
                  <text x={n.x} y={n.y + 38} textAnchor="middle" fontSize={11} fill={C.text} fontWeight={600}>{n.label}</text>
                  <text x={n.x} y={n.y + 51} textAnchor="middle" fontSize={9} fill={lvl.color} fontFamily="monospace">{n.risk}</text>
                </g>
              );
            })}
          </svg>
          <div className="flex gap-4 justify-center mt-2 text-xs" style={{ color: C.dim }}>
            {[["Critical", C.red], ["High", C.orange], ["Medium", C.amber], ["Low", C.green]].map(([l, c]) => (
              <span key={l} className="flex items-center gap-1.5"><Circle size={9} fill={c} stroke="none" />{l}</span>
            ))}
          </div>
        </Panel>
      </div>

      <div className="space-y-4">
        <Panel title={`${selNode.type} Detail`} glow={selNode.risk >= 81}>
          <div className="space-y-3">
            <div>
              <div className="text-xs uppercase tracking-wide" style={{ color: C.faint }}>{selNode.type}</div>
              <div className="text-lg font-bold" style={{ color: C.text }}>{selNode.label}</div>
            </div>
            <RiskMeter score={selNode.risk} />
            {sel === "S001" && (
              <div className="space-y-2 text-sm pt-2" style={{ borderTop: `1px solid ${C.border}` }}>
                <Row k="Country" v="China" />
                <Row k="Affected Parts" v="Infotainment MCU, BCU Chip" />
                <Row k="Affected Models" v="EV SUV X, Premium Sedan Y" />
                <Row k="Affected Lines" v="Pune L2, Pune L3" />
                <Row k="Revenue at Risk" v={fmtCr(productionLoss(5) + productionLoss(3))} tone={C.red} />
              </div>
            )}
            {sel !== "S001" && (
              <p className="text-xs leading-relaxed pt-2" style={{ color: C.dim, borderTop: `1px solid ${C.border}` }}>
                {selNode.risk >= 81 ? "Critical node — sits on a single-source dependency path feeding live production." :
                 selNode.risk >= 61 ? "Elevated risk — monitor closely and pre-qualify alternates." :
                 "Within acceptable resilience thresholds."}
              </p>
            )}
          </div>
        </Panel>
        {sel === "S001" && (
          <div className="rounded-xl p-4" style={{ background: `${C.red}10`, border: `1px solid ${C.red}44` }}>
            <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: C.red }}>Critical dependency path</div>
            <div className="text-xs font-mono leading-relaxed" style={{ color: C.text }}>
              ElectroChip Asia → Infotainment MCU → EV SUV X → Pune Line 2
            </div>
            <button onClick={() => go("risk", "P001")} className="mt-3 w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1"
              style={{ background: C.red, color: "#fff" }}>
              Inspect & Mitigate <ChevronRight size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const Row = ({ k, v, tone }) => (
  <div className="flex justify-between gap-3">
    <span style={{ color: C.faint }}>{k}</span>
    <span className="text-right font-medium" style={{ color: tone || C.text }}>{v}</span>
  </div>
);

/* ------------------------------ RISK DETAIL ------------------------------- */

function RiskDetail({ partId, go }) {
  const p = PART_RISK.find(x => x.id === partId) || PART_RISK[0];
  const s = SUPPLIERS[p.supplier];

  const [aiAnalysis, setAiAnalysis]   = useState(null);
  const [aiLoading, setAiLoading]     = useState(false);
  const [aiExpanded, setAiExpanded]   = useState(false);
  const [strategy, setStrategy]       = useState(null);
  const [stratLoading, setStratLoading] = useState(false);

  async function fetchDeepAnalysis() {
    if (aiLoading) return;
    setAiLoading(true);
    setAiExpanded(true);
    try {
      const d = await apiFetch(`/api/ai/deep-analysis/${p.id}`, { method: "POST" });
      setAiAnalysis(d.analysis);
    } catch {
      setAiAnalysis("⚠️ AI service unreachable. Ensure backend is running on port 8000 with OPENAI_API_KEY set.");
    }
    setAiLoading(false);
  }

  async function fetchStrategy() {
    if (stratLoading) return;
    setStratLoading(true);
    try {
      const d = await apiFetch(`/api/ai/procurement-strategy/${p.id}`, { method: "POST" });
      setStrategy(d.strategy);
    } catch {
      setStrategy("⚠️ AI service unreachable.");
    }
    setStratLoading(false);
  }

  const factorRows = [
    ["Supplier delay", p.factors.supplier_delay, 0.20],
    ["Country risk", p.factors.country, 0.15],
    ["Inventory risk", p.factors.inventory, 0.15],
    ["Commodity risk", p.factors.commodity, 0.10],
    ["Quality risk", p.factors.quality, 0.10],
    ["Logistics risk", p.factors.logistics, 0.10],
    ["Single-source", p.factors.single_source, 0.10],
    ["Demand volatility", p.factors.demand_volatility, 0.10],
  ];
  const relevantNews = NEWS.filter(n => n.commodity === p.commodity || n.country === s.country);

  return (
    <div className="p-6 grid grid-cols-3 gap-5">
      <div className="col-span-2 space-y-5">
        <Panel glow={p.risk >= 81} title={null}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs uppercase tracking-widest" style={{ color: C.faint }}>{p.cat} · {p.material} · Criticality {p.crit}</div>
              <h2 className="text-2xl font-bold mt-1" style={{ color: C.text }}>{p.name}</h2>
              <div className="text-sm mt-1" style={{ color: C.dim }}>{s.name} · {s.country} · {p.model} · {p.plant} {p.line}</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-5xl font-bold leading-none" style={{ color: p.level.color }}>{p.risk}</div>
              <Badge level={p.level} />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3 mt-5">
            <Mini label="Inventory cover" value={`${p.cover.toFixed(1)} d`} tone={p.cover < s.lead ? C.red : C.green} />
            <Mini label="Supplier lead time" value={`${s.lead} d`} />
            <Mini label="Line-stop prob." value={`${Math.round(p.lsp * 100)}%`} tone={C.red} />
            <Mini label="Est. production loss" value={p.loss ? fmtCr(p.loss) : "—"} tone={C.red} />
          </div>
        </Panel>

        <Panel title="Risk Factor Decomposition" right={<span className="text-xs" style={{ color: C.faint }}>weighted contribution to score</span>}>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={factorRows.map(([n, v, w]) => ({ n, contrib: +(v * w * 100).toFixed(1), v }))} layout="vertical" margin={{ left: 30, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
              <XAxis type="number" stroke={C.faint} fontSize={11} />
              <YAxis type="category" dataKey="n" stroke={C.faint} fontSize={11} width={100} />
              <Tooltip contentStyle={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8 }} formatter={(val) => [`${val} pts`, "contribution"]} />
              <Bar dataKey="contrib" radius={[0, 4, 4, 0]}>
                {factorRows.map(([, v], i) => <Cell key={i} fill={v > 0.7 ? C.red : v > 0.45 ? C.orange : C.amber} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Recommended Action Plan">
          <ol className="space-y-2">
            {[
              "Shift 35% of next PO to Bharat Semi Components (Approved, lead 21d)",
              "Shift 20% to Korea MicroSystems (Conditional backup, lead 26d)",
              "Retain 45% with ElectroChip Asia to protect existing tooling",
              "Raise safety stock from 12 → 18 days of cover",
              "Place reorder for 8,000 units now to bridge lead-time gap",
              "Inspect all incoming ElectroChip batches; route via Chennai port",
            ].map((a, i) => (
              <li key={i} className="flex gap-3 items-start text-sm" style={{ color: C.text }}>
                <span className="font-mono text-xs mt-0.5 rounded px-1.5 py-0.5" style={{ background: `${C.accent}1a`, color: C.accent }}>{i + 1}</span>
                {a}
              </li>
            ))}
          </ol>
          {p.id === "P001" && (
            <button onClick={() => go("sim", p.id)} className="mt-4 w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
              style={{ background: C.accent, color: C.bg }}>
              Open Sourcing Simulator <ChevronRight size={15} />
            </button>
          )}
        </Panel>
      </div>

      <div className="space-y-5">
        <Panel title="AI Copilot Explanation">
          <p className="text-sm leading-relaxed" style={{ color: C.text }}>
            The <b>{p.name}</b> is at <b style={{ color: p.level.color }}>{p.level.label.toLowerCase()}</b> risk because {s.name} shows rising delays
            ({s.delay}d avg, {Math.round((1 - s.otd) * 100)}% late) and inventory will last only <b>{p.cover.toFixed(1)} days</b> against a
            <b> {s.lead}-day</b> lead time. Without action, {p.plant} {p.line} may stop within {Math.round(p.cover)}–{Math.round(p.cover + 2)} days,
            costing an estimated <b style={{ color: C.red }}>{p.loss ? fmtCr(p.loss) : "—"}</b>. Best mitigation: diversify to Bharat Semi (35%) and
            Korea MicroSystems (20%), and lift safety stock to 18 days.
          </p>
        </Panel>

        {/* AI Deep Analysis */}
        <div className="rounded-xl overflow-hidden" style={{ background: C.panel, border: `1px solid ${C.accent}33` }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: aiExpanded ? `1px solid ${C.border}` : "none" }}>
            <div className="flex items-center gap-2">
              <Brain size={14} style={{ color: C.accent }} />
              <span className="text-sm font-semibold" style={{ color: C.text }}>GPT-4o Deep Risk Analysis</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={fetchDeepAnalysis} disabled={aiLoading}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background: `${C.accent}22`, color: C.accent, border: `1px solid ${C.accent}44`, opacity: aiLoading ? 0.6 : 1 }}>
                {aiLoading ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                {aiLoading ? "Analysing…" : aiAnalysis ? "Re-run" : "Run Analysis"}
              </button>
              {aiAnalysis && (
                <button onClick={() => setAiExpanded(x => !x)} style={{ color: C.faint }}>
                  {aiExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              )}
            </div>
          </div>
          {aiExpanded && (
            <div className="p-4">
              {aiLoading && !aiAnalysis ? (
                <div className="flex items-center gap-2 text-sm" style={{ color: C.faint }}>
                  <Loader2 size={14} className="animate-spin" />Generating deep analysis…
                </div>
              ) : (
                <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: C.text }}>
                  {aiAnalysis}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 90-day Procurement Strategy */}
        <div className="rounded-xl overflow-hidden" style={{ background: C.panel, border: `1px solid ${C.green}33` }}>
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles size={14} style={{ color: C.green }} />
              <span className="text-sm font-semibold" style={{ color: C.text }}>90-Day Procurement Playbook</span>
            </div>
            <button onClick={fetchStrategy} disabled={stratLoading}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: `${C.green}18`, color: C.green, border: `1px solid ${C.green}44`, opacity: stratLoading ? 0.6 : 1 }}>
              {stratLoading ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
              {stratLoading ? "Generating…" : strategy ? "Regenerate" : "Generate Strategy"}
            </button>
          </div>
          {strategy && (
            <div className="px-4 pb-4">
              <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: C.text, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                {strategy}
              </div>
            </div>
          )}
        </div>

        <Panel title="Live Risk Signals">
          <div className="space-y-2">
            {relevantNews.map((n, i) => (
              <div key={i} className="px-3 py-2 rounded-lg" style={{ background: C.panel2, border: `1px solid ${C.border}` }}>
                <div className="flex justify-between items-start gap-2">
                  <span className="text-xs leading-snug" style={{ color: C.text }}>{n.title}</span>
                  <Badge level={riskLevel(Math.round(n.score * 100))} />
                </div>
                <div className="text-[10px] mt-1 font-mono" style={{ color: C.faint }}>{n.date} · {n.cat}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Commodity Intelligence">
          {(() => { const c = COMMODITY[p.commodity]; return (
            <div className="space-y-2 text-sm">
              <Row k="Commodity" v={p.commodity} />
              <Row k="Price index" v={c.index} tone={c.index > 115 ? C.orange : C.text} />
              <Row k="Volatility" v={`${(c.vol * 100).toFixed(0)}%`} tone={c.vol > 0.6 ? C.red : C.amber} />
            </div>
          ); })()}
        </Panel>
      </div>
    </div>
  );
}

const Mini = ({ label, value, tone }) => (
  <div className="rounded-lg p-3" style={{ background: C.panel2, border: `1px solid ${C.border}` }}>
    <div className="text-[10px] uppercase tracking-wide" style={{ color: C.faint }}>{label}</div>
    <div className="font-mono text-lg font-bold mt-0.5" style={{ color: tone || C.text }}>{value}</div>
  </div>
);

/* --------------------------- SOURCING SIMULATOR --------------------------- */

function Simulator() {
  const p = PART_RISK.find(x => x.id === "P001");
  const alts = ALTERNATES.P001;
  const ranked = [...alts].map(a => ({ ...a, score: supplierScore(a), s: SUPPLIERS[a.id] }))
    .sort((a, b) => b.score - a.score);

  const [alloc, setAlloc] = useState({ S001: 45, S002: 35, S003: 20 });
  const baseCostPerUnit = 2050;        // current effective unit cost reference
  const monthlyDemand = p.daily * 30;

  // Recompute blended risk live from allocation (calibrated mitigation model).
  const blended = useMemo(() => {
    const mix = [
      { id: "S001", w: alloc.S001 / 100 },
      { id: "S002", w: alloc.S002 / 100 },
      { id: "S003", w: alloc.S003 / 100 },
    ];
    const total = mix.reduce((a, m) => a + m.w, 0) || 1;
    const effLead = mix.reduce((a, m) => a + SUPPLIERS[m.id].lead * m.w, 0) / total;

    // blend market/supplier factors weighted by allocation
    let bf = { supplier_delay:0, country:0, commodity:0, quality:0, logistics:0, demand_volatility:0 };
    mix.forEach(m => {
      const ff = riskFactors(p, SUPPLIERS[m.id], { singleSource: false });
      for (const k in bf) bf[k] += ff[k] * (m.w / total);
    });
    const nonZero = mix.filter(m => m.w > 0.05).length;

    const f = {
      supplier_delay:   bf.supplier_delay,
      country:          bf.country,
      inventory:        clamp01((1 - 18 / effLead) * 0.62),   // safety stock 18d vs blended lead
      commodity:        bf.commodity * 0.45,                  // regional + dual-source hedge
      quality:          bf.quality,
      logistics:        bf.logistics,
      single_source:    nonZero >= 3 ? 0.10 : nonZero === 2 ? 0.30 : 1.0,
      demand_volatility:bf.demand_volatility * 0.34,          // safety stock buffers demand swings
    };
    const score = riskScoreFromFactors(f);
    const lsp = lineStopProb(score);
    const altCost = alloc.S002 / 100 * (2140 - baseCostPerUnit) + alloc.S003 / 100 * (2195 - baseCostPerUnit);
    const addlCost = Math.max(0, altCost) * monthlyDemand;
    return { score, lsp, addlCost };
  }, [alloc]);

  const before = { score: p.risk, lsp: p.lsp };
  const avoided = productionLoss(5) - productionLoss(5) * (blended.lsp / before.lsp);
  const setA = (id, val) => setAlloc(a => ({ ...a, [id]: +val }));
  const sum = alloc.S001 + alloc.S002 + alloc.S003;

  return (
    <div className="p-6 grid grid-cols-3 gap-5">
      <div className="col-span-2 space-y-5">
        <Panel title="Supplier Allocation — drag to simulate" right={<span className="font-mono text-xs" style={{ color: sum === 100 ? C.green : C.amber }}>Σ {sum}%</span>}>
          <div className="space-y-5">
            {[["S001", C.red], ["S002", C.green], ["S003", C.amber]].map(([id, col]) => (
              <div key={id}>
                <div className="flex justify-between text-sm mb-1">
                  <span style={{ color: C.text }}>{SUPPLIERS[id].name} <span style={{ color: C.faint }}>· {SUPPLIERS[id].country}</span></span>
                  <span className="font-mono font-bold" style={{ color: col }}>{alloc[id]}%</span>
                </div>
                <input type="range" min={0} max={100} value={alloc[id]} onChange={e => setA(id, e.target.value)}
                  className="w-full" style={{ accentColor: col }} />
              </div>
            ))}
          </div>
        </Panel>

        <div className="grid grid-cols-2 gap-5">
          <Panel title="Before Mitigation">
            <BigNum value={before.score} label="Risk score" tone={riskLevel(before.score).color} />
            <div className="mt-3 space-y-2 text-sm">
              <Row k="Line-stop probability" v={`${Math.round(before.lsp * 100)}%`} tone={C.red} />
              <Row k="Single-source exposure" v="100%" tone={C.red} />
              <Row k="Exposed loss" v={fmtCr(productionLoss(5))} tone={C.red} />
            </div>
          </Panel>
          <Panel title="After Mitigation" glow={false}>
            <BigNum value={blended.score} label="Risk score" tone={riskLevel(blended.score).color} />
            <div className="mt-3 space-y-2 text-sm">
              <Row k="Line-stop probability" v={`${Math.round(blended.lsp * 100)}%`} tone={C.green} />
              <Row k="Additional cost" v={fmtLakh(blended.addlCost)} tone={C.amber} />
              <Row k="Avoided loss" v={fmtCr(productionLoss(5) - productionLoss(5) * blended.lsp / before.lsp)} tone={C.green} />
            </div>
          </Panel>
        </div>

        <div className="rounded-xl p-4 flex items-center justify-around" style={{ background: `linear-gradient(135deg, ${C.panel2}, ${C.panel})`, border: `1px solid ${C.green}44` }}>
          <Delta from={before.score} to={blended.score} label="Risk" />
          <div style={{ width: 1, height: 40, background: C.border }} />
          <Delta from={Math.round(before.lsp * 100)} to={Math.round(blended.lsp * 100)} label="Line-stop %" />
          <div style={{ width: 1, height: 40, background: C.border }} />
          <div className="text-center">
            <div className="text-xs uppercase tracking-wide" style={{ color: C.faint }}>Net benefit</div>
            <div className="font-mono text-lg font-bold" style={{ color: C.green }}>{fmtCr(productionLoss(5) - productionLoss(5) * blended.lsp / before.lsp - blended.addlCost)}</div>
          </div>
        </div>
      </div>

      <div>
        <Panel title="Ranked Alternate Suppliers">
          <div className="space-y-3">
            {ranked.map((a, i) => (
              <div key={a.id} className="rounded-lg p-3" style={{ background: C.panel2, border: `1px solid ${i === 0 ? C.green + "66" : C.border}` }}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-semibold" style={{ color: C.text }}>{a.s.name}</div>
                    <div className="text-xs" style={{ color: C.faint }}>{a.s.country} · {a.qual}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-lg font-bold" style={{ color: i === 0 ? C.green : C.text }}>{a.score}</div>
                    {i === 0 && <span className="text-[10px] font-bold" style={{ color: C.green }}>BEST</span>}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1 mt-2 text-[10px]" style={{ color: C.dim }}>
                  <span>Lead {a.lead}d</span>
                  <span>Defect {(a.s.defect * 100).toFixed(1)}%</span>
                  <span>Cap {(a.capacity * 100).toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

const BigNum = ({ value, label, tone }) => (
  <div>
    <div className="font-mono text-5xl font-bold leading-none" style={{ color: tone }}>{value}</div>
    <div className="text-xs uppercase tracking-wide mt-1" style={{ color: C.faint }}>{label}</div>
  </div>
);

const Delta = ({ from, to, label }) => {
  const down = to < from;
  return (
    <div className="text-center">
      <div className="text-xs uppercase tracking-wide" style={{ color: C.faint }}>{label}</div>
      <div className="flex items-center gap-1.5 justify-center mt-1">
        <span className="font-mono text-sm" style={{ color: C.dim }}>{from}</span>
        <ChevronRight size={13} style={{ color: C.faint }} />
        <span className="font-mono text-lg font-bold" style={{ color: down ? C.green : C.red }}>{to}</span>
        {down ? <TrendingDown size={15} style={{ color: C.green }} /> : <TrendingUp size={15} style={{ color: C.red }} />}
      </div>
    </div>
  );
};

/* ----------------------------- QUALITY COPILOT ---------------------------- */

function Quality() {
  const USL = 190, LSL = 178;
  const currents = WELD.map(w => w.current);
  const stats = cpk(currents, USL, LSL);
  const verdict = cpkVerdict(stats.Cpk);
  const defectRate = WELD.filter(w => w.defect).length / WELD.length;
  const nightDefects = WELD.filter(w => w.shift === "Night" && w.defect).length;
  const dayDefects = WELD.filter(w => w.shift === "Day" && w.defect).length;
  const defectProb = 0.72;

  const [rca, setRca]           = useState(null);
  const [rcaLoading, setRcaLoading] = useState(false);

  async function fetchRCA() {
    if (rcaLoading) return;
    setRcaLoading(true);
    try {
      const d = await apiFetch("/api/ai/quality-rca");
      setRca(d.analysis);
    } catch {
      setRca("⚠️ AI service unreachable. Ensure backend is running on port 8000 with OPENAI_API_KEY set.");
    }
    setRcaLoading(false);
  }

  return (
    <div className="p-6 grid grid-cols-3 gap-5">
      <div className="col-span-2 space-y-5">
        <Panel glow title={null}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-widest" style={{ color: C.red }}>Active Quality Alert</div>
              <h2 className="text-xl font-bold mt-1" style={{ color: C.text }}>Battery Tray welding defect probability rising</h2>
              <div className="text-sm mt-1" style={{ color: C.dim }}>Pune Plant · Line 3 · Machine M007 · Batch BX112</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-4xl font-bold" style={{ color: C.red }}>{Math.round(defectProb * 100)}%</div>
              <div className="text-xs" style={{ color: C.faint }}>defect probability</div>
            </div>
          </div>
        </Panel>

        <div className="grid grid-cols-2 gap-5">
          <Panel title="Welding Current vs Spec (Cp/Cpk)">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={WELD} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="t" stroke={C.faint} fontSize={9} />
                <YAxis domain={[174, 196]} stroke={C.faint} fontSize={10} />
                <Tooltip contentStyle={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8 }} />
                <ReferenceLine y={USL} stroke={C.red} strokeDasharray="4 4" label={{ value: "USL 190", fill: C.red, fontSize: 9 }} />
                <ReferenceLine y={LSL} stroke={C.red} strokeDasharray="4 4" label={{ value: "LSL 178", fill: C.red, fontSize: 9 }} />
                <Line type="monotone" dataKey="current" stroke={C.accent} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <Mini label="Mean" value={`${stats.mean.toFixed(1)}A`} />
              <Mini label="Cp" value={stats.Cp.toFixed(2)} tone={cpkVerdict(stats.Cp).c} />
              <Mini label="Cpk" value={stats.Cpk.toFixed(2)} tone={verdict.c} />
            </div>
            <div className="text-xs mt-2 font-medium" style={{ color: verdict.c }}>{verdict.t} · σ = {stats.sigma.toFixed(2)}</div>
          </Panel>

          <Panel title="Root Cause Analysis">
            <div className="space-y-2.5">
              {[
                [`Supplier batch BX112 linked to ${Math.round(defectRate * 100)}% of inspected defects`, C.red],
                ["Welding current variation +18% above normal band", C.orange],
                [`Night shift shows ${nightDefects}× defects vs ${dayDefects} on day shift`, C.orange],
                ["Machine M007 vibration up 16% this week", C.amber],
              ].map(([t, c], i) => (
                <div key={i} className="flex gap-2 items-start text-sm">
                  <Circle size={8} fill={c} stroke="none" className="mt-1.5 shrink-0" />
                  <span style={{ color: C.text }}>{t}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 text-sm" style={{ borderTop: `1px solid ${C.border}` }}>
              <Row k="Cpk drift" v="1.42 → 0.91" tone={C.red} />
            </div>
          </Panel>
        </div>

        <Panel title="Defect Distribution by Shift">
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={[
              { shift: "Day", defects: dayDefects, ok: WELD.filter(w => w.shift === "Day").length - dayDefects },
              { shift: "Night", defects: nightDefects, ok: WELD.filter(w => w.shift === "Night").length - nightDefects },
            ]} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="shift" stroke={C.faint} fontSize={11} />
              <YAxis stroke={C.faint} fontSize={11} />
              <Tooltip contentStyle={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8 }} />
              <Bar dataKey="ok" stackId="a" fill={C.green} radius={[0, 0, 0, 0]} />
              <Bar dataKey="defects" stackId="a" fill={C.red} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <div className="space-y-5">
        <Panel title="Operator Action Checklist">
          <div className="space-y-2">
            {[
              "Quarantine Batch BX112 immediately",
              "Recalibrate welding current to 184A",
              "Inspect next 50 units manually",
              "Log M007 for maintenance review",
              "Notify quality engineer on shift",
            ].map((a, i) => (
              <label key={i} className="flex gap-3 items-start text-sm px-3 py-2.5 rounded-lg cursor-pointer"
                style={{ background: C.panel2, border: `1px solid ${C.border}` }}>
                <input type="checkbox" className="mt-0.5" style={{ accentColor: C.accent }} />
                <span style={{ color: C.text }}>{a}</span>
              </label>
            ))}
          </div>
          <div className="mt-4 rounded-lg p-3 text-xs leading-relaxed" style={{ background: `${C.accent}10`, border: `1px solid ${C.accent}33`, color: C.dim }}>
            <b style={{ color: C.accent }}>Copilot:</b> Recalibrating to 184A centers the process within spec and lifts projected Cpk back above 1.33, cutting defect probability from 72% to ~9%.
          </div>
        </Panel>

        {/* AI Root Cause Analysis */}
        <div className="rounded-xl overflow-hidden" style={{ background: C.panel, border: `1px solid ${C.red}44` }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: rca ? `1px solid ${C.border}` : "none" }}>
            <div className="flex items-center gap-2">
              <Brain size={14} style={{ color: C.red }} />
              <span className="text-sm font-semibold" style={{ color: C.text }}>GPT-4o Root Cause Analysis</span>
            </div>
            <button
              onClick={fetchRCA}
              disabled={rcaLoading}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: `${C.red}18`, color: C.red, border: `1px solid ${C.red}44`, opacity: rcaLoading ? 0.6 : 1 }}
            >
              {rcaLoading ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
              {rcaLoading ? "Analysing…" : rca ? "Re-run" : "Run Deep RCA"}
            </button>
          </div>
          {rcaLoading && !rca && (
            <div className="px-4 py-3 flex items-center gap-2 text-sm" style={{ color: C.faint }}>
              <Loader2 size={13} className="animate-spin" />GPT-4o analysing welding anomaly…
            </div>
          )}
          {rca && (
            <div className="px-4 pb-4 pt-3 text-xs leading-relaxed whitespace-pre-wrap overflow-y-auto"
              style={{ color: C.text, maxHeight: 380 }}>
              {rca}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ ERP REORDER ------------------------------- */

function ERP() {
  const p = PART_RISK.find(x => x.id === "P001");
  const s = SUPPLIERS[p.supplier];
  const cover = p.cover;
  const safetyStockDays = 18;
  const reorderPoint = Math.round(p.daily * (s.lead / 30 * 18 / 18) + p.daily * 5); // demand over lead + buffer
  const orderQty = 8000;
  const split = [
    { id: "S001", pct: 45, eta: "42 d" },
    { id: "S002", pct: 35, eta: "21 d" },
    { id: "S003", pct: 20, eta: "26 d" },
  ];
  const before = p.lsp, after = lineStopProb(42);

  return (
    <div className="p-6 grid grid-cols-3 gap-5">
      <div className="col-span-2 space-y-5">
        <Panel title="Current Inventory Position — Infotainment MCU">
          <div className="grid grid-cols-4 gap-3">
            <Mini label="On-hand" value={`${p.inv.toLocaleString()}`} />
            <Mini label="Daily demand" value={`${p.daily}`} />
            <Mini label="Days of cover" value={`${cover.toFixed(1)} d`} tone={C.red} />
            <Mini label="Lead time" value={`${s.lead} d`} tone={C.orange} />
          </div>
          <div className="mt-4 rounded-lg p-3 flex items-center gap-3" style={{ background: `${C.red}10`, border: `1px solid ${C.red}44` }}>
            <AlertTriangle size={18} style={{ color: C.red }} />
            <span className="text-sm" style={{ color: C.text }}>
              Cover ({cover.toFixed(1)}d) is far below lead time ({s.lead}d). A single delay triggers a line stop —
              <b style={{ color: C.red }}> reorder required now.</b>
            </span>
          </div>
        </Panel>

        <Panel title="AI Reorder Recommendation">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Mini label="Reorder point" value={reorderPoint.toLocaleString()} />
            <Mini label="Suggested PO qty" value={orderQty.toLocaleString()} tone={C.accent} />
            <Mini label="New safety stock" value={`${safetyStockDays} d`} tone={C.green} />
          </div>
          <div className="text-xs uppercase tracking-wide mb-2" style={{ color: C.faint }}>Recommended supplier split</div>
          <div className="space-y-2">
            {split.map(sp => (
              <div key={sp.id} className="flex items-center gap-3">
                <span className="w-44 text-sm" style={{ color: C.text }}>{SUPPLIERS[sp.id].name}</span>
                <div className="flex-1 h-6 rounded-md overflow-hidden flex" style={{ background: C.border }}>
                  <div className="h-6 flex items-center px-2 text-xs font-mono font-bold" style={{ width: `${sp.pct}%`, background: sp.id === "S001" ? C.red : sp.id === "S002" ? C.green : C.amber, color: "#fff" }}>{sp.pct}%</div>
                </div>
                <span className="w-20 text-right font-mono text-xs" style={{ color: C.dim }}>ETA {sp.eta}</span>
                <span className="w-20 text-right font-mono text-xs" style={{ color: C.text }}>{Math.round(orderQty * sp.pct / 100).toLocaleString()} u</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="space-y-5">
        <Panel title="Simulated Outcome">
          <div className="space-y-4">
            <Delta from={p.risk} to={42} label="Risk score" />
            <div style={{ height: 1, background: C.border }} />
            <Delta from={Math.round(before * 100)} to={Math.round(after * 100)} label="Line-stop %" />
          </div>
        </Panel>
        <Panel title="Financial Impact">
          <div className="space-y-3 text-sm">
            <Row k="Additional cost" v={fmtLakh(1240000)} tone={C.amber} />
            <Row k="Exposed loss" v={fmtCr(productionLoss(5))} tone={C.red} />
            <Row k="Avoided loss" v={fmtCr(productionLoss(5) - 11000000)} tone={C.green} />
            <div className="pt-3 mt-1" style={{ borderTop: `1px solid ${C.border}` }}>
              <Row k="Net benefit" v={fmtCr(productionLoss(5) - 11000000 - 1240000)} tone={C.green} />
            </div>
          </div>
          <button className="mt-4 w-full py-2.5 rounded-lg text-sm font-bold" style={{ background: C.green, color: C.bg }}>
            Approve Purchase Order
          </button>
          <div className="text-[10px] text-center mt-2" style={{ color: C.faint }}>
            ROI {(((productionLoss(5) - 11000000 - 1240000) / 1240000)).toFixed(0)}× on mitigation spend
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ----------------------------- AI COPILOT --------------------------------- */

const COPILOT_CHIPS = [
  "What is the highest risk in my supply chain right now?",
  "Why is ElectroChip Asia flagged as critical?",
  "What should I do about the Infotainment MCU shortage?",
  "Analyse the quality issue on Line 3 machine M007",
  "Which suppliers can replace ElectroChip Asia?",
  "Financial impact if Pune Line 2 stops for 5 days?",
  "Should I place an emergency PO for the MCU today?",
  "How exposed am I to China geopolitical risk?",
];

function AICopilot({ partCtx }) {
  const [msgs, setMsgs] = useState([
    {
      role: "assistant",
      content:
        "I'm your AutoShield AI Copilot with real-time visibility into all supply chain risks, quality alerts, commodity signals, and inventory positions. Ask me anything about your operations — I'll give you specific, data-driven answers.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const send = useCallback(
    async (text) => {
      if (!text.trim() || loading) return;
      const userMsgs = [...msgs, { role: "user", content: text }];
      setMsgs([...userMsgs, { role: "assistant", content: "" }]);
      setInput("");
      setLoading(true);

      try {
        const res = await fetch(`${API_BASE}/api/ai/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: userMsgs.map((m) => ({ role: m.role, content: m.content })),
            part_context: partCtx || null,
          }),
        });

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let content = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value);
          for (const line of text.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const d = line.slice(6);
            if (d === "[DONE]") break;
            try {
              const parsed = JSON.parse(d);
              if (parsed.content) {
                content += parsed.content;
                setMsgs([...userMsgs, { role: "assistant", content }]);
              }
            } catch { /* incomplete JSON chunk, skip */ }
          }
        }
      } catch {
        setMsgs([
          ...userMsgs,
          {
            role: "assistant",
            content:
              "⚠️ Connection error — ensure the AutoShield backend is running on port 8000 with OPENAI_API_KEY set.",
          },
        ]);
      }
      setLoading(false);
    },
    [msgs, loading, partCtx]
  );

  const showChips = msgs.length <= 1;

  return (
    <div className="flex flex-col h-full">
      {/* header strip */}
      <div
        className="flex items-center gap-3 px-6 py-3"
        style={{ borderBottom: `1px solid ${C.border}`, background: `${C.accent}08` }}
      >
        <div className="rounded-lg p-1.5" style={{ background: `${C.accent}1a` }}>
          <Bot size={16} style={{ color: C.accent }} />
        </div>
        <div>
          <span className="text-sm font-semibold" style={{ color: C.text }}>
            AutoShield AI Copilot
          </span>
          <span className="text-xs ml-2" style={{ color: C.faint }}>
            GPT-4o · live supply chain context
          </span>
        </div>
        <div
          className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
          style={{ background: `${C.green}14`, color: C.green, border: `1px solid ${C.green}33` }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: C.green }} />
          Online
        </div>
      </div>

      {/* message list */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {msgs.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
            {m.role === "assistant" && (
              <div
                className="rounded-lg p-2 h-fit shrink-0"
                style={{ background: `${C.accent}1a`, border: `1px solid ${C.accent}33` }}
              >
                <Sparkles size={14} style={{ color: C.accent }} />
              </div>
            )}
            <div
              className="max-w-2xl rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
              style={{
                background: m.role === "user" ? `${C.accent}18` : C.panel,
                border: `1px solid ${m.role === "user" ? C.accent + "44" : C.border}`,
                color: C.text,
              }}
            >
              {m.content || (loading && i === msgs.length - 1 ? (
                <span className="flex items-center gap-2" style={{ color: C.faint }}>
                  <Loader2 size={13} className="animate-spin" />Thinking…
                </span>
              ) : "")}
            </div>
            {m.role === "user" && (
              <div
                className="rounded-lg p-2 h-fit shrink-0"
                style={{ background: `${C.border}`, border: `1px solid ${C.border}` }}
              >
                <Brain size={14} style={{ color: C.dim }} />
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* suggestion chips */}
      {showChips && (
        <div className="px-6 pb-3 flex flex-wrap gap-2">
          {COPILOT_CHIPS.map((c) => (
            <button
              key={c}
              onClick={() => send(c)}
              className="px-3 py-1.5 rounded-full text-xs transition-colors hover:brightness-125"
              style={{ background: C.panel, border: `1px solid ${C.border}`, color: C.dim }}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {/* input bar */}
      <div className="px-6 pb-6">
        <div
          className="flex gap-2 p-2 rounded-xl"
          style={{ background: C.panel, border: `1px solid ${C.border}` }}
        >
          <input
            className="flex-1 bg-transparent text-sm outline-none px-2"
            style={{ color: C.text }}
            placeholder="Ask about supply chain risks, quality, sourcing strategy…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send(input)}
          />
          <button
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-opacity"
            style={{
              background: C.accent,
              color: C.bg,
              opacity: loading || !input.trim() ? 0.4 : 1,
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            }}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {loading ? "…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- SCENARIO PLANNER ----------------------------- */

const SCENARIO_LIST = [
  {
    id: "china_ban",
    label: "China Semiconductor Export Ban",
    severity: "Critical",
    emoji: "🚫",
    desc: "China bans all semiconductor material exports immediately",
  },
  {
    id: "taiwan_crisis",
    label: "Taiwan Strait Crisis",
    severity: "Critical",
    emoji: "⚡",
    desc: "Military crisis — shipping lanes disrupted for 60 days, TSMC output cut 30%",
  },
  {
    id: "aluminium_spike",
    label: "Aluminium Price Spike +40%",
    severity: "High",
    emoji: "📈",
    desc: "European smelter shutdowns from energy crisis spike aluminium 40% in 30 days",
  },
  {
    id: "supplier_failure",
    label: "ElectroChip Asia Bankruptcy",
    severity: "Critical",
    emoji: "🏢",
    desc: "Primary MCU supplier (S001) files for bankruptcy — no new shipments, tooling locked",
  },
];

function ScenarioPlanner() {
  const [active, setActive] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function runScenario(id) {
    if (loading) return;
    setActive(id);
    setResult(null);
    setLoading(true);
    try {
      const data = await apiFetch("/api/ai/scenario", {
        method: "POST",
        body: JSON.stringify({ scenario_type: id, parameters: {} }),
      });
      setResult(data);
    } catch {
      setResult({ error: "AI service unreachable. Ensure backend is running on port 8000 with OPENAI_API_KEY set." });
    }
    setLoading(false);
  }

  const activeScenario = SCENARIO_LIST.find((s) => s.id === active);

  return (
    <div className="p-6 flex gap-5 h-full">
      {/* scenario selector */}
      <div className="w-72 shrink-0 space-y-3">
        <div
          className="text-xs uppercase tracking-widest font-semibold mb-4"
          style={{ color: C.accent }}
        >
          Select Scenario
        </div>
        {SCENARIO_LIST.map((s) => {
          const isActive = active === s.id;
          const lvl = riskLevel(s.severity === "Critical" ? 87 : 70);
          return (
            <button
              key={s.id}
              onClick={() => runScenario(s.id)}
              disabled={loading}
              className="w-full text-left rounded-xl p-4 transition-all hover:brightness-110"
              style={{
                background: isActive ? `${C.accent}14` : C.panel,
                border: `1px solid ${isActive ? C.accent + "55" : C.border}`,
                opacity: loading && !isActive ? 0.5 : 1,
              }}
            >
              <div className="text-2xl mb-2">{s.emoji}</div>
              <div className="text-sm font-semibold mb-1" style={{ color: C.text }}>
                {s.label}
              </div>
              <div className="text-xs mb-2" style={{ color: C.faint }}>
                {s.desc}
              </div>
              <Badge level={lvl} />
            </button>
          );
        })}
      </div>

      {/* results area */}
      <div className="flex-1">
        {loading && (
          <div
            className="flex flex-col items-center justify-center h-full gap-4"
            style={{ color: C.accent }}
          >
            <Loader2 size={32} className="animate-spin" />
            <div className="text-sm font-medium">AI modelling scenario impact…</div>
            <div className="text-xs" style={{ color: C.faint }}>
              GPT-4o is analysing cascade effects across your full supply chain
            </div>
          </div>
        )}

        {result && !loading && (
          <Panel
            title={
              result.error
                ? "Error"
                : `Scenario Analysis — ${activeScenario?.label}`
            }
            right={
              !result.error && (
                <button
                  onClick={() => runScenario(active)}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded"
                  style={{ color: C.accent, background: `${C.accent}14` }}
                >
                  <RefreshCw size={11} />Re-run
                </button>
              )
            }
          >
            {result.error ? (
              <p className="text-sm" style={{ color: C.amber }}>
                ⚠️ {result.error}
              </p>
            ) : (
              <div
                className="text-sm leading-relaxed whitespace-pre-wrap overflow-y-auto"
                style={{ color: C.text, maxHeight: "calc(100vh - 220px)" }}
              >
                {result.analysis}
              </div>
            )}
          </Panel>
        )}

        {!result && !loading && (
          <div
            className="flex flex-col items-center justify-center h-full gap-4"
            style={{ color: C.faint }}
          >
            <FlaskConical size={48} strokeWidth={1} />
            <div className="text-sm font-medium" style={{ color: C.dim }}>
              AI-powered what-if scenario analysis
            </div>
            <div className="text-xs text-center max-w-xs">
              Select a disruption scenario to see GPT-4o model the cascade effects, financial
              exposure, and emergency response playbook across your entire supply chain.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------- SHELL ----------------------------------- */

export default function App() {
  const [page, setPage] = useState("dash");
  const [ctx, setCtx] = useState("P001");
  const go = (pg, id) => { if (id) setCtx(id); setPage(pg); };

  const titles = {
    dash:     "Command Dashboard",
    graph:    "Supply-Chain Digital Twin",
    risk:     "Risk Detail",
    sim:      "Sourcing Simulator",
    qual:     "Smart Manufacturing Quality Copilot",
    erp:      "ERP Reorder Decision",
    copilot:  "AI Copilot  —  GPT-4o Supply Chain Intelligence",
    scenario: "AI Scenario Planner  —  What-If Disruption Analysis",
  };

  const isCopilotPage = page === "copilot" || page === "scenario";

  return (
    <div className="flex h-screen w-full font-sans" style={{ background: C.bg, color: C.text }}>
      <Sidebar page={page} setPage={setPage} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar title={titles[page]} />
        <div
          className="flex-1 overflow-y-auto"
          style={{
            background: `radial-gradient(1200px 600px at 80% -10%, ${C.panel2}55, transparent)`,
            /* copilot pages need full height flex layout */
            ...(isCopilotPage ? { display:"flex", flexDirection:"column", overflow:"hidden" } : {}),
          }}
        >
          {page === "dash"     && <Dashboard go={go} />}
          {page === "graph"    && <GraphView go={go} />}
          {page === "risk"     && <RiskDetail partId={ctx} go={go} />}
          {page === "sim"      && <Simulator />}
          {page === "qual"     && <Quality />}
          {page === "erp"      && <ERP />}
          {page === "copilot"  && <AICopilot partCtx={null} />}
          {page === "scenario" && <ScenarioPlanner />}
        </div>
      </main>
    </div>
  );
}
