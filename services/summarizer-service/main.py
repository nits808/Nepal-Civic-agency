# ═══════════════════════════════════════════════════════════════
# Nepal Civic Intelligence Graph 3.0 — Summarizer Service
# Bilingual (Nepali + English) government document summarization
# Outputs: 3-line summary, key decisions, impact analysis
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

logger = logging.getLogger("summarizer-service")
logging.basicConfig(level=logging.INFO)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")


# ── Models ─────────────────────────────────────────────────────
class SummarizeRequest(BaseModel):
    text: str = Field(..., min_length=20, description="Document text to summarize")
    title: str = Field(default="", description="Document title")
    source_name: str = Field(default="", description="Source name")
    language: str = Field(default="en", description="Language: en or ne")
    publish_date: str = Field(default="", description="Publish date")


class SummaryResult(BaseModel):
    summary_3line: str = Field(description="3-line factual summary")
    key_decisions: list[str] = Field(description="Key decisions extracted")
    impact_analysis: str = Field(description="Who is affected and how")
    affected_entities: list[str] = Field(description="Entities mentioned")
    sentiment: str = Field(description="Overall sentiment: positive, negative, neutral")
    urgency: str = Field(description="Urgency level: low, medium, high, critical")
    processing_time_ms: float


class FakeNewsRequest(BaseModel):
    text: str
    title: str = ""
    source_name: str = ""
    source_credibility: float = Field(default=0.5, ge=0, le=1)
    cross_source_count: int = Field(default=0, ge=0)


class FakeNewsResult(BaseModel):
    credibility_score: float
    credibility_level: str  # verified, needs_review, misleading
    source_score: float
    cross_validation_score: float
    ai_confidence_score: float
    temporal_score: float
    reasoning: str


# ── Summarization Engine ──────────────────────────────────────
class SummarizationEngine:
    """
    Extractive + template-based summarization engine.
    In production, this would call OpenAI GPT-4 / fine-tuned model.
    """

    # Prompt template for LLM-based summarization
    SUMMARIZE_PROMPT = """You are a Nepal civic intelligence analyst. Analyze this government 
notice/news article and provide a structured summary.

Document Title: {title}
Source: {source_name}
Date: {publish_date}
Language: {language}

Document Text:
{text}

Provide your response in JSON format:
{{
  "summary_3line": "A factual 3-line summary of the document",
  "key_decisions": ["Decision 1", "Decision 2", ...],
  "impact_analysis": "Who is affected and how",
  "affected_entities": ["Entity 1", "Entity 2", ...],
  "sentiment": "positive|negative|neutral",
  "urgency": "low|medium|high|critical"
}}"""

    def __init__(self):
        self.openai_available = bool(OPENAI_API_KEY)
        logger.info(f"SummarizationEngine initialized (OpenAI: {self.openai_available})")

    def _extractive_summarize(self, text: str, title: str) -> SummaryResult:
        """Fallback extractive summarization when LLM is unavailable."""
        start = datetime.now()

        sentences = [s.strip() for s in text.replace('\n', '. ').split('.') if len(s.strip()) > 20]

        # Take first 3 meaningful sentences as summary
        summary_sentences = sentences[:3] if len(sentences) >= 3 else sentences
        summary = '. '.join(summary_sentences) + '.'

        # Extract key phrases that look like decisions
        decision_keywords = [
            'decided', 'approved', 'announced', 'ordered', 'directed',
            'allocated', 'launched', 'signed', 'established', 'banned',
            'निर्णय', 'स्वीकृत', 'घोषणा', 'आदेश', 'बजेट',
        ]
        decisions = []
        for sentence in sentences:
            lower = sentence.lower()
            if any(kw in lower for kw in decision_keywords):
                decisions.append(sentence.strip())
        decisions = decisions[:5]  # Max 5 decisions

        # Simple entity extraction (capitalized words)
        words = text.split()
        entities = list(set(
            w.strip('.,;:()[]"\'') for w in words
            if w[0].isupper() and len(w) > 2 and w not in ('The', 'This', 'That', 'And', 'But')
        ))[:10]

        # Sentiment heuristic
        positive_words = ['success', 'improvement', 'growth', 'benefit', 'progress', 'positive']
        negative_words = ['crisis', 'failure', 'decline', 'disaster', 'problem', 'negative', 'death']
        text_lower = text.lower()
        pos_count = sum(1 for w in positive_words if w in text_lower)
        neg_count = sum(1 for w in negative_words if w in text_lower)
        sentiment = 'positive' if pos_count > neg_count else 'negative' if neg_count > pos_count else 'neutral'

        # Urgency detection
        urgent_words = ['emergency', 'immediate', 'urgent', 'critical', 'disaster', 'तत्काल', 'आपतकालीन']
        urgency = 'critical' if any(w in text_lower for w in urgent_words) else 'medium'

        elapsed = (datetime.now() - start).total_seconds() * 1000

        return SummaryResult(
            summary_3line=summary[:500],
            key_decisions=decisions,
            impact_analysis=f"This document from {title or 'unknown source'} potentially affects entities: {', '.join(entities[:5])}.",
            affected_entities=entities,
            sentiment=sentiment,
            urgency=urgency,
            processing_time_ms=round(elapsed, 2),
        )

    async def summarize_with_llm(self, request: SummarizeRequest) -> SummaryResult:
        """Use OpenAI GPT-4 for high-quality summarization."""
        start = datetime.now()

        try:
            import httpx

            prompt = self.SUMMARIZE_PROMPT.format(
                title=request.title,
                source_name=request.source_name,
                publish_date=request.publish_date,
                language=request.language,
                text=request.text[:4000],  # Limit context
            )

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {OPENAI_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "gpt-4",
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.3,
                        "max_tokens": 500,
                    },
                    timeout=30.0,
                )

                data = response.json()
                content = data["choices"][0]["message"]["content"]
                result = json.loads(content)

                elapsed = (datetime.now() - start).total_seconds() * 1000

                return SummaryResult(
                    summary_3line=result.get("summary_3line", ""),
                    key_decisions=result.get("key_decisions", []),
                    impact_analysis=result.get("impact_analysis", ""),
                    affected_entities=result.get("affected_entities", []),
                    sentiment=result.get("sentiment", "neutral"),
                    urgency=result.get("urgency", "medium"),
                    processing_time_ms=round(elapsed, 2),
                )

        except Exception as e:
            logger.warning(f"LLM summarization failed, falling back: {e}")
            return self._extractive_summarize(request.text, request.title)

    async def summarize(self, request: SummarizeRequest) -> SummaryResult:
        """Main summarization entry point."""
        if self.openai_available:
            return await self.summarize_with_llm(request)
        return self._extractive_summarize(request.text, request.title)


# ── Fake News Detection Engine ─────────────────────────────────
class FakeNewsDetector:
    """
    Multi-signal credibility scoring system.
    Score = w1·SourceScore + w2·CrossValidation + w3·AIConfidence + w4·TemporalScore
    """

    WEIGHTS = {
        "source": 0.30,
        "cross_validation": 0.35,
        "ai_confidence": 0.25,
        "temporal": 0.10,
    }

    SENSATIONAL_WORDS = [
        "shocking", "unbelievable", "breaking", "exclusive", "secret",
        "conspiracy", "exposed", "revealed", "you won't believe",
        "चौंकाउने", "विस्फोटक", "गोप्य",
    ]

    def score(self, request: FakeNewsRequest) -> FakeNewsResult:
        # Source credibility (from database or provided)
        source_score = request.source_credibility

        # Cross-source validation
        if request.cross_source_count >= 5:
            cross_score = 0.95
        elif request.cross_source_count >= 3:
            cross_score = 0.80
        elif request.cross_source_count >= 1:
            cross_score = 0.60
        else:
            cross_score = 0.30

        # AI confidence (NLP-based claim analysis)
        text_lower = request.text.lower()
        sensational_hits = sum(1 for w in self.SENSATIONAL_WORDS if w in text_lower)
        has_quotes = '"' in request.text or "'" in request.text
        has_numbers = any(c.isdigit() for c in request.text)
        text_length = len(request.text)

        ai_score = 0.7
        ai_score -= sensational_hits * 0.1
        ai_score += 0.1 if has_quotes else 0  # Quotes suggest attribution
        ai_score += 0.1 if has_numbers else 0  # Numbers suggest specificity
        ai_score += 0.05 if text_length > 200 else -0.1  # Longer = more detail
        ai_score = max(0.1, min(0.95, ai_score))

        # Temporal score (placeholder – in production, check posting patterns)
        temporal_score = 0.7

        # Weighted aggregate
        final_score = (
            self.WEIGHTS["source"] * source_score +
            self.WEIGHTS["cross_validation"] * cross_score +
            self.WEIGHTS["ai_confidence"] * ai_score +
            self.WEIGHTS["temporal"] * temporal_score
        )

        # Determine level
        if final_score > 0.8:
            level = "verified"
        elif final_score > 0.5:
            level = "needs_review"
        else:
            level = "misleading"

        reasoning_parts = []
        if source_score > 0.7:
            reasoning_parts.append("Source has good credibility history")
        if cross_score > 0.7:
            reasoning_parts.append(f"Corroborated by {request.cross_source_count} other sources")
        if sensational_hits > 0:
            reasoning_parts.append(f"Contains {sensational_hits} sensational keywords")
        if ai_score < 0.5:
            reasoning_parts.append("AI analysis flags potential issues")

        return FakeNewsResult(
            credibility_score=round(final_score, 3),
            credibility_level=level,
            source_score=round(source_score, 3),
            cross_validation_score=round(cross_score, 3),
            ai_confidence_score=round(ai_score, 3),
            temporal_score=round(temporal_score, 3),
            reasoning=". ".join(reasoning_parts) if reasoning_parts else "Standard credibility assessment.",
        )


# ── FastAPI App ────────────────────────────────────────────────
engine = SummarizationEngine()
fake_detector = FakeNewsDetector()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("📝 Summarizer Service starting...")
    yield
    logger.info("Summarizer Service shutting down...")

app = FastAPI(
    title="NCIG Summarizer & Credibility Service",
    description="Bilingual summarization and fake news detection",
    version="3.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "summarizer-service",
        "openai_available": engine.openai_available,
    }


@app.post("/summarize", response_model=SummaryResult)
async def summarize(request: SummarizeRequest):
    """Summarize a document into 3-line summary + key decisions + impact."""
    try:
        return await engine.summarize(request)
    except Exception as e:
        logger.error(f"Summarization error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/summarize/batch")
async def summarize_batch(documents: list[SummarizeRequest]):
    """Batch summarize multiple documents."""
    results = []
    for doc in documents:
        try:
            result = await engine.summarize(doc)
            results.append(result.model_dump())
        except Exception as e:
            results.append({"error": str(e)})
    return {"results": results, "total": len(results)}


@app.post("/credibility", response_model=FakeNewsResult)
async def check_credibility(request: FakeNewsRequest):
    """Score the credibility of a news article."""
    try:
        return fake_detector.score(request)
    except Exception as e:
        logger.error(f"Credibility check error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
