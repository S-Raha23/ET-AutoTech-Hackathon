# AutoShield AI

### AI-Powered Supply Chain Resilience & Smart Manufacturing Copilot for Automotive OEMs

ET Auto Hackathon 2026  
Theme 1: AI for Resilient Automotive Supply Chains & Smart Manufacturing

---

## Overview

AutoShield AI is an intelligent decision-support platform designed for automotive OEMs, EV manufacturers, and Tier-1 suppliers.

The platform predicts supply-chain disruptions before they impact production, identifies risky suppliers and components, recommends alternate sourcing strategies, and detects manufacturing quality drift on the shop floor.

Instead of reacting to shortages and defects after they occur, AutoShield AI enables organizations to proactively prevent production losses through AI-driven risk intelligence.

---

## Problem Statement

Modern automotive manufacturing depends on thousands of interconnected suppliers, components, materials, logistics routes, and production lines.

A disruption in a single critical component can:

- Stop vehicle production
- Delay customer deliveries
- Increase operational costs
- Reduce manufacturing efficiency
- Impact revenue and profitability

Current ERP and supply-chain systems provide data, but they do not provide intelligent risk prediction, root-cause analysis, or actionable recommendations.

---

## Solution

AutoShield AI continuously analyzes:

- Supplier performance
- Inventory levels
- Logistics risks
- Commodity volatility
- Country/geopolitical risks
- Production quality metrics
- Process capability (Cp/Cpk)

and converts them into:

- Risk Predictions
- Production Impact Analysis
- Alternate Supplier Recommendations
- Inventory Optimization Plans
- Quality Alerts
- Executive Decision Intelligence

---

## Key Features

### Supply Chain Risk Intelligence

Predicts disruptions before they impact production.

#### Inputs

- Supplier performance
- Lead times
- Defect rates
- Country risk
- Logistics delays
- Commodity volatility
- Inventory levels

#### Outputs

- Risk Score (0-100)
- Risk Category
- Production Impact
- Mitigation Actions

---

### Supply Chain Digital Twin

Interactive graph visualization showing relationships between:

- Suppliers
- Parts
- Materials
- Countries
- Production Plants
- Vehicle Models
- Manufacturing Lines

Enables users to understand hidden dependencies and identify critical bottlenecks.

---

### Alternate Sourcing Engine

Automatically recommends:

- Alternate suppliers
- Alternate sourcing regions
- Supplier allocation splits
- Inventory strategy changes

and estimates:

- Cost impact
- Risk reduction
- Production savings

---

### Smart Manufacturing Quality Copilot

Detects:

- Defect trends
- Process drift
- Machine anomalies
- Supplier-batch quality issues

Provides:

- Root cause analysis
- Operator guidance
- Corrective actions

---

### ERP Reorder Simulator

Simulates purchasing decisions and predicts:

- Stockout risk
- Reorder quantity
- Supplier split recommendations
- Inventory coverage
- Avoided production loss

---

## System Architecture

```text
┌───────────────────────┐
│ Supply Chain Data     │
│ Supplier Data         │
│ Inventory Data        │
│ Production Data       │
│ Commodity Signals     │
└──────────┬────────────┘
           │
           ▼
┌───────────────────────┐
│ AI Risk Engine        │
│ Forecasting Models    │
│ Defect Detection      │
│ Anomaly Detection     │
└──────────┬────────────┘
           │
           ▼
┌───────────────────────┐
│ Recommendation Layer  │
│ Supplier Ranking      │
│ Risk Mitigation       │
│ Reorder Optimization  │
└──────────┬────────────┘
           │
           ▼
┌───────────────────────┐
│ AutoShield Dashboard  │
│ Supply Chain Twin     │
│ Quality Copilot       │
│ ERP Simulator         │
└───────────────────────┘
```

---

## AI Models & Analytics

### Risk Prediction

- Weighted Risk Scoring
- Supply Risk Forecasting

### Demand Forecasting

- Inventory Consumption Analysis
- Stockout Prediction

### Supplier Ranking

- Multi-Criteria Scoring

### Manufacturing Quality

- Cp Analysis
- Cpk Analysis
- Defect Probability Estimation

### Root Cause Analysis

- Process Capability Monitoring
- Batch Correlation Detection

---

## Screenshots

### Dashboard

![Dashboard](screenshots/dashboard.png)

### Supply Chain Digital Twin

![Supply Chain Twin](screenshots/supply_chain_twin.png)

### Risk Analysis

![Risk Detail](screenshots/risk_detail.png)

### Supplier Simulator

![Supplier Simulator](screenshots/supplier_simulator.png)

### Quality Copilot

![Quality Copilot](screenshots/quality_copilot.png)

### ERP Reorder Simulator

![ERP Simulator](screenshots/erp_simulator.png)

---

## Demo Scenario

### Critical Semiconductor Risk

AutoShield AI detects:

- Supplier: ElectroChip Asia
- Part: Infotainment MCU
- Risk Score: 87
- Inventory Cover: 10.7 Days
- Line Stop Probability: 78%

### AI Recommendation

- Shift 35% to Bharat Semi Components
- Shift 20% to Korea MicroSystems
- Increase safety stock
- Create proactive purchase order

### Result

| Metric | Before | After |
|----------|----------|----------|
| Risk Score | 87 | 42 |
| Line Stop Probability | 78% | 29% |
| Production Loss Risk | ₹4.8 Cr | ₹1.1 Cr |

---

## Technology Stack

### Frontend

- React
- Vite
- Tailwind CSS
- Recharts
- Lucide React

### Backend

- FastAPI
- Python
- Pandas
- NumPy

### Data

- CSV-based automotive datasets
- Supply chain data
- Production data
- Supplier data

---

## Project Structure

```text
autoshield-ai/
├── frontend/
├── backend/
├── screenshots/
└── README.md
```

---

## Installation

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend:

```text
http://localhost:8000
```

Swagger:

```text
http://localhost:8000/docs
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

## Business Impact

- Reduced Supply Chain Disruptions
- Reduced Line Stop Events
- Improved Supplier Resilience
- Better Inventory Planning
- Improved Manufacturing Quality
- Faster Decision Making

---

## Scalability

AutoShield AI can be expanded for:

- Automotive OEMs
- EV Manufacturers
- Battery Manufacturers
- Tier-1 Suppliers
- Smart Factories
- Global Supply Chains

---

## Hackathon Alignment

ET Auto Hackathon 2026

Theme 1:

**AI for Resilient Automotive Supply Chains & Smart Manufacturing**

Addresses:

- Supply Chain Resilience
- Supplier Risk Management
- Inventory Optimization
- Smart Manufacturing
- Quality Monitoring
- AI-Driven Decision Support

---

## Team

Built for ET Auto Hackathon 2026

AutoShield AI  
Predict • Prevent • Protect