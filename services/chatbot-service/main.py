# ═══════════════════════════════════════════════════════════════
# Nepal Civic Intelligence Graph 3.0 — AI Chatbot Service
# RAG-based civic assistant with Neo4j + Elasticsearch retrieval
# ═══════════════════════════════════════════════════════════════

import os
import json
import logging
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from contextlib import asynccontextmanager

logger = logging.getLogger("chatbot-service")
logging.basicConfig(level=logging.INFO)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    user_district: Optional[str] = None
    user_province: Optional[str] = None
    conversation_id: Optional[str] = None
    language: str = Field(default="en")


class ChatResponse(BaseModel):
    response: str
    sources: list[dict] = []
    intent: str
    confidence: float
    processing_time_ms: float


# ── RAG Retrieval Engine ───────────────────────────────────────
class CivicRAGEngine:
    """
    Retrieval-Augmented Generation engine for Nepal civic data.
    Retrieves from: Neo4j Knowledge Graph, Elasticsearch, Vector DB
    """

    SYSTEM_PROMPT = """You are Nepal Civic Intelligence Assistant, an AI that helps citizens 
understand governance, policies, events, and public services across Nepal. 

Rules:
1. Answer questions about Nepali governance, policies, events, and public services
2. Always cite your data sources
3. If the answer is not in the provided context, say "I don't have information about that yet"
4. Be factual and neutral — do not express political opinions
5. Support both English and Nepali queries
6. Provide location-specific information when the user's location is known

User Location: {user_district}, {user_province}
Context: {context}"""

    # Knowledge base (in production, this queries Neo4j + ES)
    KNOWLEDGE_BASE = {
        "kathmandu": {
            "events": [
                "New highway bridge construction approved (Rs 2.5B) connecting Kathmandu to Chitwan",
                "Digital Nepal Framework 2026-2030 approved by Cabinet",
                "UGC Nepal reforms education grants policy for public universities",
            ],
            "policies": [
                "Digital Nepal Framework 2026-2030 (Implementing, 35%)",
                "National Health Insurance Expansion (Approved, 60%)",
                "Infrastructure Development Fund (Announced, 10%)",
            ],
            "stats": {"events_this_week": 287, "active_sources": 45},
        },
        "disaster": {
            "alerts": [
                "Flood warning — Koshi River basin, 3 districts on high alert",
                "Monsoon Early Warning activated across 15 districts",
            ],
            "risk_level": "HIGH in eastern terai regions",
        },
        "policies": {
            "bagmati": [
                "Digital Nepal Framework 2026-2030 — Implementing (35%)",
                "National Health Insurance Expansion — Approved (60%)",
                "Clean Energy Act 2026 — In Committee (20%)",
                "Agricultural Modernization Plan — Implementing (45%)",
                "Infrastructure Development Fund — Announced (10%)",
            ],
        },
        "officials": {
            "minister_of_health": {
                "name": "Laxmi KC",
                "score": 88,
                "decisions": [
                    "National Health Insurance Expansion to all 77 districts",
                    "Free Health Camp initiative in Karnali Province",
                    "COVID-19 Response Phase 3 protocol update",
                ],
            },
        },
    }

    INTENT_PATTERNS = {
        "local_events": ["happening", "news", "events", "updates", "district", "what's going on"],
        "disaster": ["disaster", "flood", "earthquake", "landslide", "alert", "warning", "emergency"],
        "policy": ["policy", "policies", "affecting", "law", "act", "regulation", "bill"],
        "official": ["minister", "official", "decision", "track", "who", "score"],
        "economy": ["economy", "economic", "gdp", "budget", "trade", "revenue", "tax"],
        "health": ["health", "hospital", "disease", "medical", "vaccine"],
        "general": [],
    }

    def classify_intent(self, message: str) -> tuple[str, float]:
        lower = message.lower()
        best_intent = "general"
        best_score = 0.3

        for intent, keywords in self.INTENT_PATTERNS.items():
            hits = sum(1 for kw in keywords if kw in lower)
            if hits > 0:
                score = min(0.95, 0.4 + hits * 0.2)
                if score > best_score:
                    best_intent = intent
                    best_score = score

        return best_intent, best_score

    def retrieve_context(self, message: str, intent: str, district: str = None, province: str = None) -> tuple[str, list[dict]]:
        """Retrieve relevant context from knowledge base."""
        lower = message.lower()
        context_parts = []
        sources = []

        if intent == "local_events" or any(loc in lower for loc in ["kathmandu", "district"]):
            data = self.KNOWLEDGE_BASE["kathmandu"]
            context_parts.append("Recent events in Kathmandu:\n" + "\n".join(f"• {e}" for e in data["events"]))
            context_parts.append(f"Stats: {data['stats']['events_this_week']} events this week, {data['stats']['active_sources']} active sources")
            sources.extend([{"name": "Nepal Government Portal", "type": "government"}, {"name": "MoICT", "type": "government"}])

        if intent == "disaster" or "disaster" in lower or "alert" in lower:
            data = self.KNOWLEDGE_BASE["disaster"]
            context_parts.append("Active disaster alerts:\n" + "\n".join(f"• {a}" for a in data["alerts"]))
            context_parts.append(f"Risk Level: {data['risk_level']}")
            sources.extend([{"name": "DHM Nepal", "type": "government"}, {"name": "Nepal Red Cross", "type": "ngo"}])

        if intent == "policy" or "polic" in lower or "bagmati" in lower:
            policies = self.KNOWLEDGE_BASE["policies"]["bagmati"]
            context_parts.append("Policies affecting Bagmati Province:\n" + "\n".join(f"• {p}" for p in policies))
            sources.append({"name": "Government of Nepal Knowledge Graph", "type": "graph"})

        if intent == "official" or "minister" in lower:
            official = self.KNOWLEDGE_BASE["officials"]["minister_of_health"]
            context_parts.append(f"Minister: {official['name']}, Score: {official['score']}/100")
            context_parts.append("Decisions:\n" + "\n".join(f"• {d}" for d in official["decisions"]))
            sources.append({"name": "Official Accountability Tracker", "type": "system"})

        if not context_parts:
            context_parts.append("I have access to Nepal civic data covering all 7 provinces, 77 districts. Try asking about specific locations, policies, or events.")
            sources.append({"name": "NCIG Knowledge Graph", "type": "system"})

        return "\n\n".join(context_parts), sources

    def generate_response(self, message: str, intent: str, context: str, sources: list[dict]) -> str:
        """Generate response based on context (in production, calls LLM)."""
        lower = message.lower()

        if intent == "local_events" or any(loc in lower for loc in ["kathmandu", "district"]):
            return f"""📍 **Kathmandu District Updates:**

1. **Infrastructure**: New highway bridge construction approved (Rs 2.5B) connecting Kathmandu to Chitwan
2. **Technology**: Digital Nepal Framework 2026-2030 approved by cabinet
3. **Education**: UGC reforms education grants policy for public universities

📊 Total events this week: 287 | Active sources: 45

*Sources: Nepal Government Portal, MoICT, UGC Nepal*"""

        if intent == "disaster":
            return """🚨 **Active Disaster Alerts:**

1. ⚡ **Flood Warning** — Koshi River basin, 3 districts on high alert (Province 1)
2. 🌧️ **Monsoon Early Warning** — Activated across 15 districts

Risk Level: **HIGH** in eastern terai regions

*Sources: Department of Hydrology and Meteorology, Nepal Red Cross*"""

        if intent == "policy":
            return """📋 **Policies Affecting Bagmati Province:**

1. Digital Nepal Framework 2026-2030 — *Implementing (35%)*
2. National Health Insurance Expansion — *Approved (60%)*
3. Clean Energy Act 2026 — *In Committee (20%)*
4. Agricultural Modernization Plan — *Implementing (45%)*
5. Infrastructure Development Fund — *Announced (10%)*

Total active policies: 23 | Average completion rate: 42%

*Source: Government of Nepal Knowledge Graph*"""

        if intent == "official":
            return """🏆 **Minister of Health — Laxmi KC**
Accountability Score: **88/100** (Excellent)

Recent Decisions:
1. National Health Insurance Expansion to all 77 districts
2. Free Health Camp initiative in Karnali Province
3. COVID-19 Response Phase 3 protocol update

Trend: ↑ +1 from last month

*Source: Official Accountability Tracker*"""

        return f"""I found relevant information about your query. Based on the Nepal Civic Intelligence Graph:

{context}

Would you like me to provide more specific details about any of these topics?"""


rag_engine = CivicRAGEngine()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🤖 Chatbot Service starting...")
    yield
    logger.info("Chatbot Service shutting down...")

app = FastAPI(
    title="NCIG Chatbot Service",
    description="RAG-based civic intelligence chatbot for Nepal",
    version="3.0.0",
    lifespan=lifespan,
)

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "chatbot-service"}


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    start = datetime.now()

    intent, confidence = rag_engine.classify_intent(request.message)
    context, sources = rag_engine.retrieve_context(
        request.message, intent,
        district=request.user_district,
        province=request.user_province,
    )
    response_text = rag_engine.generate_response(request.message, intent, context, sources)

    elapsed = (datetime.now() - start).total_seconds() * 1000

    return ChatResponse(
        response=response_text,
        sources=sources,
        intent=intent,
        confidence=confidence,
        processing_time_ms=round(elapsed, 2),
    )


@app.get("/chat/suggested")
async def suggested_queries():
    return {
        "queries": [
            "What is happening in my district?",
            "Show all disaster alerts",
            "Policies affecting Bagmati Province",
            "Track decisions by Minister of Health",
            "Latest economic news in Nepal",
            "Which policies affect me?",
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=4004)
