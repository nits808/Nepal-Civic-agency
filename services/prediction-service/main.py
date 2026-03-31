# ═══════════════════════════════════════════════════════════════
# Nepal Civic Intelligence Graph 3.0 — Prediction Service
# Disaster risk, economic trends, and health outbreak prediction
# ═══════════════════════════════════════════════════════════════

import os
import json
import math
import random
import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from contextlib import asynccontextmanager

logger = logging.getLogger("prediction-service")
logging.basicConfig(level=logging.INFO)


class PredictionRequest(BaseModel):
    type: str = Field(..., description="disaster, economic, or health")
    location: Optional[str] = None
    time_horizon_days: int = Field(default=30, ge=1, le=365)


class PredictionResult(BaseModel):
    type: str
    location: Optional[str]
    predictions: list[dict]
    model_version: str
    confidence_interval: dict
    generated_at: str


class SimulationRequest(BaseModel):
    policy_params: dict = Field(..., description="Policy parameters to simulate")
    duration_months: int = Field(default=12, ge=1, le=60)
    target_locations: list[str] = Field(default=[])


class SimulationResult(BaseModel):
    gdp_impact_pct: float
    employment_effect: int
    sector_breakdown: dict
    regional_impact: list[dict]
    confidence: float
    timeline: list[dict]


# ── Disaster Risk Model ───────────────────────────────────────
class DisasterRiskModel:
    """Simplified disaster risk prediction using seasonal and geographic features."""

    DISTRICT_RISK_PROFILES = {
        "Kathmandu": {"earthquake": 0.7, "flood": 0.3, "landslide": 0.4},
        "Morang": {"earthquake": 0.3, "flood": 0.8, "landslide": 0.2},
        "Sunsari": {"earthquake": 0.3, "flood": 0.75, "landslide": 0.2},
        "Chitwan": {"earthquake": 0.4, "flood": 0.6, "landslide": 0.3},
        "Kaski": {"earthquake": 0.5, "flood": 0.4, "landslide": 0.7},
        "Surkhet": {"earthquake": 0.3, "flood": 0.5, "landslide": 0.6},
        "Jhapa": {"earthquake": 0.2, "flood": 0.7, "landslide": 0.1},
        "Dolpa": {"earthquake": 0.6, "flood": 0.2, "landslide": 0.5},
    }

    SEASONAL_FACTORS = {
        1: 0.3, 2: 0.25, 3: 0.3, 4: 0.4, 5: 0.5,
        6: 0.8, 7: 0.95, 8: 0.9, 9: 0.7, 10: 0.5,
        11: 0.3, 12: 0.25,
    }

    def predict(self, location: str = None, horizon_days: int = 30) -> list[dict]:
        predictions = []
        districts = [location] if location and location in self.DISTRICT_RISK_PROFILES else list(self.DISTRICT_RISK_PROFILES.keys())

        for district in districts:
            profile = self.DISTRICT_RISK_PROFILES.get(district, {"earthquake": 0.3, "flood": 0.4, "landslide": 0.3})
            month = datetime.now().month
            seasonal = self.SEASONAL_FACTORS.get(month, 0.5)

            for disaster_type, base_risk in profile.items():
                risk = base_risk * seasonal
                if disaster_type == "flood":
                    risk *= seasonal  # Double seasonal effect for floods

                risk = min(0.95, risk)
                severity = "critical" if risk > 0.7 else "high" if risk > 0.5 else "medium" if risk > 0.3 else "low"

                predictions.append({
                    "district": district,
                    "type": disaster_type,
                    "probability": round(risk, 3),
                    "severity": severity,
                    "predicted_window": f"{datetime.now().strftime('%Y-%m-%d')} to {(datetime.now() + timedelta(days=horizon_days)).strftime('%Y-%m-%d')}",
                    "recommended_actions": self._get_recommendations(disaster_type, severity),
                })

        predictions.sort(key=lambda x: x["probability"], reverse=True)
        return predictions[:20]

    def _get_recommendations(self, dtype: str, severity: str) -> list[str]:
        recs = {
            "earthquake": ["Activate seismic monitoring", "Review building codes compliance", "Stockpile emergency supplies"],
            "flood": ["Monitor river water levels", "Prepare evacuation routes", "Alert downstream communities"],
            "landslide": ["Monitor soil moisture sensors", "Restrict hillside construction", "Clear drainage channels"],
        }
        return recs.get(dtype, ["Monitor situation", "Prepare emergency response"])


# ── Economic Trend Model ──────────────────────────────────────
class EconomicTrendModel:
    """Simplified economic trend prediction."""

    def predict(self, horizon_days: int = 30) -> list[dict]:
        sectors = ["Agriculture", "Tourism", "Remittance", "Industry", "Services", "Construction"]
        predictions = []

        for sector in sectors:
            # Simple seasonal + random walk model
            base_growth = random.uniform(-2, 5)
            seasonal = math.sin(datetime.now().month / 12 * 2 * math.pi) * 2

            predicted_growth = base_growth + seasonal
            confidence = random.uniform(0.6, 0.85)

            predictions.append({
                "sector": sector,
                "predicted_growth_pct": round(predicted_growth, 2),
                "direction": "growth" if predicted_growth > 0 else "contraction",
                "confidence": round(confidence, 3),
                "key_drivers": self._get_drivers(sector),
                "risk_factors": self._get_risks(sector),
            })

        return predictions

    def _get_drivers(self, sector: str) -> list[str]:
        drivers = {
            "Agriculture": ["Monsoon forecast favorable", "Government subsidy programs"],
            "Tourism": ["Peak season approaching", "New visa policies"],
            "Remittance": ["Global employment trends", "Exchange rate stability"],
            "Industry": ["Energy cost changes", "Trade agreements"],
            "Services": ["Digital adoption growth", "Urban expansion"],
            "Construction": ["Infrastructure spending", "Cement prices"],
        }
        return drivers.get(sector, ["General economic conditions"])

    def _get_risks(self, sector: str) -> list[str]:
        return ["Political instability", "Global economic slowdown", "Climate events"]


# ── Health Outbreak Model ─────────────────────────────────────
class HealthOutbreakModel:
    def predict(self, location: str = None, horizon_days: int = 30) -> list[dict]:
        diseases = [
            {"name": "Dengue", "seasonal_peak": [6, 7, 8, 9], "base_prob": 0.4},
            {"name": "Cholera", "seasonal_peak": [5, 6, 7, 8], "base_prob": 0.3},
            {"name": "Japanese Encephalitis", "seasonal_peak": [7, 8, 9], "base_prob": 0.25},
            {"name": "Diarrheal Disease", "seasonal_peak": [4, 5, 6, 7, 8, 9], "base_prob": 0.5},
        ]

        predictions = []
        month = datetime.now().month

        for disease in diseases:
            prob = disease["base_prob"]
            if month in disease["seasonal_peak"]:
                prob *= 1.5
            prob = min(0.9, prob)

            predictions.append({
                "disease": disease["name"],
                "probability": round(prob, 3),
                "risk_level": "high" if prob > 0.5 else "medium" if prob > 0.3 else "low",
                "peak_period": f"Month {disease['seasonal_peak'][0]}-{disease['seasonal_peak'][-1]}",
                "location": location or "National",
                "recommended_actions": [
                    "Increase surveillance",
                    "Stock medical supplies",
                    "Public awareness campaign",
                ],
            })

        return sorted(predictions, key=lambda x: x["probability"], reverse=True)


# ── Policy Simulation Engine ──────────────────────────────────
class PolicySimulator:
    def simulate(self, policy_params: dict, duration_months: int, locations: list[str]) -> SimulationResult:
        budget = policy_params.get("budget_billion_npr", 10)
        sector = policy_params.get("sector", "infrastructure")
        coverage = policy_params.get("coverage_pct", 50)

        # Simple simulation model
        gdp_impact = (budget * 0.1 * coverage / 100) + random.uniform(-0.5, 0.5)
        employment = int(budget * 1000 * coverage / 100 * random.uniform(0.8, 1.2))

        sector_impacts = {
            "primary_sector": round(gdp_impact * 0.6, 2),
            "supporting_sectors": round(gdp_impact * 0.3, 2),
            "indirect_effects": round(gdp_impact * 0.1, 2),
        }

        regional = []
        for loc in (locations or ["Bagmati", "Province 1", "Gandaki"]):
            regional.append({
                "location": loc,
                "gdp_impact_pct": round(gdp_impact * random.uniform(0.5, 1.5), 2),
                "jobs_created": int(employment * random.uniform(0.1, 0.4)),
            })

        timeline = []
        for m in range(1, min(duration_months + 1, 13)):
            progress = min(100, (m / duration_months) * 100 * random.uniform(0.8, 1.1))
            timeline.append({
                "month": m,
                "progress_pct": round(progress, 1),
                "cumulative_spend_pct": round(min(100, m / duration_months * 100), 1),
            })

        return SimulationResult(
            gdp_impact_pct=round(gdp_impact, 2),
            employment_effect=employment,
            sector_breakdown=sector_impacts,
            regional_impact=regional,
            confidence=round(random.uniform(0.6, 0.8), 2),
            timeline=timeline,
        )


# ── FastAPI ────────────────────────────────────────────────────
disaster_model = DisasterRiskModel()
economic_model = EconomicTrendModel()
health_model = HealthOutbreakModel()
simulator = PolicySimulator()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🔮 Prediction Service starting...")
    yield

app = FastAPI(
    title="NCIG Prediction & Simulation Service",
    description="Disaster risk, economic trends, health outbreaks, and policy simulation",
    version="3.0.0",
    lifespan=lifespan,
)

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "prediction-service"}


@app.post("/predict", response_model=PredictionResult)
async def predict(request: PredictionRequest):
    if request.type == "disaster":
        predictions = disaster_model.predict(request.location, request.time_horizon_days)
    elif request.type == "economic":
        predictions = economic_model.predict(request.time_horizon_days)
    elif request.type == "health":
        predictions = health_model.predict(request.location, request.time_horizon_days)
    else:
        predictions = []

    return PredictionResult(
        type=request.type,
        location=request.location,
        predictions=predictions,
        model_version="v1.0-heuristic",
        confidence_interval={"lower": 0.6, "upper": 0.85},
        generated_at=datetime.now().isoformat(),
    )


@app.post("/simulate", response_model=SimulationResult)
async def simulate(request: SimulationRequest):
    return simulator.simulate(
        request.policy_params,
        request.duration_months,
        request.target_locations,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005)
